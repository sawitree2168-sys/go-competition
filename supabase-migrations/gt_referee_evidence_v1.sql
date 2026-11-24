-- Referee page: 15-minute clock with evidence, who decided each table, name corrections, no draws (24 พ.ย. 2569)
-- Rules from ครูเล็ก:
-- - No draw result any more (old draws keep their ½ point; new results cannot be a draw).
-- - Referees start a 15-minute clock for the round. A player who is not there after 15 minutes is recorded as absent
--   with evidence (round start time, the time it was marked, minutes, which referee). A late arrival keeps how many
--   minutes late they checked in.
-- - Every table shows which referee (or admin) decided the result, so a wrong result can be traced to its referee.
-- - Referees may correct a misspelled athlete name; every change is logged (old name, new name, who, when).

-- 1. No new draws
create or replace function gt_private.record_result_core(p_match uuid, p_result text, p_margin text, p_actor uuid, p_actor_label text)
returns void language plpgsql security definer set search_path = public as $$
declare m gt_matches%rowtype; v_winner uuid; v_margin text;
begin
  if p_result is null or p_result not in ('black_win','white_win','black_win_forfeit','white_win_forfeit','double_loss','double_forfeit') then
    raise exception 'INVALID_RESULT';
  end if;
  select * into m from gt_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.state = 'void' then raise exception 'MATCH_VOID'; end if;
  if exists (select 1 from gt_matches x where x.division_id = m.division_id and x.pool_label is not distinct from m.pool_label
             and x.round_number > m.round_number and x.state <> 'void') then
    raise exception 'LATER_ROUND_ALREADY_PUBLISHED';
  end if;
  v_winner := case when p_result in ('black_win','black_win_forfeit') then m.black_athlete_id
                   when p_result in ('white_win','white_win_forfeit') then m.white_athlete_id end;
  v_margin := case when p_result in ('black_win','white_win') then nullif(btrim(p_margin), '') end;
  update gt_matches set result_code = p_result, winner_athlete_id = v_winner, result_margin = v_margin,
         state = 'verified', verified_at = now()
   where id = p_match;
  insert into gt_match_audit_v1 (match_id, division_id, action, before, after, actor, actor_label)
  values (p_match, m.division_id, case when m.state = 'verified' then 'correct_result' else 'record_result' end,
          jsonb_build_object('result', m.result_code, 'margin', m.result_margin, 'state', m.state),
          jsonb_build_object('result', p_result, 'margin', v_margin), p_actor, p_actor_label);
end $$;

-- 2. Tables
create table if not exists public.gt_round_clock_v1 (
  division_id uuid not null references public.gt_divisions(id) on delete cascade,
  pool text not null default '',
  round integer not null,
  started_at timestamptz not null default now(),
  started_by text,
  primary key (division_id, pool, round)
);
create table if not exists public.gt_absence_evidence_v1 (
  id bigserial primary key,
  match_id uuid not null references public.gt_matches(id) on delete cascade,
  side text not null check (side in ('black', 'white')),
  clock_started_at timestamptz not null,
  marked_at timestamptz not null default now(),
  minutes numeric not null,
  actor_label text,
  note text
);
create table if not exists public.gt_athlete_name_log_v1 (
  id bigserial primary key,
  athlete_id uuid not null references public.gt_athletes(id) on delete cascade,
  tournament_id uuid references public.gt_tournaments(id) on delete set null,
  old_name text not null,
  new_name text not null,
  actor_label text,
  changed_at timestamptz not null default now()
);
alter table public.gt_round_clock_v1 enable row level security;
alter table public.gt_absence_evidence_v1 enable row level security;
alter table public.gt_athlete_name_log_v1 enable row level security;
revoke all on public.gt_round_clock_v1, public.gt_absence_evidence_v1, public.gt_athlete_name_log_v1 from anon, authenticated;

