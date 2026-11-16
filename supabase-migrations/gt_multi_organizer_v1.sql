-- Multi-organiser foundation + referee links (requested 2026-11-04).
--
-- Roles
--   platform owner/admin  gt_staff_members (today: the site owner only) — everything, every event, manages organisers.
--   organiser member      gt_organizer_members — manages ONLY the events of their organiser, and only while it is active.
--   referee               gt_referee_access — a link + 6-digit code for ONE event: table check-in and results only.
--                         No account, no personal data, expires, can be revoked; every action is logged with the referee name.
-- Existing events are assigned to the organiser "GO TOURNAMENT", owned by the site owner, so nothing changes for her today.

-- ---------------------------------------------------------------- organisers
create table if not exists public.gt_organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  status text not null default 'active' check (status in ('active','suspended')),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.gt_organizer_members (
  organizer_id uuid not null references public.gt_organizers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner','admin')),
  active boolean not null default true,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (organizer_id, user_id)
);
create index if not exists gt_organizer_members_user_v1 on public.gt_organizer_members (user_id);
alter table public.gt_tournaments add column if not exists organizer_id uuid references public.gt_organizers(id) on delete set null;
create index if not exists gt_tournaments_organizer_v1 on public.gt_tournaments (organizer_id);
alter table public.gt_match_audit_v1 add column if not exists actor_label text;

do $$
declare v_owner uuid; v_org uuid;
begin
  select user_id into v_owner from gt_staff_members where role = 'owner' and active order by granted_at limit 1;
  select id into v_org from gt_organizers where name = 'GO TOURNAMENT' limit 1;
  if v_org is null then
    insert into gt_organizers (name, created_by) values ('GO TOURNAMENT', v_owner) returning id into v_org;
  end if;
  if v_owner is not null then
    insert into gt_organizer_members (organizer_id, user_id, role, added_by) values (v_org, v_owner, 'owner', v_owner)
    on conflict do nothing;
  end if;
  update gt_tournaments set organizer_id = v_org where organizer_id is null;
end $$;

-- ---------------------------------------------------------------- permission helpers
create or replace function public.gt_is_platform_admin_v1()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from gt_staff_members s where s.user_id = auth.uid() and s.active and s.role = any (array['owner','admin']));
$$;

create or replace function public.gt_can_manage_tournament_v1(p_tournament uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    gt_is_platform_admin_v1()
    or exists (select 1 from gt_tournaments t
               join gt_organizers o on o.id = t.organizer_id and o.status = 'active'
               join gt_organizer_members m on m.organizer_id = o.id and m.user_id = auth.uid() and m.active
               where t.id = p_tournament));
$$;

create or replace function public.gt_require_tournament_staff_v1(p_tournament uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if p_tournament is null or not gt_can_manage_tournament_v1(p_tournament) then
    raise exception 'STAFF_ONLY' using errcode = '42501';
  end if;
  return auth.uid();
end $$;

create or replace function public.gt_require_platform_admin_v1()
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if not gt_is_platform_admin_v1() then raise exception 'PLATFORM_ADMIN_ONLY' using errcode = '42501'; end if;
  return auth.uid();
end $$;

-- What the signed-in user may do (drives the organiser screens).
create or replace function public.gt_my_access_v1()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'platform_role', (select s.role from gt_staff_members s where s.user_id = auth.uid() and s.active and s.role = any (array['owner','admin']) limit 1),
    'organizers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'status', o.status, 'role', m.role) order by o.name)
                            from gt_organizer_members m join gt_organizers o on o.id = m.organizer_id
                            where m.user_id = auth.uid() and m.active), '[]'::jsonb));
$$;

