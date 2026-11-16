-- Institution portal (design 16 Nov 2026): teachers look after their students and enter them in competitions.
--
-- * A teacher signs in, picks their institution from the institutions that have entered competitions before
--   (or types a new one). They can see its overview at once (all of it is already public on the site);
--   adding students and group entries unlock after the site owner approves them (one tap on /organizer/platform).
-- * An institution's students = athletes whose latest entry was under that institution name (or, with no entries,
--   whose school is that name) + students the teacher added. Nobody can pull an athlete with history from
--   another institution.
-- * No private data here: names, ranks, photos, results only (no birth dates or phone numbers).

create or replace function gt_private.norm_inst(p text) returns text
language sql immutable as $$ select lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g')) $$;

revoke all on public.gt_academies, public.gt_academy_staff, public.gt_academy_memberships from anon, authenticated;
create unique index if not exists gt_academies_norm_name_v1 on public.gt_academies (gt_private.norm_inst(name));

-- Group entries remember who they are for, so approval reuses the athlete (and their history).
alter table public.gt_web_applications add column if not exists athlete_id uuid references public.gt_athletes(id);
alter table public.gt_web_applications add column if not exists academy_id uuid references public.gt_academies(id);
alter table public.gt_web_applications add column if not exists submitted_by uuid references auth.users(id);
create index if not exists gt_web_applications_academy_v1 on public.gt_web_applications (academy_id, created_at);

-- Caller's status for an institution: 'admin' (site owner), 'active', 'pending' or null.
create or replace function gt_private.academy_role(p_academy uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when gt_is_platform_admin_v1() then 'admin'
              else (select s.status from gt_academy_staff s where s.academy_id = p_academy and s.user_id = auth.uid() and s.status in ('active', 'pending')) end
$$;

create or replace function gt_private.academy_students(p_academy uuid) returns table (athlete_id uuid)
language sql stable security definer set search_path = public as $$
  with ac as (select gt_private.norm_inst(name) n from gt_academies where id = p_academy),
  latest as (
    select distinct on (r.athlete_id) r.athlete_id, coalesce(nullif(btrim(r.display_institution), ''), a.school_name) inst
    from gt_registrations r join gt_tournaments t on t.id = r.tournament_id join gt_athletes a on a.id = r.athlete_id
    where r.registration_status in ('confirmed', 'withdrawn')
    order by r.athlete_id, t.event_date desc nulls last, r.created_at desc
  )
  select l.athlete_id from latest l, ac where gt_private.norm_inst(l.inst) = ac.n
  union
  select a.id from gt_athletes a, ac where gt_private.norm_inst(a.school_name) = ac.n
    and not exists (select 1 from gt_registrations r where r.athlete_id = a.id and r.registration_status in ('confirmed', 'withdrawn'))
  union
  select m.athlete_id from gt_academy_memberships m where m.academy_id = p_academy and m.membership_status <> 'inactive'
$$;

-- Institutions to choose from: entered before, or already set up.
create or replace function public.gt_institutions_v1(p_query text default null)
returns table (name text, academy_id uuid, entrants integer)
language sql stable security definer set search_path = public as $$
  with names as (
    select coalesce(nullif(btrim(r.display_institution), ''), a.school_name) n, r.athlete_id::text who
    from gt_registrations r join gt_tournaments t on t.id = r.tournament_id join gt_athletes a on a.id = r.athlete_id
    where t.published and r.registration_status in ('confirmed', 'withdrawn')
    union all
    select e.institution, e.full_name from gt_public_entrants e join gt_tournaments t on t.id = e.tournament_id where t.published
    union all
    select ac.name, null from gt_academies ac where ac.status = 'active'
  ), grouped as (
    select gt_private.norm_inst(n) k, min(btrim(n)) shown, count(distinct who)::int c from names
    where length(btrim(coalesce(n, ''))) >= 2 group by 1
  )
  select coalesce(ac.name, g.shown), ac.id, g.c from grouped g left join gt_academies ac on gt_private.norm_inst(ac.name) = g.k
  where auth.uid() is not null
    and (coalesce(btrim(p_query), '') = '' or g.k like '%' || gt_private.norm_inst(p_query) || '%')
  order by g.c desc, 1 limit 50
$$;

-- "This is my institution": joins (pending) or, for the site owner, opens it straight away.
create or replace function public.gt_academy_join_v1(p_name text, p_role text default 'teacher')
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare v_uid uuid := auth.uid(); v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
        v_id uuid; v_admin boolean := gt_is_platform_admin_v1(); v_status text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'SIGNED_OUT'); end if;
  if length(v_name) < 2 or length(v_name) > 160 then return jsonb_build_object('ok', false, 'error', 'NAME'); end if;
  if p_role not in ('manager', 'teacher') then return jsonb_build_object('ok', false, 'error', 'ROLE'); end if;
  if (select count(*) from gt_academy_staff where user_id = v_uid and status = 'pending') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'TOO_MANY');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(norm_inst(v_name), 77));
  select id into v_id from gt_academies where norm_inst(name) = norm_inst(v_name);
  if v_id is null then
    insert into gt_academies (name, status, created_by) values (v_name, 'active', v_uid) returning id into v_id;
  end if;
  v_status := case when v_admin then 'active' else 'pending' end;
  insert into gt_academy_staff (academy_id, user_id, role, status, granted_by)
  values (v_id, v_uid, p_role, v_status, case when v_admin then v_uid end)
  on conflict (academy_id, user_id) do update set role = excluded.role,
     status = case when gt_academy_staff.status = 'active' then 'active' else excluded.status end
  returning status into v_status;
  return jsonb_build_object('ok', true, 'academy_id', v_id, 'status', v_status);
