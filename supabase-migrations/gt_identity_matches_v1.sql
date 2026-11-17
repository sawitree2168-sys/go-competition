-- ยืนยันตัวตน: a past-results name that only *looks like* an upcoming entrant is not starred until someone confirms
-- (17 Nov 2026, ครูเล็ก: "บางทีเป็นพี่น้อง ฝาแฝด บางทีเขียนผิด ระบบช่วยทำยืนยันตัวตน เดี๋ยวข้อมูลผิด").
-- * Candidate pair = same surname, different name, and neither name has an exact match on the other side
--   (ปุณยวัจน์ / ปุญยวัจน์ งามสิริศักดิ์, ชวัลฑรรศ / ขวัลฑรรศ, พรรค์เพ็ชร์ / เพียงเพ็ชร์ พานิช ...).
-- * The organiser answers ใช่ / ไม่ใช่ after asking the family; a web applicant can answer for themself in
--   สถานะการสมัคร (reference + phone, or their account). An organiser's answer is final for the applicant.
-- * /results: confirmed 'same' → ★ like an exact match; not answered yet → "รอยืนยัน". 'different' → nothing.

create or replace function gt_private.bare_name_v1(p text) returns text
language sql immutable set search_path = pg_catalog, gt_private as $$
  select btrim(regexp_replace(clean_name_v1(p), '^(ด\.ช\.|ด\.ญ\.|น\.ส\.|นางสาว\s|นาย\s|นาง\s)\s*', ''))
$$;
create or replace function gt_private.first_name_v1(p text) returns text
language sql immutable set search_path = pg_catalog, gt_private as $$
  select lower(split_part(bare_name_v1(p), ' ', 1))
$$;
-- Everything after the first name, no spaces or trailing dots ('' when there is no surname).
create or replace function gt_private.surname_key_v1(p text) returns text
language sql immutable set search_path = pg_catalog, gt_private as $$
  select case when strpos(bare_name_v1(p), ' ') = 0 then ''
              else lower(regexp_replace(regexp_replace(substr(bare_name_v1(p), strpos(bare_name_v1(p), ' ') + 1), '\s+', '', 'g'), '\.+$', '')) end
$$;

create table if not exists gt_private.result_identity_matches_v1 (
  tournament_id uuid not null references public.gt_tournaments(id) on delete cascade,
  entrant_key text not null,
  event_title text not null,
  player_ref text not null,
  decision text not null check (decision in ('same', 'different')),
  decided_by text not null check (decided_by in ('organizer', 'applicant')),
  decided_user uuid,
  application_id uuid,
  decided_at timestamptz not null default now(),
  primary key (tournament_id, entrant_key, event_title, player_ref)
);
alter table gt_private.result_identity_matches_v1 enable row level security;
revoke all on table gt_private.result_identity_matches_v1 from public, anon, authenticated;

-- Entrants of published events that have not happened yet: the organiser's sheet rows and web sign-ups.
create or replace function gt_private.upcoming_entrants_v1()
returns table (tournament_id uuid, title text, full_name text, k text, s text, f text)
language sql stable security definer set search_path = public, gt_private as $$
  with up as (
    select t.id, t.title from gt_tournaments t
    where t.published and t.event_date >= (now() at time zone 'Asia/Bangkok')::date
  ), raw as (
    select up.id, up.title, e.full_name from gt_public_entrants e join up on up.id = e.tournament_id
    union
    select up.id, up.title, a.full_name from gt_web_applications a join up on up.id = a.tournament_id
      left join gt_registrations r on r.id = a.registration_id
    where a.status in ('pending', 'approved') and (r.id is null or r.registration_status = 'confirmed')
  )
  select distinct on (id, name_key_v1(full_name)) id, title, bare_name_v1(full_name), name_key_v1(full_name), surname_key_v1(full_name), first_name_v1(full_name)
  from raw
$$;

