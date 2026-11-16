-- Withdraw / swap athlete / change division (16 Nov 2026, ครูเล็ก).
-- * Each organiser sets the conditions of their own event: refund tiers by date (e.g. 100% until …, 50% until …,
--   then x%), and for each action whether it is allowed, the last day and a fee.
-- * The applicant opens their entry with the 6-character reference + phone (no account), or from their account.
-- * Every change is a REQUEST; the organiser approves or rejects it. Refunds are transferred by the organiser
--   to the account the applicant typed in (visible to the organiser only), then marked "คืนเงินแล้ว".

-- Who sent a web application, when signed in (lets "my applications" find it).
create or replace function gt_private.web_application_submitter_v1() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if new.submitted_by is null then new.submitted_by := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists gt_web_application_submitter_v1 on public.gt_web_applications;
create trigger gt_web_application_submitter_v1 before insert on public.gt_web_applications
  for each row execute function gt_private.web_application_submitter_v1();

-- ---------- the organiser's conditions ----------
create table if not exists public.gt_event_change_policy_v1 (
  tournament_id uuid primary key references public.gt_tournaments(id) on delete cascade,
  allow_withdraw boolean not null default false,
  withdraw_until date,
  refund_tiers jsonb not null default '[]' check (jsonb_typeof(refund_tiers) = 'array' and jsonb_array_length(refund_tiers) <= 6),
  refund_after_percent int not null default 0 check (refund_after_percent between 0 and 100),
  allow_swap boolean not null default false,
  swap_until date,
  swap_fee numeric not null default 0 check (swap_fee between 0 and 100000),
  allow_division boolean not null default false,
  division_until date,
  division_fee numeric not null default 0 check (division_fee between 0 and 100000),
  note text check (note is null or length(note) <= 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.gt_event_change_policy_v1 enable row level security;
revoke all on public.gt_event_change_policy_v1 from anon, authenticated;

create or replace function gt_private.change_policy_json_v1(p_tournament uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('allow_withdraw', c.allow_withdraw, 'withdraw_until', c.withdraw_until, 'refund_tiers', c.refund_tiers,
           'refund_after_percent', c.refund_after_percent, 'allow_swap', c.allow_swap, 'swap_until', c.swap_until, 'swap_fee', c.swap_fee,
           'allow_division', c.allow_division, 'division_until', c.division_until, 'division_fee', c.division_fee, 'note', c.note)
  from gt_event_change_policy_v1 c where c.tournament_id = p_tournament
$$;

-- Refund percent on a given day: first tier whose date has not passed, otherwise the "after" percent.
create or replace function gt_private.refund_percent_v1(p_tournament uuid, p_day date) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select (t->>'percent')::int from gt_event_change_policy_v1 c, jsonb_array_elements(c.refund_tiers) t
                   where c.tournament_id = p_tournament and (t->>'until')::date >= p_day order by (t->>'until')::date limit 1),
                  (select refund_after_percent from gt_event_change_policy_v1 where tournament_id = p_tournament), 0)
$$;

create or replace function public.gt_event_change_policy_v1(p_tournament uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select gt_private.change_policy_json_v1(t.id) from gt_tournaments t where t.id = p_tournament and t.published
$$;
revoke all on function public.gt_event_change_policy_v1(uuid) from public;
grant execute on function public.gt_event_change_policy_v1(uuid) to anon, authenticated;

create or replace function public.gt_staff_change_policy_v1(p_tournament uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return gt_private.change_policy_json_v1(p_tournament);
end $$;

create or replace function public.gt_staff_set_change_policy_v1(p_tournament uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1(p_tournament); v_tiers jsonb := '[]'; t jsonb; v_last date; v_d date; v_pct int;
begin
  if jsonb_typeof(p->'refund_tiers') = 'array' then
    if jsonb_array_length(p->'refund_tiers') > 6 then return jsonb_build_object('ok', false, 'error', 'TIERS'); end if;
    for t in select x from jsonb_array_elements(p->'refund_tiers') x order by (x->>'until') loop
      begin v_d := (t->>'until')::date; v_pct := (t->>'percent')::int; exception when others then return jsonb_build_object('ok', false, 'error', 'TIERS'); end;
      if v_d is null or v_pct is null or v_pct < 0 or v_pct > 100 or v_d = v_last then return jsonb_build_object('ok', false, 'error', 'TIERS'); end if;
      v_tiers := v_tiers || jsonb_build_object('until', v_d, 'percent', v_pct); v_last := v_d;
    end loop;
  end if;
  insert into gt_event_change_policy_v1 as c (tournament_id, allow_withdraw, withdraw_until, refund_tiers, refund_after_percent, allow_swap, swap_until, swap_fee,
                                             allow_division, division_until, division_fee, note, updated_at, updated_by)
  values (p_tournament, coalesce((p->>'allow_withdraw')::boolean, false), nullif(p->>'withdraw_until', '')::date, v_tiers,
          coalesce(nullif(p->>'refund_after_percent', '')::int, 0), coalesce((p->>'allow_swap')::boolean, false), nullif(p->>'swap_until', '')::date,
          coalesce(nullif(p->>'swap_fee', '')::numeric, 0), coalesce((p->>'allow_division')::boolean, false), nullif(p->>'division_until', '')::date,
          coalesce(nullif(p->>'division_fee', '')::numeric, 0), nullif(btrim(coalesce(p->>'note', '')), ''), now(), v_actor)
  on conflict (tournament_id) do update set allow_withdraw = excluded.allow_withdraw, withdraw_until = excluded.withdraw_until,
    refund_tiers = excluded.refund_tiers, refund_after_percent = excluded.refund_after_percent, allow_swap = excluded.allow_swap,
    swap_until = excluded.swap_until, swap_fee = excluded.swap_fee, allow_division = excluded.allow_division,
    division_until = excluded.division_until, division_fee = excluded.division_fee, note = excluded.note, updated_at = now(), updated_by = v_actor;
  return jsonb_build_object('ok', true);
exception when check_violation or invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
  return jsonb_build_object('ok', false, 'error', 'VALUE');
end $$;
revoke all on function public.gt_staff_change_policy_v1(uuid), public.gt_staff_set_change_policy_v1(uuid, jsonb) from public, anon;
grant execute on function public.gt_staff_change_policy_v1(uuid), public.gt_staff_set_change_policy_v1(uuid, jsonb) to authenticated;

-- ---------- requests (private) ----------
create table if not exists gt_private.application_requests_v1 (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.gt_web_applications(id) on delete cascade,
  kind text not null check (kind in ('withdraw', 'swap', 'division')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  new_division uuid references public.gt_divisions(id),
  new_person jsonb,
  reason text check (reason is null or length(reason) <= 500),
  fee_paid numeric not null default 0,
  refund_percent int,
  refund_amount numeric not null default 0,
  charge_amount numeric not null default 0,
  pay_slip_path text,
  pay_slip_mime text,
  refund_bank jsonb,
  refund_done_at timestamptz,
  refund_slip_path text,
  requested_by uuid,
  created_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text check (decision_note is null or length(decision_note) <= 500)
);
revoke all on gt_private.application_requests_v1 from public, anon, authenticated;
create unique index if not exists application_requests_one_pending_v1 on gt_private.application_requests_v1 (application_id) where status = 'pending';
create table if not exists gt_private.application_lookup_failures_v1 (reference text not null, at timestamptz not null default now());
revoke all on gt_private.application_lookup_failures_v1 from public, anon, authenticated;

-- Which application the caller may open: reference + phone, or their own account.
create or replace function gt_private.application_for_v1(p_reference text, p_phone text, p_id uuid) returns uuid
language plpgsql security definer set search_path = public, gt_private as $$
declare v_ref text := upper(regexp_replace(coalesce(p_reference, ''), '[^0-9A-Fa-f]', '', 'g'));
        v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'); v_id uuid; v_uid uuid := auth.uid();
begin
  if p_id is not null then
    if v_uid is null then return null; end if;
    select a.id into v_id from gt_web_applications a left join gt_athletes at on at.id = a.athlete_id
    left join gt_registrations r on r.id = a.registration_id left join gt_athletes ra on ra.id = r.athlete_id
    where a.id = p_id and (a.submitted_by = v_uid or at.claimed_by = v_uid or ra.claimed_by = v_uid);
    return v_id;
  end if;
  if length(v_ref) <> 6 or v_phone !~ '^0[0-9]{8,9}$' then return null; end if;
  if (select count(*) from application_lookup_failures_v1 f where f.reference = v_ref and f.at > now() - interval '1 hour') >= 8 then
    raise exception 'LOCKED';
  end if;
  select a.id into v_id from gt_web_applications a join web_application_details_v1 w on w.application_id = a.id
  where upper(left(replace(a.id::text, '-', ''), 6)) = v_ref and w.phone = v_phone limit 1;
  if v_id is null then insert into application_lookup_failures_v1 (reference) values (v_ref); end if;
  return v_id;
end $$;

-- One application as the applicant sees it (no other people's data).
create or replace function gt_private.application_json_v1(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  select jsonb_build_object(
    'id', a.id, 'reference', upper(left(replace(a.id::text, '-', ''), 6)), 'created_at', a.created_at,
    'status', a.status, 'full_name', a.full_name, 'rank', a.rank_label, 'club', a.club,
    'tournament_id', t.id, 'title', t.title, 'event_date', t.event_date, 'poster_url', t.poster_url,
    'division_id', d.id, 'division', d.name, 'fee', coalesce(w.fee_thb, d.entry_fee_thb), 'paid', w.slip_path is not null,
    'registration', (select r.registration_status from gt_registrations r where r.id = a.registration_id),
    'payment', (select r.payment_status from gt_registrations r where r.id = a.registration_id),
    'policy', change_policy_json_v1(t.id),
    'refund_percent_today', refund_percent_v1(t.id, (now() at time zone 'Asia/Bangkok')::date),
    'divisions', (select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'fee', x.entry_fee_thb) order by x.name) from gt_divisions x where x.tournament_id = t.id),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'status', q.status, 'created_at', q.created_at,
                  'refund_amount', q.refund_amount, 'charge_amount', q.charge_amount, 'refund_done', q.refund_done_at is not null,
                  'new_division', (select name from gt_divisions where id = q.new_division), 'new_name', q.new_person->>'full_name',
                  'decision_note', q.decision_note) order by q.created_at desc)
                 from application_requests_v1 q where q.application_id = a.id), '[]'::jsonb))
  from gt_web_applications a join gt_tournaments t on t.id = a.tournament_id join gt_divisions d on d.id = a.division_id
  left join web_application_details_v1 w on w.application_id = a.id
  where a.id = p_id
$$;

create or replace function public.gt_application_status_v1(p_reference text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare v_id uuid;
begin
  begin v_id := gt_private.application_for_v1(p_reference, p_phone, null);
  exception when raise_exception then return jsonb_build_object('ok', false, 'error', 'LOCKED'); end;
  if v_id is null then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  return jsonb_build_object('ok', true, 'application', gt_private.application_json_v1(v_id));
end $$;
revoke all on function public.gt_application_status_v1(text, text) from public;
grant execute on function public.gt_application_status_v1(text, text) to anon, authenticated;

create or replace function public.gt_my_applications_v1() returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  select coalesce(jsonb_agg(gt_private.application_json_v1(x.id) order by x.created_at desc), '[]'::jsonb)
  from (select distinct a.id, a.created_at from gt_web_applications a left join gt_athletes at on at.id = a.athlete_id
        left join gt_registrations r on r.id = a.registration_id left join gt_athletes ra on ra.id = r.athlete_id
        where auth.uid() is not null and (a.submitted_by = auth.uid() or at.claimed_by = auth.uid() or ra.claimed_by = auth.uid())
        order by a.created_at desc limit 50) x
$$;
revoke all on function public.gt_my_applications_v1() from public, anon;
grant execute on function public.gt_my_applications_v1() to authenticated;

-- ---------- applicant: send a request ----------
create or replace function public.gt_application_request_v1(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare v_id uuid; a gt_web_applications%rowtype; w web_application_details_v1%rowtype; pol gt_event_change_policy_v1%rowtype; t gt_tournaments%rowtype;
        v_kind text := coalesce(p->>'kind', ''); v_today date := (now() at time zone 'Asia/Bangkok')::date; e text[] := '{}';
        v_paid numeric := 0; v_pct int; v_refund numeric := 0; v_charge numeric := 0; v_new_div gt_divisions%rowtype; v_old_fee numeric;
        np jsonb := coalesce(p->'new_person', '{}'::jsonb); v_person jsonb; v_bank jsonb := coalesce(p->'refund_bank', '{}'::jsonb);
        v_slip text := nullif(btrim(coalesce(p->>'pay_slip', '')), ''); c record; v_birth date; v_nm text; v_req uuid;
begin
  begin
    v_id := gt_private.application_for_v1(p->>'reference', p->>'phone', nullif(p->>'application_id', '')::uuid);
  exception when raise_exception then return jsonb_build_object('ok', false, 'errors', jsonb_build_array('LOCKED'));
            when invalid_text_representation then v_id := null; end;
  if v_id is null then return jsonb_build_object('ok', false, 'errors', jsonb_build_array('NOT_FOUND')); end if;
  select * into a from gt_web_applications where id = v_id for update;
  select * into w from web_application_details_v1 where application_id = v_id;
  select * into t from gt_tournaments where id = a.tournament_id;
  select * into pol from gt_event_change_policy_v1 where tournament_id = a.tournament_id;
  if a.status = 'rejected' or (a.registration_id is not null and exists (select 1 from gt_registrations r where r.id = a.registration_id and r.registration_status <> 'confirmed')) then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('NOT_ACTIVE'));
  end if;
  if t.event_date is not null and v_today > t.event_date then return jsonb_build_object('ok', false, 'errors', jsonb_build_array('EVENT_PASSED')); end if;
  if v_kind not in ('withdraw', 'swap', 'division') then return jsonb_build_object('ok', false, 'errors', jsonb_build_array('KIND')); end if;
  if pol.tournament_id is null
     or (v_kind = 'withdraw' and not pol.allow_withdraw) or (v_kind = 'swap' and not pol.allow_swap) or (v_kind = 'division' and not pol.allow_division) then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('NOT_ALLOWED'));
  end if;
  if (v_kind = 'withdraw' and pol.withdraw_until < v_today) or (v_kind = 'swap' and pol.swap_until < v_today) or (v_kind = 'division' and pol.division_until < v_today) then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('PAST_DEADLINE'));
  end if;
  if exists (select 1 from application_requests_v1 q where q.application_id = v_id and q.status = 'pending') then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('PENDING_EXISTS'));
  end if;
  v_paid := case when w.slip_path is not null then coalesce(w.fee_thb, 0) else 0 end;

  if v_kind = 'withdraw' then
    v_pct := refund_percent_v1(a.tournament_id, v_today);
    v_refund := round(v_paid * v_pct / 100.0, 2);
    if v_refund > 0 then
      if length(btrim(coalesce(v_bank->>'bank_name', ''))) < 2 or length(btrim(coalesce(v_bank->>'account_name', ''))) < 2
         or regexp_replace(coalesce(v_bank->>'account_number', ''), '[^0-9]', '', 'g') !~ '^[0-9]{6,20}$' then
        e := array_append(e, 'BANK');
      end if;
      v_bank := jsonb_build_object('bank_name', left(btrim(v_bank->>'bank_name'), 100), 'account_name', left(btrim(v_bank->>'account_name'), 200),
                                   'account_number', regexp_replace(coalesce(v_bank->>'account_number', ''), '[^0-9-]', '', 'g'));
    else
      v_bank := null;
    end if;
  else
    v_bank := null;
  end if;

  if v_kind = 'division' then
    begin select * into v_new_div from gt_divisions where id = (p->>'new_division')::uuid and tournament_id = a.tournament_id;
    exception when others then v_new_div := null; end;
    if v_new_div.id is null or v_new_div.id = a.division_id then
      e := array_append(e, 'DIVISION');
    else
      if v_new_div.seats_limit is not null and (select count(*) from gt_registrations r where r.division_id = v_new_div.id and r.registration_status = 'confirmed') >= v_new_div.seats_limit then
        e := array_append(e, 'FULL');
      end if;
      select entry_fee_thb into v_old_fee from gt_divisions where id = a.division_id;
      v_charge := pol.division_fee + greatest(0, coalesce(v_new_div.entry_fee_thb, 0) - coalesce(w.fee_thb, v_old_fee, 0));
    end if;
  end if;

  if v_kind = 'swap' then
    v_charge := pol.swap_fee;
    if np->>'mode' = 'existing' then
      select * into c from register_candidates_v1(coalesce(np->>'full_name', '')) k where k.go_id = upper(btrim(coalesce(np->>'go_id', ''))) limit 1;
      if not found then
        e := array_append(e, 'ATHLETE'); v_person := jsonb_build_object('mode', 'existing');
      else
        v_nm := c.full_name;
        v_person := jsonb_build_object('mode', 'existing', 'go_id', c.go_id, 'full_name', v_nm, 'athlete_id', c.athlete_id, 'institution', c.institution);
      end if;
    else
      v_nm := btrim(regexp_replace(coalesce(np->>'first_name', ''), '\s+', ' ', 'g')) || ' ' || btrim(regexp_replace(coalesce(np->>'last_name', ''), '\s+', ' ', 'g'));
      if btrim(coalesce(np->>'first_name', '')) = '' or btrim(coalesce(np->>'last_name', '')) = '' or length(v_nm) > 120 then e := array_append(e, 'NAME'); end if;
      begin v_birth := (np->>'birth_date')::date; exception when others then v_birth := null; end;
      if v_birth is null or v_birth > v_today - 365 * 3 or v_birth < date '1920-01-01' then e := array_append(e, 'BIRTH'); end if;
      v_person := jsonb_build_object('mode', 'new', 'full_name', v_nm, 'birth_date', v_birth);
    end if;
    if coalesce(np->>'rank', '') !~ '^([1-9]|[12][0-9]|30) คิว$' and coalesce(np->>'rank', '') !~ '^[1-9] ดั้ง$' then e := array_append(e, 'RANK'); end if;
    if regexp_replace(coalesce(np->>'phone', ''), '[^0-9]', '', 'g') !~ '^0[0-9]{8,9}$' then e := array_append(e, 'PHONE'); end if;
    v_person := v_person || jsonb_build_object('rank', np->>'rank', 'phone', regexp_replace(coalesce(np->>'phone', ''), '[^0-9]', '', 'g'));
    if v_nm is not null and lower(v_nm) = lower(a.full_name) then e := array_append(e, 'SAME_PERSON'); end if;
    if v_nm is not null and exists (select 1 from gt_web_applications x where x.division_id = a.division_id and x.id <> a.id and x.status <> 'rejected' and lower(x.full_name) = lower(v_nm)) then
      e := array_append(e, 'DUPLICATE');
    end if;
  end if;

  if v_charge > 0 then
    if v_slip is null then e := array_append(e, 'SLIP');
    elsif v_slip !~ '^web/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
       or not exists (select 1 from storage.objects o where o.bucket_id = 'gt-payment-slips' and o.name = v_slip)
       or exists (select 1 from web_application_details_v1 x where x.slip_path = v_slip)
       or exists (select 1 from application_requests_v1 x where x.pay_slip_path = v_slip) then
      e := array_append(e, 'SLIP_INVALID');
    end if;
  else
    v_slip := null;
  end if;
  if not coalesce((p->>'accept')::boolean, false) then e := array_append(e, 'ACCEPT'); end if;
  if cardinality(e) > 0 then return jsonb_build_object('ok', false, 'errors', to_jsonb((select array_agg(distinct z) from unnest(e) z))); end if;

  insert into application_requests_v1 (application_id, kind, new_division, new_person, reason, fee_paid, refund_percent, refund_amount, charge_amount,
                                       pay_slip_path, pay_slip_mime, refund_bank, requested_by)
  values (v_id, v_kind, case when v_kind = 'division' then v_new_div.id end, case when v_kind = 'swap' then v_person end,
          nullif(left(btrim(coalesce(p->>'reason', '')), 500), ''), v_paid, v_pct, v_refund, v_charge, v_slip,
          case when v_slip is not null then nullif(p->>'pay_slip_mime', '') end, v_bank, auth.uid())
  returning id into v_req;
  return jsonb_build_object('ok', true, 'request_id', v_req, 'refund_amount', v_refund, 'charge_amount', v_charge, 'refund_percent', v_pct);