end $$;

-- My institutions (for the switcher).
create or replace function public.gt_my_academies_v1()
returns table (id uuid, name text, role text, status text)
language sql stable security definer set search_path = public as $$
  select ac.id, ac.name, s.role, s.status from gt_academy_staff s join gt_academies ac on ac.id = s.academy_id
  where s.user_id = auth.uid() and s.status in ('active', 'pending') and ac.status = 'active'
  order by s.status, ac.name
$$;

-- Everything the portal shows. Filtering by year / competition happens in the browser.
create or replace function public.gt_academy_overview_v1(p_academy uuid)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private as $$
declare v_role text := academy_role(p_academy); v_ac gt_academies%rowtype;
begin
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'NO_ACCESS'); end if;
  select * into v_ac from gt_academies where id = p_academy;
  return jsonb_build_object('ok', true,
    'academy', jsonb_build_object('id', v_ac.id, 'name', v_ac.name),
    'access', v_role,
    'role', (select s.role from gt_academy_staff s where s.academy_id = p_academy and s.user_id = auth.uid()),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.full_name, 'nickname', a.nickname, 'rank', a.current_rank,
                                          'photo', nullif(btrim(a.avatar_url), ''), 'go_id', a.go_id,
                                          'added', exists (select 1 from gt_academy_memberships m where m.academy_id = p_academy and m.athlete_id = a.id))
                       order by a.full_name)
      from academy_students(p_academy) s join gt_athletes a on a.id = s.athlete_id), '[]'::jsonb),
    -- One row per student per division entered (published competitions).
    'records', coalesce((
      with st as (select athlete_id from academy_students(p_academy)),
      regs as (
        select r.athlete_id, r.division_id, r.tournament_id, r.pool_label, t.title, t.event_date, d.name dname
        from gt_registrations r join st on st.athlete_id = r.athlete_id
        join gt_tournaments t on t.id = r.tournament_id join gt_divisions d on d.id = r.division_id
        where t.published and r.registration_status in ('confirmed', 'withdrawn')
      ),
      games as (
        select g.athlete_id, g.division_id,
               count(*) filter (where m.id is not null)::int n,
               count(*) filter (where m.winner_athlete_id = g.athlete_id)::int w,
               count(*) filter (where m.result_code = 'draw')::int d,
               count(*) filter (where m.id is not null and m.result_code <> 'draw' and m.winner_athlete_id is distinct from g.athlete_id)::int l
        from regs g left join gt_matches m on m.division_id = g.division_id and m.state = 'verified'
             and g.athlete_id in (m.black_athlete_id, m.white_athlete_id)
        group by 1, 2
      ),
      pos as (
        select dv.division_id, s.athlete_id, s.pos, count(*) over (partition by dv.division_id, s.pool_label) field
        from (select distinct division_id from regs) dv cross join lateral gt_division_standings_v3(dv.division_id) s
        where not s.withdrawn
      )
      select jsonb_agg(jsonb_build_object('athlete_id', r.athlete_id, 'tournament_id', r.tournament_id, 'title', r.title,
                                          'date', r.event_date, 'division_id', r.division_id, 'division', r.dname,
                                          'games', coalesce(g.n, 0), 'wins', coalesce(g.w, 0), 'losses', coalesce(g.l, 0), 'draws', coalesce(g.d, 0),
                                          'pos', p.pos, 'field', p.field)
                       order by r.event_date desc nulls last, r.title, r.dname)
      from regs r left join games g on g.athlete_id = r.athlete_id and g.division_id = r.division_id
      left join pos p on p.athlete_id = r.athlete_id and p.division_id = r.division_id), '[]'::jsonb),
    -- Latest table of each student in each division (live follow-up).
    'tracking', coalesce((
      with st as (select athlete_id from academy_students(p_academy)),
      last as (
        select distinct on (st.athlete_id, m.division_id) st.athlete_id, m.*
        from st join gt_matches m on st.athlete_id in (m.black_athlete_id, m.white_athlete_id) and m.state <> 'void'
        join gt_tournaments t on t.id = m.tournament_id and t.published
        order by st.athlete_id, m.division_id, m.round_number desc
      )
      select jsonb_agg(jsonb_build_object('athlete_id', l.athlete_id, 'tournament_id', l.tournament_id, 'title', t.title, 'date', t.event_date,
                                          'division', d.name, 'round', l.round_number, 'board', l.board_number,
                                          'outcome', case when l.state <> 'verified' then 'pending'
                                                          when l.result_code = 'draw' then 'draw'
                                                          when l.winner_athlete_id = l.athlete_id then 'win' else 'loss' end)
                       order by t.event_date desc nulls last, l.round_number desc, l.board_number)
      from last l join gt_tournaments t on t.id = l.tournament_id join gt_divisions d on d.id = l.division_id), '[]'::jsonb));
