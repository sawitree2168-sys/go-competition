-- gt_competition_day_v1
-- Competition-day operations for organisers (owner/admin staff only), all additive:
--   * pools (สาย A/B) on registrations, matches and byes
--   * import entrants approved in the Google Sheet into athletes + confirmed registrations
--   * set pools, publish a Swiss round atomically, cancel an unscored round
--   * record / correct a result (with an audit trail)
--   * per-pool standings (v2) and Friendship medal counts
-- Matches stay server-written only: every write goes through these SECURITY DEFINER functions.

-- ---------------------------------------------------------------- one registration per division
-- A child may enter both Friendship 9x9 and 13x13 in the same event, so uniqueness is per division.
alter table public.gt_registrations drop constraint if exists gt_registrations_tournament_id_athlete_id_key;
alter table public.gt_registrations add constraint gt_registrations_tournament_division_athlete_v1 unique (tournament_id, division_id, athlete_id);

-- ---------------------------------------------------------------- pools
alter table public.gt_registrations add column if not exists pool_label text
  constraint gt_registrations_pool_label_v1 check (pool_label is null or pool_label in ('A','B','C','D'));
alter table public.gt_matches add column if not exists pool_label text
  constraint gt_matches_pool_label_v1 check (pool_label is null or pool_label in ('A','B','C','D'));
alter table public.gt_byes add column if not exists pool_label text
  constraint gt_byes_pool_label_v1 check (pool_label is null or pool_label in ('A','B','C','D'));

-- table numbers are unique per division + pool + round
drop index if exists public.gt_matches_division_round_board_v1;
create unique index if not exists gt_matches_division_pool_round_board_v1
  on public.gt_matches (division_id, coalesce(pool_label, ''), round_number, board_number)
  where board_number is not null and state <> 'void';

-- ---------------------------------------------------------------- audit
create table if not exists public.gt_match_audit_v1 (
  id         bigint generated always as identity primary key,
  match_id   uuid,
  division_id uuid,
  action     text not null,
  before     jsonb,
  after      jsonb,
  actor      uuid,
  created_at timestamptz not null default now()
);
alter table public.gt_match_audit_v1 enable row level security;
create policy gt_match_audit_staff_read_v1 on public.gt_match_audit_v1 for select to authenticated
  using (exists (select 1 from public.gt_staff_members s where s.user_id = (select auth.uid()) and s.active
                 and s.role = any (array['owner','admin','reviewer'])));
revoke all on public.gt_match_audit_v1 from anon;
grant select on public.gt_match_audit_v1 to authenticated;  -- rows still limited to staff by the policy above
comment on table public.gt_match_audit_v1 is 'Append-only log of competition-day actions (publish/cancel round, results). Written only by staff RPCs.';

-- ---------------------------------------------------------------- helper
create or replace function public.gt_require_competition_staff_v1()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid := auth.uid();
begin
  if v is null or not exists (select 1 from gt_staff_members s where s.user_id = v and s.active
                              and s.role = any (array['owner','admin'])) then
    raise exception 'STAFF_ONLY' using errcode = '42501';
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------- import entrants
-- p_rows: [{"source_row": 12, "division_id": "<uuid>"}]
-- Reuses an athlete with the same normalised name and same/empty school; otherwise creates one with
-- the standard GO ID sequence. Names the legacy-duplicate check flags come back as 'needs_review'.
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
      insert into gt_registrations (tournament_id, division_id, athlete_id, registration_status, payment_status)
      values (p_tournament, v_div, v_ath.id, 'confirmed',
              case when e.payment_status = 'ชำระเงินแล้ว' then 'verified' else 'pending' end)
      on conflict (tournament_id, division_id, athlete_id) do update
        set registration_status = 'confirmed',
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

