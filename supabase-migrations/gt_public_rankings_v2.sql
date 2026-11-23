-- อันดับและสถิติ: ใครชนะมากที่สุด แยกดั้ง / คิว (23 Nov 2026).
-- Source: ประวัติกลาง (gt_history_matches, counts_for_stats) — every recorded event of the year, not only the 2 events
-- in history_event_summaries_v1 that v1 used.
--   ชนะ/แพ้ = played games only; walkovers (ชนะ/แพ้ผ่าน) and byes are counted separately, same as head-to-head.
--   ดั้ง = dan holders (dan list / crosswalk), level from the association dan list.
--   คิว  = everyone else, level = the athlete directory kyu (1–15, unknown = 0).
--   groups: level -1 = ทั้งหมด, 0 = ไม่ทราบระดับ, else the level. Each row carries its events (the source).
--   Returns head-counts of every group, and rows (with events = the source) for the one group asked: p_grp 'dan'/'kyu', p_level.
--   p_year null = this year, 0 = all years.
drop function if exists public.gt_public_rankings_v2(int, int);
create or replace function public.gt_public_rankings_v2(p_grp text default 'kyu', p_level int default -1, p_year int default null, p_limit int default 30) returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  with yr as (select case when p_year = 0 then null else coalesce(p_year, extract(year from (now() at time zone 'Asia/Bangkok'))::int) end y),
  lim as (select least(greatest(coalesce(p_limit, 30), 1), 200) n),
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
  ), dr as materialized (
    select distinct on (x.go_id) x.go_id, x.level, x.dan from gt_private.dan_ranking_rows_v1() x where x.go_id is not null order by x.go_id, x.dan
  ), who as materialized (
    select pe.go_id, dr.level dan_level, dr.dan dan_number, kl.kyu
    from (select distinct go_id from per_event) pe
    left join dr on dr.go_id = pe.go_id
    left join gt_private.kyu_levels_v1(array(select distinct go_id from per_event)) kl on kl.go_id = pe.go_id
  ), tagged as (
    select pe.*, ev.title, ev.d, ev.event_year,
           case when w2.dan_level is not null or coalesce(w2.kyu, 99) > 15 and exists (select 1 from gt_private.history_dan_crosswalk_v1 c where c.go_id = pe.go_id) then 'dan' else 'kyu' end grp,
           case when w2.dan_level is not null then nullif(regexp_replace(w2.dan_level, '[^0-9]', '', 'g'), '')::int
                when w2.kyu between 1 and 15 then w2.kyu end lvl,
           w2.dan_number
    from per_event pe join ev on ev.id = pe.event_id join who w2 on w2.go_id = pe.go_id
  ), g as (
    select grp, -1 lvl, lvl rl, go_id, dan_number, event_id, title, d, event_year, division, w, l, ww, wl, b from tagged
    union all
    select grp, coalesce(lvl, 0), lvl, go_id, dan_number, event_id, title, d, event_year, division, w, l, ww, wl, b from tagged
  ), p as (
    select grp, lvl, go_id, max(dan_number) dan_number, max(rl) level_num,
           sum(w)::int wins, sum(l)::int losses, sum(ww)::int wo_wins, sum(wl)::int wo_losses, sum(b)::int byes, count(*)::int events,
           jsonb_agg(jsonb_build_object('id', event_id, 'title', title, 'date', d, 'year', event_year, 'division', division, 'wins', w, 'losses', l, 'byes', b,
                     'wo_wins', ww, 'wo_losses', wl) order by d desc nulls last, title) list
    from g group by grp, lvl, go_id
  ), r as (
    select p.*, gt_private.clean_name_v1(coalesce(a.full_name, ir.full_name, hp.full_name)) full_name, a.id athlete_id, a.avatar_url photo,
           row_number() over (partition by p.grp, p.lvl order by p.wins desc, p.losses asc, p.events desc, coalesce(a.full_name, ir.full_name, hp.full_name)) pos,
           count(*) over (partition by p.grp, p.lvl) total
    from p
    left join gt_private.history_identity_registry_v1 ir on ir.go_id = p.go_id
    left join gt_athletes a on a.go_id = p.go_id
    left join lateral (select full_name from public.gt_history_people x where x.go_id = p.go_id limit 1) hp on true
  ), b as (
    select grp, lvl, max(total)::int total,
           case when grp = coalesce(p_grp, 'kyu') and lvl = coalesce(p_level, -1) then jsonb_agg(jsonb_build_object('pos', pos, 'go_id', go_id, 'full_name', full_name, 'athlete_id', athlete_id, 'photo', photo,
             'level', level_num, 'dan_number', dan_number,
             'wins', wins, 'losses', losses, 'played', wins + losses, 'wo_wins', wo_wins, 'wo_losses', wo_losses, 'byes', byes,
             'events', events, 'list', list) order by pos) filter (where pos <= (select n from lim)) end rows
    from r group by grp, lvl
  )
  select jsonb_build_object(
    'year', (select y from yr),
    'from', (select min(d) from ev where exists (select 1 from per_event pe where pe.event_id = ev.id)),
    'to', (select max(d) from ev where exists (select 1 from per_event pe where pe.event_id = ev.id)),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'date', d, 'year', event_year) order by d nulls last, title)
                        from ev where exists (select 1 from per_event pe where pe.event_id = ev.id)), '[]'::jsonb),
    'games', (select count(*) from public.gt_history_matches m join ev on ev.id = m.event_id where m.counts_for_stats and m.kind = 'played'),
    'groups', coalesce((select jsonb_agg(jsonb_build_object('grp', grp, 'level', lvl, 'total', total) order by grp, lvl) from b), '[]'::jsonb),
    'rows', coalesce((select rows from b where rows is not null), '[]'::jsonb))
$$;
revoke all on function public.gt_public_rankings_v2(text, int, int, int) from public;
grant execute on function public.gt_public_rankings_v2(text, int, int, int) to anon, authenticated;
