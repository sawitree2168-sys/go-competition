-- Athlete profile page (design 16 Nov 2026): public header + every game of the athlete in PUBLISHED events.
-- Exposes only what the public boards already show: name, institution, rank, photo, pairings and results.
-- An athlete with no entry in a published event is not visible here at all.

create or replace function public.gt_athlete_public_v1(p_athlete uuid)
returns table (id uuid, full_name text, institution text, current_rank text, photo text)
language sql stable security definer set search_path = public as $$
  select a.id, a.full_name,
         coalesce((select nullif(r.display_institution, '') from gt_registrations r
                   join gt_tournaments t on t.id = r.tournament_id
                   where r.athlete_id = a.id and t.published and r.registration_status in ('confirmed', 'withdrawn')
                   order by t.event_date desc nulls last limit 1), a.school_name),
         a.current_rank, nullif(btrim(a.avatar_url), '')
  from gt_athletes a
  where a.id = p_athlete
    and exists (select 1 from gt_registrations r join gt_tournaments t on t.id = r.tournament_id
                where r.athlete_id = a.id and t.published and r.registration_status in ('confirmed', 'withdrawn'));
$$;

create or replace function public.gt_athlete_games_v1(p_athlete uuid)
returns table (kind text, tournament_id uuid, title text, event_date date, division_id uuid, division_name text,
               round_number int, colour text, opponent_id uuid, opponent_name text, opponent_institution text,
               opponent_rank text, opponent_photo text, winner_id uuid, result_code text, result_margin text, state text)
language sql stable security definer set search_path = public as $$
  with mine as (
    select r.division_id, r.tournament_id from gt_registrations r join gt_tournaments t on t.id = r.tournament_id
    where r.athlete_id = p_athlete and t.published and r.registration_status in ('confirmed', 'withdrawn')
  ),
  who as (
    select r.division_id, r.athlete_id, a.full_name, coalesce(nullif(r.display_institution, ''), a.school_name) inst,
           a.current_rank rk, nullif(btrim(a.avatar_url), '') photo
    from gt_registrations r join mine on mine.division_id = r.division_id join gt_athletes a on a.id = r.athlete_id
  )
  select 'match', t.id, t.title, t.event_date, d.id, d.name, m.round_number,
         case when m.black_athlete_id = p_athlete then 'black' else 'white' end,
         o.athlete_id, o.full_name, o.inst, o.rk, o.photo, m.winner_athlete_id, m.result_code, m.result_margin, m.state
  from gt_matches m join mine on mine.division_id = m.division_id
  join gt_divisions d on d.id = m.division_id join gt_tournaments t on t.id = d.tournament_id
  left join who o on o.division_id = m.division_id
       and o.athlete_id = case when m.black_athlete_id = p_athlete then m.white_athlete_id else m.black_athlete_id end
  where (m.black_athlete_id = p_athlete or m.white_athlete_id = p_athlete) and m.state <> 'void'
  union all
  select 'bye', t.id, t.title, t.event_date, d.id, d.name, y.round_number, null, null, null, null, null, null, null, null, null, 'verified'
  from gt_byes y join mine on mine.division_id = y.division_id
  join gt_divisions d on d.id = y.division_id join gt_tournaments t on t.id = d.tournament_id
  where y.athlete_id = p_athlete
  order by 4 desc nulls last, 3, 7;
$$;

grant execute on function public.gt_athlete_public_v1(uuid) to anon, authenticated;
grant execute on function public.gt_athlete_games_v1(uuid) to anon, authenticated;
