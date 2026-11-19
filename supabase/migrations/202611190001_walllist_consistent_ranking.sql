CREATE OR REPLACE FUNCTION gt_private.history_walllist_v1(p_event_id text, p_division text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
 with ev as (select * from public.gt_history_events where id = p_event_id),
 divs as (
   select m.division, count(distinct m.id) filter (where m.kind = 'played') games,
          bool_and(m.round_label is not null) has_rounds,
          count(distinct pid) players
   from public.gt_history_matches m
   cross join lateral (values (m.player_a), (m.player_b)) v(pid)
   where m.event_id = p_event_id and v.pid is not null
   group by m.division
 ),
 sel as (
   select coalesce((select d.division from divs d where d.division = p_division),
                   (select d.division from divs d order by d.has_rounds desc, d.players desc, d.division limit 1)) d
 ),
 m as (select * from public.gt_history_matches where event_id = p_event_id and division = (select d from sel)),
 res as (
   select m.id, m.round_label, m.kind, s.pid,
          case when s.pid = m.player_a then m.player_b else m.player_a end opp,
          case when m.kind = 'bye' then 'bye'
               when m.kind = 'not_played' then 'not_played'
               when m.result = 'draw' then 'draw'
               when m.winner = s.pid then 'win' else 'loss' end outcome
   from m cross join lateral (values (m.player_a), (m.player_b)) s(pid)
   where s.pid is not null
 ),
 res2 as (
   select r.*, case r.outcome when 'win' then 1.0 when 'bye' then 1.0 when 'draw' then 0.5 else 0 end pts,
          row_number() over (partition by r.pid order by
             case when r.round_label ~ '^\d+$' then r.round_label::int end nulls last, r.id) seq
   from res r
 ),
 tot as (
   select pid, sum(pts) points,
          count(*) filter (where outcome = 'win' and kind = 'played') wins,
          count(*) filter (where outcome = 'loss' and kind = 'played') losses,
          count(*) filter (where outcome = 'draw') draws,
          count(*) filter (where outcome = 'bye') byes,
          count(*) filter (where kind = 'walkover') walkovers
   from res2 group by pid
 ),
 sos as (
   select r.pid, coalesce(sum(t.points), 0) sos
   from res2 r left join tot t on t.pid = r.opp and r.kind in ('played','walkover')
   group by r.pid
 ),
 sosos as (
   select r.pid, coalesce(sum(s.sos), 0) sosos
   from res2 r left join sos s on s.pid = r.opp and r.kind in ('played','walkover')
   group by r.pid
 ),
 srcplace as (
   select o.person_id pid, min(o.placing_no) placing
   from gt_private.history_player_observations_v1 o
   where o.event_id = p_event_id and o.division = (select d from sel)
   group by o.person_id
 ),
 rank_policy as (
   select count(sp.placing) = count(*) and count(distinct sp.placing) = count(*) as source_complete
   from tot t left join srcplace sp using(pid)
 ),
 placed as (
   select t.*, s.sos, ss.sosos, sp.placing, p.full_name, p.go_id,
          row_number() over (order by case when (select source_complete from rank_policy) then sp.placing end nulls last, t.points desc, s.sos desc, ss.sosos desc, p.full_name, t.pid) place
   from tot t join sos s using (pid) join sosos ss using (pid)
   left join srcplace sp using (pid)
   join public.gt_history_people p on p.id = t.pid
 ),
 tokens as (
   select r.pid, jsonb_agg(jsonb_build_object(
            'round', coalesce(r.round_label, r.seq::text),
            'token', case r.outcome when 'bye' then 'บาย' when 'not_played' then '–'
                       else coalesce(op.place::text, '?') || case r.outcome when 'win' then '+' when 'loss' then '-' else '=' end end,
            'outcome', r.outcome, 'walkover', r.kind = 'walkover',
            'opponent', op.full_name, 'opponent_go_id', op.go_id) order by r.seq) t,
          max(r.seq) n
   from res2 r left join placed op on op.pid = r.opp
   group by r.pid
 )
 select jsonb_build_object(
   'event', (select jsonb_build_object('id', id, 'title', title, 'event_date', event_date, 'date_status', date_status) from ev),
   'divisions', coalesce((select jsonb_agg(jsonb_build_object('name', division, 'games', games, 'players', players, 'has_rounds', has_rounds) order by division) from divs), '[]'::jsonb),
   'division', (select d from sel),
   'ranking_mode', case when (select source_complete from rank_policy) then 'source' else 'calculated' end,
   'has_rounds', (select has_rounds from divs where division = (select d from sel)),
   'rounds', coalesce((select max(n) from tokens), 0),
   'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'place', p.place, 'source_place', p.placing, 'full_name', p.full_name, 'go_id', p.go_id,
        'wins', p.wins, 'losses', p.losses, 'draws', p.draws, 'byes', p.byes, 'walkovers', p.walkovers,
        'points', p.points, 'sos', p.sos, 'sosos', p.sosos, 'rounds', tk.t) order by p.place)
      from placed p left join tokens tk using (pid)), '[]'::jsonb)
 )
 where exists (select 1 from ev)
$function$

-- Refresh only the derived profile standings cache, using the same ranking policy.
select gt_private.refresh_history_standings_v1();
