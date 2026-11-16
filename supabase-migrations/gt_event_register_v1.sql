-- Web sign-up from the event poster (design 16 Nov 2026, ครูเล็ก). No sign-in needed.
--
-- 1. "สมัครใหม่": name, birth date (age shown in the browser), photo, phone, school + class, Go institutions
--    (several; tick "show in the institution's student list"), rank (entered / follow organiser-certified results).
-- 2. "มีข้อมูลแล้ว": search your name in the register → public card (photo, rank, institution, record);
--    only the phone number for this event is asked again. Private data is never shown to the public.
-- 3. Division → pay to the account the organiser CONFIRMED for this event → attach slip → preview → confirm.
--    Missing items come back as reasons ("สมัครไม่สำเร็จ เพราะ …").
--
-- Private data (birth date, phone, school, slip) lives in gt_private and is visible only to this event's
-- organisers and the site owner. Bank details are shown only after the organiser confirms the account.

-- ---------- private details of a web application ----------
create table if not exists gt_private.web_application_details_v1 (
  application_id uuid primary key references public.gt_web_applications(id) on delete cascade,
  mode text not null check (mode in ('new', 'existing')),
  go_id text,
  birth_date date,
  phone text not null check (phone ~ '^0[0-9]{8,9}$'),
  school text check (school is null or length(school) <= 160),
  school_level text check (school_level is null or length(school_level) <= 60),
  academies text[] not null default '{}' check (cardinality(academies) <= 5),
  show_in_academy boolean not null default true,
  rank_source text not null default 'self' check (rank_source in ('self', 'results')),
  fee_thb numeric check (fee_thb is null or fee_thb between 0 and 1000000),
  slip_path text,
  slip_mime text,
  created_at timestamptz not null default now()
);
revoke all on gt_private.web_application_details_v1 from public, anon, authenticated;
create unique index if not exists web_application_details_slip_v1 on gt_private.web_application_details_v1 (slip_path) where slip_path is not null;

-- ---------- rank text from the register ("8" = 8 คิว) ----------
create or replace function gt_private.rank_label_v1(p text) returns text
language sql immutable set search_path = pg_catalog as $$
  select case when btrim(coalesce(p, '')) ~ '^([1-9]|[12][0-9]|30)$' then btrim(p) || ' คิว'
              when btrim(coalesce(p, '')) ~ '^[1-9] ดั้ง$' then btrim(p)
              when btrim(coalesce(p, '')) ~ '^([1-9]|[12][0-9]|30) คิว$' then btrim(p)
              else null end
$$;

-- ---------- who can be found on the "มีข้อมูลแล้ว" tab ----------
create or replace function gt_private.register_candidates_v1(p_query text)
returns table (go_id text, full_name text, rank text, athlete_id uuid, photo text, institution text, events int, wins int, losses int)
language sql stable security definer set search_path = public, gt_private as $$
  with q as (select regexp_replace(btrim(coalesce(p_query, '')), '\s+', ' ', 'g') s),
  people as (
    select r.go_id, r.full_name, r.source_rank from history_identity_registry_v1 r
    union all
    select a.go_id, a.full_name, a.current_rank from gt_athletes a
    where not exists (select 1 from history_identity_registry_v1 r where r.go_id = a.go_id)
  ), hit as (
    select p.* from people p, q
    where length(q.s) >= 2 and p.go_id <> 'GO106260826'
      and (regexp_replace(p.full_name, '[[:space:]\u00a0\u200b-\u200d\ufeff]', '', 'g') = regexp_replace(q.s, '[[:space:]\u00a0\u200b-\u200d\ufeff]', '', 'g')
           or split_part(regexp_replace(btrim(regexp_replace(p.full_name, '[\u00a0\u200b-\u200d\ufeff]', '', 'g')), '\s+', ' ', 'g'), ' ', 1) = q.s)
    order by p.full_name limit 10
  )
  select h.go_id, regexp_replace(btrim(regexp_replace(h.full_name, '[\u00a0\u200b-\u200d\ufeff]', '', 'g')), '\s+', ' ', 'g'),
         coalesce(rank_label_v1(a.current_rank), rank_label_v1(h.source_rank)),
         a.id, a.avatar_url,
         coalesce((select coalesce(nullif(btrim(rg.display_institution), ''), a.school_name) from gt_registrations rg join gt_tournaments t on t.id = rg.tournament_id
                   where rg.athlete_id = a.id and rg.registration_status in ('confirmed', 'withdrawn') order by t.event_date desc nulls last limit 1), a.school_name),
         ((select count(*) from history_event_summaries_v1 s where s.go_id = h.go_id)
          + (select count(*) from gt_registrations rg join gt_tournaments t on t.id = rg.tournament_id where rg.athlete_id = a.id and t.published and rg.registration_status = 'confirmed'))::int,
         coalesce((select sum(s.wins) from history_event_summaries_v1 s where s.go_id = h.go_id), 0)::int,
         coalesce((select sum(s.losses) from history_event_summaries_v1 s where s.go_id = h.go_id), 0)::int
  from hit h left join gt_athletes a on a.go_id = h.go_id
