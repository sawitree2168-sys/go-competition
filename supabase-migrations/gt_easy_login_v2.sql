-- Easy login v2 (20 Nov 2026): service-only helpers for the "easy-login" Edge Function.
-- Plain default passwords live only in the database (gt_private), never in this public repo.

alter table gt_private.easy_defaults_v1 add column if not exists pw_plain text;
alter table gt_private.easy_defaults_v1 drop column if exists pw_hash;  -- values are set directly in the database

-- Reserved usernames (owner, pairing admin) created on first sign-in with their reserved password.
create table if not exists gt_private.easy_reserved_v1 (
  login_key text primary key,
  display_name text not null,
  kind text not null check (kind in ('owner','pairing')),
  pw_plain text not null
);

-- What an identifier points at (accounts, institution, organiser team, reserved username).
create or replace function public.gt_easy_resolve_v1(p_identifier text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare k text := gt_private.easy_key(p_identifier); v_ac record; v_org record; v_res record; v_mgr uuid[];
begin
  select a.id, a.name into v_ac from gt_academies a where a.status = 'active' and coalesce(a.workspace_type, 'academy') = 'academy' and gt_private.easy_key(a.name) = k limit 1;
  if v_ac.id is not null then
    select array_agg(s.user_id) into v_mgr from gt_academy_staff s where s.academy_id = v_ac.id and s.role = 'manager' and s.status = 'active';
  end if;
  select o.id, o.name into v_org from gt_organizers o where o.status = 'active' and gt_private.easy_key(o.name) = k limit 1;
  select r.* into v_res from gt_private.easy_reserved_v1 r where r.login_key = k;
  return jsonb_build_object(
    'key', k,
    'users', coalesce((select jsonb_agg(distinct u) from (
        select l.user_id u from gt_private.easy_logins_v1 l where l.login_key = k
        union select su.user_id from gt_staff_usernames su where su.username = lower(btrim(p_identifier))) z), '[]'::jsonb),
    'academy', case when v_ac.id is null then null else jsonb_build_object('id', v_ac.id, 'name', v_ac.name, 'managers', coalesce(to_jsonb(v_mgr), '[]'::jsonb)) end,
    'organizer', case when v_org.id is null then null else jsonb_build_object('id', v_org.id, 'name', v_org.name) end,
    'reserved', case when v_res.login_key is null then null else jsonb_build_object('name', v_res.display_name, 'kind', v_res.kind) end);
end $$;

-- Which roles use this password as their default (and the reserved password check).
create or replace function public.gt_easy_default_kinds_v1(p_password text, p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'kinds', coalesce((select jsonb_agg(d.kind) from gt_private.easy_defaults_v1 d where d.pw_plain = p_password), '[]'::jsonb),
    'reserved', exists (select 1 from gt_private.easy_reserved_v1 r where r.login_key = p_key and r.pw_plain = p_password));
$$;

create or replace function public.gt_easy_default_password_v1(p_kind text, p_key text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select r.pw_plain from gt_private.easy_reserved_v1 r where r.login_key = p_key and r.kind = p_kind),
                  (select d.pw_plain from gt_private.easy_defaults_v1 d where d.kind = p_kind));
$$;

create or replace function public.gt_easy_account_v1(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('kind', e.kind, 'name', e.display_name, 'using_default', e.using_default,
           'has_recovery', e.recovery_phone is not null and e.recovery_birth is not null,
           'login_key', (select min(l.login_key) from gt_private.easy_logins_v1 l where l.user_id = e.user_id))
  from gt_private.easy_accounts_v1 e where e.user_id = p_user;
$$;

-- Create the easy-account records and the role links for a newly created auth user.
create or replace function public.gt_easy_register_v1(p_user uuid, p_kind text, p_name text, p_key text, p_academy uuid, p_organizer uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_ws uuid; v_go uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('easy:' || coalesce(p_key, p_user::text), 0));
  if p_key is not null and exists (select 1 from gt_private.easy_logins_v1 where login_key = p_key) then return 'TAKEN'; end if;
  -- An institution may keep an older e-mail manager; only one easy (name + password) manager account.
  if p_kind = 'institution' and (p_academy is null or exists (select 1 from gt_academy_staff s join gt_private.easy_accounts_v1 e on e.user_id = s.user_id and e.kind = 'institution'
        where s.academy_id = p_academy and s.role = 'manager' and s.status = 'active')) then return 'HAS_MANAGER'; end if;
  insert into gt_private.easy_accounts_v1 (user_id, display_name, kind) values (p_user, left(btrim(p_name), 120), p_kind);
  if p_key is not null and p_kind <> 'athlete' then insert into gt_private.easy_logins_v1 (login_key, user_id) values (p_key, p_user); end if;
  if p_kind = 'owner' then
    insert into gt_staff_members (user_id, role, active) values (p_user, 'owner', true) on conflict (user_id) do update set role = 'owner', active = true;
  elsif p_kind = 'pairing' then
    for v_go in select id from gt_organizers where status = 'active' loop
      insert into gt_organizer_members (organizer_id, user_id, role, active) values (v_go, p_user, 'admin', true) on conflict do nothing;
    end loop;
  elsif p_kind = 'organizer' then
    if p_organizer is null then raise exception 'NO_ORGANIZER'; end if;
    insert into gt_organizer_members (organizer_id, user_id, role, active) values (p_organizer, p_user, 'owner', true) on conflict do nothing;
  elsif p_kind = 'institution' then
    insert into gt_academy_staff (academy_id, user_id, role, status) values (p_academy, p_user, 'manager', 'active');
  elsif p_kind = 'teacher' then
    if p_academy is null or not exists (select 1 from gt_academies where id = p_academy and status = 'active') then raise exception 'NO_ACADEMY'; end if;
    insert into gt_academy_staff (academy_id, user_id, role, status) values (p_academy, p_user, 'teacher', 'active');
  elsif p_kind = 'freelance' then
    insert into gt_academies (name, status, created_by, workspace_type)
    values (left('ครูอิสระ · ' || btrim(p_name), 160), 'active', p_user, 'independent_coach') returning id into v_ws;
    insert into gt_academy_staff (academy_id, user_id, role, status) values (v_ws, p_user, 'manager', 'active');
  end if;
  insert into gt_private.easy_audit_v1 (action, target, note) values ('register_' || p_kind, p_user, p_name);
  return 'OK';
end $$;

create or replace function public.gt_easy_mark_v1(p_user uuid, p_using_default boolean, p_phone text, p_birth date) returns void
language sql security definer set search_path = public as $$
  update gt_private.easy_accounts_v1 set
    using_default = coalesce(p_using_default, using_default),
    recovery_phone = coalesce(nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), ''), recovery_phone),
    recovery_birth = coalesce(p_birth, recovery_birth)
  where user_id = p_user;
