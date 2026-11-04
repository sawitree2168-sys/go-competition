-- Competition day v3 (requested 2026-11-04):
--  * Result types used by referees: normal win, win by resignation, win because the opponent did not come
--    (late > 15 min), draw, both lose, both absent.
--  * Table check-in per player per round.
--  * Withdrawal: a player who still does not come is removed from later rounds; earlier games stay.
--  * Public pairings, results and standings show real name + registered institution (published events).
--
-- Scoring and tie-break rules (gt_division_standings_v3):
--   win / win by resignation ........ 1 / 0      game played  -> both count each other in SOS
--   draw ............................ 0.5 / 0.5  game played
--   both lose (แพ้คู่) ................ 0 / 0      game played
--   win because opponent absent ..... 1 / 0      NOT played   -> neither counts the other in SOS (same as a bye)
--   both absent ..................... 0 / 0      NOT played
--   bye ............................. 1          NOT played
--   SOS = sum of current scores of opponents actually played; SOSOS = sum of those opponents' SOS.
--   A withdrawn player keeps the points earned before leaving (so opponents' SOS is unchanged),
--   is listed without a place, and is not paired again.

-- ---------------------------------------------------------------- result codes
alter table public.gt_matches drop constraint if exists gt_matches_result_code_values_v1;
alter table public.gt_matches add constraint gt_matches_result_code_values_v2 check (
  result_code is null or result_code = any (array['black_win','white_win','black_win_forfeit','white_win_forfeit','draw','double_loss','double_forfeit']));

alter table public.gt_matches drop constraint if exists gt_matches_verified_outcome_v3;
alter table public.gt_matches add constraint gt_matches_verified_outcome_v4 check (
  state <> 'verified' or (verified_at is not null and (
       (winner_athlete_id = black_athlete_id and coalesce(result_code, 'black_win') = any (array['black_win','black_win_forfeit']))
    or (winner_athlete_id = white_athlete_id and coalesce(result_code, 'white_win') = any (array['white_win','white_win_forfeit']))
    or (winner_athlete_id is null and result_code = any (array['draw','double_loss','double_forfeit'])))));

-- ---------------------------------------------------------------- check-in, withdrawal, institution
alter table public.gt_matches add column if not exists black_checkin_at timestamptz;
alter table public.gt_matches add column if not exists white_checkin_at timestamptz;

alter table public.gt_registrations drop constraint if exists gt_registrations_registration_status_check;
alter table public.gt_registrations add constraint gt_registrations_registration_status_check
  check (registration_status = any (array['pending','confirmed','cancelled','withdrawn']));
alter table public.gt_registrations add column if not exists display_institution text;

-- Fill the institution of registrations already imported from the Google Form.
update public.gt_registrations r set display_institution = nullif(btrim(a.school_name), '')
  from public.gt_athletes a where a.id = r.athlete_id and r.display_institution is null;

-- ---------------------------------------------------------------- import: keep the institution written on this event's form
create or replace function public.gt_staff_import_entrants_v1(p_tournament uuid, p_rows jsonb)
returns table (source_row integer, division_id uuid, athlete_id uuid, go_id text, outcome text)
language plpgsql security definer set search_path = public, gt_private as $$
#variable_conflict use_column
declare
  v_actor uuid := gt_require_competition_staff_v1();
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

-- ---------------------------------------------------------------- results (all referee result types)
-- p_result: black_win | white_win | black_win_forfeit | white_win_forfeit | draw | double_loss | double_forfeit
-- p_margin: 'R' (resignation), 'T' (time), a number like 6.5, or null. Ignored for forfeits, draws and double results.
create or replace function public.gt_staff_record_result_v1(p_match uuid, p_result text, p_margin text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_competition_staff_v1(); m gt_matches%rowtype; v_winner uuid; v_margin text;
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
  insert into gt_match_audit_v1 (match_id, division_id, action, before, after, actor)
  values (p_match, m.division_id, case when m.state = 'verified' then 'correct_result' else 'record_result' end,
          jsonb_build_object('result', m.result_code, 'margin', m.result_margin, 'state', m.state),
          jsonb_build_object('result', p_result, 'margin', v_margin), v_actor);
end $$;

-- ---------------------------------------------------------------- check-in at the table
-- p_side: black | white; p_present false clears the check-in.
create or replace function public.gt_staff_checkin_v1(p_match uuid, p_side text, p_present boolean)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_competition_staff_v1(); m gt_matches%rowtype; v_at timestamptz := case when p_present then now() end;
begin
  if p_side not in ('black','white') then raise exception 'INVALID_SIDE'; end if;
  select * into m from gt_matches where id = p_match for update;
  if not found or m.state = 'void' then raise exception 'MATCH_NOT_FOUND'; end if;
  if p_side = 'black' then update gt_matches set black_checkin_at = v_at where id = p_match;
  else update gt_matches set white_checkin_at = v_at where id = p_match; end if;
  insert into gt_match_audit_v1 (match_id, division_id, action, after, actor)
  values (p_match, m.division_id, 'checkin', jsonb_build_object('side', p_side, 'present', p_present), v_actor);
  return v_at;
end $$;

-- ---------------------------------------------------------------- withdraw / reinstate
create or replace function public.gt_staff_set_withdrawn_v1(p_division uuid, p_athlete uuid, p_withdrawn boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_competition_staff_v1(); v_status text := case when p_withdrawn then 'withdrawn' else 'confirmed' end; n integer;
begin
  update gt_registrations set registration_status = v_status
   where division_id = p_division and athlete_id = p_athlete and registration_status in ('confirmed','withdrawn');
  get diagnostics n = row_count;
  if n = 0 then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  insert into gt_match_audit_v1 (division_id, action, after, actor)
  values (p_division, case when p_withdrawn then 'withdraw' else 'reinstate' end, jsonb_build_object('athlete', p_athlete), v_actor);
  return v_status;
end $$;

-- ---------------------------------------------------------------- public pairings board (names + institution)
create or replace function public.gt_division_board_v1(p_division uuid)
returns table (
  kind text, match_id uuid, pool_label text, round_number integer, board_number integer,
  black_id uuid, black_name text, black_institution text, white_id uuid, white_name text, white_institution text,
  winner_id uuid, result_code text, result_margin text, state text
)
language sql stable security definer set search_path = public as $$
with div as (
  select d.id, d.tournament_id from gt_divisions d join gt_tournaments t on t.id = d.tournament_id
  where d.id = p_division and (t.published or exists (select 1 from gt_staff_members s where s.user_id = auth.uid() and s.active
                                                       and s.role = any (array['owner','admin','reviewer'])))
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

-- ---------------------------------------------------------------- standings v3
create or replace function public.gt_division_standings_v3(p_division uuid, p_pool text default null)
returns table (
  pool_label text, pos integer, athlete_id uuid, display_name text, institution text, current_rank text,
  wins integer, losses integer, draws integer, byes integer, forfeit_wins integer,
  score numeric, sos numeric, sosos numeric, withdrawn boolean
)
language sql stable security definer set search_path = public as $$
with caller as (
  select exists (select 1 from gt_staff_members s where s.user_id = auth.uid() and s.active
                 and s.role = any (array['owner','admin','reviewer'])) as is_staff
),
div as (
  select d.id, d.tournament_id from gt_divisions d join gt_tournaments t on t.id = d.tournament_id cross join caller c
  where d.id = p_division and (t.published or c.is_staff)
),
entrants as (
  select r.athlete_id as aid, r.pool_label as pl, r.registration_status = 'withdrawn' as wd, r.display_institution as inst
  from gt_registrations r join div on r.division_id = div.id and r.tournament_id = div.tournament_id
  where r.registration_status in ('confirmed','withdrawn') and (p_pool is null or r.pool_label = p_pool)
),
-- one row per player per verified game: points earned, opponent, and whether the game was actually played
games as (
  select m.black_athlete_id as p, m.white_athlete_id as o, m.result_code as rc, m.winner_athlete_id as win, true as is_black
  from gt_matches m join div on m.division_id = div.id where m.state = 'verified'
  union all
  select m.white_athlete_id, m.black_athlete_id, m.result_code, m.winner_athlete_id, false
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
select r.pl, r.rk,
       case when c.is_staff or exists (select 1 from gt_tournaments t join div on t.id = div.tournament_id where t.published) then a.id end,
       case when c.is_staff or exists (select 1 from gt_tournaments t join div on t.id = div.tournament_id where t.published) then a.full_name end,
       coalesce(nullif(r.inst, ''), a.school_name),
       a.current_rank, r.w, r.l, r.dr, r.b, r.fw, r.sc, r.so, r.soso, r.wd
from ranked r join gt_athletes a on a.id = r.aid cross join caller c
order by r.pl nulls first, r.wd, r.rk nulls last, a.full_name;
$$;

-- ---------------------------------------------------------------- permissions
revoke all on function public.gt_staff_checkin_v1(uuid, text, boolean) from public, anon;
revoke all on function public.gt_staff_set_withdrawn_v1(uuid, uuid, boolean) from public, anon;
grant execute on function public.gt_staff_checkin_v1(uuid, text, boolean) to authenticated;
grant execute on function public.gt_staff_set_withdrawn_v1(uuid, uuid, boolean) to authenticated;
grant execute on function public.gt_division_board_v1(uuid) to anon, authenticated;
grant execute on function public.gt_division_standings_v3(uuid, text) to anon, authenticated;