$$;
revoke all on function gt_private.register_candidates_v1(text) from public, anon, authenticated;

-- Public search: whole first name or full name (no partial matches), at most 10 people, public fields only.
create or replace function public.gt_register_search_v1(p_query text)
returns jsonb language sql stable security definer set search_path = public, gt_private as $$
  select coalesce(jsonb_agg(jsonb_build_object('go_id', c.go_id, 'full_name', c.full_name, 'rank', c.rank, 'photo', c.photo,
           'institution', c.institution, 'events', c.events, 'wins', c.wins, 'losses', c.losses) order by c.full_name), '[]'::jsonb)
  from gt_private.register_candidates_v1(p_query) c
$$;
revoke all on function public.gt_register_search_v1(text) from public;
grant execute on function public.gt_register_search_v1(text) to anon, authenticated;

-- Institution names for the sign-up form.
create or replace function public.gt_academy_names_v1()
returns setof text language sql stable security definer set search_path = public as $$
  select name from gt_academies where status = 'active' order by lower(name)
$$;
revoke all on function public.gt_academy_names_v1() from public;
grant execute on function public.gt_academy_names_v1() to anon, authenticated;

-- ---------- payment account per event (organiser enters, then confirms) ----------
-- Before: anyone could read the saved account of any published event. Now only confirmed ones.
drop policy if exists gt_payment_settings_read_v2 on public.gt_event_payment_settings_v2;
create policy gt_payment_settings_read_v2 on public.gt_event_payment_settings_v2 for select
  using (registration_enabled and exists (select 1 from gt_tournaments t where t.id = gt_event_payment_settings_v2.tournament_id and t.published));

