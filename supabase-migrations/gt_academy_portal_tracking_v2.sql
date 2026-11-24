-- Institution portal tracking v2 (24 พ.ย. 2569)
-- Tracking now returns every round per student/division (opponent, colour, board, outcome), byes from gt_byes,
-- running points (win/bye = 1, draw = ½) and division_id so the page can tell two divisions of one event apart.
-- Only published competitions are shown, as before.

create or replace function public.gt_academy_overview_v1(p_academy uuid)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private as $$
declare v_role text := academy_role(p_academy); v_ac gt_academies%rowtype;
begin
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'NO_ACCESS'); end if;
  select * into v_ac from gt_academies where id = p_academy;
  return jsonb_build_object('ok', true,
    'academy', jsonb_build_object('id', v_ac.id, 'name', v_ac.name),
    'access', v_role,
    'role', (select s.role from gt_academy_staff s where s.academy_id = p_academy and s.user_id = auth.uid()),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.full_name, 'nickname', a.nickname, 'rank', a.current_rank,
                                          'photo', nullif(btrim(a.avatar_url), ''), 'go_id', a.go_id,
                                          'added', exists (select 1 from gt_academy_memberships m where m.academy_id = p_academy and m.athlete_id = a.id))
                       order by a.full_name)
      from academy_students(p_academy) s join gt_athletes a on a.id = s.athlete_id), '[]'::jsonb),
    -- One row per student per division entered (published competitions).
    'records', coalesce((
      with st as (select athlete_id from academy_students(p_academy)),
      regs as (
        select r.athlete_id, r.division_id, r.tournament_id, r.pool_label, t.title, t.event_date, d.name dname
        from gt_registrations r join st on st.athlete_id = r.athlete_id
        join gt_tournaments t on t.id = r.tournament_id join gt_divisions d on d.id = r.division_id
        where t.published and r.registration_status in ('confirmed', 'withdrawn')
      ),
      games as (
        select g.athlete_id, g.division_id,
               count(*) filter (where m.id is not null)::int n,
               count(*) filter (where m.winner_athlete_id = g.athlete_id)::int w,
               count(*) filter (where m.result_code = 'draw')::int d,
               count(*) filter (where m.id is not null and m.result_code <> 'draw' and m.winner_athlete_id is distinct from g.athlete_id)::int l
        from regs g left join gt_matches m on m.division_id = g.division_id and m.state = 'verified'
             and g.athlete_id in (m.black_athlete_id, m.white_athlete_id)
        group by 1, 2
      ),
      pos as (
        select dv.division_id, s.athlete_id, s.pos, count(*) over (partition by dv.division_id, s.pool_label) field
        from (select distinct division_id from regs) dv cross join lateral gt_division_standings_v3(dv.division_id) s
        where not s.withdrawn
      )
      select jsonb_agg(jsonb_build_object('athlete_id', r.athlete_id, 'tournament_id', r.tournament_id, 'title', r.title,
                                          'date', r.event_date, 'division_id', r.division_id, 'division', r.dname,
                                          'games', coalesce(g.n, 0), 'wins', coalesce(g.w, 0), 'losses', coalesce(g.l, 0), 'draws', coalesce(g.d, 0),
                                          'pos', p.pos, 'field', p.field)
                       order by r.event_date desc nulls last, r.title, r.dname)
      from regs r left join games g on g.athlete_id = r.athlete_id and g.division_id = r.division_id
      left join pos p on p.athlete_id = r.athlete_id and p.division_id = r.division_id), '[]'::jsonb),
    -- Live follow-up: every round of each student in each division (games + byes), latest first.
    'tracking', coalesce((
      with st as (select athlete_id from academy_students(p_academy)),
      ev as (
        select st.athlete_id, m.tournament_id, m.division_id, m.round_number rnd, m.board_number board,
               case when m.black_athlete_id = st.athlete_id then m.white_athlete_id else m.black_athlete_id end opp_id,
               case when m.black_athlete_id = st.athlete_id then 'black' else 'white' end colour,
               case when m.state <> 'verified' then 'pending'
                    when m.result_code = 'draw' then 'draw'
                    when m.winner_athlete_id = st.athlete_id then 'win' else 'loss' end outcome
        from st join gt_matches m on st.athlete_id in (m.black_athlete_id, m.white_athlete_id) and m.state <> 'void'
        join gt_tournaments t on t.id = m.tournament_id and t.published
        union all
        select st.athlete_id, b.tournament_id, b.division_id, b.round_number, null, null, null, 'bye'
        from st join gt_byes b on b.athlete_id = st.athlete_id
        join gt_tournaments t on t.id = b.tournament_id and t.published
      ),
      named as (select ev.*, o.full_name opp from ev left join gt_athletes o on o.id = ev.opp_id),
      grp as (
        select athlete_id, tournament_id, division_id,
               jsonb_agg(jsonb_build_object('round', rnd, 'board', board, 'opponent', opp, 'opponent_id', opp_id,
                                            'colour', colour, 'outcome', outcome) order by rnd) rounds,
               sum(case outcome when 'win' then 1 when 'bye' then 1 when 'draw' then 0.5 else 0 end) points
        from named group by 1, 2, 3
      ),
      last as (
        select distinct on (athlete_id, division_id) * from named
        order by athlete_id, division_id, rnd desc, (outcome = 'bye')
      )
      select jsonb_agg(jsonb_build_object('athlete_id', l.athlete_id, 'tournament_id', l.tournament_id, 'title', t.title, 'date', t.event_date,
                                          'division_id', l.division_id, 'division', d.name, 'round', l.rnd, 'board', l.board,
                                          'opponent', l.opp, 'outcome', l.outcome, 'points', g.points, 'rounds', g.rounds)
                       order by t.event_date desc nulls last, l.rnd desc, l.board nulls last)
      from last l join grp g on g.athlete_id = l.athlete_id and g.division_id = l.division_id
      join gt_tournaments t on t.id = l.tournament_id join gt_divisions d on d.id = l.division_id), '[]'::jsonb));
end $$;
