-- Public institution page /institutions/[id] (24 พ.ย. 2569): name, logo, how many students, games and medals, and
-- the latest podium places (from published competitions on this site + the central history). Only names and
-- results that are already public on the results pages; no teacher, phone, birthday or school details.
create or replace function public.gt_public_academy_v1(p_academy uuid)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private, pg_temp as $$
declare a gt_academies%rowtype; v_hist jsonb;
begin
  select * into a from gt_academies where id = p_academy and status = 'active' and workspace_type = 'academy';
  if a.id is null then return null; end if;
  v_hist := gt_private.academy_history_v1(p_academy);
  return (
    with st as (select athlete_id from gt_private.academy_students(p_academy)),
    regs as (
      select r.athlete_id, r.division_id, r.tournament_id, t.title, t.event_date, d.name dname
      from gt_registrations r join st on st.athlete_id = r.athlete_id
      join gt_tournaments t on t.id = r.tournament_id join gt_divisions d on d.id = r.division_id
      where t.published and r.registration_status in ('confirmed', 'withdrawn')
    ),
    live_games as (
      select g.athlete_id, g.division_id,
             count(m.id)::int n, count(*) filter (where m.winner_athlete_id = g.athlete_id)::int w
      from regs g left join gt_matches m on m.division_id = g.division_id and m.state = 'verified'
           and g.athlete_id in (m.black_athlete_id, m.white_athlete_id)
      group by 1, 2
    ),
    live_pos as (
      select dv.division_id, s.athlete_id, s.pos
      from (select distinct division_id from regs) dv cross join lateral gt_division_standings_v3(dv.division_id) s
      where not s.withdrawn
    ),
    recs as (
      select ath.full_name name, ath.id::text athlete_id, null::text go_id, r.title, r.event_date date, r.dname division,
             coalesce(g.n, 0) games, coalesce(g.w, 0) wins, p.pos
      from regs r join gt_athletes ath on ath.id = r.athlete_id
      left join live_games g on g.athlete_id = r.athlete_id and g.division_id = r.division_id
      left join live_pos p on p.athlete_id = r.athlete_id and p.division_id = r.division_id
      union all
      select coalesce(s.full_name, hs.name), case when x->>'athlete_id' like 'h:%' then null else x->>'athlete_id' end,
             case when x->>'athlete_id' like 'h:%' then substring(x->>'athlete_id' from 3) else null end,
             x->>'title', (x->>'date')::date, x->>'division', (x->>'games')::int, (x->>'wins')::int, (x->>'pos')::int
      from jsonb_array_elements(coalesce(v_hist->'records', '[]'::jsonb)) x
      left join gt_athletes s on s.id::text = x->>'athlete_id'
      left join lateral (select h->>'name' name from jsonb_array_elements(coalesce(v_hist->'students', '[]'::jsonb)) h where h->>'id' = x->>'athlete_id' limit 1) hs on true
    )
    select jsonb_build_object(
      'id', a.id, 'name', a.name, 'logo_path', a.logo_path, 'shape', a.logo_shape, 'zoom', a.logo_zoom, 'x', a.logo_x, 'y', a.logo_y,
      'students', (select count(*) from st) + jsonb_array_length(coalesce(v_hist->'students', '[]'::jsonb)),
      'events', (select count(distinct title || coalesce(date::text, '')) from recs where games > 0),
      'games', (select coalesce(sum(games), 0) from recs), 'wins', (select coalesce(sum(wins), 0) from recs),
      'gold', (select count(*) from recs where pos = 1 and games > 0),
      'silver', (select count(*) from recs where pos = 2 and games > 0),
      'bronze', (select count(*) from recs where pos = 3 and games > 0),
      'podiums', coalesce((select jsonb_agg(p order by p->>'date' desc nulls last, (p->>'pos')::int) from (
          select jsonb_build_object('name', name, 'athlete_id', athlete_id, 'go_id', go_id, 'title', title, 'date', date,
                                    'division', division, 'pos', pos, 'wins', wins, 'games', games) p
          from recs where pos between 1 and 3 and games > 0
          order by date desc nulls last, pos limit 40) z), '[]'::jsonb))
  );
end $$;
revoke all on function public.gt_public_academy_v1(uuid) from public;
grant execute on function public.gt_public_academy_v1(uuid) to anon, authenticated;
