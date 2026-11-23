-- อันดับและสถิติ v3 (23 Nov 2026): all players of the year in one compact payload, so the page switches
-- ดั้ง/คิว/ระดับ instantly in the browser and ranks by win percentage there.
--   players: [go_id, name, athlete_id, photo, grp ('dan'|'kyu'), level (null = unknown), wins, losses, wo_wins, wo_losses, byes,
--             events: [[event index, wins, losses, byes, division], ...]]
--   events:  [{id, title, date, year}] — the source list; player events point into it by index.
create or replace function public.gt_public_win_stats_v1(p_year int default null) returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  with yr as (select case when p_year = 0 then null else coalesce(p_year, extract(year from (now() at time zone 'Asia/Bangkok'))::int) end y),
  ev as materialized (
    select e.id, e.title, gt_private.history_event_sort_date_v1(e.id, e.event_date) d, e.event_year
    from public.gt_history_events e, yr
    where yr.y is null or coalesce(extract(year from gt_private.history_event_sort_date_v1(e.id, e.event_date))::int, e.event_year) = yr.y
  ), side as (
    select hp.go_id, m.event_id, coalesce(nullif(btrim(m.division), ''), 'ไม่ระบุรุ่น') division,
           (m.kind = 'played' and m.winner = s.pid)::int w, (m.kind = 'played' and m.winner <> s.pid)::int l,
           (m.kind = 'walkover' and m.winner = s.pid)::int ww, (m.kind = 'walkover' and m.winner <> s.pid)::int wl,
           (m.kind = 'bye')::int b
    from public.gt_history_matches m
    join ev on ev.id = m.event_id
    cross join lateral (values (m.player_a), (m.player_b)) s(pid)
    join public.gt_history_people hp on hp.id = s.pid
    where m.counts_for_stats and s.pid is not null and hp.go_id is not null and hp.go_id <> 'GO106260826'
  ), per_event as (
    select go_id, event_id, string_agg(distinct division, ', ') division, sum(w)::int w, sum(l)::int l, sum(ww)::int ww, sum(wl)::int wl, sum(b)::int b
    from side group by go_id, event_id
  ), evi as materialized (
    select ev.*, (row_number() over (order by d nulls last, title) - 1)::int idx
    from ev where exists (select 1 from per_event pe where pe.event_id = ev.id)
  ), dr as materialized (
    select distinct on (x.go_id) x.go_id, x.level from gt_private.dan_ranking_rows_v1() x where x.go_id is not null order by x.go_id, x.dan
  ), who as materialized (
    select pe.go_id, dr.level dan_level, kl.kyu
    from (select distinct go_id from per_event) pe
    left join dr on dr.go_id = pe.go_id
    left join gt_private.kyu_levels_v1(array(select distinct go_id from per_event)) kl on kl.go_id = pe.go_id
  ), pl as (
    select pe.go_id,
           case when w2.dan_level is not null or coalesce(w2.kyu, 99) > 15 and exists (select 1 from gt_private.history_dan_crosswalk_v1 c where c.go_id = pe.go_id) then 'dan' else 'kyu' end grp,
           case when w2.dan_level is not null then nullif(regexp_replace(w2.dan_level, '[^0-9]', '', 'g'), '')::int
                when w2.kyu between 1 and 15 then w2.kyu end lvl,
           sum(pe.w)::int w, sum(pe.l)::int l, sum(pe.ww)::int ww, sum(pe.wl)::int wl, sum(pe.b)::int b,
           jsonb_agg(jsonb_build_array(evi.idx, pe.w, pe.l, pe.b, pe.division) order by evi.d desc nulls last, evi.title) list
    from per_event pe join evi on evi.id = pe.event_id join who w2 on w2.go_id = pe.go_id
    group by pe.go_id, w2.dan_level, w2.kyu
  )
  select jsonb_build_object(
    'year', (select y from yr),
    'from', (select min(d) from evi), 'to', (select max(d) from evi),
    'games', (select count(*) from public.gt_history_matches m join ev on ev.id = m.event_id where m.counts_for_stats and m.kind = 'played'),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'date', d, 'year', event_year) order by idx) from evi), '[]'::jsonb),
    'players', coalesce((select jsonb_agg(jsonb_build_array(pl.go_id,
                 gt_private.clean_name_v1(coalesce(a.full_name, ir.full_name, (select x.full_name from public.gt_history_people x where x.go_id = pl.go_id limit 1))),
                 a.id, a.avatar_url, pl.grp, pl.lvl, pl.w, pl.l, pl.ww, pl.wl, pl.b, pl.list))
               from pl left join gt_private.history_identity_registry_v1 ir on ir.go_id = pl.go_id left join gt_athletes a on a.go_id = pl.go_id), '[]'::jsonb))
$$;
revoke all on function public.gt_public_win_stats_v1(int) from public;
grant execute on function public.gt_public_win_stats_v1(int) to anon, authenticated;
