-- Easy login v1 (20 Nov 2026)
-- One sign-in box for every role: name / institution name / team name / GO ID / dan number / username + password.
-- Each role has a default password (stored hashed in gt_private.easy_defaults_v1, set outside this file — the repo is public).
-- People can keep the default or change it; parents reset athlete passwords themselves with phone + birth date;
-- teachers / institution managers reset passwords for their own students and teachers; the owner handles the rest.
-- One person = one account; per-event roles (referee, pairing admin) are given by the organiser of that event.

create extension if not exists pgcrypto with schema extensions;

-- Normalised login key: lower case, no spaces / zero-width / dots / dashes / underscores / brackets.
create or replace function gt_private.easy_key(p text) returns text language sql immutable set search_path = pg_catalog as $$
  select lower(regexp_replace(normalize(coalesce(p, ''), NFC), '[[:space:]​-‍﻿._\-()\[\]''"]', '', 'g'));
$$;

create table if not exists gt_private.easy_defaults_v1 (
  kind text primary key check (kind in ('organizer','institution','teacher','freelance','athlete','referee')),
  pw_hash text not null            -- sha256 hex of the default password
);

create table if not exists gt_private.easy_accounts_v1 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  kind text not null check (kind in ('owner','pairing','organizer','institution','teacher','freelance','athlete','referee')),
  using_default boolean not null default true,
  recovery_phone text,             -- digits only
  recovery_birth date,
  created_at timestamptz not null default now()
);

create table if not exists gt_private.easy_logins_v1 (
  login_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists easy_logins_user_idx on gt_private.easy_logins_v1(user_id);

create table if not exists gt_private.easy_audit_v1 (
  id bigserial primary key, action text not null, target uuid, actor uuid, note text, at timestamptz not null default now()
);

-- Per-event roles given by the organiser of that event.
create table if not exists public.gt_event_roles_v1 (
  tournament_id uuid not null references public.gt_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('pairing')),
  added_by uuid, added_at timestamptz not null default now(),
  primary key (tournament_id, user_id, role)
);
alter table public.gt_event_roles_v1 enable row level security;

alter table public.gt_referee_access add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists gt_referee_access_user_idx on public.gt_referee_access(user_id) where user_id is not null;

-- Pairing admins of an event manage that event like the organiser.
create or replace function public.gt_can_manage_tournament_v1(p_tournament uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    gt_is_platform_admin_v1()
    or exists (select 1 from gt_tournaments t
               join gt_organizers o on o.id = t.organizer_id and o.status = 'active'
               join gt_organizer_members m on m.organizer_id = o.id and m.user_id = auth.uid() and m.active
               where t.id = p_tournament)
    or exists (select 1 from gt_event_roles_v1 r where r.tournament_id = p_tournament and r.user_id = auth.uid() and r.role = 'pairing'));
$$;

create or replace function public.gt_my_access_v1() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'platform_role', (select s.role from gt_staff_members s where s.user_id = auth.uid() and s.active and s.role = any (array['owner','admin']) limit 1),
    'organizers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'status', o.status, 'role', m.role) order by o.name)
                            from gt_organizer_members m join gt_organizers o on o.id = m.organizer_id
                            where m.user_id = auth.uid() and m.active), '[]'::jsonb),
    'academies', coalesce((select jsonb_agg(jsonb_build_object('id', ac.id, 'name', ac.name, 'status', s.status) order by ac.name)
                           from gt_academy_staff s join gt_academies ac on ac.id = s.academy_id
                           where s.user_id = auth.uid() and s.status in ('active', 'pending')), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'event_date', t.event_date, 'role', r.role) order by t.event_date desc)
                        from gt_event_roles_v1 r join gt_tournaments t on t.id = r.tournament_id where r.user_id = auth.uid()), '[]'::jsonb),
    'referee', coalesce((select jsonb_agg(jsonb_build_object('access_id', x.id, 'id', t.id, 'title', t.title, 'event_date', t.event_date) order by t.event_date desc)
                         from gt_referee_access x join gt_tournaments t on t.id = x.tournament_id
                         where x.user_id = auth.uid() and x.revoked_at is null and x.expires_at > now()), '[]'::jsonb),
    'easy', (select jsonb_build_object('kind', e.kind, 'name', e.display_name, 'using_default', e.using_default,
                                       'has_recovery', e.recovery_phone is not null and e.recovery_birth is not null)
             from gt_private.easy_accounts_v1 e where e.user_id = auth.uid()),
    'athlete', (select jsonb_build_object('id', a.id, 'go_id', a.go_id, 'name', a.full_name, 'rank', a.current_rank,
                  'has_profile', exists (select 1 from gt_registrations r join gt_tournaments t on t.id = r.tournament_id
                                         where r.athlete_id = a.id and t.published and r.registration_status in ('confirmed', 'withdrawn')))
                from gt_athletes a where a.claimed_by = auth.uid() and auth.uid() is not null limit 1));
$$;