-- Who decided a table (latest result entry), readable label for staff ids.
create or replace function gt_private.match_decider_v1(p_match uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('by', coalesce(a.actor_label,
           (select 'แอดมิน: ' || coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), nullif(btrim(u.raw_user_meta_data->>'display_name'), ''), split_part(u.email, '@', 1))
              from auth.users u where u.id = a.actor), 'ไม่ทราบ'),
         'at', a.created_at, 'edits', (select count(*) from gt_match_audit_v1 x where x.match_id = p_match and x.action in ('record_result', 'correct_result')) - 1)
  from gt_match_audit_v1 a where a.match_id = p_match and a.action in ('record_result', 'correct_result')
  order by a.created_at desc limit 1
$$;

-- Clock, late minutes and absence evidence of one table.
create or replace function gt_private.match_timing_v1(p_match uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'clock_started_at', c.started_at, 'clock_started_by', c.started_by,
    'black_checkin_at', m.black_checkin_at, 'white_checkin_at', m.white_checkin_at,
    'black_late', case when c.started_at is not null and m.black_checkin_at > c.started_at + interval '1 minute' then floor(extract(epoch from m.black_checkin_at - c.started_at) / 60) end,
    'white_late', case when c.started_at is not null and m.white_checkin_at > c.started_at + interval '1 minute' then floor(extract(epoch from m.white_checkin_at - c.started_at) / 60) end,
    'absence', coalesce((select jsonb_agg(jsonb_build_object('side', e.side, 'clock_started_at', e.clock_started_at, 'marked_at', e.marked_at,
                                                             'minutes', e.minutes, 'by', e.actor_label, 'note', e.note) order by e.marked_at)
                         from gt_absence_evidence_v1 e where e.match_id = m.id), '[]'::jsonb))
  from gt_matches m left join gt_round_clock_v1 c on c.division_id = m.division_id and c.pool = coalesce(m.pool_label, '') and c.round = m.round_number
  where m.id = p_match
$$;

-- 3. Referee functions
create or replace function public.gt_referee_start_clock_v1(p_token text, p_code text, p_division uuid, p_pool text, p_round integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; v_at timestamptz;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_matches m where m.division_id = p_division and m.tournament_id = (c.acc).tournament_id
                 and coalesce(m.pool_label, '') = coalesce(p_pool, '') and m.round_number = p_round and m.state <> 'void') then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  insert into gt_round_clock_v1 (division_id, pool, round, started_by) values (p_division, coalesce(p_pool, ''), p_round, 'กรรมการ: ' || (c.acc).referee_name)
  on conflict do nothing;
  select started_at into v_at from gt_round_clock_v1 where division_id = p_division and pool = coalesce(p_pool, '') and round = p_round;
  return jsonb_build_object('ok', true, 'started_at', v_at);
end $$;