-- Every player of recorded past results (whole standings sheets, else the summary rows).
create or replace function gt_private.result_people_v1()
returns table (event_title text, division text, player_ref text, full_name text, institution text, k text, s text, f text)
language sql stable security definer set search_path = public, gt_private as $$
  select x.event_title, x.division, x.player_ref, clean_name_v1(x.full_name), nullif(x.institution, ''),
         name_key_v1(x.full_name), surname_key_v1(x.full_name), first_name_v1(x.full_name)
  from history_event_results_v1 x
  union all
  select h.event_title, btrim(h.division), h.go_id, clean_name_v1(r.full_name), null,
         name_key_v1(r.full_name), surname_key_v1(r.full_name), first_name_v1(r.full_name)
  from history_event_summaries_v1 h join history_identity_registry_v1 r on r.go_id = h.go_id
  where not exists (select 1 from history_event_results_v1 x where x.event_title = h.event_title)
$$;

-- Pairs to confirm, with the answer so far (decision null = not answered).
create or replace function gt_private.identity_candidates_v1()
returns table (tournament_id uuid, title text, entrant_key text, entrant_name text, event_title text, division text,
               player_ref text, result_name text, institution text, decision text, decided_by text, decided_at timestamptz)
language sql stable security definer set search_path = public, gt_private as $$
  with e as (select * from upcoming_entrants_v1()), p as (select * from result_people_v1())
  select e.tournament_id, e.title, e.k, e.full_name, p.event_title, p.division, p.player_ref, p.full_name, p.institution,
         m.decision, m.decided_by, m.decided_at
  from e join p on p.s = e.s and e.s <> '' and p.k <> e.k
  left join result_identity_matches_v1 m
    on m.tournament_id = e.tournament_id and m.entrant_key = e.k and m.event_title = p.event_title and m.player_ref = p.player_ref
  where not exists (select 1 from p p2 where p2.k = e.k)
    and not exists (select 1 from e e2 where e2.k = p.k)
$$;

create or replace function public.gt_public_results_v1() returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  with ent as (
    select * from upcoming_entrants_v1()
  ), cand as (
    select * from identity_candidates_v1()
  ), full_src as (
    select x.event_title, x.event_date d, x.division, x.div_order o, x.player_ref pref, coalesce(g.go_id, x.player_ref) go_id,
           clean_name_v1(x.full_name) full_name, nullif(x.institution, '') institution, a.id athlete_id,
           x.rank_no plc, x.wins, x.losses, x.byes, x.points, x.sos
    from history_event_results_v1 x
    left join lateral (
      select h.go_id from history_event_summaries_v1 h join history_identity_registry_v1 r on r.go_id = h.go_id
      where h.event_title = x.event_title and name_key_v1(r.full_name) = name_key_v1(x.full_name) limit 1
    ) g on true
    left join gt_athletes a on a.go_id = g.go_id
  ), sum_src as (
    select h.event_title, history_date_v1(h.event_date_raw) d, btrim(h.division) division, null::int o, h.go_id pref, h.go_id,
           clean_name_v1(coalesce(a.full_name, r.full_name)) full_name, null::text institution, a.id athlete_id,
           nullif(regexp_replace(coalesce(h.placing_raw, ''), '[^0-9]', '', 'g'), '')::int plc, h.wins, h.losses, h.byes,
           null::numeric points, null::numeric sos
    from history_event_summaries_v1 h left join history_identity_registry_v1 r on r.go_id = h.go_id left join gt_athletes a on a.go_id = h.go_id
    where not exists (select 1 from history_event_results_v1 x where x.event_title = h.event_title)
  ), people as (
    select p.*, name_key_v1(p.full_name) nk from (select * from full_src union all select * from sum_src) p
  ), hits as (
    -- Entered in an upcoming event: the same name, or a near name the family or organiser confirmed.
    select p.event_title, p.pref, e.title from people p join ent e on e.k = p.nk
    union
    select c.event_title, c.player_ref, c.title from cand c where c.decision = 'same'
  ), up_by as (
    select event_title, pref, jsonb_agg(distinct title) titles from hits group by event_title, pref
  ), pend as (
    select event_title, player_ref pref, jsonb_agg(distinct title) titles from cand where decision is null group by event_title, player_ref
  ), src as (
    select s.*, u.titles upcoming, q.titles pending, s.event_title in (select event_title from full_src) complete
    from people s left join up_by u on u.event_title = s.event_title and u.pref = s.pref
    left join pend q on q.event_title = s.event_title and q.pref = s.pref
  ), divs as (
    select event_title, d, division, min(o) o, bool_or(complete) complete,
           jsonb_agg(jsonb_build_object('placing', plc, 'go_id', go_id, 'full_name', full_name, 'institution', institution, 'athlete_id', athlete_id,
             'wins', wins, 'losses', losses, 'byes', byes, 'points', points, 'sos', sos, 'upcoming', upcoming, 'pending', pending)
             order by plc nulls last, wins desc, full_name) people
    from src group by event_title, d, division
  )
  select coalesce(jsonb_agg(e order by e->>'date' desc nulls last, e->>'title'), '[]'::jsonb) from (
    select jsonb_build_object('title', event_title, 'date', d, 'complete', bool_or(complete),
             'divisions', jsonb_agg(jsonb_build_object('division', division, 'people', people) order by o nulls last, division)) e
    from divs group by event_title, d
  ) z