end $$;

-- Teacher adds a new student (no history yet). Same name already at this institution → that student is reused.
create or replace function public.gt_academy_add_student_v1(p_academy uuid, p_name text, p_nickname text, p_rank text)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare v_role text := academy_role(p_academy); v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
        v_ac gt_academies%rowtype; v_id uuid;
begin
  if v_role is null or v_role = 'pending' then return jsonb_build_object('ok', false, 'error', 'NOT_APPROVED'); end if;
  if length(v_name) < 3 or v_name !~ '\s' or length(v_name) > 120 then return jsonb_build_object('ok', false, 'error', 'NAME'); end if;
  if coalesce(btrim(p_rank), '') = '' or length(p_rank) > 20 then return jsonb_build_object('ok', false, 'error', 'RANK'); end if;
  select * into v_ac from gt_academies where id = p_academy;
  perform pg_advisory_xact_lock(hashtextextended(lower(v_name), 417));
  select a.id into v_id from academy_students(p_academy) s join gt_athletes a on a.id = s.athlete_id
   where lower(regexp_replace(btrim(a.full_name), '\s+', ' ', 'g')) = lower(v_name) limit 1;
  if v_id is not null then return jsonb_build_object('ok', false, 'error', 'ALREADY_HERE', 'athlete_id', v_id); end if;
  insert into gt_athletes (go_id, full_name, nickname, school_name, current_rank)
  values ('GO' || nextval('gt_private.athlete_number_v4')::text, v_name, nullif(left(btrim(coalesce(p_nickname, '')), 40), ''), v_ac.name, btrim(p_rank))
  returning id into v_id;
  insert into gt_academy_memberships (academy_id, athlete_id, membership_status, verified_by, verified_at)
  values (p_academy, v_id, 'verified', auth.uid(), now());
  return jsonb_build_object('ok', true, 'athlete_id', v_id);
