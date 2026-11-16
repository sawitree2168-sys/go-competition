-- Web registration (approved design 16 Nov 2026): name + rank + club -> organiser approves or rejects.
-- No account and no payment on this form; nothing personal beyond what is shown publicly once approved.
-- Each event chooses how it takes entries: 'web' (this form), 'external' (e.g. Google Form, optional link), 'closed'.

alter table public.gt_tournaments add column if not exists registration_mode text not null default 'web'
  check (registration_mode in ('web', 'external', 'closed'));
alter table public.gt_tournaments add column if not exists registration_url text;
-- ZEER GO KYU WAR 2026 keeps its Google Form.
update public.gt_tournaments set registration_mode = 'external' where id = 'ce1382d9-1e1f-4697-8fe4-6a1a347d91eb';

create table if not exists public.gt_web_applications (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.gt_tournaments(id) on delete cascade,
  division_id uuid not null references public.gt_divisions(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 3 and 120),
  rank_label text not null check (length(btrim(rank_label)) between 1 and 30),
  club text check (club is null or length(club) <= 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  registration_id uuid references public.gt_registrations(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists gt_web_applications_event_status_v1 on public.gt_web_applications (tournament_id, status, created_at);
alter table public.gt_web_applications enable row level security;   -- reachable only through the functions below
revoke all on public.gt_web_applications from anon, authenticated;

-- Public: send an application. Checks the event is published, takes web entries, is within its registration dates,
-- and that the same name is not already waiting or accepted in this division. Returns a short reference.
create or replace function public.gt_apply_v1(p_division uuid, p_full_name text, p_rank text, p_club text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d record; v_name text := regexp_replace(btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g'); v_id uuid; v_today date := (now() at time zone 'Asia/Bangkok')::date;
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
  insert into gt_web_applications (tournament_id, division_id, full_name, rank_label, club)
  values (d.tournament_id, p_division, v_name, btrim(p_rank), nullif(btrim(coalesce(p_club, '')), ''))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'reference', upper(left(replace(v_id::text, '-', ''), 6)));
end $$;

-- Organisers: applications of one event (optionally one division).
create or replace function public.gt_staff_list_applications_v1(p_tournament uuid, p_division uuid default null)
returns table (id uuid, division_id uuid, division_name text, full_name text, rank_label text, club text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return query select a.id, a.division_id, d.name, a.full_name, a.rank_label, a.club, a.status, a.created_at
    from gt_web_applications a join gt_divisions d on d.id = a.division_id
    where a.tournament_id = p_tournament and (p_division is null or a.division_id = p_division)
    order by (a.status = 'pending') desc, a.created_at;
end $$;

-- Organisers: approve (creates or links the athlete and a confirmed registration, payment pending) or reject.
create or replace function public.gt_staff_decide_application_v1(p_id uuid, p_approve boolean)
returns text language plpgsql security definer set search_path = public, gt_private as $$
declare a gt_web_applications%rowtype; v_actor uuid; v_ath gt_athletes%rowtype; v_reg uuid; v_limit int; v_count int;
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
  perform pg_advisory_xact_lock(hashtextextended(lower(a.full_name), 417));
  select t.* into v_ath from gt_athletes t
   where lower(regexp_replace(btrim(t.full_name), '\s+', ' ', 'g')) = lower(a.full_name)
     and (t.school_name is null or a.club is null or lower(btrim(t.school_name)) = lower(a.club))
   order by t.created_at limit 1;
  if not found then
    insert into gt_athletes (go_id, full_name, school_name, current_rank)
    values ('GO' || nextval('gt_private.athlete_number_v4')::text, a.full_name, a.club, a.rank_label) returning * into v_ath;
  elsif v_ath.current_rank is null then
    update gt_athletes set current_rank = a.rank_label where id = v_ath.id;
  end if;
  insert into gt_registrations (tournament_id, division_id, athlete_id, registration_status, payment_status, display_institution)
  values (a.tournament_id, a.division_id, v_ath.id, 'confirmed', 'pending', a.club)
  on conflict (tournament_id, division_id, athlete_id) do update set registration_status = 'confirmed', display_institution = coalesce(excluded.display_institution, gt_registrations.display_institution)
  returning id into v_reg;
  update gt_web_applications set status = 'approved', registration_id = v_reg, decided_by = v_actor, decided_at = now() where id = p_id;
  insert into gt_match_audit_v1 (division_id, action, after, actor) values (a.division_id, 'approve_application', jsonb_build_object('application', p_id, 'athlete', v_ath.id), v_actor);
  return 'approved';
end $$;

-- Organisers: how this event takes entries.
create or replace function public.gt_staff_set_registration_mode_v1(p_tournament uuid, p_mode text, p_url text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1(p_tournament);
begin
  if p_mode not in ('web', 'external', 'closed') then raise exception 'INVALID_MODE'; end if;
  if p_url is not null and btrim(p_url) <> '' and btrim(p_url) !~ '^https://' then raise exception 'INVALID_URL'; end if;
  update gt_tournaments set registration_mode = p_mode, registration_url = nullif(btrim(coalesce(p_url, '')), '') where id = p_tournament;
  insert into gt_match_audit_v1 (action, after, actor) values ('set_registration_mode', jsonb_build_object('tournament', p_tournament, 'mode', p_mode), v_actor);
end $$;

revoke all on function public.gt_staff_list_applications_v1(uuid, uuid) from public, anon;
revoke all on function public.gt_staff_decide_application_v1(uuid, boolean) from public, anon;
revoke all on function public.gt_staff_set_registration_mode_v1(uuid, text, text) from public, anon;
grant execute on function public.gt_apply_v1(uuid, text, text, text) to anon, authenticated;
grant execute on function public.gt_staff_list_applications_v1(uuid, uuid) to authenticated;
grant execute on function public.gt_staff_decide_application_v1(uuid, boolean) to authenticated;
grant execute on function public.gt_staff_set_registration_mode_v1(uuid, text, text) to authenticated;