end $$;
revoke all on function public.gt_application_request_v1(jsonb) from public;
grant execute on function public.gt_application_request_v1(jsonb) to anon, authenticated;

-- Applicant: cancel their own pending request.
create or replace function public.gt_application_cancel_request_v1(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare v_id uuid;
begin
  begin v_id := gt_private.application_for_v1(p->>'reference', p->>'phone', nullif(p->>'application_id', '')::uuid);
  exception when others then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end;
  if v_id is null then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  delete from application_requests_v1 where application_id = v_id and status = 'pending';
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.gt_application_cancel_request_v1(jsonb) from public;
grant execute on function public.gt_application_cancel_request_v1(jsonb) to anon, authenticated;

-- ---------- organiser ----------
create or replace function public.gt_staff_list_requests_v1(p_tournament uuid) returns jsonb
language plpgsql stable security definer set search_path = public, gt_private as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'status', q.status, 'created_at', q.created_at, 'reason', q.reason,
             'reference', upper(left(replace(a.id::text, '-', ''), 6)), 'full_name', a.full_name, 'division', d.name,
             'new_division', nd.name, 'new_person', q.new_person, 'fee_paid', q.fee_paid, 'refund_percent', q.refund_percent,
             'refund_amount', q.refund_amount, 'charge_amount', q.charge_amount, 'pay_slip_path', q.pay_slip_path, 'pay_slip_mime', q.pay_slip_mime,
             'refund_bank', q.refund_bank, 'refund_done', q.refund_done_at is not null, 'refund_slip_path', q.refund_slip_path,
             'phone', w.phone, 'decision_note', q.decision_note)
           order by (q.status = 'pending') desc, (q.status = 'approved' and q.refund_amount > 0 and q.refund_done_at is null) desc, q.created_at desc)
    from application_requests_v1 q join gt_web_applications a on a.id = q.application_id join gt_divisions d on d.id = a.division_id
    left join gt_divisions nd on nd.id = q.new_division left join web_application_details_v1 w on w.application_id = a.id
    where a.tournament_id = p_tournament), '[]'::jsonb);