-- ---------------------------------------------------------------- shared cores (used by staff and referees)
create or replace function gt_private.record_result_core(p_match uuid, p_result text, p_margin text, p_actor uuid, p_actor_label text)
returns void language plpgsql security definer set search_path = public as $$
declare m gt_matches%rowtype; v_winner uuid; v_margin text;
begin
  if p_result is null or p_result not in ('black_win','white_win','black_win_forfeit','white_win_forfeit','draw','double_loss','double_forfeit') then
    raise exception 'INVALID_RESULT';
  end if;
  select * into m from gt_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.state = 'void' then raise exception 'MATCH_VOID'; end if;
  if exists (select 1 from gt_matches x where x.division_id = m.division_id and x.pool_label is not distinct from m.pool_label
             and x.round_number > m.round_number and x.state <> 'void') then
    raise exception 'LATER_ROUND_ALREADY_PUBLISHED';
  end if;
  v_winner := case when p_result in ('black_win','black_win_forfeit') then m.black_athlete_id
                   when p_result in ('white_win','white_win_forfeit') then m.white_athlete_id end;
  v_margin := case when p_result in ('black_win','white_win') then nullif(btrim(p_margin), '') end;
  update gt_matches set result_code = p_result, winner_athlete_id = v_winner, result_margin = v_margin,
         state = 'verified', verified_at = now()
   where id = p_match;
  insert into gt_match_audit_v1 (match_id, division_id, action, before, after, actor, actor_label)
  values (p_match, m.division_id, case when m.state = 'verified' then 'correct_result' else 'record_result' end,
          jsonb_build_object('result', m.result_code, 'margin', m.result_margin, 'state', m.state),
          jsonb_build_object('result', p_result, 'margin', v_margin), p_actor, p_actor_label);
end $$;

