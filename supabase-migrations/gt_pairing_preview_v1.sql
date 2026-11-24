-- Pairing test mode (23 Nov 2026).
-- While gt_tournaments.pairing_preview is on, the event's pairings, results, byes and standings are visible only to
-- people who manage the event (gt_can_manage_tournament_v1) — and to referees through their own links.
-- The public pages, athlete profiles, academy pages, GO FAN and the site totals see no rounds for it.
-- Event info, divisions and entrant lists stay public as before.

alter table public.gt_tournaments add column if not exists pairing_preview boolean not null default false;

-- Every public reader that gates on "t.published" now also needs "not t.pairing_preview".
do $$
declare f record; def text;
begin
  for f in
    select p.oid from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('gt_athlete_games_v1', 'gt_division_board_v1', 'gt_division_board_v2', 'gt_division_live_v1',
                        'gt_division_standings_v1', 'gt_division_standings_v2', 'gt_division_standings_v3',
                        'gt_public_overview_v1', 'gt_academy_overview_v1')
      and p.prosrc !~ 'pairing_preview'
  loop
    def := pg_get_functiondef(f.oid);
    def := regexp_replace(def, '\mt\.published\M', '(t.published and not t.pairing_preview)', 'g');
    execute def;
  end loop;
end $$;

drop policy if exists gt_matches_public_verified_opt_in_v1 on public.gt_matches;
create policy gt_matches_public_verified_opt_in_v1 on public.gt_matches for select to anon using (
  state = 'verified' and verified_at is not null
  and exists (select 1 from gt_tournaments t where t.id = gt_matches.tournament_id and t.published and not t.pairing_preview)
  and exists (select 1 from gt_athletes b where b.id = gt_matches.black_athlete_id and b.profile_public)
  and exists (select 1 from gt_athletes w where w.id = gt_matches.white_athlete_id and w.profile_public));

drop policy if exists gt_byes_public_opt_in_v1 on public.gt_byes;
create policy gt_byes_public_opt_in_v1 on public.gt_byes for select to public using (
  exists (select 1 from gt_tournaments t where t.id = gt_byes.tournament_id and t.published and not t.pairing_preview)
  and exists (select 1 from gt_athletes a where a.id = gt_byes.athlete_id and a.profile_public));

create or replace function public.gt_staff_set_pairing_preview_v1(p_tournament uuid, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  update gt_tournaments set pairing_preview = coalesce(p_on, false) where id = p_tournament;
  return jsonb_build_object('ok', true, 'preview', coalesce(p_on, false));
end $$;

-- Wipe every round of the event (pairings, results, byes, referee calls). Only while test mode is on.
create or replace function public.gt_staff_clear_test_pairings_v1(p_tournament uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1(p_tournament); n_m int; n_b int;
begin
  if not coalesce((select pairing_preview from gt_tournaments where id = p_tournament), false) then
    return jsonb_build_object('ok', false, 'error', 'NOT_IN_TEST_MODE');
  end if;
  delete from gt_matches where tournament_id = p_tournament; get diagnostics n_m = row_count;
  delete from gt_byes where tournament_id = p_tournament; get diagnostics n_b = row_count;
  delete from gt_referee_calls_v1 where tournament_id = p_tournament;
  insert into gt_match_audit_v1 (division_id, action, after, actor)
  select d.id, 'clear_test_pairings', jsonb_build_object('matches', n_m, 'byes', n_b), v_actor
  from gt_divisions d where d.tournament_id = p_tournament;
  return jsonb_build_object('ok', true, 'matches', n_m, 'byes', n_b);
end $$;

revoke all on function public.gt_staff_set_pairing_preview_v1(uuid, boolean), public.gt_staff_clear_test_pairings_v1(uuid) from public, anon;
grant execute on function public.gt_staff_set_pairing_preview_v1(uuid, boolean), public.gt_staff_clear_test_pairings_v1(uuid) to authenticated;