create or replace function public.gt_referee_mark_absent_v1(p_token text, p_code text, p_match uuid, p_side text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; m gt_matches%rowtype; v_clock timestamptz; v_min numeric; v_label text; v_other_here boolean; v_other_absent boolean;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if p_side not in ('black', 'white') then return jsonb_build_object('ok', false, 'error', 'INVALID_SIDE'); end if;
  select * into m from gt_matches where id = p_match and tournament_id = (c.acc).tournament_id;
  if m.id is null then return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT'); end if;
  if (p_side = 'black' and m.black_checkin_at is not null) or (p_side = 'white' and m.white_checkin_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_HERE');
  end if;
  select started_at into v_clock from gt_round_clock_v1 where division_id = m.division_id and pool = coalesce(m.pool_label, '') and round = m.round_number;
  if v_clock is null then return jsonb_build_object('ok', false, 'error', 'NO_CLOCK'); end if;
  v_min := round(extract(epoch from now() - v_clock) / 60, 1);
  if v_min < 15 then return jsonb_build_object('ok', false, 'error', 'TOO_EARLY', 'minutes', v_min); end if;
  v_label := 'กรรมการ: ' || (c.acc).referee_name;
  insert into gt_absence_evidence_v1 (match_id, side, clock_started_at, minutes, actor_label, note)
  values (m.id, p_side, v_clock, v_min, v_label, nullif(left(btrim(coalesce(p_note, '')), 300), ''));
  v_other_here := case when p_side = 'black' then m.white_checkin_at is not null else m.black_checkin_at is not null end;
  v_other_absent := exists (select 1 from gt_absence_evidence_v1 e where e.match_id = m.id and e.side <> p_side);
  if v_other_here then
    perform gt_private.record_result_core(m.id, case when p_side = 'black' then 'white_win_forfeit' else 'black_win_forfeit' end, null, null, v_label);
  elsif v_other_absent then
    perform gt_private.record_result_core(m.id, 'double_forfeit', null, null, v_label);
  end if;
  update gt_matches set result_note = coalesce(nullif(btrim(result_note), '') || ' · ', '') || 'ไม่มาเกิน 15 นาที (' || case when p_side = 'black' then 'ดำ' else 'ขาว' end || ')'
   where id = m.id and (v_other_here or v_other_absent);
  return jsonb_build_object('ok', true, 'minutes', v_min, 'result_recorded', v_other_here or v_other_absent);
end $$;

create or replace function public.gt_referee_rename_v1(p_token text, p_code text, p_athlete uuid, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; v_new text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'); v_old text;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_registrations r where r.athlete_id = p_athlete and r.tournament_id = (c.acc).tournament_id) then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  if length(v_new) < 3 or length(v_new) > 120 or v_new !~ '\s' then return jsonb_build_object('ok', false, 'error', 'NAME'); end if;
  select full_name into v_old from gt_athletes where id = p_athlete for update;
  if v_old = v_new then return jsonb_build_object('ok', true, 'changed', false); end if;
  update gt_athletes set full_name = v_new where id = p_athlete;
  insert into gt_athlete_name_log_v1 (athlete_id, tournament_id, old_name, new_name, actor_label)
  values (p_athlete, (c.acc).tournament_id, v_old, v_new, 'กรรมการ: ' || (c.acc).referee_name);
  return jsonb_build_object('ok', true, 'changed', true, 'old_name', v_old);
end $$;

-- 4. Board with timing, decider and absence evidence (same tables as before)
create or replace function public.gt_referee_board_v1(p_token text, p_code text, p_division uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_divisions d where d.id = p_division and d.tournament_id = (c.acc).tournament_id) then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  return jsonb_build_object('ok', true, 'now', now(), 'tables', coalesce((
    with latest as (
      select coalesce(m.pool_label, '') pl, max(m.round_number) r from gt_matches m where m.division_id = p_division and m.state <> 'void' group by 1
    ), who as (
      select r.athlete_id, a.full_name, coalesce(nullif(r.display_institution, ''), a.school_name) inst,
             a.current_rank rk, nullif(btrim(a.avatar_url), '') photo
      from gt_registrations r join gt_athletes a on a.id = r.athlete_id where r.division_id = p_division
    ), pts as (
      select p.id, coalesce(sum(p.v), 0) v from (
        select m.black_athlete_id id, case when m.result_code = 'draw' then 0.5 when m.winner_athlete_id = m.black_athlete_id then 1 else 0 end v, m.round_number rn, coalesce(m.pool_label, '') pl
          from gt_matches m where m.division_id = p_division and m.state = 'verified'
        union all
        select m.white_athlete_id, case when m.result_code = 'draw' then 0.5 when m.winner_athlete_id = m.white_athlete_id then 1 else 0 end, m.round_number, coalesce(m.pool_label, '')
          from gt_matches m where m.division_id = p_division and m.state = 'verified'
        union all
        select y.athlete_id, 1, y.round_number, coalesce(y.pool_label, '') from gt_byes y where y.division_id = p_division
      ) p join latest l on l.pl = p.pl and p.rn < l.r group by p.id
    )
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'pool', m.pool_label, 'round', m.round_number, 'board', m.board_number, 'state', m.state,
      'result_code', m.result_code, 'result_margin', m.result_margin, 'winner', m.winner_athlete_id, 'note', m.result_note,
      'decided', gt_private.match_decider_v1(m.id), 'timing', gt_private.match_timing_v1(m.id),
      'black', jsonb_build_object('id', m.black_athlete_id, 'name', b.full_name, 'institution', b.inst, 'rank', b.rk, 'photo', b.photo,
                                  'score', coalesce((select v from pts where pts.id = m.black_athlete_id), 0), 'checked_in', m.black_checkin_at is not null),
      'white', jsonb_build_object('id', m.white_athlete_id, 'name', w.full_name, 'institution', w.inst, 'rank', w.rk, 'photo', w.photo,
                                  'score', coalesce((select v from pts where pts.id = m.white_athlete_id), 0), 'checked_in', m.white_checkin_at is not null)
    ) order by m.pool_label nulls first, m.board_number)
    from gt_matches m join latest l on l.pl = coalesce(m.pool_label, '') and l.r = m.round_number
    left join who b on b.athlete_id = m.black_athlete_id left join who w on w.athlete_id = m.white_athlete_id
    where m.division_id = p_division and m.state <> 'void'), '[]'::jsonb));
end $$;

-- 5. Organiser: the same evidence per table + name changes of the event
create or replace function public.gt_staff_match_log_v1(p_division uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_t uuid;
begin
  select tournament_id into v_t from gt_divisions where id = p_division;
  if v_t is null or not public.gt_can_manage_tournament_v1(v_t) then return jsonb_build_object('ok', false, 'error', 'NOT_ALLOWED'); end if;
  return jsonb_build_object('ok', true,
    'matches', coalesce((select jsonb_object_agg(m.id, jsonb_build_object('decided', gt_private.match_decider_v1(m.id), 'timing', gt_private.match_timing_v1(m.id)))
                         from gt_matches m where m.division_id = p_division and m.state <> 'void'), '{}'::jsonb),
    'renames', coalesce((select jsonb_agg(jsonb_build_object('athlete_id', l.athlete_id, 'old', l.old_name, 'new', l.new_name, 'by', l.actor_label, 'at', l.changed_at) order by l.changed_at desc)
                         from gt_athlete_name_log_v1 l where l.tournament_id = v_t), '[]'::jsonb));
end $$;

create or replace function public.gt_staff_start_clock_v1(p_division uuid, p_pool text, p_round integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_t uuid; v_at timestamptz;
begin
  select tournament_id into v_t from gt_divisions where id = p_division;
  if v_t is null or not public.gt_can_manage_tournament_v1(v_t) then return jsonb_build_object('ok', false, 'error', 'NOT_ALLOWED'); end if;
  insert into gt_round_clock_v1 (division_id, pool, round, started_by)
  values (p_division, coalesce(p_pool, ''), p_round,
          'แอดมิน: ' || coalesce((select coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)) from auth.users u where u.id = auth.uid()), ''))
  on conflict do nothing;
  select started_at into v_at from gt_round_clock_v1 where division_id = p_division and pool = coalesce(p_pool, '') and round = p_round;
  return jsonb_build_object('ok', true, 'started_at', v_at);
end $$;

revoke all on function public.gt_referee_start_clock_v1(text, text, uuid, text, integer), public.gt_referee_mark_absent_v1(text, text, uuid, text, text),
  public.gt_referee_rename_v1(text, text, uuid, text), public.gt_staff_match_log_v1(uuid), public.gt_staff_start_clock_v1(uuid, text, integer) from public;
grant execute on function public.gt_referee_start_clock_v1(text, text, uuid, text, integer), public.gt_referee_mark_absent_v1(text, text, uuid, text, text),
  public.gt_referee_rename_v1(text, text, uuid, text) to anon, authenticated;
grant execute on function public.gt_staff_match_log_v1(uuid), public.gt_staff_start_clock_v1(uuid, text, integer) to authenticated;
revoke all on function gt_private.match_decider_v1(uuid), gt_private.match_timing_v1(uuid) from public, anon, authenticated;
