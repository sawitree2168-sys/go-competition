-- Public stats for the home page, /stats and /results (16 Nov 2026, ครูเล็ก).
-- * Top athletes of a year = most wins in recorded results; ties: fewer losses, then more events, then name.
-- * Only names, GO ID, rank, wins/losses and placings: the same as a printed results sheet. No birth date or contacts.

create or replace function gt_private.clean_name_v1(p text) returns text
language sql immutable set search_path = pg_catalog as $$
  select regexp_replace(btrim(regexp_replace(coalesce(p, ''), '[' || chr(160) || chr(8203) || '-' || chr(8205) || chr(65279) || ']', '', 'g')), '\s+', ' ', 'g')
$$;

-- "18/07/2026" → 2026-07-18 (null when unreadable).
create or replace function gt_private.history_date_v1(p text) returns date
language plpgsql immutable set search_path = pg_catalog as $$
begin
  if p ~ '^\d{1,2}/\d{1,2}/\d{4}$' then
    return make_date(split_part(p, '/', 3)::int - case when split_part(p, '/', 3)::int > 2400 then 543 else 0 end,
                     split_part(p, '/', 2)::int, split_part(p, '/', 1)::int);
  end if;
  return null;
exception when others then return null;
end $$;

create or replace function public.gt_public_rankings_v1(p_year int default null, p_limit int default 5) returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  with yr as (select coalesce(p_year, extract(year from (now() at time zone 'Asia/Bangkok'))::int) y),
  s as (
    select h.go_id, sum(h.wins)::int wins, sum(h.losses)::int losses, count(*)::int events
    from history_event_summaries_v1 h, yr
    where extract(year from history_date_v1(h.event_date_raw)) = yr.y
    group by h.go_id
  ), ranked as (
    select s.*, clean_name_v1(coalesce(a.full_name, r.full_name)) full_name,
           coalesce(rank_label_v1(a.current_rank), rank_label_v1(r.source_rank)) rank, a.id athlete_id, a.avatar_url photo
    from s left join history_identity_registry_v1 r on r.go_id = s.go_id left join gt_athletes a on a.go_id = s.go_id
    where s.go_id <> 'GO106260826'
  )
  select jsonb_build_object('year', (select y from yr), 'rows', coalesce(jsonb_agg(jsonb_build_object(
           'pos', x.pos, 'go_id', x.go_id, 'full_name', x.full_name, 'rank', x.rank, 'athlete_id', x.athlete_id, 'photo', x.photo,
           'wins', x.wins, 'losses', x.losses, 'events', x.events) order by x.pos), '[]'::jsonb))
  from (select ranked.*, row_number() over (order by wins desc, losses asc, events desc, full_name) pos from ranked
        order by pos limit least(greatest(coalesce(p_limit, 5), 1), 200)) x
$$;

create or replace function public.gt_public_overview_v1() returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  select jsonb_build_object(
    'tournaments', (select count(*) from gt_tournaments where published) + (select count(distinct event_title) from history_event_summaries_v1),
    'athletes', (select count(*) from history_identity_registry_v1 where go_id <> 'GO106260826')
                + (select count(*) from gt_athletes a where not exists (select 1 from history_identity_registry_v1 r where r.go_id = a.go_id)),
    'results', (select count(distinct event_title) from history_event_summaries_v1)
               + (select count(distinct m.tournament_id) from gt_matches m join gt_tournaments t on t.id = m.tournament_id
                  where t.published and m.state in ('verified', 'confirmed')))
$$;

-- Recorded results of past events, grouped by event and division, best placing first.
create or replace function public.gt_public_results_v1() returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  with src as (
    select h.event_title, history_date_v1(h.event_date_raw) d, btrim(h.division) division, h.go_id,
           clean_name_v1(coalesce(a.full_name, r.full_name)) full_name, a.id athlete_id,
           nullif(regexp_replace(coalesce(h.placing_raw, ''), '[^0-9]', '', 'g'), '')::int plc, h.wins, h.losses, h.byes
    from history_event_summaries_v1 h left join history_identity_registry_v1 r on r.go_id = h.go_id left join gt_athletes a on a.go_id = h.go_id
  ), divs as (
    select event_title, d, division, jsonb_agg(jsonb_build_object('placing', plc, 'go_id', go_id, 'full_name', full_name, 'athlete_id', athlete_id,
             'wins', wins, 'losses', losses, 'byes', byes) order by plc nulls last, wins desc, full_name) people
    from src group by event_title, d, division
  )
  select coalesce(jsonb_agg(e order by e->>'date' desc nulls last, e->>'title'), '[]'::jsonb) from (
    select jsonb_build_object('title', event_title, 'date', d,
             'divisions', jsonb_agg(jsonb_build_object('division', division, 'people', people) order by division)) e
    from divs group by event_title, d
  ) z
$$;

revoke all on function public.gt_public_rankings_v1(int, int), public.gt_public_overview_v1(), public.gt_public_results_v1() from public;
grant execute on function public.gt_public_rankings_v1(int, int), public.gt_public_overview_v1(), public.gt_public_results_v1() to anon, authenticated;
