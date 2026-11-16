-- Competition list (design 16 Nov 2026): venue shown on each event card and on the event page.
alter table public.gt_tournaments add column if not exists venue text check (venue is null or length(venue) <= 160);

create or replace function public.gt_staff_set_venue_v1(p_tournament uuid, p_venue text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1(p_tournament);
begin
  update gt_tournaments set venue = nullif(left(btrim(coalesce(p_venue, '')), 160), '') where id = p_tournament;
  insert into gt_match_audit_v1 (action, after, actor) values ('set_venue', jsonb_build_object('tournament', p_tournament, 'venue', p_venue), v_actor);
end $$;
revoke all on function public.gt_staff_set_venue_v1(uuid, text) from public, anon;
grant execute on function public.gt_staff_set_venue_v1(uuid, text) to authenticated;
