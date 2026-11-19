-- Pair Go results are four-player sporting facts. Individual history reads a
-- different table, so publishing a game here does not add individual results.
create table public.gt_history_pair_matches (
  id text primary key,
  event_id text not null references public.gt_history_events(id),
  division text not null check (btrim(division) <> ''),
  round_label text,
  board_label text,
  player_a1 text not null references public.gt_history_people(id),
  player_a2 text not null references public.gt_history_people(id),
  player_b1 text not null references public.gt_history_people(id),
  player_b2 text not null references public.gt_history_people(id),
  outcome text not null check (outcome in ('a_win', 'b_win', 'draw')),
  source_url text not null check (source_url ~ '^https?://[^[:space:]]+$'),
  check (
    player_a1 <> player_a2 and player_b1 <> player_b2
    and player_a1 not in (player_b1, player_b2)
    and player_a2 not in (player_b1, player_b2)
  )
);

create index gt_history_pair_matches_event on public.gt_history_pair_matches(event_id);
create index gt_history_pair_matches_a1 on public.gt_history_pair_matches(player_a1);
create index gt_history_pair_matches_a2 on public.gt_history_pair_matches(player_a2);
create index gt_history_pair_matches_b1 on public.gt_history_pair_matches(player_b1);
create index gt_history_pair_matches_b2 on public.gt_history_pair_matches(player_b2);

alter table public.gt_history_pair_matches enable row level security;
revoke all on public.gt_history_pair_matches from public, anon, authenticated;
grant select on public.gt_history_pair_matches to anon, authenticated;
grant select, insert, update, delete on public.gt_history_pair_matches to service_role;
create policy history_pair_matches_public on public.gt_history_pair_matches
  for select to anon, authenticated using (true);

create function public.gt_history_pair_meetings_v1(
  p_player_go_id text,
  p_opponent_go_id text default null
) returns jsonb
language sql stable security invoker set search_path = pg_catalog as $$
  with selected as (
    select id from public.gt_history_people where go_id = p_player_go_id
  ), opposite as (
    select id from public.gt_history_people where go_id = p_opponent_go_id
  ), oriented as (
    select m.*, p.id in (m.player_a1, m.player_a2) as selected_is_a
    from selected p
    join public.gt_history_pair_matches m
      on p.id in (m.player_a1, m.player_a2, m.player_b1, m.player_b2)
    left join opposite o on true
    where p_opponent_go_id is null
       or p.id in (m.player_a1, m.player_a2) and o.id in (m.player_b1, m.player_b2)
       or p.id in (m.player_b1, m.player_b2) and o.id in (m.player_a1, m.player_a2)
  ), games as (
    select
      m.id, e.title, e.event_date, e.event_year, m.division,
      m.round_label, m.board_label, m.source_url,
      case when m.outcome = 'draw' then 'draw'
           when (m.outcome = 'a_win') = m.selected_is_a then 'win'
           else 'loss' end as outcome,
      jsonb_build_array(
        jsonb_build_object('name', a1.full_name, 'go_id', a1.go_id),
        jsonb_build_object('name', a2.full_name, 'go_id', a2.go_id)
      ) as side_a,
      jsonb_build_array(
        jsonb_build_object('name', b1.full_name, 'go_id', b1.go_id),
        jsonb_build_object('name', b2.full_name, 'go_id', b2.go_id)
      ) as side_b,
      m.selected_is_a
    from oriented m
    join public.gt_history_events e on e.id = m.event_id
    join public.gt_history_people a1 on a1.id = m.player_a1
    join public.gt_history_people a2 on a2.id = m.player_a2
    join public.gt_history_people b1 on b1.id = m.player_b1
    join public.gt_history_people b2 on b2.id = m.player_b2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'title', title, 'event_date', event_date, 'event_year', event_year,
    'division', division, 'round_label', round_label, 'board_label', board_label,
    'source_url', source_url, 'outcome', outcome,
    'players', case when selected_is_a then side_a else side_b end,
    'opponents', case when selected_is_a then side_b else side_a end
  ) order by event_year desc, event_date desc nulls last, title, division, round_label, id), '[]'::jsonb)
  from games
$$;

revoke all on function public.gt_history_pair_meetings_v1(text, text) from public;
grant execute on function public.gt_history_pair_meetings_v1(text, text) to anon, authenticated;