create or replace function public.gt_event_payment_public_v1(p_tournament uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('bank_name', s.bank_name, 'account_name', s.account_name, 'account_number', s.account_number, 'qr_url', s.qr_url)
  from gt_event_payment_settings_v2 s join gt_tournaments t on t.id = s.tournament_id
  where s.tournament_id = p_tournament and t.published and s.registration_enabled
$$;
revoke all on function public.gt_event_payment_public_v1(uuid) from public;
grant execute on function public.gt_event_payment_public_v1(uuid) to anon, authenticated;

create or replace function public.gt_staff_payment_settings_v1(p_tournament uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return (select jsonb_build_object('bank_name', s.bank_name, 'account_name', s.account_name, 'account_number', s.account_number,
                 'qr_url', s.qr_url, 'confirmed', s.registration_enabled, 'updated_at', s.updated_at)
          from gt_event_payment_settings_v2 s where s.tournament_id = p_tournament);
end $$;

-- Saving changed details always needs a fresh "ยืนยันบัญชี" before the public sees them.
create or replace function public.gt_staff_set_payment_v1(p_tournament uuid, p_bank text, p_account_name text, p_account_number text, p_qr_url text, p_confirm boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_bank text := btrim(coalesce(p_bank, '')); v_name text := btrim(coalesce(p_account_name, ''));
        v_no text := regexp_replace(coalesce(p_account_number, ''), '[^0-9-]', '', 'g'); v_qr text := nullif(btrim(coalesce(p_qr_url, '')), '');
        v_old gt_event_payment_settings_v2%rowtype; v_same boolean;
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  if length(v_bank) < 2 or length(v_bank) > 100 then return jsonb_build_object('ok', false, 'error', 'BANK'); end if;
  if length(v_name) < 2 or length(v_name) > 200 then return jsonb_build_object('ok', false, 'error', 'ACCOUNT_NAME'); end if;
  if v_no !~ '^[0-9-]{6,30}$' then return jsonb_build_object('ok', false, 'error', 'ACCOUNT_NUMBER'); end if;
  if v_qr is not null and v_qr !~ ('^https://bqyokjwuxyzyiripijbs\.supabase\.co/storage/v1/object/public/gt-site-assets/payment-qr/' || p_tournament::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    return jsonb_build_object('ok', false, 'error', 'QR');
  end if;
  select * into v_old from gt_event_payment_settings_v2 where tournament_id = p_tournament for update;
  v_same := found and v_old.bank_name = v_bank and v_old.account_name = v_name and v_old.account_number = v_no and v_old.qr_url is not distinct from v_qr;
  insert into gt_event_payment_settings_v2 (tournament_id, bank_name, account_name, account_number, qr_url, registration_enabled, updated_at)
  values (p_tournament, v_bank, v_name, v_no, v_qr, coalesce(p_confirm, false), now())
  on conflict (tournament_id) do update set bank_name = excluded.bank_name, account_name = excluded.account_name,
    account_number = excluded.account_number, qr_url = excluded.qr_url, updated_at = now(),
    registration_enabled = case when p_confirm then true when v_same then gt_event_payment_settings_v2.registration_enabled else false end;
  return jsonb_build_object('ok', true, 'confirmed', (select registration_enabled from gt_event_payment_settings_v2 where tournament_id = p_tournament));
end $$;

create or replace function public.gt_staff_unconfirm_payment_v1(p_tournament uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  update gt_event_payment_settings_v2 set registration_enabled = false, updated_at = now() where tournament_id = p_tournament;
  return true;
end $$;
revoke all on function public.gt_staff_payment_settings_v1(uuid), public.gt_staff_set_payment_v1(uuid, text, text, text, text, boolean),
  public.gt_staff_unconfirm_payment_v1(uuid) from public, anon;
grant execute on function public.gt_staff_payment_settings_v1(uuid), public.gt_staff_set_payment_v1(uuid, text, text, text, text, boolean),
  public.gt_staff_unconfirm_payment_v1(uuid) to authenticated;

-- QR picture: organisers of the event upload to the public site bucket under payment-qr/<event>/.
create or replace function public.gt_can_upload_payment_qr_v1(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if p_name !~ '^payment-qr/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$' then
    return false;
  end if;
  return gt_can_manage_tournament_v1(split_part(p_name, '/', 2)::uuid);
end $$;
revoke all on function public.gt_can_upload_payment_qr_v1(text) from public, anon;
grant execute on function public.gt_can_upload_payment_qr_v1(text) to authenticated;
drop policy if exists gt_payment_qr_upload_v1 on storage.objects;
create policy gt_payment_qr_upload_v1 on storage.objects for insert to authenticated
  with check (bucket_id = 'gt-site-assets' and public.gt_can_upload_payment_qr_v1(name));

-- ---------- payment slips from the public form ----------
drop policy if exists gt_web_slip_upload_v1 on storage.objects;
create policy gt_web_slip_upload_v1 on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'gt-payment-slips'
    and name ~ '^web/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$');

create or replace function public.gt_can_view_application_slip_v1(p_name text)
returns boolean language sql stable security definer set search_path = public, gt_private as $$
  select exists (select 1 from web_application_details_v1 x join gt_web_applications a on a.id = x.application_id
                 where x.slip_path = p_name and gt_can_manage_tournament_v1(a.tournament_id))
$$;
revoke all on function public.gt_can_view_application_slip_v1(text) from public, anon;
grant execute on function public.gt_can_view_application_slip_v1(text) to authenticated;
drop policy if exists gt_web_slip_staff_read_v1 on storage.objects;
create policy gt_web_slip_staff_read_v1 on storage.objects for select to authenticated
  using (bucket_id = 'gt-payment-slips' and name like 'web/%' and public.gt_can_view_application_slip_v1(name));

-- ---------- the sign-up itself ----------
-- Returns {ok:true, reference, …} or {ok:false, errors:[codes]} listing everything that is missing.
create or replace function public.gt_register_v1(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
  v_mode text := coalesce(p->>'mode', '');
  v_div uuid; d record; v_pay gt_event_payment_settings_v2%rowtype; v_fee numeric;
  v_first text := regexp_replace(btrim(coalesce(p->>'first_name', '')), '\s+', ' ', 'g');
  v_last text := regexp_replace(btrim(coalesce(p->>'last_name', '')), '\s+', ' ', 'g');
  v_name text; v_birth date; v_phone text := regexp_replace(coalesce(p->>'phone', ''), '[^0-9]', '', 'g');
  v_rank text := btrim(coalesce(p->>'rank', '')); v_rank_source text := coalesce(nullif(p->>'rank_source', ''), 'self');
  v_school text := nullif(regexp_replace(btrim(coalesce(p->>'school', '')), '\s+', ' ', 'g'), '');
  v_level text := nullif(btrim(coalesce(p->>'school_level', '')), '');
  v_academies text[] := '{}'; v_show boolean := coalesce((p->>'show_in_academy')::boolean, true);
  v_photo text := nullif(btrim(coalesce(p->>'photo', '')), '');
  v_slip text := nullif(btrim(coalesce(p->>'slip', '')), ''); v_slip_mime text := nullif(btrim(coalesce(p->>'slip_mime', '')), '');
  v_go text := nullif(upper(btrim(coalesce(p->>'go_id', ''))), ''); c record; v_athlete uuid;
  e text[] := '{}'; v_id uuid; v_club text;
begin
  -- event and division
  begin v_div := (p->>'division')::uuid; exception when others then v_div := null; end;
  if v_div is null then
    begin
      select t.id, null::numeric fee, null::int seats_limit, t.published, t.registration_mode, t.registration_open_date, t.registration_close_date
        into d from gt_tournaments t where t.id = (p->>'tournament')::uuid;
    exception when others then return jsonb_build_object('ok', false, 'errors', jsonb_build_array('NOT_FOUND')); end;
    if not found or not d.published then return jsonb_build_object('ok', false, 'errors', jsonb_build_array('NOT_FOUND')); end if;
    e := array_append(e, 'DIVISION');
  else
    select dv.tournament_id id, dv.entry_fee_thb fee, dv.seats_limit, t.published, t.registration_mode,
           t.registration_open_date, t.registration_close_date
      into d from gt_divisions dv join gt_tournaments t on t.id = dv.tournament_id where dv.id = v_div;
    if not found or not d.published then return jsonb_build_object('ok', false, 'errors', jsonb_build_array('NOT_FOUND')); end if;
  end if;
  if d.registration_mode <> 'web' then return jsonb_build_object('ok', false, 'errors', jsonb_build_array('NOT_WEB')); end if;
  if (d.registration_open_date is not null and v_today < d.registration_open_date)
     or (d.registration_close_date is not null and v_today > d.registration_close_date) then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('CLOSED'));
  end if;
  if v_div is not null and d.seats_limit is not null
     and (select count(*) from gt_registrations r where r.division_id = v_div and r.registration_status = 'confirmed') >= d.seats_limit then
    e := array_append(e, 'FULL');
  end if;

  -- who
  if v_mode = 'existing' then
    select * into c from gt_private.register_candidates_v1(coalesce(p->>'full_name', '')) k where k.go_id = v_go limit 1;
    if not found then
      e := array_append(e, 'ATHLETE');
    else
      v_name := c.full_name; v_athlete := c.athlete_id; v_club := c.institution;
      if v_rank = '' then v_rank := coalesce(c.rank, ''); end if;
    end if;
    v_photo := null;
  elsif v_mode = 'new' then
    if v_first = '' or v_last = '' or length(v_first || v_last) < 2 or length(v_first) > 60 or length(v_last) > 60 then e := array_append(e, 'NAME'); end if;
    v_name := v_first || ' ' || v_last;
    begin v_birth := (p->>'birth_date')::date; exception when others then v_birth := null; end;
    if v_birth is null or v_birth > v_today - 365 * 3 or v_birth < date '1920-01-01' then e := array_append(e, 'BIRTH'); end if;
    if v_photo is not null and (
         v_photo !~ '^pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
         or not exists (select 1 from storage.objects o where o.bucket_id = 'gt-application-photos' and o.name = v_photo)
         or exists (select 1 from gt_web_applications a where a.photo_path = v_photo)) then
      e := array_append(e, 'PHOTO');
    elsif v_photo is not null and not coalesce((p->>'photo_consent')::boolean, false) then
      e := array_append(e, 'PHOTO_CONSENT');
    end if;
    if v_school is not null and length(v_school) > 160 or v_level is not null and length(v_level) > 60 then e := array_append(e, 'SCHOOL'); end if;
    if jsonb_typeof(p->'academies') = 'array' then
      select coalesce(array_agg(distinct a), '{}') into v_academies
      from (select regexp_replace(btrim(x), '\s+', ' ', 'g') a from jsonb_array_elements_text(p->'academies') x) s where length(a) between 2 and 120;
    end if;
    if cardinality(v_academies) > 5 then e := array_append(e, 'ACADEMY'); end if;
    v_club := v_academies[1];
  else
    e := array_append(e, 'MODE');
  end if;
  if v_rank !~ '^([1-9]|[12][0-9]|30) คิว$' and v_rank !~ '^[1-9] ดั้ง$' then e := array_append(e, 'RANK'); end if;
  if v_rank_source not in ('self', 'results') then e := array_append(e, 'RANK'); end if;
  if v_phone !~ '^0[0-9]{8,9}$' then e := array_append(e, 'PHONE'); end if;

  -- payment
  v_fee := d.fee;
  if v_div is not null and coalesce(v_fee, 0) > 0 then
    select * into v_pay from gt_event_payment_settings_v2 s where s.tournament_id = d.id and s.registration_enabled;
    if not found then
      return jsonb_build_object('ok', false, 'errors', jsonb_build_array('PAYMENT_NOT_READY'));
    end if;
    if v_slip is null then
      e := array_append(e, 'SLIP');
    elsif v_slip !~ '^web/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
       or not exists (select 1 from storage.objects o where o.bucket_id = 'gt-payment-slips' and o.name = v_slip)
       or exists (select 1 from web_application_details_v1 w where w.slip_path = v_slip) then
      e := array_append(e, 'SLIP_INVALID');
    end if;
  else
    v_slip := null;
  end if;
  if not coalesce((p->>'accept')::boolean, false) then e := array_append(e, 'ACCEPT'); end if;

  if cardinality(e) > 0 then
    return jsonb_build_object('ok', false, 'errors', to_jsonb((select array_agg(distinct z) from unnest(e) z)));
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_div::text || lower(v_name), 31));
  if exists (select 1 from gt_web_applications a left join web_application_details_v1 w on w.application_id = a.id
             where a.division_id = v_div and a.status <> 'rejected'
               and (lower(a.full_name) = lower(v_name) or (v_go is not null and w.go_id = v_go) or (v_athlete is not null and a.athlete_id = v_athlete)))
     or exists (select 1 from gt_registrations r join gt_athletes at on at.id = r.athlete_id
                where r.division_id = v_div and r.registration_status in ('confirmed', 'withdrawn')
                  and (lower(regexp_replace(btrim(at.full_name), '\s+', ' ', 'g')) = lower(v_name) or at.id = v_athlete)) then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('DUPLICATE'));
  end if;
  if (select count(*) from gt_web_applications a where a.tournament_id = d.id and a.created_at > now() - interval '1 minute') >= 20 then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('BUSY'));
  end if;

  insert into gt_web_applications (tournament_id, division_id, full_name, rank_label, club, photo_path, athlete_id)
  values (d.id, v_div, v_name, v_rank, v_club, v_photo, v_athlete)
  returning id into v_id;
  insert into web_application_details_v1 (application_id, mode, go_id, birth_date, phone, school, school_level, academies,
                                          show_in_academy, rank_source, fee_thb, slip_path, slip_mime)
  values (v_id, v_mode, case when v_mode = 'existing' then v_go end, v_birth, v_phone, v_school, v_level, v_academies,
          v_show, v_rank_source, v_fee, v_slip, case when v_slip is not null then v_slip_mime end);
  return jsonb_build_object('ok', true, 'reference', upper(left(replace(v_id::text, '-', ''), 6)), 'name', v_name, 'fee', v_fee);
end $$;
revoke all on function public.gt_register_v1(jsonb) from public;
grant execute on function public.gt_register_v1(jsonb) to anon, authenticated;

-- ---------- organiser queue: everything they need to check ----------
create or replace function public.gt_staff_list_applications_v2(p_tournament uuid, p_division uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id, 'division_id', a.division_id, 'division_name', d.name, 'full_name', a.full_name, 'rank_label', a.rank_label,
             'club', a.club, 'status', a.status, 'created_at', a.created_at, 'photo_path', a.photo_path,
             'mode', w.mode, 'go_id', coalesce(w.go_id, at.go_id), 'birth_date', w.birth_date, 'phone', w.phone, 'school', w.school,
             'school_level', w.school_level, 'academies', coalesce(to_jsonb(w.academies), '[]'::jsonb), 'show_in_academy', w.show_in_academy,
             'rank_source', w.rank_source, 'fee', w.fee_thb, 'slip_path', w.slip_path, 'slip_mime', w.slip_mime,
             'reference', upper(left(replace(a.id::text, '-', ''), 6)))
           order by (a.status = 'pending') desc, a.created_at)
    from gt_web_applications a join gt_divisions d on d.id = a.division_id
    left join web_application_details_v1 w on w.application_id = a.id
    left join gt_athletes at on at.id = a.athlete_id
    where a.tournament_id = p_tournament and (p_division is null or a.division_id = p_division)), '[]'::jsonb);