end $$;

create or replace function public.gt_staff_decide_request_v1(p_id uuid, p_approve boolean, p_note text default null) returns text
language plpgsql security definer set search_path = public, gt_private as $$
declare q application_requests_v1%rowtype; a gt_web_applications%rowtype; w web_application_details_v1%rowtype; v_actor uuid;
        r gt_registrations%rowtype; v_played boolean; v_new uuid; v_np jsonb; v_new_reg gt_registrations%rowtype;
begin
  select * into q from application_requests_v1 where id = p_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  select * into a from gt_web_applications where id = q.application_id for update;
  v_actor := gt_require_tournament_staff_v1(a.tournament_id);
  if q.status <> 'pending' then raise exception 'ALREADY_DECIDED'; end if;
  if not p_approve then
    update application_requests_v1 set status = 'rejected', decided_by = v_actor, decided_at = now(), decision_note = nullif(left(btrim(coalesce(p_note, '')), 500), '') where id = p_id;
    return 'rejected';
  end if;
  select * into w from web_application_details_v1 where application_id = a.id;
  select * into r from gt_registrations where id = a.registration_id for update;
  v_played := r.id is not null and exists (select 1 from gt_matches m where m.division_id = r.division_id and m.state <> 'void'
                                           and (m.black_athlete_id = r.athlete_id or m.white_athlete_id = r.athlete_id));

  if q.kind = 'withdraw' then
    if a.status = 'pending' then
      update gt_web_applications set status = 'rejected', decided_by = v_actor, decided_at = now() where id = a.id;
    elsif r.id is not null then
      update gt_registrations set registration_status = case when v_played then 'withdrawn' else 'cancelled' end where id = r.id;
    end if;

  elsif q.kind = 'division' then
    if v_played then raise exception 'HAS_MATCHES'; end if;
    if r.id is not null then
      if exists (select 1 from gt_registrations x where x.tournament_id = r.tournament_id and x.division_id = q.new_division and x.athlete_id = r.athlete_id) then
        raise exception 'ALREADY_IN_DIVISION';
      end if;
      update gt_registrations set division_id = q.new_division where id = r.id;
    end if;
    update gt_web_applications set division_id = q.new_division where id = a.id;
    update web_application_details_v1 set fee_thb = (select entry_fee_thb from gt_divisions where id = q.new_division) where application_id = a.id and q.charge_amount > 0;

  else -- swap
    if v_played then raise exception 'HAS_MATCHES'; end if;
    v_np := q.new_person;
    if a.status = 'pending' then
      update gt_web_applications set full_name = v_np->>'full_name', rank_label = v_np->>'rank', photo_path = null,
        athlete_id = nullif(v_np->>'athlete_id', '')::uuid,
        club = case when v_np->>'mode' = 'existing' then v_np->>'institution' else club end where id = a.id;
      update web_application_details_v1 set mode = v_np->>'mode', go_id = case when v_np->>'mode' = 'existing' then v_np->>'go_id' end,
        birth_date = nullif(v_np->>'birth_date', '')::date, phone = v_np->>'phone', school = null, school_level = null where application_id = a.id;
    else
      -- Approved entry: cancel the old seat, create and approve the new person's entry (paid status carried over).
      update gt_registrations set registration_status = 'cancelled' where id = r.id;
      insert into gt_web_applications (tournament_id, division_id, full_name, rank_label, club, athlete_id, submitted_by)
      values (a.tournament_id, a.division_id, v_np->>'full_name', v_np->>'rank',
              case when v_np->>'mode' = 'existing' then v_np->>'institution' else a.club end, nullif(v_np->>'athlete_id', '')::uuid, a.submitted_by)
      returning id into v_new;
      insert into web_application_details_v1 (application_id, mode, go_id, birth_date, phone, academies, show_in_academy, fee_thb)
      values (v_new, v_np->>'mode', case when v_np->>'mode' = 'existing' then v_np->>'go_id' end, nullif(v_np->>'birth_date', '')::date,
              v_np->>'phone', coalesce(w.academies, '{}'), coalesce(w.show_in_academy, true), 0);
      perform gt_staff_decide_application_v1(v_new, true);
      update gt_registrations set payment_status = r.payment_status, fee_snapshot_thb = r.fee_snapshot_thb
      where id = (select registration_id from gt_web_applications where id = v_new);
    end if;
  end if;
  update application_requests_v1 set status = 'approved', decided_by = v_actor, decided_at = now(), decision_note = nullif(left(btrim(coalesce(p_note, '')), 500), '') where id = p_id;
  insert into gt_match_audit_v1 (division_id, action, after, actor)
  values (a.division_id, 'application_' || q.kind, jsonb_build_object('application', a.id, 'request', q.id, 'refund', q.refund_amount, 'charge', q.charge_amount), v_actor);
  return 'approved';
