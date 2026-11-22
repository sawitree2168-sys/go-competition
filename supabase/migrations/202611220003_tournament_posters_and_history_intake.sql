create table public.gt_tournament_posters_v1 (
  event_key text primary key check (event_key ~ '^[a-z0-9]+:[A-Za-z0-9_-]{1,40}$'),
  mode text not null check (mode in ('pending', 'stock', 'original')),
  style smallint,
  original_url text,
  check (
    (mode = 'pending' and style is null and original_url is null)
    or (mode = 'stock' and style is not null and style between 1 and 20 and original_url is null)
    or (mode = 'original' and style is null and original_url is not null and length(original_url) <= 2048 and (original_url ~ '^https://[^[:space:]]+$' or original_url = '/posters/buddy-go-2026-results-v2.webp'))
  )
);

alter table public.gt_tournament_posters_v1 enable row level security;
revoke all on public.gt_tournament_posters_v1 from public, anon, authenticated;
grant select on public.gt_tournament_posters_v1 to anon, authenticated;
grant insert, update on public.gt_tournament_posters_v1 to authenticated;

create policy gt_tournament_posters_public_read on public.gt_tournament_posters_v1
  for select to anon, authenticated using (
    exists (select 1 from public.gt_history_events h where h.id = event_key)
    or exists (select 1 from public.gt_tournaments t where t.published and 'tournament:' || t.id::text = event_key)
  );

create policy gt_tournament_posters_admin_read on public.gt_tournament_posters_v1
  for select to authenticated using ((select public.gt_is_platform_admin_v1()));

create policy gt_tournament_posters_admin_insert on public.gt_tournament_posters_v1
  for insert to authenticated with check ((select public.gt_is_platform_admin_v1()) and (
    exists (select 1 from public.gt_history_events h where h.id = event_key)
    or exists (select 1 from public.gt_tournaments t where 'tournament:' || t.id::text = event_key)
  ));

create policy gt_tournament_posters_admin_update on public.gt_tournament_posters_v1
  for update to authenticated using ((select public.gt_is_platform_admin_v1()))
  with check ((select public.gt_is_platform_admin_v1()) and (
    exists (select 1 from public.gt_history_events h where h.id = event_key)
    or exists (select 1 from public.gt_tournaments t where 'tournament:' || t.id::text = event_key)
  ));

create policy gt_tournament_poster_originals_upload on storage.objects
  for insert to authenticated with check (
    bucket_id = 'gt-site-assets'
    and name ~ '^tournament-posters/originals/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and (select public.gt_is_platform_admin_v1())
  );

create or replace function public.gt_photo_intake_history_v1(
  p_token uuid, p_event_id text, p_division text, p_scope text, p_athlete text, p_note text
) returns uuid
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_event record;
  v_submission uuid;
begin
  if p_scope is null or p_scope not in ('athlete', 'division')
    or (p_scope = 'athlete' and nullif(btrim(coalesce(p_athlete,'')), '') is null) then
    raise exception 'HISTORY_SCOPE_REQUIRED';
  end if;
  select id, title, event_date into v_event
  from public.gt_history_events where id = p_event_id;
  if not found or not exists (
    select 1 from public.gt_history_matches m where m.event_id = p_event_id and m.division = p_division
  ) then
    raise exception 'HISTORY_EVENT_DIVISION_REQUIRED';
  end if;
  v_submission := public.gt_photo_intake_start_v1(
    p_token, p_athlete, v_event.title,
    concat_ws(E'\n', 'รายการย้อนหลัง: ' || v_event.id, 'รุ่น: ' || p_division,
      'วันที่: ' || coalesce(v_event.event_date::text, ''),
      'ข้อมูล: ' || case p_scope when 'athlete' then 'รายบุคคล' else 'ทั้งรุ่น' end,
      nullif(btrim(p_note), ''))
  );
  update public.gt_photo_inbox_v1 set draft = jsonb_build_object(
    'event', v_event.title, 'date', coalesce(v_event.event_date::text, ''), 'division', p_division, 'games', '[]'::jsonb
  ) where id = v_submission;
  return v_submission;
end $$;

revoke all on function public.gt_photo_intake_history_v1(uuid,text,text,text,text,text) from public;
grant execute on function public.gt_photo_intake_history_v1(uuid,text,text,text,text,text) to anon, authenticated;