$$;

revoke all on function public.gt_public_results_v1() from public;
grant execute on function public.gt_public_results_v1() to anon, authenticated;

-- ---------- organiser ----------
create or replace function public.gt_staff_identity_matches_v1(p_tournament uuid) returns jsonb
language plpgsql stable security definer set search_path = public, gt_private as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return (select coalesce(jsonb_agg(jsonb_build_object(
            'entrant_key', c.entrant_key, 'entrant_name', c.entrant_name, 'event_title', c.event_title, 'division', c.division,
            'player_ref', c.player_ref, 'result_name', c.result_name, 'institution', c.institution,
            'decision', c.decision, 'decided_by', c.decided_by, 'decided_at', c.decided_at)
            order by c.decision nulls first, c.entrant_name, c.event_title), '[]'::jsonb)
          from identity_candidates_v1() c where c.tournament_id = p_tournament);
end $$;
revoke all on function public.gt_staff_identity_matches_v1(uuid) from public, anon;
grant execute on function public.gt_staff_identity_matches_v1(uuid) to authenticated;

-- p_decision: 'same' | 'different' | null (clear the answer). One answer covers every pair of the same two names
-- (the same past-results name can appear in several events).
create or replace function public.gt_staff_set_identity_match_v1(p_tournament uuid, p_entrant_key text, p_event_title text, p_player_ref text, p_decision text)
returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare v_actor uuid := gt_require_tournament_staff_v1(p_tournament); v_name text; c record; n int := 0;
begin
  if p_decision is not null and p_decision not in ('same', 'different') then return jsonb_build_object('ok', false, 'error', 'DECISION'); end if;
  select name_key_v1(x.result_name) into v_name from identity_candidates_v1() x
  where x.tournament_id = p_tournament and x.entrant_key = p_entrant_key and x.event_title = p_event_title and x.player_ref = p_player_ref;
  if v_name is null then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  for c in select * from identity_candidates_v1() x where x.tournament_id = p_tournament and x.entrant_key = p_entrant_key and name_key_v1(x.result_name) = v_name loop
    if p_decision is null then
      delete from result_identity_matches_v1 where tournament_id = p_tournament and entrant_key = p_entrant_key and event_title = c.event_title and player_ref = c.player_ref;
    else
      insert into result_identity_matches_v1 (tournament_id, entrant_key, event_title, player_ref, decision, decided_by, decided_user)
      values (p_tournament, p_entrant_key, c.event_title, c.player_ref, p_decision, 'organizer', v_actor)
      on conflict (tournament_id, entrant_key, event_title, player_ref) do update
        set decision = excluded.decision, decided_by = 'organizer', decided_user = excluded.decided_user, application_id = null, decided_at = now();
    end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'pairs', n);
