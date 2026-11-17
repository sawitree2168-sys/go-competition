-- รายชื่อพักรอ (17 Nov 2026, ครูเล็ก): players who have not arrived, or did not come to the last round, wait
-- in a list until the organiser decides: here (plays the next round) or withdrawn ("ไม่มาแข่งแน่").
-- * gt_registrations.present_for_round: the round the organiser confirmed the player is here for, after an absence.
-- * A win because the opponent did not come within 15 minutes ("ชนะบาย") counts in SOS like a bye: by the
--   event's bye rule (none = nothing; own_score = own score / own SOS).
alter table public.gt_registrations add column if not exists present_for_round smallint;

create or replace function public.gt_staff_confirm_present_v1(p_division uuid, p_athlete uuid, p_round int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1((select d.tournament_id from gt_divisions d where d.id = p_division)); n int;
begin
  if p_round is null or p_round < 1 or p_round > 15 then return jsonb_build_object('ok', false, 'error', 'RANGE'); end if;
  update gt_registrations set present_for_round = p_round
   where division_id = p_division and athlete_id = p_athlete and registration_status = 'confirmed';
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'REGISTRATION_NOT_FOUND'); end if;
  insert into gt_match_audit_v1 (division_id, action, after, actor)
  values (p_division, 'confirm_present', jsonb_build_object('athlete', p_athlete, 'round', p_round), v_actor);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.gt_staff_confirm_present_v1(uuid, uuid, int) from public, anon;
grant execute on function public.gt_staff_confirm_present_v1(uuid, uuid, int) to authenticated;

create or replace function public.gt_division_standings_v3(p_division uuid, p_pool text default null)
returns table (
  pool_label text, pos integer, athlete_id uuid, display_name text, institution text, current_rank text,
  wins integer, losses integer, draws integer, byes integer, forfeit_wins integer,
  score numeric, sos numeric, sosos numeric, withdrawn boolean
)
language sql stable security definer set search_path = public as $$
with div as (
  select d.id, d.tournament_id, t.bye_sos_mode as bm from gt_divisions d join gt_tournaments t on t.id = d.tournament_id
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
-- Bye round, and a win because the opponent did not come (ชนะบาย), in SOS / SOSOS by the event's rule
-- (gt_tournaments.bye_sos_mode); both are rounds without a real opponent (ครูเล็ก, 17 Nov 2026):
--   'none'      adds nothing (Thai practice, the default);
--   'own_score' a virtual opponent with the player's own final score (which includes the bye point) in SOS,
--               and the player's own SOS in SOSOS (BGA McMahon rule for rounds without an opponent).
s1 as (select s0.*, coalesce((select sum(o.sc) from scored g join s0 o on o.aid = g.o where g.p = s0.aid and g.played), 0)
          + case when (select bm from div) = 'own_score' then (s0.b + s0.fw) * s0.sc else 0 end as so from s0),
s2 as (select s1.*, coalesce((select sum(o.so) from scored g join s1 o on o.aid = g.o where g.p = s1.aid and g.played), 0)
          + case when (select bm from div) = 'own_score' then (s1.b + s1.fw) * s1.so else 0 end as soso from s1),
ranked as (
  select s2.*, case when not s2.wd then (rank() over (partition by s2.pl, s2.wd order by s2.sc desc, s2.so desc, s2.soso desc))::int end as rk
  from s2
)
select r.pl, r.rk, a.id, a.full_name, coalesce(nullif(r.inst, ''), a.school_name),
       a.current_rank, r.w, r.l, r.dr, r.b, r.fw, r.sc, r.so, r.soso, r.wd
from ranked r join gt_athletes a on a.id = r.aid
order by r.pl nulls first, r.wd, r.rk nulls last, a.full_name;
$$;
