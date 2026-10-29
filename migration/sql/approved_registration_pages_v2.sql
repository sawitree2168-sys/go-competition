-- Additive registration flow. Public RPC wrappers delegate to tightly scoped private functions.
create schema if not exists gt_private;
revoke all on schema gt_private from public;
grant usage on schema gt_private to anon,authenticated;
alter table public.gt_athletes add column if not exists photo_path text;
create table if not exists public.gt_event_payment_settings_v2 (
 tournament_id uuid primary key references public.gt_tournaments(id),
 bank_name text not null, account_name text not null, account_number text not null,
 qr_url text, registration_enabled boolean not null default false,
 updated_at timestamptz not null default now(),
 check(length(bank_name) between 2 and 100),check(length(account_name) between 2 and 200),
 check(account_number ~ '^[0-9 -]{6,30}$'),check(qr_url is null or qr_url ~ '^https://|^/payment-assets/')
);
alter table public.gt_event_payment_settings_v2 enable row level security;
create policy gt_payment_settings_read_v2 on public.gt_event_payment_settings_v2 for select to anon,authenticated using(exists(select 1 from public.gt_tournaments t where t.id=tournament_id and t.published));
create policy gt_payment_settings_staff_v2 on public.gt_event_payment_settings_v2 for all to authenticated using(exists(select 1 from public.gt_staff_members s where s.user_id=(select auth.uid()) and s.active and s.role in ('owner','admin'))) with check(exists(select 1 from public.gt_staff_members s where s.user_id=(select auth.uid()) and s.active and s.role in ('owner','admin')));
grant select on public.gt_event_payment_settings_v2 to anon,authenticated;
grant insert,update on public.gt_event_payment_settings_v2 to authenticated;
create table if not exists public.gt_application_receipts_v2 (
 registration_id uuid primary key references public.gt_registrations(id),
 submitted_by uuid not null references auth.users(id), payment_id uuid not null references public.gt_payments(id),
 bank_snapshot jsonb not null, transfer_at timestamptz not null, submitted_amount numeric(12,2) not null,
 proof_path text not null, created_at timestamptz not null default now()
);
alter table public.gt_application_receipts_v2 enable row level security;
create policy gt_receipt_read_v2 on public.gt_application_receipts_v2 for select to authenticated using(submitted_by=(select auth.uid()) or exists(select 1 from public.gt_staff_members s where s.user_id=(select auth.uid()) and s.active and s.role in ('owner','admin')));
grant select on public.gt_application_receipts_v2 to authenticated;
create policy gt_registration_own_read_v2 on public.gt_registrations for select to authenticated using(exists(select 1 from public.gt_athletes a where a.id=athlete_id and a.claimed_by=(select auth.uid())));
create policy gt_checkin_own_read_v2 on public.gt_checkins for select to authenticated using(exists(select 1 from public.gt_registrations r join public.gt_athletes a on a.id=r.athlete_id where r.id=registration_id and a.claimed_by=(select auth.uid())));
grant select on public.gt_registrations,public.gt_checkins to authenticated;
create policy gt_own_upload_v2 on storage.objects for insert to authenticated with check(bucket_id in ('gt-payment-slips','gt-athlete-photos') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy gt_own_read_upload_v2 on storage.objects for select to authenticated using(bucket_id in ('gt-payment-slips','gt-athlete-photos') and (storage.foldername(name))[1]=(select auth.uid())::text);
create or replace function gt_private.division_roster_v2(p_event uuid,p_division uuid)
returns table(id uuid,go_id text,full_name text,current_rank text) language sql stable security definer set search_path=pg_catalog,public as $$
 select a.id,a.go_id,a.full_name,a.current_rank from public.gt_registrations r join public.gt_athletes a on a.id=r.athlete_id join public.gt_tournaments t on t.id=r.tournament_id where r.tournament_id=p_event and r.division_id=p_division and t.published and r.registration_status='confirmed' and a.profile_public order by a.full_name limit 500
$$;
revoke all on function gt_private.division_roster_v2(uuid,uuid) from public;
grant execute on function gt_private.division_roster_v2(uuid,uuid) to anon,authenticated;
create or replace function public.gt_division_roster_v2(p_event uuid,p_division uuid) returns table(id uuid,go_id text,full_name text,current_rank text) language sql stable security invoker set search_path=pg_catalog,gt_private as $$select * from gt_private.division_roster_v2(p_event,p_division)$$;
revoke all on function public.gt_division_roster_v2(uuid,uuid) from public;
grant execute on function public.gt_division_roster_v2(uuid,uuid) to anon,authenticated;
create or replace function gt_private.submit_application_v2(p_event uuid,p_division uuid,p_athlete uuid,p_proof text,p_mime text,p_amount numeric,p_transfer timestamptz)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); a public.gt_athletes; t public.gt_tournaments; d public.gt_divisions; cfg public.gt_event_payment_settings_v2; rid uuid; existing_division uuid; pid uuid; today date:=(now() at time zone 'Asia/Bangkok')::date; ranknum int; lows int; highs int;
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 -- Lock the athlete to serialize duplicates even when two different divisions are submitted.
 select * into a from public.gt_athletes where id=p_athlete and claimed_by=uid for update;
 if not found then raise exception 'ATHLETE_NOT_OWNED' using errcode='42501'; end if;
 select r.id,r.division_id into rid,existing_division from public.gt_registrations r where r.tournament_id=p_event and r.athlete_id=p_athlete;
 if found then if existing_division<>p_division then raise exception 'ALREADY_REGISTERED_OTHER_DIVISION';end if;return rid; end if;
 select * into t from public.gt_tournaments where id=p_event and published;
 if not found then raise exception 'EVENT_UNAVAILABLE';end if;
 select * into cfg from public.gt_event_payment_settings_v2 where tournament_id=p_event and registration_enabled;
 if not found then raise exception 'REGISTRATION_NOT_READY';end if;
 if t.registration_open_date is null or t.registration_close_date is null or today<t.registration_open_date or today>t.registration_close_date then raise exception 'REGISTRATION_CLOSED';end if;
 select * into d from public.gt_divisions where id=p_division and tournament_id=p_event for update;
 if not found or d.entry_fee_thb is null then raise exception 'DIVISION_NOT_READY';end if;
 if a.photo_path is null or not exists(select 1 from storage.objects where bucket_id='gt-athlete-photos' and name=a.photo_path and split_part(name,'/',1)=uid::text) then raise exception 'PHOTO_REQUIRED';end if;
 if d.seats_limit is not null and (select count(*) from public.gt_registrations r where r.division_id=d.id and r.registration_status<>'cancelled')>=d.seats_limit then raise exception 'DIVISION_FULL';end if;
 if d.friendship_board_size is null then
  if d.name ~* 'dan|ดั้ง' then
   if coalesce(a.current_rank,'') !~* '^1[[:space:]]*(d|dan|ดั้ง)$' then raise exception 'RANK_NOT_ELIGIBLE';end if;
  else
   lows:=substring(d.name from '([0-9]+)')::int; highs:=substring(d.name from '[–-][[:space:]]*([0-9]+)')::int;
   if lows is null or highs is null or coalesce(a.current_rank,'') !~* '^[0-9]+[[:space:]]*(k|kyu|คิว)$' then raise exception 'RANK_REVIEW_REQUIRED';end if;
   ranknum:=substring(a.current_rank from '([0-9]+)')::int;
   if ranknum<lows or ranknum>highs then raise exception 'RANK_NOT_ELIGIBLE';end if;
  end if;
 end if;
 if p_amount is null or p_amount<>d.entry_fee_thb or p_amount<0 or p_amount>1000000 then raise exception 'AMOUNT_MISMATCH';end if;
 if p_transfer is null or p_transfer>now()+interval '5 minutes' or p_transfer<now()-interval '1 year' then raise exception 'TRANSFER_TIME_INVALID';end if;
 if p_mime not in ('image/jpeg','image/png','image/webp','application/pdf') or split_part(p_proof,'/',1)<>uid::text or not exists(select 1 from storage.objects where bucket_id='gt-payment-slips' and name=p_proof and metadata->>'mimetype'=p_mime) then raise exception 'PROOF_INVALID';end if;
 insert into public.gt_registrations(tournament_id,division_id,athlete_id) values(p_event,p_division,p_athlete) returning id into rid;
 insert into public.gt_payments(tournament_id,payer_label,amount_received,currency,payment_method,payment_status,paid_at) values(p_event,a.full_name,p_amount,'THB','bank_transfer','submitted',p_transfer) returning id into pid;
 insert into public.gt_payment_allocations(payment_id,registration_id,allocated_amount) values(pid,rid,p_amount);
 insert into public.gt_payment_proofs(payment_id,storage_path,file_mime,uploaded_by) values(pid,p_proof,p_mime,uid);
 insert into public.gt_application_receipts_v2(registration_id,submitted_by,payment_id,bank_snapshot,transfer_at,submitted_amount,proof_path) values(rid,uid,pid,to_jsonb(cfg),p_transfer,p_amount,p_proof);
 return rid;