end $$;

-- Competitions open for web entry right now, with their divisions and fees.
create or replace function public.gt_open_events_v1()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'date', t.event_date, 'close', t.registration_close_date,
           'divisions', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'fee', d.entry_fee_thb, 'seats', d.seats_limit) order by d.name), '[]'::jsonb)
                         from gt_divisions d where d.tournament_id = t.id))
         order by t.event_date nulls last), '[]'::jsonb)
  from gt_tournaments t
  where auth.uid() is not null and t.published and t.registration_mode = 'web'
    and (t.registration_open_date is null or (now() at time zone 'Asia/Bangkok')::date >= t.registration_open_date)
    and (t.registration_close_date is null or (now() at time zone 'Asia/Bangkok')::date <= t.registration_close_date)
$$;

-- Group entry: chosen students into one division. Each becomes an application the organiser approves as usual.
create or replace function public.gt_academy_group_apply_v1(p_academy uuid, p_division uuid, p_athletes uuid[])
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare v_role text := academy_role(p_academy); v_ac gt_academies%rowtype; d record; a record;
        v_today date := (now() at time zone 'Asia/Bangkok')::date; v_added int := 0; v_skipped jsonb := '[]'::jsonb;
begin
  if v_role is null or v_role = 'pending' then return jsonb_build_object('ok', false, 'error', 'NOT_APPROVED'); end if;
  if p_athletes is null or cardinality(p_athletes) = 0 then return jsonb_build_object('ok', false, 'error', 'NONE'); end if;
  if cardinality(p_athletes) > 60 then return jsonb_build_object('ok', false, 'error', 'TOO_MANY'); end if;
  select * into v_ac from gt_academies where id = p_academy;
  select dv.id, dv.tournament_id, t.published, t.registration_mode, t.registration_open_date, t.registration_close_date
    into d from gt_divisions dv join gt_tournaments t on t.id = dv.tournament_id where dv.id = p_division;
  if not found or not d.published then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if d.registration_mode <> 'web' then return jsonb_build_object('ok', false, 'error', 'NOT_WEB'); end if;
  if (d.registration_open_date is not null and v_today < d.registration_open_date)
     or (d.registration_close_date is not null and v_today > d.registration_close_date) then
    return jsonb_build_object('ok', false, 'error', 'CLOSED');
  end if;
  for a in
    select at.id, at.full_name, at.current_rank, (s.athlete_id is not null) mine
    from unnest(p_athletes) x(id) join gt_athletes at on at.id = x.id
    left join academy_students(p_academy) s on s.athlete_id = at.id
  loop
    perform pg_advisory_xact_lock(hashtextextended(p_division::text || lower(a.full_name), 31));
    if not a.mine then
      v_skipped := v_skipped || jsonb_build_object('name', a.full_name, 'why', 'NOT_STUDENT');
    elsif coalesce(btrim(a.current_rank), '') = '' then
      v_skipped := v_skipped || jsonb_build_object('name', a.full_name, 'why', 'RANK');
    elsif exists (select 1 from gt_web_applications w where w.division_id = p_division and w.status <> 'rejected'
                    and (w.athlete_id = a.id or lower(w.full_name) = lower(regexp_replace(btrim(a.full_name), '\s+', ' ', 'g'))))
       or exists (select 1 from gt_registrations r where r.division_id = p_division and r.athlete_id = a.id and r.registration_status in ('confirmed', 'withdrawn')) then
      v_skipped := v_skipped || jsonb_build_object('name', a.full_name, 'why', 'DUPLICATE');
    else
      insert into gt_web_applications (tournament_id, division_id, full_name, rank_label, club, athlete_id, academy_id, submitted_by)
      values (d.tournament_id, p_division, regexp_replace(btrim(a.full_name), '\s+', ' ', 'g'), btrim(a.current_rank), v_ac.name, a.id, p_academy, auth.uid());
      v_added := v_added + 1;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'added', v_added, 'skipped', v_skipped);
end $$;

