-- Athlete photo on the web application form (16 Nov 2026).
-- The applicant crops the photo in the browser (square JPEG, 400 px) and uploads it to a PRIVATE bucket
-- under pending/<random uuid>.jpg. Nobody but the event's organisers can view it.
-- On approval the organiser's browser copies it to the PUBLIC avatar bucket (approved/<application id>.jpg)
-- and the athlete's avatar_url points there, so it shows on cards, pairings and standings.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('gt-application-photos', 'gt-application-photos', false, 1048576, array['image/jpeg']),
  ('gt-athlete-avatars', 'gt-athlete-avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

alter table public.gt_web_applications add column if not exists photo_path text;

-- True when the signed-in user organises the event this application photo belongs to.
create or replace function public.gt_can_handle_application_photo_v1(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from gt_web_applications a
    where (a.photo_path = p_name or p_name = 'approved/' || a.id::text || '.jpg')
      and gt_can_manage_tournament_v1(a.tournament_id));
$$;
revoke all on function public.gt_can_handle_application_photo_v1(text) from public, anon;
grant execute on function public.gt_can_handle_application_photo_v1(text) to authenticated;

-- Anyone may add a new pending photo (no read, list, overwrite or delete).
create policy gt_application_photo_upload_v1 on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'gt-application-photos'
    and name ~ '^pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$');
-- Organisers of the event: view and clean up.
create policy gt_application_photo_staff_read_v1 on storage.objects for select to authenticated
  using (bucket_id = 'gt-application-photos' and public.gt_can_handle_application_photo_v1(name));
create policy gt_application_photo_staff_delete_v1 on storage.objects for delete to authenticated
  using (bucket_id = 'gt-application-photos' and public.gt_can_handle_application_photo_v1(name));
-- Organisers of the event: publish the approved copy.
create policy gt_athlete_avatar_staff_upload_v1 on storage.objects for insert to authenticated
  with check (bucket_id = 'gt-athlete-avatars' and name ~ '^approved/[0-9a-f-]{36}\.jpg$'
    and public.gt_can_handle_application_photo_v1(name));

-- Application with an optional photo.
create or replace function public.gt_apply_v2(p_division uuid, p_full_name text, p_rank text, p_club text, p_photo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d record; v_name text := regexp_replace(btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g'); v_id uuid;
        v_today date := (now() at time zone 'Asia/Bangkok')::date; v_photo text := nullif(btrim(coalesce(p_photo, '')), '');
begin
  select dv.id, dv.tournament_id, t.published, t.registration_mode, t.registration_open_date, t.registration_close_date
    into d from gt_divisions dv join gt_tournaments t on t.id = dv.tournament_id where dv.id = p_division;
  if not found or not d.published then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if d.registration_mode <> 'web' then return jsonb_build_object('ok', false, 'error', 'NOT_WEB'); end if;
  if (d.registration_open_date is not null and v_today < d.registration_open_date)
     or (d.registration_close_date is not null and v_today > d.registration_close_date) then
    return jsonb_build_object('ok', false, 'error', 'CLOSED');
  end if;
  if length(v_name) < 3 or v_name !~ '\s' then return jsonb_build_object('ok', false, 'error', 'NAME'); end if;
  if coalesce(btrim(p_rank), '') = '' then return jsonb_build_object('ok', false, 'error', 'RANK'); end if;
  if v_photo is not null and (
       v_photo !~ '^pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
       or not exists (select 1 from storage.objects o where o.bucket_id = 'gt-application-photos' and o.name = v_photo)
       or exists (select 1 from gt_web_applications a where a.photo_path = v_photo)) then
    return jsonb_build_object('ok', false, 'error', 'PHOTO');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_division::text || lower(v_name), 31));
  if exists (select 1 from gt_web_applications a where a.division_id = p_division and lower(a.full_name) = lower(v_name) and a.status <> 'rejected')
     or exists (select 1 from gt_registrations r join gt_athletes at on at.id = r.athlete_id
                where r.division_id = p_division and r.registration_status in ('confirmed', 'withdrawn')
                  and lower(regexp_replace(btrim(at.full_name), '\s+', ' ', 'g')) = lower(v_name)) then
    return jsonb_build_object('ok', false, 'error', 'DUPLICATE');
  end if;
  if (select count(*) from gt_web_applications a where a.tournament_id = d.tournament_id and a.created_at > now() - interval '1 minute') >= 20 then
    return jsonb_build_object('ok', false, 'error', 'BUSY');
  end if;
  insert into gt_web_applications (tournament_id, division_id, full_name, rank_label, club, photo_path)
  values (d.tournament_id, p_division, v_name, btrim(p_rank), nullif(btrim(coalesce(p_club, '')), ''), v_photo)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'reference', upper(left(replace(v_id::text, '-', ''), 6)));
end $$;

create or replace function public.gt_apply_v1(p_division uuid, p_full_name text, p_rank text, p_club text)
returns jsonb language sql security definer set search_path = public as $$
  select gt_apply_v2(p_division, p_full_name, p_rank, p_club, null);