end $$;
revoke all on function gt_private.submit_application_v2(uuid,uuid,uuid,text,text,numeric,timestamptz) from public;
grant execute on function gt_private.submit_application_v2(uuid,uuid,uuid,text,text,numeric,timestamptz) to authenticated;
create or replace function public.gt_submit_application_v2(p_event uuid,p_division uuid,p_athlete uuid,p_proof text,p_mime text,p_amount numeric,p_transfer timestamptz) returns uuid language sql security invoker set search_path=pg_catalog,gt_private as $$select gt_private.submit_application_v2(p_event,p_division,p_athlete,p_proof,p_mime,p_amount,p_transfer)$$;
revoke all on function public.gt_submit_application_v2(uuid,uuid,uuid,text,text,numeric,timestamptz) from public;
grant execute on function public.gt_submit_application_v2(uuid,uuid,uuid,text,text,numeric,timestamptz) to authenticated;

-- Ownership is not permission to change verified rank or stable identifiers via the Data API.
create or replace function public.gt_protect_athlete_identity_v2() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if auth.uid() is not null and not exists(select 1 from public.gt_staff_members s where s.user_id=auth.uid() and s.active and s.role in ('owner','admin')) then
  if new.id is distinct from old.id or new.go_id is distinct from old.go_id or new.claimed_by is distinct from old.claimed_by or new.current_rank is distinct from old.current_rank or new.created_at is distinct from old.created_at then raise exception 'VERIFIED_IDENTITY_READ_ONLY' using errcode='42501';end if;
 end if;
 return new;
end $$;
revoke all on function public.gt_protect_athlete_identity_v2() from public,anon,authenticated;
create trigger gt_protect_athlete_identity_v2 before update on public.gt_athletes for each row execute function public.gt_protect_athlete_identity_v2();
create index if not exists gt_application_receipts_owner_v2 on public.gt_application_receipts_v2(submitted_by);