-- A referee with an account opens the referee console: a fresh link code for their own access row.
create or replace function public.gt_referee_open_mine_v1(p_access uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_token text; v_code text;
begin
  if auth.uid() is null or not exists (select 1 from gt_referee_access where id = p_access and user_id = auth.uid() and revoked_at is null and expires_at > now())
    then raise exception 'NOT_YOURS' using errcode = '42501'; end if;
  v_token := replace(replace(rtrim(encode(gen_random_bytes(18), 'base64'), '='), '+', '-'), '/', '_');
  v_code := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  update gt_referee_access set token_hash = encode(digest(v_token, 'sha256'), 'hex'), code_hash = crypt(v_code, gen_salt('bf', 8)), failed_attempts = 0
   where id = p_access;
  return jsonb_build_object('token', v_token, 'code', v_code);
end $$;

-- Organiser: find people with an account (teachers, referees, organisers, …) by name.
create or replace function public.gt_staff_people_search_v1(p_tournament uuid, p_query text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  if length(gt_private.easy_key(p_query)) < 2 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(x) from (
    select e.user_id, e.display_name as name, e.kind from gt_private.easy_accounts_v1 e
     where gt_private.easy_key(e.display_name) like '%' || gt_private.easy_key(p_query) || '%'
     order by e.display_name limit 20) x), '[]'::jsonb);
end $$;

create or replace function public.gt_staff_event_people_v1(p_tournament uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return jsonb_build_object(
    'pairing', coalesce((select jsonb_agg(jsonb_build_object('user_id', r.user_id, 'name', coalesce(e.display_name, '?')) order by e.display_name)
                         from gt_event_roles_v1 r left join gt_private.easy_accounts_v1 e on e.user_id = r.user_id
                         where r.tournament_id = p_tournament and r.role = 'pairing'), '[]'::jsonb),
    'referee', coalesce((select jsonb_agg(jsonb_build_object('user_id', x.user_id, 'name', x.referee_name) order by x.referee_name)
                         from gt_referee_access x where x.tournament_id = p_tournament and x.user_id is not null and x.revoked_at is null and x.expires_at > now()), '[]'::jsonb));
end $$;

create or replace function public.gt_staff_set_event_role_v1(p_tournament uuid, p_user uuid, p_role text, p_on boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_actor uuid := gt_require_tournament_staff_v1(p_tournament); v_name text; v_exp timestamptz;
begin
  if p_role not in ('pairing','referee') then raise exception 'INVALID_ROLE'; end if;
  select display_name into v_name from gt_private.easy_accounts_v1 where user_id = p_user;
  if v_name is null then raise exception 'NO_ACCOUNT'; end if;
  if p_role = 'pairing' then
    if p_on then insert into gt_event_roles_v1 (tournament_id, user_id, role, added_by) values (p_tournament, p_user, 'pairing', v_actor) on conflict do nothing;
    else delete from gt_event_roles_v1 where tournament_id = p_tournament and user_id = p_user and role = 'pairing'; end if;
  else
    if p_on then
      if not exists (select 1 from gt_referee_access where tournament_id = p_tournament and user_id = p_user and revoked_at is null and expires_at > now()) then
        select greatest(coalesce(t.event_date::timestamptz + interval '3 days', now() + interval '30 days'), now() + interval '2 days') into v_exp from gt_tournaments t where t.id = p_tournament;
        v_exp := least(v_exp, now() + interval '60 days');
        insert into gt_referee_access (tournament_id, referee_name, token_hash, code_hash, expires_at, created_by, user_id)
        values (p_tournament, v_name, encode(gen_random_bytes(32), 'hex'), crypt(encode(gen_random_bytes(16), 'hex'), gen_salt('bf', 8)), v_exp, v_actor, p_user);
      end if;
    else update gt_referee_access set revoked_at = now() where tournament_id = p_tournament and user_id = p_user and revoked_at is null; end if;
  end if;
  insert into gt_match_audit_v1 (action, after, actor) values ('set_event_role', jsonb_build_object('tournament', p_tournament, 'user', p_user, 'role', p_role, 'on', p_on), v_actor);
end $$;

-- People this signed-in user may reset to the default password.
create or replace function public.gt_my_resettable_people_v1(p_query text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); q text := gt_private.easy_key(p_query); owner boolean := gt_is_platform_admin_v1();
begin
  if me is null then raise exception 'SIGN_IN' using errcode = '42501'; end if;
  if length(q) < 2 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(x) from (
    select distinct on (e.user_id) e.user_id, e.display_name as name, e.kind
    from gt_private.easy_accounts_v1 e
    where e.user_id <> me and gt_private.easy_key(e.display_name) like '%' || q || '%'
      and (owner
        -- institution manager: teachers of the same institution
        or (e.kind = 'teacher' and exists (select 1 from gt_academy_staff mine join gt_academy_staff t on t.academy_id = mine.academy_id
              where mine.user_id = me and mine.role = 'manager' and mine.status = 'active' and t.user_id = e.user_id))
        -- teacher / manager / freelance teacher: their own students
        or (e.kind = 'athlete' and exists (select 1 from gt_athletes a where a.claimed_by = e.user_id and (
              exists (select 1 from gt_teacher_athletes ta where ta.teacher_user_id = me and ta.athlete_id = a.id)
              or exists (select 1 from gt_academy_memberships am join gt_academy_staff s on s.academy_id = am.academy_id
                         where am.athlete_id = a.id and s.user_id = me and s.status = 'active' and s.role in ('manager','teacher'))))))
    order by e.user_id, e.display_name limit 20) x), '[]'::jsonb);
end $$;

revoke all on function public.gt_referee_open_mine_v1(uuid), public.gt_staff_people_search_v1(uuid, text), public.gt_staff_event_people_v1(uuid),
  public.gt_staff_set_event_role_v1(uuid, uuid, text, boolean), public.gt_my_resettable_people_v1(text) from public, anon;
grant execute on function public.gt_referee_open_mine_v1(uuid), public.gt_staff_people_search_v1(uuid, text), public.gt_staff_event_people_v1(uuid),
  public.gt_staff_set_event_role_v1(uuid, uuid, text, boolean), public.gt_my_resettable_people_v1(text) to authenticated;
