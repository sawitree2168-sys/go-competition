-- Bye rule chosen per event (17 Nov 2026, ครูเล็ก: "ให้กดเลือกได้ ในอนาคตอาจมีการปรับเปลี่ยน").
-- 1. 'none' (default): a bye gives 1 point (a win); the bye round adds nothing to SOS / SOSOS.
-- 2. 'own_score': a bye gives 1 point; in SOS the bye round counts as a virtual opponent with the player's own
--    final score (bye point included), and in SOSOS with the player's own SOS (BGA handbook, McMahon rules).
--    It has to be announced before the event, so the organiser chooses it on the event page.
alter table public.gt_tournaments add column if not exists bye_sos_mode text not null default 'none'
  check (bye_sos_mode in ('none', 'own_score'));

create or replace function public.gt_staff_set_bye_sos_mode_v1(p_tournament uuid, p_mode text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  if p_mode is null or p_mode not in ('none', 'own_score') then return jsonb_build_object('ok', false, 'error', 'MODE'); end if;
  update gt_tournaments set bye_sos_mode = p_mode where id = p_tournament;
  return jsonb_build_object('ok', true, 'mode', p_mode);
end $$;
revoke all on function public.gt_staff_set_bye_sos_mode_v1(uuid, text) from public, anon;
grant execute on function public.gt_staff_set_bye_sos_mode_v1(uuid, text) to authenticated;

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
-- Bye round in SOS / SOSOS, by the event's rule (gt_tournaments.bye_sos_mode):
--   'none'      adds nothing (Thai practice, the default);
--   'own_score' a virtual opponent with the player's own final score (which includes the bye point) in SOS,
--               and the player's own SOS in SOSOS (BGA McMahon rule for rounds without an opponent).
s1 as (select s0.*, coalesce((select sum(o.sc) from scored g join s0 o on o.aid = g.o where g.p = s0.aid and g.played), 0)
          + case when (select bm from div) = 'own_score' then s0.b * s0.sc else 0 end as so from s0),
s2 as (select s1.*, coalesce((select sum(o.so) from scored g join s1 o on o.aid = g.o where g.p = s1.aid and g.played), 0)
          + case when (select bm from div) = 'own_score' then s1.b * s1.so else 0 end as soso from s1),
ranked as (
  select s2.*, case when not s2.wd then (rank() over (partition by s2.pl, s2.wd order by s2.sc desc, s2.so desc, s2.soso desc))::int end as rk
  from s2
)
select r.pl, r.rk, a.id, a.full_name, coalesce(nullif(r.inst, ''), a.school_name),
       a.current_rank, r.w, r.l, r.dr, r.b, r.fw, r.sc, r.so, r.soso, r.wd
from ranked r join gt_athletes a on a.id = r.aid
order by r.pl nulls first, r.wd, r.rk nulls last, a.full_name;
$$;