create or replace function gt_private.checkin_core(p_match uuid, p_side text, p_present boolean, p_actor uuid, p_actor_label text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare m gt_matches%rowtype; v_at timestamptz := case when p_present then now() end;
begin
  if p_side not in ('black','white') then raise exception 'INVALID_SIDE'; end if;
  select * into m from gt_matches where id = p_match for update;
  if not found or m.state = 'void' then raise exception 'MATCH_NOT_FOUND'; end if;
  if p_side = 'black' then update gt_matches set black_checkin_at = v_at where id = p_match;
  else update gt_matches set white_checkin_at = v_at where id = p_match; end if;
  insert into gt_match_audit_v1 (match_id, division_id, action, after, actor, actor_label)
  values (p_match, m.division_id, 'checkin', jsonb_build_object('side', p_side, 'present', p_present), p_actor, p_actor_label);
  return v_at;
end $$;
revoke all on function gt_private.record_result_core(uuid, text, text, uuid, text) from public, anon, authenticated;
revoke all on function gt_private.checkin_core(uuid, text, boolean, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- staff functions: now checked per event
create or replace function public.gt_staff_import_entrants_v1(p_tournament uuid, p_rows jsonb)
returns table (source_row integer, division_id uuid, athlete_id uuid, go_id text, outcome text)
language plpgsql security definer set search_path = public, gt_private as $$
#variable_conflict use_column
declare
  v_actor uuid := gt_require_tournament_staff_v1(p_tournament);
  r jsonb; e record; v_div uuid; v_name text; v_school text; v_ath gt_athletes%rowtype; v_new boolean;
begin
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    source_row := (r->>'source_row')::int; v_div := (r->>'division_id')::uuid; division_id := v_div;
    athlete_id := null; go_id := null;
    select pe.* into e from gt_public_entrants pe where pe.tournament_id = p_tournament and pe.source_row = (r->>'source_row')::int;
    if not found then outcome := 'entrant_not_found'; return next; continue; end if;
    if not exists (select 1 from gt_divisions d where d.id = v_div and d.tournament_id = p_tournament) then
      outcome := 'division_not_in_tournament'; return next; continue;
    end if;
    v_name := regexp_replace(btrim(e.full_name), '\s+', ' ', 'g');
    v_school := nullif(btrim(coalesce(e.institution, '')), '');
    begin
      perform pg_advisory_xact_lock(hashtextextended(lower(v_name), 417));
      select a.* into v_ath from gt_athletes a
       where lower(regexp_replace(btrim(a.full_name), '\s+', ' ', 'g')) = lower(v_name)
         and (a.school_name is null or v_school is null or lower(btrim(a.school_name)) = lower(v_school))
       order by a.created_at limit 1;
      v_new := not found;
      if v_new then
        insert into gt_athletes (go_id, full_name, school_name)
        values ('GO' || nextval('gt_private.athlete_number_v4')::text, v_name, v_school)
        returning * into v_ath;
      end if;
      insert into gt_registrations (tournament_id, division_id, athlete_id, registration_status, payment_status, display_institution)
      values (p_tournament, v_div, v_ath.id, 'confirmed',
              case when e.payment_status = 'ชำระเงินแล้ว' then 'verified' else 'pending' end, v_school)
      on conflict (tournament_id, division_id, athlete_id) do update
        set registration_status = case when gt_registrations.registration_status = 'withdrawn' then 'withdrawn' else 'confirmed' end,
            display_institution = coalesce(excluded.display_institution, gt_registrations.display_institution),
            payment_status = case when gt_registrations.payment_status in ('verified','waived') then gt_registrations.payment_status else excluded.payment_status end;
      athlete_id := v_ath.id; go_id := v_ath.go_id;
      outcome := case when v_new then 'created' else 'linked_existing' end;
    exception when others then
      outcome := case when sqlerrm like '%DUPLICATE_REVIEW_REQUIRED%' then 'needs_review' else 'error: ' || left(sqlerrm, 120) end;
    end;
    return next;
  end loop;
  insert into gt_match_audit_v1 (action, after, actor) values ('import_entrants', jsonb_build_object('tournament', p_tournament, 'rows', jsonb_array_length(coalesce(p_rows,'[]'::jsonb))), v_actor);
end $$;

create or replace function public.gt_staff_set_pools_v1(p_division uuid, p_assignments jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1((select d.tournament_id from gt_divisions d where d.id = p_division)); n integer;
begin
  if exists (select 1 from gt_matches m where m.division_id = p_division and m.state <> 'void')
     or exists (select 1 from gt_byes b where b.division_id = p_division) then
    raise exception 'POOLS_LOCKED_AFTER_PAIRING' using errcode = '23514';
  end if;
  update gt_registrations r set pool_label = nullif(a->>'pool', '')
    from jsonb_array_elements(p_assignments) a
   where r.division_id = p_division and r.athlete_id = (a->>'athlete_id')::uuid and r.registration_status = 'confirmed';
  get diagnostics n = row_count;
  insert into gt_match_audit_v1 (division_id, action, after, actor) values (p_division, 'set_pools', p_assignments, v_actor);
  return n;
end $$;

create or replace function public.gt_staff_publish_round_v1(p_division uuid, p_pool text, p_round integer, p_tables jsonb, p_bye uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_tournament uuid := (select d.tournament_id from gt_divisions d where d.id = p_division);
  v_actor uuid := gt_require_tournament_staff_v1(v_tournament);
  v_last integer; v_expected uuid[]; v_given uuid[]; t jsonb; n integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_division::text || '/' || coalesce(p_pool,''), 7));
  select greatest(coalesce(max(m.round_number), 0), coalesce((select max(b.round_number) from gt_byes b where b.division_id = p_division and b.pool_label is not distinct from p_pool), 0))
    into v_last from gt_matches m where m.division_id = p_division and m.pool_label is not distinct from p_pool and m.state <> 'void';
  if p_round <> v_last + 1 then raise exception 'ROUND_OUT_OF_SEQUENCE: expected %', v_last + 1; end if;
  if exists (select 1 from gt_matches m where m.division_id = p_division and m.pool_label is not distinct from p_pool
             and m.state not in ('verified','void')) then
    raise exception 'PREVIOUS_ROUND_NOT_FINISHED';
  end if;
  select array_agg(r.athlete_id order by r.athlete_id) into v_expected from gt_registrations r
   where r.division_id = p_division and r.registration_status = 'confirmed' and r.pool_label is not distinct from p_pool;
  select array_agg(x order by x) into v_given from (
    select (t2->>'black')::uuid x from jsonb_array_elements(p_tables) t2
    union all select (t2->>'white')::uuid from jsonb_array_elements(p_tables) t2
    union all select p_bye where p_bye is not null) s;
  if v_expected is null or v_given is distinct from v_expected then
    raise exception 'PAIRING_MUST_COVER_EACH_PLAYER_ONCE';
  end if;
  for t in select * from jsonb_array_elements(p_tables) loop
    insert into gt_matches (tournament_id, division_id, pool_label, round_number, board_number, black_athlete_id, white_athlete_id, state)
    values (v_tournament, p_division, p_pool, p_round, (t->>'board')::int, (t->>'black')::uuid, (t->>'white')::uuid, 'pending');
    n := n + 1;
  end loop;
  if p_bye is not null then
    insert into gt_byes (tournament_id, division_id, pool_label, round_number, athlete_id) values (v_tournament, p_division, p_pool, p_round, p_bye);
  end if;
  insert into gt_match_audit_v1 (division_id, action, after, actor)
  values (p_division, 'publish_round', jsonb_build_object('pool', p_pool, 'round', p_round, 'tables', p_tables, 'bye', p_bye), v_actor);
  return n;
end $$;

create or replace function public.gt_staff_cancel_round_v1(p_division uuid, p_pool text, p_round integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1((select d.tournament_id from gt_divisions d where d.id = p_division)); v_last integer; n integer;
begin
  select max(m.round_number) into v_last from gt_matches m where m.division_id = p_division and m.pool_label is not distinct from p_pool and m.state <> 'void';
  if v_last is distinct from p_round then raise exception 'ONLY_LATEST_ROUND_CAN_BE_CANCELLED'; end if;
  if exists (select 1 from gt_matches m where m.division_id = p_division and m.pool_label is not distinct from p_pool
             and m.round_number = p_round and m.state = 'verified') then
    raise exception 'ROUND_HAS_RESULTS';
  end if;
  delete from gt_matches m where m.division_id = p_division and m.pool_label is not distinct from p_pool and m.round_number = p_round;
  get diagnostics n = row_count;
  delete from gt_byes b where b.division_id = p_division and b.pool_label is not distinct from p_pool and b.round_number = p_round;
  insert into gt_match_audit_v1 (division_id, action, after, actor) values (p_division, 'cancel_round', jsonb_build_object('pool', p_pool, 'round', p_round), v_actor);
  return n;
end $$;

create or replace function public.gt_staff_record_result_v1(p_match uuid, p_result text, p_margin text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1((select m.tournament_id from gt_matches m where m.id = p_match));
begin
  perform gt_private.record_result_core(p_match, p_result, p_margin, v_actor, null);
end $$;

create or replace function public.gt_staff_checkin_v1(p_match uuid, p_side text, p_present boolean)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1((select m.tournament_id from gt_matches m where m.id = p_match));
begin
  return gt_private.checkin_core(p_match, p_side, p_present, v_actor, null);
end $$;

create or replace function public.gt_staff_set_withdrawn_v1(p_division uuid, p_athlete uuid, p_withdrawn boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := gt_require_tournament_staff_v1((select d.tournament_id from gt_divisions d where d.id = p_division));
  v_status text := case when p_withdrawn then 'withdrawn' else 'confirmed' end; n integer;
begin
  update gt_registrations set registration_status = v_status
   where division_id = p_division and athlete_id = p_athlete and registration_status in ('confirmed','withdrawn');
  get diagnostics n = row_count;
  if n = 0 then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  insert into gt_match_audit_v1 (division_id, action, after, actor)
  values (p_division, case when p_withdrawn then 'withdraw' else 'reinstate' end, jsonb_build_object('athlete', p_athlete), v_actor);
  return v_status;
end $$;

-- Standings and board: unpublished events are visible to that event's organisers (not every staff member).
create or replace function public.gt_division_board_v1(p_division uuid)
returns table (
  kind text, match_id uuid, pool_label text, round_number integer, board_number integer,
  black_id uuid, black_name text, black_institution text, white_id uuid, white_name text, white_institution text,
  winner_id uuid, result_code text, result_margin text, state text
)
language sql stable security definer set search_path = public as $$
with div as (
  select d.id, d.tournament_id from gt_divisions d join gt_tournaments t on t.id = d.tournament_id
  where d.id = p_division and (t.published or gt_can_manage_tournament_v1(t.id))
),
who as (
  select r.athlete_id, a.full_name, coalesce(nullif(r.display_institution, ''), a.school_name) as inst
  from gt_registrations r join div on r.division_id = div.id join gt_athletes a on a.id = r.athlete_id
)
select 'match', m.id, m.pool_label, m.round_number, m.board_number,
       m.black_athlete_id, b.full_name, b.inst, m.white_athlete_id, w.full_name, w.inst,
       m.winner_athlete_id, m.result_code, m.result_margin, m.state
from gt_matches m join div on m.division_id = div.id
left join who b on b.athlete_id = m.black_athlete_id left join who w on w.athlete_id = m.white_athlete_id
where m.state <> 'void'
union all
select 'bye', null, y.pool_label, y.round_number, null, y.athlete_id, b.full_name, b.inst, null, null, null, null, null, null, null
from gt_byes y join div on y.division_id = div.id left join who b on b.athlete_id = y.athlete_id
order by 3 nulls first, 4, 1 desc, 5;
$$;

create or replace function public.gt_division_standings_v3(p_division uuid, p_pool text default null)
returns table (
  pool_label text, pos integer, athlete_id uuid, display_name text, institution text, current_rank text,
  wins integer, losses integer, draws integer, byes integer, forfeit_wins integer,
  score numeric, sos numeric, sosos numeric, withdrawn boolean
)
language sql stable security definer set search_path = public as $$
with div as (
  select d.id, d.tournament_id from gt_divisions d join gt_tournaments t on t.id = d.tournament_id
  where d.id = p_division and (t.published or gt_can_manage_tournament_v1(t.id))
),
entrants as (
  select r.athlete_id as aid, r.pool_label as pl, r.registration_status = 'withdrawn' as wd, r.display_institution as inst
  from gt_registrations r join div on r.division_id = div.id and r.tournament_id = div.tournament_id
  where r.registration_status in ('confirmed','withdrawn') and (p_pool is null or r.pool_label = p_pool)
),
games as (
  select m.black_athlete_id as p, m.white_athlete_id as o, m.result_code as rc, m.winner_athlete_id as win
  from gt_matches m join div on m.division_id = div.id where m.state = 'verified'
  union all
  select m.white_athlete_id, m.black_athlete_id, m.result_code, m.winner_athlete_id
  from gt_matches m join div on m.division_id = div.id where m.state = 'verified'
),
scored as (
  select p, o,
    case when rc = 'draw' then 0.5 when win = p then 1 else 0 end::numeric as pts,
    coalesce(rc, '') not in ('black_win_forfeit','white_win_forfeit','double_forfeit') as played,
    (win = p) as won, (rc = 'draw') as drew, (rc in ('black_win_forfeit','white_win_forfeit') and win = p) as fwin
  from games
),
base as (
  select e.aid, e.pl, e.wd, e.inst,
    coalesce((select count(*) from scored g where g.p = e.aid and g.won), 0)::int as w,
    coalesce((select count(*) from scored g where g.p = e.aid and not coalesce(g.won, false) and not coalesce(g.drew, false)), 0)::int as l,
    coalesce((select count(*) from scored g where g.p = e.aid and g.drew), 0)::int as dr,
    coalesce((select count(*) from scored g where g.p = e.aid and g.fwin), 0)::int as fw,
    (select count(*) from gt_byes b join div on b.division_id = div.id where b.athlete_id = e.aid)::int as b,
    coalesce((select sum(g.pts) from scored g where g.p = e.aid), 0) as gp
  from entrants e
),
s0 as (select base.*, gp + b as sc from base),
s1 as (select s0.*, coalesce((select sum(o.sc) from scored g join s0 o on o.aid = g.o where g.p = s0.aid and g.played), 0) as so from s0),
s2 as (select s1.*, coalesce((select sum(o.so) from scored g join s1 o on o.aid = g.o where g.p = s1.aid and g.played), 0) as soso from s1),
ranked as (
  select s2.*, case when not s2.wd then (rank() over (partition by s2.pl, s2.wd order by s2.sc desc, s2.so desc, s2.soso desc))::int end as rk
  from s2
)
select r.pl, r.rk, a.id, a.full_name, coalesce(nullif(r.inst, ''), a.school_name),
       a.current_rank, r.w, r.l, r.dr, r.b, r.fw, r.sc, r.so, r.soso, r.wd
from ranked r join gt_athletes a on a.id = r.aid
order by r.pl nulls first, r.wd, r.rk nulls last, a.full_name;
$$;

-- ---------------------------------------------------------------- organiser read access (their own events only)
alter table public.gt_organizers enable row level security;
alter table public.gt_organizer_members enable row level security;
create policy gt_organizers_read_v1 on public.gt_organizers for select to authenticated
  using (gt_is_platform_admin_v1() or exists (select 1 from gt_organizer_members m where m.organizer_id = id and m.user_id = (select auth.uid()) and m.active));
create policy gt_organizer_members_read_v1 on public.gt_organizer_members for select to authenticated
  using (gt_is_platform_admin_v1() or user_id = (select auth.uid()));
grant select on public.gt_organizers, public.gt_organizer_members to authenticated;
revoke all on public.gt_organizers, public.gt_organizer_members from anon;

create policy gt_tournaments_organizer_read_v1 on public.gt_tournaments for select to authenticated using (gt_can_manage_tournament_v1(id));
create policy gt_divisions_organizer_read_v1 on public.gt_divisions for select to authenticated using (gt_can_manage_tournament_v1(tournament_id));
create policy gt_registrations_organizer_read_v1 on public.gt_registrations for select to authenticated using (gt_can_manage_tournament_v1(tournament_id));
create policy gt_matches_organizer_read_v1 on public.gt_matches for select to authenticated using (gt_can_manage_tournament_v1(tournament_id));
create policy gt_byes_organizer_read_v1 on public.gt_byes for select to authenticated using (gt_can_manage_tournament_v1(tournament_id));
create policy gt_public_entrants_organizer_read_v1 on public.gt_public_entrants for select to authenticated using (gt_can_manage_tournament_v1(tournament_id));
-- Through a definer function: a policy on gt_athletes that reads gt_registrations (whose own policy reads gt_athletes) would recurse.
create or replace function public.gt_can_manage_athlete_v1(p_athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from gt_registrations r where r.athlete_id = p_athlete and gt_can_manage_tournament_v1(r.tournament_id));
$$;
grant execute on function public.gt_can_manage_athlete_v1(uuid) to authenticated;
create policy gt_athletes_organizer_read_v1 on public.gt_athletes for select to authenticated using (gt_can_manage_athlete_v1(id));

-- ---------------------------------------------------------------- platform administration (site owner)
create or replace function public.gt_platform_list_organizers_v1()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform gt_require_platform_admin_v1();
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'name', o.name, 'status', o.status, 'note', o.note, 'created_at', o.created_at,
           'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'role', m.role, 'active', m.active) order by u.email)
                                from gt_organizer_members m join auth.users u on u.id = m.user_id where m.organizer_id = o.id), '[]'::jsonb),
           'tournaments', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'published', t.published) order by t.created_at desc)
                                    from gt_tournaments t where t.organizer_id = o.id), '[]'::jsonb)
         ) order by o.created_at), '[]'::jsonb) into v
  from gt_organizers o;
  return v;
