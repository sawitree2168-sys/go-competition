-- Referee console v2 (design 16 Nov 2026): optional note with a result ("หมายเหตุ (ถ้ามี)").
-- The note is for organisers and referees only; public boards never return it.

alter table public.gt_matches add column if not exists result_note text check (result_note is null or length(result_note) <= 300);

create or replace function public.gt_referee_record_result_v2(p_token text, p_code text, p_match uuid, p_result text, p_margin text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_matches m where m.id = p_match and m.tournament_id = (c.acc).tournament_id) then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  perform gt_private.record_result_core(p_match, p_result, p_margin, null, 'กรรมการ: ' || (c.acc).referee_name);
  update gt_matches set result_note = nullif(left(btrim(coalesce(p_note, '')), 300), '') where id = p_match;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.gt_referee_record_result_v2(text, text, uuid, text, text, text) from public;
grant execute on function public.gt_referee_record_result_v2(text, text, uuid, text, text, text) to anon, authenticated;

-- Same board as before, plus the note.
create or replace function public.gt_referee_board_v1(p_token text, p_code text, p_division uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_divisions d where d.id = p_division and d.tournament_id = (c.acc).tournament_id) then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  return jsonb_build_object('ok', true, 'tables', coalesce((
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
      'black', jsonb_build_object('id', m.black_athlete_id, 'name', b.full_name, 'institution', b.inst, 'rank', b.rk, 'photo', b.photo,
                                  'score', coalesce((select v from pts where pts.id = m.black_athlete_id), 0), 'checked_in', m.black_checkin_at is not null),
      'white', jsonb_build_object('id', m.white_athlete_id, 'name', w.full_name, 'institution', w.inst, 'rank', w.rk, 'photo', w.photo,
                                  'score', coalesce((select v from pts where pts.id = m.white_athlete_id), 0), 'checked_in', m.white_checkin_at is not null)
    ) order by m.pool_label nulls first, m.board_number)
    from gt_matches m join latest l on l.pl = coalesce(m.pool_label, '') and l.r = m.round_number
    left join who b on b.athlete_id = m.black_athlete_id left join who w on w.athlete_id = m.white_athlete_id
    where m.division_id = p_division and m.state <> 'void'), '[]'::jsonb));
end $$;
