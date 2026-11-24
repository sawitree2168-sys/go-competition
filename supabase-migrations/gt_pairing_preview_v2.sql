-- Pairing test mode v2 (24 พ.ย. 2569) — replaces the unmerged v1 (PR #118).
-- Rule from ครูเล็ก: pairings and results made while testing the system must NOT count anywhere — not in statistics,
-- rankings, medals, certificates, athlete profiles, institution pages or the public institution page.
--
-- While gt_tournaments.pairing_preview is on:
-- - Board / live / standings (what the organiser works with) are still shown to people who manage the event
--   (gt_can_manage_tournament_v1) and to referees through their links — everyone else sees no rounds.
-- - Everything that adds results up (athlete games and profile, certificates, site totals, institution pages,
--   institution student games, public institution page, team stats) never counts the event, for anyone.
-- "🗑 ล้างการจับคู่ทดสอบ" wipes every test round; "▶ เริ่มแข่งจริง" turns test mode off.

alter table public.gt_tournaments add column if not exists pairing_preview boolean not null default false;

do $$
declare f record; def text;
begin
  -- Organiser views: hidden from the public, still visible to the event's managers.
  for f in
    select p.oid from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('gt_division_board_v1', 'gt_division_board_v2', 'gt_division_live_v1', 'gt_division_photos_v1',
                        'gt_division_standings_v1', 'gt_division_standings_v2', 'gt_division_standings_v3')
      and p.prosrc !~ 'pairing_preview'
  loop
    def := pg_get_functiondef(f.oid);
    def := regexp_replace(def, '\mt\.published\M', '(t.published and (not t.pairing_preview or public.gt_can_manage_tournament_v1(t.id)))', 'g');
    execute def;
  end loop;
  -- Totals and statistics: a test event never counts.
  for f in
    select p.oid from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('gt_athlete_games_v1', 'gt_athlete_certificates_v1', 'gt_public_overview_v1', 'gt_academy_overview_v1',
                        'gt_academy_student_games_v1', 'gt_public_academy_v1')
      and p.prosrc !~ 'pairing_preview'
  loop
    def := pg_get_functiondef(f.oid);
    def := regexp_replace(def, '\mt\.published\M', '(t.published and not t.pairing_preview)', 'g');
    execute def;
  end loop;
  select p.oid into f from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'gt_academy_team_v1' and p.prosrc !~ 'pairing_preview';
  if found then
    execute regexp_replace(pg_get_functiondef(f.oid), '\mtt\.published\M', '(tt.published and not tt.pairing_preview)', 'g');
  end if;
end $$;

-- Direct table reads by visitors (athlete pages read verified games straight from the tables)
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

-- Wipe every round of the event (pairings, results, byes, referee calls, round clocks). Only while test mode is on.
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
  delete from gt_round_clock_v1 c using gt_divisions d where d.id = c.division_id and d.tournament_id = p_tournament;
  insert into gt_match_audit_v1 (division_id, action, after, actor)
  select d.id, 'clear_test_pairings', jsonb_build_object('matches', n_m, 'byes', n_b), v_actor
  from gt_divisions d where d.tournament_id = p_tournament;
  return jsonb_build_object('ok', true, 'matches', n_m, 'byes', n_b);
end $$;

revoke all on function public.gt_staff_set_pairing_preview_v1(uuid, boolean), public.gt_staff_clear_test_pairings_v1(uuid) from public, anon;
grant execute on function public.gt_staff_set_pairing_preview_v1(uuid, boolean), public.gt_staff_clear_test_pairings_v1(uuid) to authenticated;
