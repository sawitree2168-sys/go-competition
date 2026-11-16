-- Athlete sign-in by GO ID / dan number / full name (16 Nov 2026).
-- Used only by the athlete-login Edge Function (service role): turns what the athlete typed into the
-- registered full name, so the existing name-based lookup, dan check and rate limit still apply.
-- GO ID: as issued (GO106260826 / GO-347-180769), spaces/dashes/case ignored. Dan number: digits only.

create or replace function public.gt_athlete_identify_v1(p_identifier text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare v text := upper(regexp_replace(coalesce(p_identifier, ''), '[[:space:],​‌‍﻿-]', '', 'g')); r record;
begin
  if v ~ '^GO[0-9]{4,12}$' then
    select x.go_id, x.full_name into r from (
      select go_id, full_name from gt_private.history_identity_registry_v1
      union all select a.go_id, a.full_name from public.gt_athletes a
      where not exists (select 1 from gt_private.history_identity_registry_v1 h where h.go_id = a.go_id)
    ) x where upper(replace(x.go_id, '-', '')) = v limit 1;
    if found then return jsonb_build_object('kind', 'go_id', 'go_id', r.go_id, 'full_name', r.full_name); end if;
    return jsonb_build_object('kind', 'go_id', 'error', 'NOT_FOUND');
  elsif v ~ '^[0-9]{1,6}$' then
    select d.full_name into r from gt_private.legacy_dan_directory_v5 d where d.dan_number = ltrim(v, '0') or d.dan_number = v limit 1;
    if found then return jsonb_build_object('kind', 'dan', 'dan_number', ltrim(v, '0'), 'full_name', r.full_name); end if;
    return jsonb_build_object('kind', 'dan', 'error', 'NOT_FOUND');
  end if;
  return jsonb_build_object('kind', 'name', 'full_name', regexp_replace(btrim(coalesce(p_identifier, '')), '\s+', ' ', 'g'));
end $$;

revoke all on function public.gt_athlete_identify_v1(text) from public, anon, authenticated;
grant execute on function public.gt_athlete_identify_v1(text) to service_role;

-- Sign-up v2: an athlete who already has a row (e.g. entered a competition before) can claim it too,
-- as long as nobody has claimed it. Same rules otherwise as v1 (name match, dan number for dan players,
-- one athlete per account, staff accounts excluded).
create or replace function public.gt_athlete_self_register_v2(p_go_id text, p_name text, p_dan text, p_user uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare candidate jsonb; n int;
begin
  if p_go_id = 'GO106260826' or p_user is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_go_id, 0));
  if exists (select 1 from public.gt_athletes where claimed_by = p_user)
     or exists (select 1 from public.gt_athletes where go_id = p_go_id and claimed_by is not null)
     or exists (select 1 from public.gt_staff_members where user_id = p_user)
     or not exists (select 1 from auth.users where id = p_user and email_confirmed_at is not null) then
    return false;
  end if;
  select v into candidate from jsonb_array_elements(public.gt_athlete_login_lookup_v1(p_name)) v where v->>'go_id' = p_go_id;
  if candidate is null or candidate->>'user_id' is not null
     or (candidate->>'dan_number' is not null and candidate->>'dan_number' is distinct from p_dan) then
    return false;
  end if;
  insert into public.gt_athletes (go_id, full_name, current_rank, claimed_by, profile_public)
  values (p_go_id, candidate->>'full_name', nullif(candidate->>'source_rank', ''), p_user, false)
  on conflict (go_id) do update set claimed_by = excluded.claimed_by where public.gt_athletes.claimed_by is null;
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  insert into gt_private.athlete_self_registration_audit_v1 (go_id, user_id) values (p_go_id, p_user);
  return true;
end $$;
revoke all on function public.gt_athlete_self_register_v2(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.gt_athlete_self_register_v2(text, text, text, uuid) to service_role;

-- Sign-in routing / account page: the athlete linked to this account (if any).
create or replace function public.gt_my_access_v1()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'platform_role', (select s.role from gt_staff_members s where s.user_id = auth.uid() and s.active and s.role = any (array['owner','admin']) limit 1),
    'organizers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'status', o.status, 'role', m.role) order by o.name)
                            from gt_organizer_members m join gt_organizers o on o.id = m.organizer_id
                            where m.user_id = auth.uid() and m.active), '[]'::jsonb),
    'academies', coalesce((select jsonb_agg(jsonb_build_object('id', ac.id, 'name', ac.name, 'status', s.status) order by ac.name)
                           from gt_academy_staff s join gt_academies ac on ac.id = s.academy_id
                           where s.user_id = auth.uid() and s.status in ('active', 'pending')), '[]'::jsonb),
    'athlete', (select jsonb_build_object('id', a.id, 'go_id', a.go_id, 'name', a.full_name, 'rank', a.current_rank,
                  'has_profile', exists (select 1 from gt_registrations r join gt_tournaments t on t.id = r.tournament_id
                                         where r.athlete_id = a.id and t.published and r.registration_status in ('confirmed', 'withdrawn')))
                from gt_athletes a where a.claimed_by = auth.uid() and auth.uid() is not null limit 1));
$$;