end $$;

create or replace function public.gt_platform_save_organizer_v1(p_id uuid, p_name text, p_status text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_platform_admin_v1(); v_id uuid;
begin
  if p_status not in ('active','suspended') then raise exception 'INVALID_STATUS'; end if;
  if p_id is null then
    insert into gt_organizers (name, status, note, created_by) values (btrim(p_name), p_status, nullif(btrim(p_note), ''), v_actor) returning id into v_id;
  else
    update gt_organizers set name = btrim(p_name), status = p_status, note = nullif(btrim(p_note), '') where id = p_id returning id into v_id;
    if v_id is null then raise exception 'ORGANIZER_NOT_FOUND'; end if;
  end if;
  insert into gt_match_audit_v1 (action, after, actor) values ('save_organizer', jsonb_build_object('id', v_id, 'name', p_name, 'status', p_status), v_actor);
  return v_id;
end $$;

-- Adds an existing account (by e-mail) to an organiser. New accounts are created by /api/organizer/accounts first.
create or replace function public.gt_platform_set_organizer_member_v1(p_organizer uuid, p_email text, p_role text, p_active boolean)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_actor uuid := gt_require_platform_admin_v1(); v_user uuid;
begin
  if p_role not in ('owner','admin') then raise exception 'INVALID_ROLE'; end if;
  select u.id into v_user from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1;
  if v_user is null then raise exception 'USER_NOT_FOUND'; end if;
  insert into gt_organizer_members (organizer_id, user_id, role, active, added_by) values (p_organizer, v_user, p_role, p_active, v_actor)
  on conflict (organizer_id, user_id) do update set role = excluded.role, active = excluded.active;
  insert into gt_match_audit_v1 (action, after, actor) values ('set_organizer_member', jsonb_build_object('organizer', p_organizer, 'user', v_user, 'role', p_role, 'active', p_active), v_actor);
  return v_user;
end $$;

create or replace function public.gt_platform_assign_tournament_v1(p_tournament uuid, p_organizer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_platform_admin_v1();
begin
  update gt_tournaments set organizer_id = p_organizer where id = p_tournament;
  if not found then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  insert into gt_match_audit_v1 (action, after, actor) values ('assign_tournament', jsonb_build_object('tournament', p_tournament, 'organizer', p_organizer), v_actor);
end $$;

-- ---------------------------------------------------------------- referee links (link token + 6-digit code, one event)
create table if not exists public.gt_referee_access (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.gt_tournaments(id) on delete cascade,
  referee_name text not null check (length(btrim(referee_name)) between 1 and 80),
  token_hash text not null unique,
  code_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  failed_attempts integer not null default 0,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.gt_referee_access enable row level security;  -- no policies: only reachable through the functions below
revoke all on public.gt_referee_access from anon, authenticated;

create or replace function public.gt_staff_create_referee_v1(p_tournament uuid, p_name text, p_expires_at timestamptz)
returns table (id uuid, token text, code text, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare v_actor uuid := gt_require_tournament_staff_v1(p_tournament); v_token text; v_code text; v_id uuid; v_exp timestamptz;
begin
  v_exp := least(coalesce(p_expires_at, now() + interval '2 days'), now() + interval '30 days');
  if v_exp <= now() then raise exception 'EXPIRY_IN_PAST'; end if;
  v_token := replace(replace(rtrim(encode(gen_random_bytes(18), 'base64'), '='), '+', '-'), '/', '_');
  v_code := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into gt_referee_access (tournament_id, referee_name, token_hash, code_hash, expires_at, created_by)
  values (p_tournament, btrim(p_name), encode(digest(v_token, 'sha256'), 'hex'), crypt(v_code, gen_salt('bf', 8)), v_exp, v_actor)
  returning gt_referee_access.id into v_id;
  insert into gt_match_audit_v1 (action, after, actor) values ('create_referee', jsonb_build_object('tournament', p_tournament, 'referee', v_id, 'name', p_name), v_actor);
  id := v_id; token := v_token; code := v_code; expires_at := v_exp;
  return next;
end $$;

create or replace function public.gt_staff_list_referees_v1(p_tournament uuid)
returns table (id uuid, referee_name text, expires_at timestamptz, revoked_at timestamptz, last_used_at timestamptz, created_at timestamptz, locked boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return query select r.id, r.referee_name, r.expires_at, r.revoked_at, r.last_used_at, r.created_at, r.failed_attempts >= 8
               from gt_referee_access r where r.tournament_id = p_tournament order by r.created_at desc;
end $$;

create or replace function public.gt_staff_revoke_referee_v1(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1((select r.tournament_id from gt_referee_access r where r.id = p_id));
begin
  update gt_referee_access set revoked_at = coalesce(revoked_at, now()) where id = p_id;
  insert into gt_match_audit_v1 (action, after, actor) values ('revoke_referee', jsonb_build_object('referee', p_id), v_actor);
end $$;

-- Checks a referee link + code. Returns the access row, or null with an error code. A wrong code is counted
-- (8 wrong codes lock the link) — the count is written even though the caller reports an error, because it returns, not raises.
create or replace function gt_private.referee_check(p_token text, p_code text, out acc gt_referee_access, out err text)
language plpgsql security definer set search_path = public, extensions as $$
begin
  select * into acc from gt_referee_access where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then acc := null; err := 'LINK_INVALID'; return; end if;
  if acc.revoked_at is not null or acc.expires_at <= now() then acc := null; err := 'LINK_EXPIRED'; return; end if;
  if acc.failed_attempts >= 8 then acc := null; err := 'LINK_LOCKED'; return; end if;
  if coalesce(p_code, '') !~ '^[0-9]{6}$' or crypt(p_code, acc.code_hash) <> acc.code_hash then
    update gt_referee_access set failed_attempts = failed_attempts + 1 where id = acc.id;
    acc := null; err := 'WRONG_CODE'; return;
  end if;
  update gt_referee_access set failed_attempts = 0, last_used_at = now() where id = acc.id;
  err := null;
end $$;
revoke all on function gt_private.referee_check(text, text) from public, anon, authenticated;

create or replace function public.gt_referee_open_v1(p_token text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  return jsonb_build_object('ok', true, 'referee_name', (c.acc).referee_name, 'expires_at', (c.acc).expires_at,
    'tournament', (select jsonb_build_object('id', t.id, 'title', t.title, 'event_date', t.event_date) from gt_tournaments t where t.id = (c.acc).tournament_id),
    'divisions', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name,
                    'pending', (select count(*) from gt_matches m where m.division_id = d.id and m.state = 'pending'),
                    'last_round', (select max(m.round_number) from gt_matches m where m.division_id = d.id and m.state <> 'void')))
                  from gt_divisions d where d.tournament_id = (c.acc).tournament_id), '[]'::jsonb));
end $$;

-- Latest round of each pool of one division: names, institution, check-in, result. No personal data.
create or replace function public.gt_referee_board_v1(p_token text, p_code text, p_division uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_divisions d where d.id = p_division and d.tournament_id = (c.acc).tournament_id) then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  return jsonb_build_object('ok', true, 'tables', coalesce((
    with latest as (
      select coalesce(m.pool_label, '') pl, max(m.round_number) r from gt_matches m where m.division_id = p_division and m.state <> 'void' group by 1
    ), who as (
      select r.athlete_id, a.full_name, coalesce(nullif(r.display_institution, ''), a.school_name) inst
      from gt_registrations r join gt_athletes a on a.id = r.athlete_id where r.division_id = p_division
    )
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'pool', m.pool_label, 'round', m.round_number, 'board', m.board_number, 'state', m.state,
      'result_code', m.result_code, 'result_margin', m.result_margin, 'winner', m.winner_athlete_id,
      'black', jsonb_build_object('id', m.black_athlete_id, 'name', b.full_name, 'institution', b.inst, 'checked_in', m.black_checkin_at is not null),
      'white', jsonb_build_object('id', m.white_athlete_id, 'name', w.full_name, 'institution', w.inst, 'checked_in', m.white_checkin_at is not null)
    ) order by m.pool_label nulls first, m.board_number)
    from gt_matches m join latest l on l.pl = coalesce(m.pool_label, '') and l.r = m.round_number
    left join who b on b.athlete_id = m.black_athlete_id left join who w on w.athlete_id = m.white_athlete_id
    where m.division_id = p_division and m.state <> 'void'), '[]'::jsonb));
end $$;

create or replace function public.gt_referee_checkin_v1(p_token text, p_code text, p_match uuid, p_side text, p_present boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_matches m where m.id = p_match and m.tournament_id = (c.acc).tournament_id) then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  perform gt_private.checkin_core(p_match, p_side, p_present, null, 'กรรมการ: ' || (c.acc).referee_name);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.gt_referee_record_result_v1(p_token text, p_code text, p_match uuid, p_result text, p_margin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_matches m where m.id = p_match and m.tournament_id = (c.acc).tournament_id) then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  perform gt_private.record_result_core(p_match, p_result, p_margin, null, 'กรรมการ: ' || (c.acc).referee_name);
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- permissions
revoke all on function public.gt_require_tournament_staff_v1(uuid) from public, anon;
revoke all on function public.gt_require_platform_admin_v1() from public, anon;
revoke all on function public.gt_platform_list_organizers_v1() from public, anon;
revoke all on function public.gt_platform_save_organizer_v1(uuid, text, text, text) from public, anon;
revoke all on function public.gt_platform_set_organizer_member_v1(uuid, text, text, boolean) from public, anon;
revoke all on function public.gt_platform_assign_tournament_v1(uuid, uuid) from public, anon;
revoke all on function public.gt_staff_create_referee_v1(uuid, text, timestamptz) from public, anon;
revoke all on function public.gt_staff_list_referees_v1(uuid) from public, anon;
revoke all on function public.gt_staff_revoke_referee_v1(uuid) from public, anon;
revoke all on function public.gt_my_access_v1() from public, anon;
grant execute on function public.gt_is_platform_admin_v1() to anon, authenticated;
grant execute on function public.gt_can_manage_tournament_v1(uuid) to anon, authenticated;
grant execute on function public.gt_require_tournament_staff_v1(uuid) to authenticated;
grant execute on function public.gt_require_platform_admin_v1() to authenticated;
grant execute on function public.gt_my_access_v1() to authenticated;
grant execute on function public.gt_platform_list_organizers_v1() to authenticated;
grant execute on function public.gt_platform_save_organizer_v1(uuid, text, text, text) to authenticated;
grant execute on function public.gt_platform_set_organizer_member_v1(uuid, text, text, boolean) to authenticated;
grant execute on function public.gt_platform_assign_tournament_v1(uuid, uuid) to authenticated;
grant execute on function public.gt_staff_create_referee_v1(uuid, text, timestamptz) to authenticated;
grant execute on function public.gt_staff_list_referees_v1(uuid) to authenticated;
grant execute on function public.gt_staff_revoke_referee_v1(uuid) to authenticated;
grant execute on function public.gt_referee_open_v1(text, text) to anon, authenticated;
grant execute on function public.gt_referee_board_v1(text, text, uuid) to anon, authenticated;
grant execute on function public.gt_referee_checkin_v1(text, text, uuid, text, boolean) to anon, authenticated;
grant execute on function public.gt_referee_record_result_v1(text, text, uuid, text, text) to anon, authenticated;
