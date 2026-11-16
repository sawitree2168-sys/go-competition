-- Match cards ("จับคู่ & ผล" mockup, 16 Nov 2026): the public board and the referee board also return each
-- player's rank label and photo URL (gt_athletes.avatar_url, a public image URL; null = initials avatar).
-- Additive: new function gt_division_board_v2; gt_referee_board_v1 keeps its signature and gains two JSON keys.

create or replace function public.gt_division_board_v2(p_division uuid)
returns table (
  kind text, match_id uuid, pool_label text, round_number integer, board_number integer,
  black_id uuid, black_name text, black_institution text, black_rank text, black_photo text,
  white_id uuid, white_name text, white_institution text, white_rank text, white_photo text,
  winner_id uuid, result_code text, result_margin text, state text
)
language sql stable security definer set search_path = public as $$
with div as (
  select d.id, d.tournament_id from gt_divisions d join gt_tournaments t on t.id = d.tournament_id
  where d.id = p_division and (t.published or gt_can_manage_tournament_v1(t.id))
),
who as (
  select r.athlete_id, a.full_name, coalesce(nullif(r.display_institution, ''), a.school_name) as inst,
         a.current_rank as rk, nullif(btrim(a.avatar_url), '') as photo
  from gt_registrations r join div on r.division_id = div.id join gt_athletes a on a.id = r.athlete_id
)
select 'match', m.id, m.pool_label, m.round_number, m.board_number,
       m.black_athlete_id, b.full_name, b.inst, b.rk, b.photo,
       m.white_athlete_id, w.full_name, w.inst, w.rk, w.photo,
       m.winner_athlete_id, m.result_code, m.result_margin, m.state
from gt_matches m join div on m.division_id = div.id
left join who b on b.athlete_id = m.black_athlete_id left join who w on w.athlete_id = m.white_athlete_id
where m.state <> 'void'
union all
select 'bye', null, y.pool_label, y.round_number, null, y.athlete_id, b.full_name, b.inst, b.rk, b.photo,
       null, null, null, null, null, null, null, null, null
from gt_byes y join div on y.division_id = div.id left join who b on b.athlete_id = y.athlete_id
order by 3 nulls first, 4, 1 desc, 5;
$$;
grant execute on function public.gt_division_board_v2(uuid) to anon, authenticated;

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
    ), pts as (  -- score before the shown round: wins + byes + ½ per draw, verified results only
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
      'result_code', m.result_code, 'result_margin', m.result_margin, 'winner', m.winner_athlete_id,
      'black', jsonb_build_object('id', m.black_athlete_id, 'name', b.full_name, 'institution', b.inst, 'rank', b.rk, 'photo', b.photo,
                                  'score', coalesce((select v from pts where pts.id = m.black_athlete_id), 0), 'checked_in', m.black_checkin_at is not null),
      'white', jsonb_build_object('id', m.white_athlete_id, 'name', w.full_name, 'institution', w.inst, 'rank', w.rk, 'photo', w.photo,
                                  'score', coalesce((select v from pts where pts.id = m.white_athlete_id), 0), 'checked_in', m.white_checkin_at is not null)
    ) order by m.pool_label nulls first, m.board_number)
    from gt_matches m join latest l on l.pl = coalesce(m.pool_label, '') and l.r = m.round_number
    left join who b on b.athlete_id = m.black_athlete_id left join who w on w.athlete_id = m.white_athlete_id
    where m.division_id = p_division and m.state <> 'void'), '[]'::jsonb));
end $$;