end $$;
revoke all on function public.gt_staff_set_identity_match_v1(uuid, text, text, text, text) from public, anon;
grant execute on function public.gt_staff_set_identity_match_v1(uuid, text, text, text, text) to authenticated;

-- ---------- applicant (web sign-up): reference + phone, or their own account ----------
create or replace function public.gt_application_identity_matches_v1(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare v_id uuid; a gt_web_applications%rowtype;
begin
  begin v_id := application_for_v1(p->>'reference', p->>'phone', nullif(p->>'application_id', '')::uuid);
  exception when raise_exception then return jsonb_build_object('ok', false, 'error', 'LOCKED');
            when invalid_text_representation then v_id := null; end;
  if v_id is null then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  select * into a from gt_web_applications where id = v_id;
  return jsonb_build_object('ok', true, 'matches', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'event_title', c.event_title, 'division', c.division, 'player_ref', c.player_ref, 'result_name', c.result_name,
             'institution', c.institution, 'decision', c.decision, 'decided_by', c.decided_by) order by c.event_title, c.result_name), '[]'::jsonb)
    from identity_candidates_v1() c where c.tournament_id = a.tournament_id and c.entrant_key = name_key_v1(a.full_name)));
end $$;
revoke all on function public.gt_application_identity_matches_v1(jsonb) from public;
grant execute on function public.gt_application_identity_matches_v1(jsonb) to anon, authenticated;

-- p: { reference, phone | application_id, event_title, player_ref, decision: 'same' | 'different' }.
-- Covers every pair of the same two names, except pairs the organiser has already answered.
create or replace function public.gt_application_set_identity_match_v1(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare v_id uuid; a gt_web_applications%rowtype; v_key text; v_dec text := p->>'decision'; v_name text; c record; n int := 0;
begin
  begin v_id := application_for_v1(p->>'reference', p->>'phone', nullif(p->>'application_id', '')::uuid);
  exception when raise_exception then return jsonb_build_object('ok', false, 'error', 'LOCKED');
            when invalid_text_representation then v_id := null; end;
  if v_id is null then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if v_dec is null or v_dec not in ('same', 'different') then return jsonb_build_object('ok', false, 'error', 'DECISION'); end if;
  select * into a from gt_web_applications where id = v_id;
  v_key := name_key_v1(a.full_name);
  select name_key_v1(x.result_name) into v_name from identity_candidates_v1() x
  where x.tournament_id = a.tournament_id and x.entrant_key = v_key and x.event_title = p->>'event_title' and x.player_ref = p->>'player_ref';
  if v_name is null then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  for c in select * from identity_candidates_v1() x where x.tournament_id = a.tournament_id and x.entrant_key = v_key
             and name_key_v1(x.result_name) = v_name and x.decided_by is distinct from 'organizer' loop
    insert into result_identity_matches_v1 (tournament_id, entrant_key, event_title, player_ref, decision, decided_by, decided_user, application_id)
    values (a.tournament_id, v_key, c.event_title, c.player_ref, v_dec, 'applicant', auth.uid(), v_id)
    on conflict (tournament_id, entrant_key, event_title, player_ref) do update
      set decision = excluded.decision, decided_by = 'applicant', decided_user = excluded.decided_user, application_id = excluded.application_id, decided_at = now();
    n := n + 1;
  end loop;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'DECIDED'); end if;
  return jsonb_build_object('ok', true, 'pairs', n);
end $$;
revoke all on function public.gt_application_set_identity_match_v1(jsonb) from public;
grant execute on function public.gt_application_set_identity_match_v1(jsonb) to anon, authenticated;
