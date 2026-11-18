-- Profile photos keyed by GO ID (18 Nov 2026).
-- The athlete (or parent) signed in to the claimed account changes and crops their own photo; it goes live at once.
-- The platform owner/admin can replace or remove anyone's photo (e.g. wrong person) and must give a reason.
-- Every change is logged with the previous URL, so a mistake can be put back.
-- Photos are 400x400 JPEGs in the PUBLIC bucket gt-athlete-avatars, the same place approved application photos live;
-- gt_athletes.avatar_url is what every public page shows. No photo = the default avatar.

create table if not exists gt_private.athlete_photo_audit_v1 (
  id bigserial primary key,
  athlete_id uuid not null,
  go_id text,
  actor uuid,
  actor_role text not null,
  old_url text,
  new_url text,
  reason text,
  created_at timestamptz not null default now()
);
alter table gt_private.athlete_photo_audit_v1 enable row level security;

create or replace function public.gt_is_platform_admin_v1()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from gt_staff_members s where s.user_id = auth.uid() and s.active and s.role in ('owner', 'admin'));
$$;
revoke all on function public.gt_is_platform_admin_v1() from public, anon;
grant execute on function public.gt_is_platform_admin_v1() to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'gt_avatar_self_upload_v1') then
    create policy gt_avatar_self_upload_v1 on storage.objects for insert to authenticated
      with check (bucket_id = 'gt-athlete-avatars'
        and name ~ '^self/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
        and exists (select 1 from public.gt_athletes a where a.id::text = (storage.foldername(name))[2] and a.claimed_by = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'gt_avatar_admin_upload_v1') then
    create policy gt_avatar_admin_upload_v1 on storage.objects for insert to authenticated
      with check (bucket_id = 'gt-athlete-avatars'
        and name ~ '^admin/[A-Za-z0-9-]{3,40}/[0-9a-f-]{36}\.jpg$'
        and public.gt_is_platform_admin_v1());
  end if;
end $$;

-- Set (p_path) or remove (p_path null) the photo of the athlete with this GO ID.
create or replace function public.gt_athlete_photo_set_v1(p_go_id text, p_path text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare
  v_admin boolean := public.gt_is_platform_admin_v1();
  v_uid uuid := auth.uid();
  a gt_athletes%rowtype;
  r record;
  v_path text := nullif(btrim(coalesce(p_path, '')), '');
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_url text;
begin
  if v_uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into a from gt_athletes where go_id = p_go_id for update;
  if not found then
    if not v_admin then raise exception 'NOT_ALLOWED'; end if;
    select * into r from gt_private.history_identity_registry_v1 where go_id = p_go_id;
    if not found then raise exception 'NOT_FOUND'; end if;
    insert into gt_athletes (go_id, full_name, current_rank, profile_public)
    values (r.go_id, r.full_name, nullif(r.source_rank, ''), false) returning * into a;
  end if;
  if not v_admin and a.claimed_by is distinct from v_uid then raise exception 'NOT_ALLOWED'; end if;
  if v_admin and a.claimed_by is distinct from v_uid and (v_reason is null or length(v_reason) < 4) then
    raise exception 'REASON_REQUIRED';
  end if;
  if v_path is not null then
    if not (v_path ~ ('^self/' || a.id::text || '/[0-9a-f-]{36}\.jpg$')
            or (v_admin and v_path ~ ('^admin/' || regexp_replace(a.go_id, '[^A-Za-z0-9-]', '', 'g') || '/[0-9a-f-]{36}\.jpg$'))) then
      raise exception 'BAD_PATH';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'gt-athlete-avatars' and o.name = v_path) then
      raise exception 'PHOTO_MISSING';
    end if;
    v_url := 'https://bqyokjwuxyzyiripijbs.supabase.co/storage/v1/object/public/gt-athlete-avatars/' || v_path;
  end if;
  insert into gt_private.athlete_photo_audit_v1 (athlete_id, go_id, actor, actor_role, old_url, new_url, reason)
  values (a.id, a.go_id, v_uid, case when a.claimed_by = v_uid then 'owner' else 'admin' end, a.avatar_url, v_url, v_reason);
  update gt_athletes set avatar_url = v_url where id = a.id;
  return jsonb_build_object('athlete_id', a.id, 'go_id', a.go_id, 'avatar_url', v_url);
end $$;
revoke all on function public.gt_athlete_photo_set_v1(text, text, text) from public, anon;
grant execute on function public.gt_athlete_photo_set_v1(text, text, text) to authenticated;

-- Put back the photo a logged change replaced (admin only).
create or replace function public.gt_athlete_photo_revert_v1(p_audit_id bigint, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare h gt_private.athlete_photo_audit_v1%rowtype; cur text;
begin
  if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 4 then raise exception 'REASON_REQUIRED'; end if;
  select * into h from gt_private.athlete_photo_audit_v1 where id = p_audit_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select avatar_url into cur from gt_athletes where id = h.athlete_id for update;
  insert into gt_private.athlete_photo_audit_v1 (athlete_id, go_id, actor, actor_role, old_url, new_url, reason)
  values (h.athlete_id, h.go_id, auth.uid(), 'admin', cur, h.old_url, btrim(p_reason));
  update gt_athletes set avatar_url = h.old_url where id = h.athlete_id;
  return jsonb_build_object('go_id', h.go_id, 'avatar_url', h.old_url);
end $$;
revoke all on function public.gt_athlete_photo_revert_v1(bigint, text) from public, anon;
grant execute on function public.gt_athlete_photo_revert_v1(bigint, text) to authenticated;

-- Admin search: name, GO ID or dan number -> current photo and the last changes.
create or replace function public.gt_admin_photo_search_v1(p_query text)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private as $$
declare k text := regexp_replace(btrim(coalesce(p_query, '')), '[[:space:]​‌‍﻿]', '', 'g');
begin
  if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED'; end if;
  if length(k) < 2 then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(x order by x->>'full_name') from (
      select jsonb_build_object(
        'go_id', r.go_id, 'full_name', r.full_name, 'rank', r.source_rank,
        'dan', (select c.dan_number from history_dan_crosswalk_v1 c where c.go_id = r.go_id),
        'photo', nullif(btrim(a.avatar_url), ''), 'claimed', a.claimed_by is not null,
        'history', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'at', h.created_at, 'role', h.actor_role,
                                 'old_url', h.old_url, 'new_url', h.new_url, 'reason', h.reason) order by h.id desc)
                             from (select * from athlete_photo_audit_v1 h where h.go_id = r.go_id order by h.id desc limit 5) h), '[]'::jsonb)) x
      from history_identity_registry_v1 r
      left join gt_athletes a on a.go_id = r.go_id
      where upper(replace(r.go_id, '-', '')) = upper(replace(k, '-', ''))
         or (k ~ '^[0-9,]+$' and exists (select 1 from history_dan_crosswalk_v1 c where c.go_id = r.go_id and c.dan_number::text = replace(k, ',', '')))
         or regexp_replace(r.full_name, '[[:space:]​‌‍﻿]', '', 'g') ilike '%' || k || '%'
      limit 20) s), '[]'::jsonb);
end $$;
revoke all on function public.gt_admin_photo_search_v1(text) from public, anon;
grant execute on function public.gt_admin_photo_search_v1(text) to authenticated;

-- Signed-in athlete: own GO ID, name and current photo (for the change-photo page).
create or replace function public.gt_my_photo_v1()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('athlete_id', a.id, 'go_id', a.go_id, 'full_name', a.full_name, 'rank', a.current_rank,
                            'photo', nullif(btrim(a.avatar_url), ''))
  from gt_athletes a where a.claimed_by = auth.uid() and auth.uid() is not null limit 1;
$$;
revoke all on function public.gt_my_photo_v1() from public, anon;
grant execute on function public.gt_my_photo_v1() to authenticated;