end $$;
revoke all on function public.gt_staff_list_applications_v2(uuid, uuid) from public, anon;
grant execute on function public.gt_staff_list_applications_v2(uuid, uuid) to authenticated;

-- ---------- approval: same as before, plus register GO ID, rank update, institutions, payment ----------
create or replace function public.gt_staff_decide_application_v1(p_id uuid, p_approve boolean)
 returns text language plpgsql security definer set search_path to 'public', 'gt_private' as $function$
declare a gt_web_applications%rowtype; v_actor uuid; v_ath gt_athletes%rowtype; v_reg uuid; v_limit int; v_count int;
        v_avatar text; w web_application_details_v1%rowtype; v_reg_name text; v_inst text;
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
  select * into w from web_application_details_v1 where application_id = p_id;
  perform pg_advisory_xact_lock(hashtextextended(lower(a.full_name), 417));
  if a.athlete_id is not null then
    select t.* into v_ath from gt_athletes t where t.id = a.athlete_id;
  elsif w.go_id is not null then
    select t.* into v_ath from gt_athletes t where t.go_id = w.go_id;
    if not found then
      insert into gt_athletes (go_id, full_name, school_name, current_rank, avatar_url)
      values (w.go_id, a.full_name, a.club, a.rank_label, v_avatar) returning * into v_ath;
    end if;
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
    -- Official rank changes stay with the site owner/admins (gt_protect_athlete_identity_v2); others keep the old rule.
    update gt_athletes set current_rank = case when w.application_id is not null and gt_is_platform_admin_v1() then a.rank_label else coalesce(current_rank, a.rank_label) end,
                           avatar_url = coalesce(v_avatar, avatar_url) where id = v_ath.id;
  end if;
  insert into gt_registrations (tournament_id, division_id, athlete_id, registration_status, payment_status, display_institution, fee_snapshot_thb)
  values (a.tournament_id, a.division_id, v_ath.id, 'confirmed',
          case when w.slip_path is not null then 'verified' when w.application_id is not null and coalesce(w.fee_thb, 0) = 0 then 'waived' else 'pending' end,
          a.club, w.fee_thb)
  on conflict (tournament_id, division_id, athlete_id) do update set registration_status = 'confirmed', display_institution = coalesce(excluded.display_institution, gt_registrations.display_institution)
  returning id into v_reg;
  -- "show me in my institution's student list"
  if w.application_id is not null and w.show_in_academy then
    foreach v_inst in array w.academies loop
      insert into gt_academy_memberships (academy_id, athlete_id, membership_status, verified_by, verified_at)
      select ac.id, v_ath.id, 'verified', v_actor, now() from gt_academies ac
      where gt_private.norm_inst(ac.name) = gt_private.norm_inst(v_inst) and ac.status = 'active'
      on conflict (academy_id, athlete_id) do update set membership_status = 'verified', verified_by = excluded.verified_by, verified_at = excluded.verified_at;
    end loop;
  end if;
  update gt_web_applications set status = 'approved', registration_id = v_reg, decided_by = v_actor, decided_at = now() where id = p_id;
  insert into gt_match_audit_v1 (division_id, action, after, actor) values (a.division_id, 'approve_application', jsonb_build_object('application', p_id, 'athlete', v_ath.id, 'photo', v_avatar is not null), v_actor);
  return 'approved';