$$;

-- Parent / athlete proves who they are with phone + birth date (own recovery data or what they gave when applying).
create or replace function public.gt_easy_recovery_match_v1(p_user uuid, p_phone text, p_birth date) returns boolean
language sql stable security definer set search_path = public as $$
  with ph as (select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9) d)
  select length((select d from ph)) = 9 and p_birth is not null and (
    exists (select 1 from gt_private.easy_accounts_v1 e where e.user_id = p_user and right(e.recovery_phone, 9) = (select d from ph) and e.recovery_birth = p_birth)
    or exists (select 1 from gt_athletes a join gt_private.web_application_details_v1 w on w.go_id = a.go_id
               where a.claimed_by = p_user and right(regexp_replace(coalesce(w.phone, ''), '\D', '', 'g'), 9) = (select d from ph) and w.birth_date = p_birth)
    or exists (select 1 from gt_athletes a join gt_athlete_contacts_v3 c on c.athlete_id = a.id
               where a.claimed_by = p_user and right(regexp_replace(coalesce(c.contact_phone, ''), '\D', '', 'g'), 9) = (select d from ph) and c.birth_date = p_birth));
$$;

-- May p_actor reset p_target to the default password? Returns the target's kind or null.
create or replace function public.gt_easy_can_reset_v1(p_actor uuid, p_target uuid) returns text
language sql stable security definer set search_path = public as $$
  select e.kind from gt_private.easy_accounts_v1 e
  where e.user_id = p_target and p_actor <> p_target and e.kind not in ('owner')
    and (exists (select 1 from gt_staff_members s where s.user_id = p_actor and s.active and s.role in ('owner','admin'))
      or (e.kind = 'teacher' and exists (select 1 from gt_academy_staff mine join gt_academy_staff t on t.academy_id = mine.academy_id
            where mine.user_id = p_actor and mine.role = 'manager' and mine.status = 'active' and t.user_id = e.user_id))
      or (e.kind = 'athlete' and exists (select 1 from gt_athletes a where a.claimed_by = e.user_id and (
            exists (select 1 from gt_teacher_athletes ta where ta.teacher_user_id = p_actor and ta.athlete_id = a.id)
            or exists (select 1 from gt_academy_memberships am join gt_academy_staff s on s.academy_id = am.academy_id
                       where am.athlete_id = a.id and s.user_id = p_actor and s.status = 'active' and s.role in ('manager','teacher'))))));
$$;

create or replace function public.gt_easy_audit_v1(p_action text, p_target uuid, p_actor uuid, p_note text) returns void
language sql security definer set search_path = public as $$
  insert into gt_private.easy_audit_v1 (action, target, actor, note) values (p_action, p_target, p_actor, left(p_note, 300));
$$;

-- Teachers choosing their institution when creating an account.
create or replace function public.gt_easy_academies_v1() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name), '[]'::jsonb)
  from gt_academies where status = 'active' and coalesce(workspace_type, 'academy') = 'academy';
$$;

do $$ declare f text; begin
  foreach f in array array['gt_easy_resolve_v1(text)','gt_easy_default_kinds_v1(text,text)','gt_easy_default_password_v1(text,text)','gt_easy_account_v1(uuid)',
    'gt_easy_register_v1(uuid,text,text,text,uuid,uuid)','gt_easy_mark_v1(uuid,boolean,text,date)','gt_easy_recovery_match_v1(uuid,text,date)',
    'gt_easy_can_reset_v1(uuid,uuid)','gt_easy_audit_v1(text,uuid,uuid,text)','gt_easy_academies_v1()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
