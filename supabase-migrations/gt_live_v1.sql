-- Live updates (16 Nov 2026): a tiny "has anything changed?" value per division.
-- Public pages, the organiser console, the referee console and the projector page ask for it every
-- few seconds and reload only when it changes. Published divisions for everyone; unpublished ones only
-- for that event's staff. Returns an md5 — no names, results or notes leave the database through it.

create or replace function public.gt_division_live_v1(p_division uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when exists (
    select 1 from gt_divisions d join gt_tournaments t on t.id = d.tournament_id
    where d.id = p_division and (t.published or gt_can_manage_tournament_v1(t.id))
  ) then md5(
    coalesce((select string_agg(concat_ws(':', m.id, m.state, m.round_number, m.board_number, m.black_athlete_id, m.white_athlete_id,
                                          m.winner_athlete_id, m.result_code, m.result_margin,
                                          (m.black_checkin_at is not null), (m.white_checkin_at is not null)), ',' order by m.id)
              from gt_matches m where m.division_id = p_division), '')
    || '|' || coalesce((select string_agg(concat_ws(':', b.round_number, b.athlete_id, b.pool_label), ',' order by b.round_number, b.athlete_id)
              from gt_byes b where b.division_id = p_division), '')
    || '|' || coalesce((select string_agg(concat_ws(':', r.athlete_id, r.registration_status, r.pool_label), ',' order by r.athlete_id)
              from gt_registrations r where r.division_id = p_division), '')
    || '|' || coalesce((select count(*)::text || ':' || coalesce(max(a.created_at)::text, '')
              from gt_announcements a join gt_divisions d on d.tournament_id = a.tournament_id where d.id = p_division), '')
  ) end
$$;

revoke all on function public.gt_division_live_v1(uuid) from public;
grant execute on function public.gt_division_live_v1(uuid) to anon, authenticated;