-- The institution's entries and what they cost (payment details come from the organiser later).
create or replace function public.gt_academy_applications_v1(p_academy uuid)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private as $$
begin
  if academy_role(p_academy) is null then return jsonb_build_object('ok', false, 'error', 'NO_ACCESS'); end if;
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('id', w.id, 'name', w.full_name, 'rank', w.rank_label, 'athlete_id', w.athlete_id,
             'tournament_id', w.tournament_id, 'title', t.title, 'date', t.event_date, 'division', d.name, 'fee', d.entry_fee_thb,
             'status', w.status, 'payment', r.payment_status, 'created_at', w.created_at,
             'reference', upper(left(replace(w.id::text, '-', ''), 6)))
           order by w.created_at desc)
    from gt_web_applications w join gt_tournaments t on t.id = w.tournament_id join gt_divisions d on d.id = w.division_id
    left join gt_registrations r on r.id = w.registration_id
    where w.academy_id = p_academy), '[]'::jsonb));
end $$;

-- Site owner: teachers waiting for approval / approve or remove.
create or replace function public.gt_platform_academy_staff_v1()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform gt_require_platform_admin_v1();
  return coalesce((
    select jsonb_agg(jsonb_build_object('academy_id', ac.id, 'academy', ac.name, 'user_id', s.user_id, 'email', u.email,
             'name', coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name'),
             'role', s.role, 'status', s.status, 'created_at', s.created_at)
           order by (s.status = 'pending') desc, s.created_at desc)
    from gt_academy_staff s join gt_academies ac on ac.id = s.academy_id join auth.users u on u.id = s.user_id
    where s.status in ('pending', 'active')), '[]'::jsonb);
end $$;

create or replace function public.gt_platform_decide_academy_staff_v1(p_academy uuid, p_user uuid, p_approve boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_admin uuid := auth.uid();
begin
  perform gt_require_platform_admin_v1();
  update gt_academy_staff set status = case when p_approve then 'active' else 'revoked' end, granted_by = v_admin
  where academy_id = p_academy and user_id = p_user;
  if not found then raise exception 'NOT_FOUND'; end if;
  return case when p_approve then 'active' else 'revoked' end;
end $$;

-- Organiser approval: group entries reuse the chosen athlete instead of matching by name.
create or replace function public.gt_staff_decide_application_v1(p_id uuid, p_approve boolean)
 returns text language plpgsql security definer set search_path to 'public', 'gt_private' as $function$
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
  if a.athlete_id is not null then
    select t.* into v_ath from gt_athletes t where t.id = a.athlete_id;
  else
    select t.* into v_ath from gt_athletes t
     where lower(regexp_replace(btrim(t.full_name), '\s+', ' ', 'g')) = lower(a.full_name)
       and (t.school_name is null or a.club is null or lower(btrim(t.school_name)) = lower(a.club))
     order by t.created_at limit 1;
  end if;
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
end $function$;

-- Sign-in routing knows about institutions too.
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
                           where s.user_id = auth.uid() and s.status in ('active', 'pending')), '[]'::jsonb));
$$;

revoke all on function gt_private.academy_role(uuid), gt_private.academy_students(uuid) from public, anon, authenticated;
revoke all on function public.gt_institutions_v1(text), public.gt_academy_join_v1(text, text), public.gt_my_academies_v1(),
  public.gt_academy_overview_v1(uuid), public.gt_academy_add_student_v1(uuid, text, text, text), public.gt_open_events_v1(),
  public.gt_academy_group_apply_v1(uuid, uuid, uuid[]), public.gt_academy_applications_v1(uuid),
  public.gt_platform_academy_staff_v1(), public.gt_platform_decide_academy_staff_v1(uuid, uuid, boolean) from public, anon;
grant execute on function public.gt_institutions_v1(text), public.gt_academy_join_v1(text, text), public.gt_my_academies_v1(),
  public.gt_academy_overview_v1(uuid), public.gt_academy_add_student_v1(uuid, text, text, text), public.gt_open_events_v1(),
  public.gt_academy_group_apply_v1(uuid, uuid, uuid[]), public.gt_academy_applications_v1(uuid),
  public.gt_platform_academy_staff_v1(), public.gt_platform_decide_academy_staff_v1(uuid, uuid, boolean) to authenticated;