end $function$;

-- Dan-register guard: creating the athlete row for a person's OWN register GO ID is not a duplicate.
create or replace function gt_private.prevent_legacy_duplicate_v5()
 returns trigger language plpgsql security definer set search_path to 'pg_catalog' as $function$
begin
  if auth.uid() is not null
     and exists (select 1 from gt_private.legacy_dan_directory_v5 where regexp_replace(btrim(full_name), '\s+', ' ', 'g') = regexp_replace(btrim(new.full_name), '\s+', ' ', 'g'))
     and not exists (select 1 from public.gt_athlete_claim_requests c join public.gt_staff_members s on s.user_id = auth.uid()
                     where s.active and s.role in ('owner', 'admin') and c.go_id = new.go_id and c.status = 'approved' and c.reviewed_by = auth.uid() and c.requester_user_id = new.claimed_by)
     and not exists (select 1 from gt_private.history_identity_registry_v1 r
                     where r.go_id = new.go_id
                       and regexp_replace(r.full_name, '[[:space:]\u00a0\u200b-\u200d\ufeff]', '', 'g') = regexp_replace(new.full_name, '[[:space:]\u00a0\u200b-\u200d\ufeff]', '', 'g')) then
    raise exception 'DUPLICATE_REVIEW_REQUIRED';
  end if;
  return new;
end $function$;
