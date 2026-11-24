-- Institution portal: past results from the central history (ทำเนียบดั้งสมาคม + 1go) — 24 พ.ย. 2569
--
-- 1. gt_private.history_athlete_person_v1(): links a site athlete (gt_athletes) to a history person (gt_history_people)
--    by the same GO ID, otherwise by an exact full name that belongs to exactly one history person AND exactly one
--    site athlete (identity rule 3: "ชื่อไทยเต็มตรงกับคนเดียว"). Read-only: no athlete or GO ID is changed or merged.
-- 2. gt_private.history_institutions_v1(): every institution written next to a history person's results
--    (only results sheets that carry an institution column — history_event_results_v1).
-- 3. academy_students(): adds athletes who were entered under this academy in the history. One student may belong to
--    several institutions (rule from ครูเล็ก 24 พ.ย. 2569: students study with several teachers).
-- 4. gt_private.academy_history_v1(): history-only students (a GO ID but no site athlete yet, shown read-only) and one
--    record per student per history division (games / wins / losses / draws with the same rules as gt_history_stats_v1,
--    place from history_standings_v1). Ids are prefixed "h:" so the page can tell them from live competitions.
-- 5. gt_academy_overview_v1 appends those students and records.

create or replace function gt_private.history_athlete_person_v1()
returns table (athlete_id uuid, person_id text, basis text)
language sql stable security definer set search_path = public, gt_private, pg_temp as $$
  with hp as (select id, go_id, lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')) nn from gt_history_people),
  hpn as (select nn, min(id) pid, count(*) c from hp group by nn),
  ga as (select id, go_id, lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')) nn from gt_athletes),
  gan as (select nn, count(*) c from ga group by nn),
  xw as (
    select ga.id, hp.id pid, 1 pri, 'go_id'::text basis from ga join hp on hp.go_id = ga.go_id
    union all
    select ga.id, hpn.pid, 2, 'unique_full_name'
    from ga join hpn on hpn.nn = ga.nn and hpn.c = 1 join gan on gan.nn = ga.nn and gan.c = 1
  ),
  best as (select distinct on (id) id, pid, basis from xw order by id, pri)
  -- one history person never feeds two site athletes
  select b.id, b.pid, b.basis from best b
  where (select count(*) from best b2 where b2.pid = b.pid) = 1
$$;

create or replace function gt_private.history_institutions_v1()
returns table (person_id text, institution text)
language sql stable security definer set search_path = public, gt_private, pg_temp as $$
  -- every institution a history person was entered under (a student may study at several places)
  with hpn as (
    select lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')) nn, min(id) pid, count(*) c
    from gt_history_people group by 1
  ),
  er as (
    select distinct lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')) nn, btrim(institution) institution
    from gt_private.history_event_results_v1 where nullif(btrim(institution), '') is not null
  )
  select distinct hpn.pid, er.institution from er join hpn on hpn.nn = er.nn and hpn.c = 1
$$;

create or replace function gt_private.academy_students(p_academy uuid)
returns table (athlete_id uuid)
language sql stable security definer set search_path = public, gt_private, pg_temp as $$
 with ac as (
   select gt_private.norm_inst(name) n,workspace_type
   from public.gt_academies where id=p_academy
 )
 select distinct r.athlete_id
 from public.gt_registrations r
 join public.gt_tournaments t on t.id=r.tournament_id and t.published
 join ac on ac.workspace_type='academy'
 where r.registration_status='confirmed' and gt_private.norm_inst(r.display_institution)=ac.n
 union
 select a.id from public.gt_athletes a join ac on ac.workspace_type='academy'
 where gt_private.norm_inst(a.school_name)=ac.n
 union
 select m.athlete_id from public.gt_academy_memberships m
 where m.academy_id=p_academy and m.membership_status='verified'
 union
 select l.athlete_id from public.gt_teacher_athletes l
 where l.academy_id=p_academy
   and exists(select 1 from public.gt_academy_staff s
              where s.academy_id=p_academy and s.user_id=l.teacher_user_id and s.status='active')
 union
 -- institutions written next to the athlete's results in the central history
 select x.athlete_id
 from gt_private.history_institutions_v1() h
 join gt_private.history_athlete_person_v1() x on x.person_id=h.person_id
 join ac on ac.workspace_type='academy'
 where gt_private.norm_inst(h.institution)=ac.n
$$;

create or replace function gt_private.academy_history_v1(p_academy uuid)
returns jsonb language sql stable security definer set search_path = public, gt_private, pg_temp as $$
  with ac as (select gt_private.norm_inst(name) n, workspace_type from gt_academies where id = p_academy),
  xw as (select * from gt_private.history_athlete_person_v1()),
  roster as (
    select s.athlete_id::text sid, x.person_id from gt_private.academy_students(p_academy) s join xw x on x.athlete_id = s.athlete_id
  ),
  hist_only as (
    select distinct 'h:' || p.go_id sid, p.id person_id, p.go_id, p.full_name, r.source_rank
    from gt_private.history_institutions_v1() h
    join ac on ac.workspace_type = 'academy' and gt_private.norm_inst(h.institution) = ac.n
    join gt_history_people p on p.id = h.person_id and p.go_id is not null
    left join gt_private.history_identity_registry_v1 r on r.go_id = p.go_id
    where not exists (select 1 from xw where xw.person_id = h.person_id)
  ),
  members as (select sid, person_id from roster union select sid, person_id from hist_only),
  games as (
    select mb.sid, mb.person_id, m.event_id, m.division,
           count(*) filter (where m.kind = 'played' and m.counts_for_stats)::int n,
           count(*) filter (where m.kind = 'played' and m.counts_for_stats and m.winner = mb.person_id)::int w,
           count(*) filter (where m.kind = 'played' and m.counts_for_stats and m.winner is not null and m.winner <> mb.person_id)::int l,
           count(*) filter (where m.kind = 'played' and m.counts_for_stats and m.result = 'draw')::int d
    from members mb join gt_history_matches m on mb.person_id in (m.player_a, m.player_b)
    group by 1, 2, 3, 4
  )
  select jsonb_build_object(
    'students', coalesce((select jsonb_agg(jsonb_build_object('id', sid, 'name', full_name, 'nickname', null, 'rank', source_rank,
                                                               'photo', null, 'go_id', go_id, 'added', false, 'history_only', true)
                                           order by full_name) from hist_only), '[]'::jsonb),
    'records', coalesce((select jsonb_agg(jsonb_build_object(
        'athlete_id', g.sid, 'tournament_id', 'h:' || g.event_id, 'title', e.title, 'date', e.event_date,
        'division_id', 'h:' || g.event_id || '|' || coalesce(g.division, ''), 'division', coalesce(nullif(g.division, ''), 'ไม่ระบุรุ่น'),
        'games', g.n, 'wins', g.w, 'losses', g.l, 'draws', g.d, 'pos', st.place, 'field', st.players, 'source', 'history')
        order by e.event_date desc nulls last, e.title, g.division)
      from games g join gt_history_events e on e.id = g.event_id
      left join gt_private.history_standings_v1 st on st.person_id = g.person_id and st.event_id = g.event_id
                                                   and st.division is not distinct from g.division), '[]'::jsonb));
$$;
revoke all on function gt_private.history_athlete_person_v1(), gt_private.history_institutions_v1(),
  gt_private.academy_history_v1(uuid) from public, anon, authenticated;

create or replace function public.gt_academy_overview_v1(p_academy uuid)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private as $$
declare v_role text := academy_role(p_academy); v_ac gt_academies%rowtype; v_hist jsonb;
begin
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'NO_ACCESS'); end if;
  select * into v_ac from gt_academies where id = p_academy;
  v_hist := gt_private.academy_history_v1(p_academy);
  return jsonb_build_object('ok', true,
    'academy', jsonb_build_object('id', v_ac.id, 'name', v_ac.name),
    'access', v_role,
    'role', (select s.role from gt_academy_staff s where s.academy_id = p_academy and s.user_id = auth.uid()),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.full_name, 'nickname', a.nickname, 'rank', a.current_rank,
                                          'photo', nullif(btrim(a.avatar_url), ''), 'go_id', a.go_id,
                                          'added', exists (select 1 from gt_academy_memberships m where m.academy_id = p_academy and m.athlete_id = a.id))
                       order by a.full_name)
      from academy_students(p_academy) s join gt_athletes a on a.id = s.athlete_id), '[]'::jsonb)
      || coalesce(v_hist->'students', '[]'::jsonb),
    -- One row per student per division entered (published competitions), then past results from the central history.
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
      left join pos p on p.athlete_id = r.athlete_id and p.division_id = r.division_id), '[]'::jsonb)
      || coalesce(v_hist->'records', '[]'::jsonb),
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