-- ---------------------------------------------------------------- pools
-- p_assignments: [{"athlete_id": "<uuid>", "pool": "A"}]; only before round 1 is published.
create or replace function public.gt_staff_set_pools_v1(p_division uuid, p_assignments jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_competition_staff_v1(); n integer;
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

-- ---------------------------------------------------------------- publish round
-- p_tables: [{"board": 1, "black": "<uuid>", "white": "<uuid>"}], p_bye: athlete or null.
-- Checks: next round in sequence, previous round fully scored, every confirmed player of the pool
-- appears exactly once (table or bye). Existing constraints block rematches and double-booking.
create or replace function public.gt_staff_publish_round_v1(p_division uuid, p_pool text, p_round integer, p_tables jsonb, p_bye uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := gt_require_competition_staff_v1();
  v_tournament uuid; v_last integer; v_expected uuid[]; v_given uuid[]; t jsonb; n integer := 0;
begin
  select d.tournament_id into v_tournament from gt_divisions d where d.id = p_division;
  if v_tournament is null then raise exception 'DIVISION_NOT_FOUND'; end if;
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

-- Undo the latest round of a pool, only while none of its games has a result.
create or replace function public.gt_staff_cancel_round_v1(p_division uuid, p_pool text, p_round integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_competition_staff_v1(); v_last integer; n integer;
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

-- ---------------------------------------------------------------- results
-- p_result: black_win | white_win | double_forfeit; p_margin: R, T, a number like 6.5, or null.
-- A result can be corrected only while the pool's next round has not been published.
create or replace function public.gt_staff_record_result_v1(p_match uuid, p_result text, p_margin text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_competition_staff_v1(); m gt_matches%rowtype; v_winner uuid;
begin
  select * into m from gt_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.state = 'void' then raise exception 'MATCH_VOID'; end if;
  if exists (select 1 from gt_matches x where x.division_id = m.division_id and x.pool_label is not distinct from m.pool_label
             and x.round_number > m.round_number and x.state <> 'void') then
    raise exception 'LATER_ROUND_ALREADY_PUBLISHED';
  end if;
  v_winner := case p_result when 'black_win' then m.black_athlete_id when 'white_win' then m.white_athlete_id
                            when 'double_forfeit' then null else null end;
  if p_result not in ('black_win','white_win','double_forfeit') then raise exception 'INVALID_RESULT'; end if;
  update gt_matches set result_code = p_result, winner_athlete_id = v_winner,
         result_margin = case when p_result = 'double_forfeit' then null else nullif(btrim(p_margin), '') end,
         state = 'verified', verified_at = now()
   where id = p_match;
  insert into gt_match_audit_v1 (match_id, division_id, action, before, after, actor)
  values (p_match, m.division_id, case when m.state = 'verified' then 'correct_result' else 'record_result' end,
          jsonb_build_object('result', m.result_code, 'margin', m.result_margin, 'state', m.state),
          jsonb_build_object('result', p_result, 'margin', p_margin), v_actor);
end $$;

-- ---------------------------------------------------------------- standings per pool
-- Same rules as v1 (verified results + byes; SOS; SOSOS), restricted to one pool when p_pool is given.
create or replace function public.gt_division_standings_v2(p_division uuid, p_pool text default null)
returns table (
  pool_label text, pos integer, athlete_id uuid, display_name text, institution text, current_rank text,
  wins integer, losses integer, byes integer, score integer, sos integer, sosos integer
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
  select r.athlete_id as aid, r.pool_label as pl from gt_registrations r join div on r.division_id = div.id and r.tournament_id = div.tournament_id
  where r.registration_status = 'confirmed' and (p_pool is null or r.pool_label = p_pool)
),
played as (
  select m.pool_label as pl, m.black_athlete_id as p, m.white_athlete_id as o, (m.winner_athlete_id = m.black_athlete_id) as won
  from gt_matches m join div on m.division_id = div.id where m.state = 'verified' and m.winner_athlete_id is not null
  union all
  select m.pool_label, m.white_athlete_id, m.black_athlete_id, (m.winner_athlete_id = m.white_athlete_id)
  from gt_matches m join div on m.division_id = div.id where m.state = 'verified' and m.winner_athlete_id is not null
),
forfeits as (  -- both players absent: a loss for each, but no game, so no SOS contribution
  select m.black_athlete_id as p from gt_matches m join div on m.division_id = div.id where m.state = 'verified' and m.result_code = 'double_forfeit'
  union all
  select m.white_athlete_id from gt_matches m join div on m.division_id = div.id where m.state = 'verified' and m.result_code = 'double_forfeit'
),
base as (
  select e.aid, e.pl,
    (select count(*) from played g where g.p = e.aid and g.won)::int as w,
    ((select count(*) from played g where g.p = e.aid and not g.won) + (select count(*) from forfeits f where f.p = e.aid))::int as l,
    (select count(*) from gt_byes b join div on b.division_id = div.id where b.athlete_id = e.aid)::int as b
  from entrants e
),
s0 as (select aid, pl, w, l, b, w + b as sc from base),
s1 as (select s0.*, coalesce((select sum(o.sc) from played g join s0 o on o.aid = g.o where g.p = s0.aid), 0)::int as so from s0),
s2 as (select s1.*, coalesce((select sum(o.so) from played g join s1 o on o.aid = g.o where g.p = s1.aid), 0)::int as soso from s1)
select s2.pl,
       (rank() over (partition by s2.pl order by s2.sc desc, s2.so desc, s2.soso desc))::int,
       case when a.profile_public or c.is_staff then a.id end,
       case when a.profile_public or c.is_staff then a.full_name end,
       case when a.profile_public or c.is_staff then a.school_name end,
       a.current_rank, s2.w, s2.l, s2.b, s2.sc, s2.so, s2.soso
from s2 join gt_athletes a on a.id = s2.aid cross join caller c
order by s2.pl nulls first, 2, a.full_name;
$$;

-- ---------------------------------------------------------------- permissions
revoke all on function public.gt_require_competition_staff_v1() from public, anon;
revoke all on function public.gt_staff_import_entrants_v1(uuid, jsonb) from public, anon;
revoke all on function public.gt_staff_set_pools_v1(uuid, jsonb) from public, anon;
revoke all on function public.gt_staff_publish_round_v1(uuid, text, integer, jsonb, uuid) from public, anon;
revoke all on function public.gt_staff_cancel_round_v1(uuid, text, integer) from public, anon;
revoke all on function public.gt_staff_record_result_v1(uuid, text, text) from public, anon;
grant execute on function public.gt_require_competition_staff_v1() to authenticated;
grant execute on function public.gt_staff_import_entrants_v1(uuid, jsonb) to authenticated;
grant execute on function public.gt_staff_set_pools_v1(uuid, jsonb) to authenticated;
grant execute on function public.gt_staff_publish_round_v1(uuid, text, integer, jsonb, uuid) to authenticated;
grant execute on function public.gt_staff_cancel_round_v1(uuid, text, integer) to authenticated;
grant execute on function public.gt_staff_record_result_v1(uuid, text, text) to authenticated;
grant execute on function public.gt_division_standings_v2(uuid, text) to anon, authenticated;