end $$;

create or replace function public.gt_staff_refund_done_v1(p_id uuid, p_slip text default null) returns text
language plpgsql security definer set search_path = public, gt_private as $$
declare q application_requests_v1%rowtype; v_t uuid;
begin
  select * into q from application_requests_v1 where id = p_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  select tournament_id into v_t from gt_web_applications where id = q.application_id;
  perform gt_require_tournament_staff_v1(v_t);
  if q.status <> 'approved' or q.refund_amount <= 0 then raise exception 'NO_REFUND'; end if;
  if p_slip is not null and p_slip !~ '^refund/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$' then raise exception 'PROOF_INVALID'; end if;
  update application_requests_v1 set refund_done_at = now(), refund_slip_path = coalesce(p_slip, refund_slip_path) where id = p_id;
  return 'refunded';
end $$;
revoke all on function public.gt_staff_list_requests_v1(uuid), public.gt_staff_decide_request_v1(uuid, boolean, text), public.gt_staff_refund_done_v1(uuid, text) from public, anon;
grant execute on function public.gt_staff_list_requests_v1(uuid), public.gt_staff_decide_request_v1(uuid, boolean, text), public.gt_staff_refund_done_v1(uuid, text) to authenticated;

-- Slips: change/swap payments go under web/ (anyone may upload, as for sign-up); organisers of the event can view them.
-- Refund proofs go under refund/ (organisers upload).
create or replace function public.gt_can_view_application_slip_v1(p_name text)
returns boolean language sql stable security definer set search_path = public, gt_private as $$
  select exists (select 1 from web_application_details_v1 x join gt_web_applications a on a.id = x.application_id
                 where x.slip_path = p_name and gt_can_manage_tournament_v1(a.tournament_id))
      or exists (select 1 from application_requests_v1 q join gt_web_applications a on a.id = q.application_id
                 where (q.pay_slip_path = p_name or q.refund_slip_path = p_name) and gt_can_manage_tournament_v1(a.tournament_id))
$$;
drop policy if exists gt_web_slip_staff_read_v1 on storage.objects;
create policy gt_web_slip_staff_read_v1 on storage.objects for select to authenticated
  using (bucket_id = 'gt-payment-slips' and (name like 'web/%' or name like 'refund/%') and public.gt_can_view_application_slip_v1(name));
drop policy if exists gt_refund_slip_upload_v1 on storage.objects;
create policy gt_refund_slip_upload_v1 on storage.objects for insert to authenticated
  with check (bucket_id = 'gt-payment-slips'
    and name ~ '^refund/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
    and (exists (select 1 from public.gt_staff_members s where s.user_id = auth.uid() and s.active)
         or exists (select 1 from public.gt_organizer_members m where m.user_id = auth.uid() and m.active)));
