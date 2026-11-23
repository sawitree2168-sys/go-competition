-- อันดับและสถิติ แยกดั้ง / คิว (23 Nov 2026).
-- v1 ranked everyone by total wins across all divisions, so 9×9 Friendship winners sat above stronger players.
-- v2:
--   ดั้ง = national score ranking (association dan scores, same as ทำเนียบนักกีฬา), active players only.
--   คิว  = wins this year, ranked separately inside each class of division played
--          (3-4 → 3 คิว, 5-6 → 5, 7-8 → 7, 9-12 → 9, Friendship 13×13 → 13, 9×9 → 15).
--          Divisions with no kyu level (dan, age groups) are left out. A player in two classes appears in each.
create or replace function public.gt_public_rankings_v2(p_year int default null, p_limit int default 50) returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  with yr as (select coalesce(p_year, extract(year from (now() at time zone 'Asia/Bangkok'))::int) y),
  lim as (select least(greatest(coalesce(p_limit, 50), 1), 200) n),
  k as (
    select h.go_id, -gt_private.history_division_strength_v1(h.division) kyu,
           sum(h.wins)::int wins, sum(h.losses)::int losses, count(*)::int events
    from gt_private.history_event_summaries_v1 h, yr
    where extract(year from gt_private.history_date_v1(h.event_date_raw)) = yr.y
      and gt_private.history_division_strength_v1(h.division) is not null
      and h.go_id <> 'GO106260826'
    group by 1, 2
  ), kr as (
    select k.*, gt_private.clean_name_v1(coalesce(a.full_name, r.full_name)) full_name, a.id athlete_id, a.avatar_url photo,
           row_number() over (partition by k.kyu order by k.wins desc, k.losses asc, k.events desc,
                              gt_private.clean_name_v1(coalesce(a.full_name, r.full_name))) pos
    from k left join gt_private.history_identity_registry_v1 r on r.go_id = k.go_id left join gt_athletes a on a.go_id = k.go_id
  ), kc as (
    select kyu, count(*)::int total, jsonb_agg(jsonb_build_object('pos', pos, 'go_id', go_id, 'full_name', full_name,
             'athlete_id', athlete_id, 'photo', photo, 'wins', wins, 'losses', losses, 'events', events) order by pos)
             filter (where pos <= (select n from lim)) rows
    from kr group by kyu
  ), d as (
    select x.*, rank() over (order by x.score desc) pos
    from gt_private.dan_ranking_rows_v1() x where x.active and x.score is not null
  )
  select jsonb_build_object(
    'year', (select y from yr),
    'kyu', coalesce((select jsonb_agg(jsonb_build_object('kyu', kyu, 'total', total, 'rows', rows) order by kyu) from kc), '[]'::jsonb),
    'dan_as_of', (select max(rated_on) from gt_private.dan_rating_history_v1),
    'dan_total', (select count(*) from d),
    'dan', coalesce((select jsonb_agg(jsonb_build_object('pos', pos, 'go_id', go_id, 'full_name', name, 'level', level,
             'diamond', diamond, 'dan', dan, 'athlete_id', profile_id, 'photo', photo, 'score', score, 'delta', delta) order by pos, dan)
             from (select * from d order by pos, dan limit (select n from lim)) z), '[]'::jsonb))
$$;
revoke all on function public.gt_public_rankings_v2(int, int) from public;
grant execute on function public.gt_public_rankings_v2(int, int) to anon, authenticated;
