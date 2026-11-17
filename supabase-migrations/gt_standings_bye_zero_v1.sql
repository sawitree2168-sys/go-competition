-- Back to: a bye gives 1 point and adds nothing to SOS (17 Nov 2026, ครูเล็ก after talking with ครูชาญ).
-- "การเจอบายเป็นผลจากจำนวนคนไม่ครบคู่ ในไทยใช้แบบนี้มาเกือบทุกรายการ ทุกระดับ หากเปลี่ยนเป็นแต้มสมมุติจะเกิดความผิดพลาดและโต้แย้งกัน"
-- (The other McMahon option, counting the bye in SOS, must be announced before an event; not used.)
-- Reverts gt_standings_bye_sos_v1 to the gt_multi_organizer_v1 version.
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
-- The bye round adds nothing to SOS or SOSOS (Thai practice; see the header).
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