$$;

drop function if exists public.gt_staff_list_applications_v1(uuid, uuid);
create function public.gt_staff_list_applications_v1(p_tournament uuid, p_division uuid default null)
returns table (id uuid, division_id uuid, division_name text, full_name text, rank_label text, club text, status text, created_at timestamptz, photo_path text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return query select a.id, a.division_id, d.name, a.full_name, a.rank_label, a.club, a.status, a.created_at, a.photo_path
    from gt_web_applications a join gt_divisions d on d.id = a.division_id
    where a.tournament_id = p_tournament and (p_division is null or a.division_id = p_division)
    order by (a.status = 'pending') desc, a.created_at;
end $$;

-- Approve also sets the athlete's photo when the organiser's browser has published approved/<id>.jpg.
create or replace function public.gt_staff_decide_application_v1(p_id uuid, p_approve boolean)
returns text language plpgsql security definer set search_path = public, gt_private as $$
declare a gt_web_applications%rowtype; v_actor uuid; v_ath gt_athletes%rowtype; v_reg uuid; v_limit int; v_count int;
        v_avatar text;
begin
  select * into a from gt_web_applications where id = p_id for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  v_actor := gt_require_tournament_staff_v1(a.tournament_id);
  if a.status <> 'pending' then raise exception 'ALREADY_DECIDED'; end if;
  if not p_approve then
    update gt_web_applications set status = 'rejected', decided_by = v_actor, decided_at = now() where id = p_id;
    insert into gt_match_audit_v1 (division_id, action, after, actor) values (a.division_id, 'reject_application', jsonb_build_object('application', p_id), v_actor);
    return 'rejected';
  end if;
  select seats_limit into v_limit from gt_divisions where id = a.division_id;
  select count(*) into v_count from gt_registrations where division_id = a.division_id and registration_status = 'confirmed';
  if v_limit is not null and v_count >= v_limit then raise exception 'SEATS_FULL'; end if;
  if exists (select 1 from storage.objects o where o.bucket_id = 'gt-athlete-avatars' and o.name = 'approved/' || p_id::text || '.jpg') then
    v_avatar := 'https://bqyokjwuxyzyiripijbs.supabase.co/storage/v1/object/public/gt-athlete-avatars/approved/' || p_id::text || '.jpg';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(lower(a.full_name), 417));
  select t.* into v_ath from gt_athletes t
   where lower(regexp_replace(btrim(t.full_name), '\s+', ' ', 'g')) = lower(a.full_name)
     and (t.school_name is null or a.club is null or lower(btrim(t.school_name)) = lower(a.club))
   order by t.created_at limit 1;
  if not found then
    insert into gt_athletes (go_id, full_name, school_name, current_rank, avatar_url)
    values ('GO' || nextval('gt_private.athlete_number_v4')::text, a.full_name, a.club, a.rank_label, v_avatar) returning * into v_ath;
  else
    update gt_athletes set current_rank = coalesce(current_rank, a.rank_label), avatar_url = coalesce(v_avatar, avatar_url) where id = v_ath.id;
  end if;
  insert into gt_registrations (tournament_id, division_id, athlete_id, registration_status, payment_status, display_institution)
  values (a.tournament_id, a.division_id, v_ath.id, 'confirmed', 'pending', a.club)
  on conflict (tournament_id, division_id, athlete_id) do update set registration_status = 'confirmed', display_institution = coalesce(excluded.display_institution, gt_registrations.display_institution)
  returning id into v_reg;
  update gt_web_applications set status = 'approved', registration_id = v_reg, decided_by = v_actor, decided_at = now() where id = p_id;
  insert into gt_match_audit_v1 (division_id, action, after, actor) values (a.division_id, 'approve_application', jsonb_build_object('application', p_id, 'athlete', v_ath.id, 'photo', v_avatar is not null), v_actor);
  return 'approved';
end $$;

revoke all on function public.gt_staff_list_applications_v1(uuid, uuid) from public, anon;
grant execute on function public.gt_staff_list_applications_v1(uuid, uuid) to authenticated;
grant execute on function public.gt_apply_v2(uuid, text, text, text, text) to anon, authenticated;

-- Public: photo of every entrant of a published division (also before round 1, when the board has no rows yet).
create or replace function public.gt_division_photos_v1(p_division uuid)
returns table (athlete_id uuid, photo text) language sql stable security definer set search_path = public as $$
  select r.athlete_id, a.avatar_url
  from gt_registrations r
  join gt_athletes a on a.id = r.athlete_id
  join gt_divisions d on d.id = r.division_id
  join gt_tournaments t on t.id = d.tournament_id
  where r.division_id = p_division and t.published and r.registration_status in ('confirmed', 'withdrawn') and a.avatar_url is not null;
$$;
grant execute on function public.gt_division_photos_v1(uuid) to anon, authenticated;
