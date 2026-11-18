-- Results of outside events sent in by parents and athletes (18 Nov 2026).
-- Every division needs a file for each round's pairing/result sheet and one for the final standings.
-- Files are stored in the owner's Google Drive by an Apps Script web app; this database keeps the
-- submission, the checklist and the Drive file ids. Claude reads new files every morning and fills the
-- staging tables; an admin confirms before anything is published or rated.

create table if not exists gt_private.result_settings_v1 (
  id int primary key default 1 check (id = 1),
  upload_url text,
  updated_at timestamptz not null default now()
);
insert into gt_private.result_settings_v1 (id) values (1) on conflict do nothing;

create table if not exists gt_private.result_submissions_v1 (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (length(btrim(event_name)) between 3 and 200),
  event_date date not null,
  venue text,
  organizer text,
  -- [{ "name": "15 คิว", "rounds": 4 }, ...]
  divisions jsonb not null default '[]'::jsonb,
  status text not null default 'incomplete'
    check (status in ('incomplete', 'pending', 'extracted', 'confirmed', 'rejected')),
  admin_note text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists result_submissions_v1_date on gt_private.result_submissions_v1 (event_date);

create table if not exists gt_private.result_submission_files_v1 (
  id bigint generated always as identity primary key,
  submission_id uuid not null references gt_private.result_submissions_v1 (id) on delete cascade,
  division text not null,
  round int not null check (round between 0 and 20),       -- 0 = final standings
  drive_file_id text not null,
  file_name text,
  mime text,
  size_bytes bigint,
  uploaded_by uuid not null,
  uploaded_at timestamptz not null default now(),
  extracted_at timestamptz
);
create index if not exists result_submission_files_v1_sub on gt_private.result_submission_files_v1 (submission_id);

create table if not exists gt_private.result_upload_tickets_v1 (
  ticket uuid primary key default gen_random_uuid(),
  submission_id uuid not null references gt_private.result_submissions_v1 (id) on delete cascade,
  division text not null,
  round int not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- Filled by Claude from the files; confirmed by an admin.
create table if not exists gt_private.result_extracted_games_v1 (
  id bigint generated always as identity primary key,
  submission_id uuid not null references gt_private.result_submissions_v1 (id) on delete cascade,
  division text not null,
  round int not null,
  table_no int,
  player_a text not null,
  player_b text,                 -- null = bye
  a_go_id text,
  b_go_id text,
  winner text check (winner in ('a', 'b', 'draw', 'unknown')),
  source_file_id bigint references gt_private.result_submission_files_v1 (id) on delete set null,
  needs_check boolean not null default false,
  note text
);
create table if not exists gt_private.result_extracted_standings_v1 (
  id bigint generated always as identity primary key,
  submission_id uuid not null references gt_private.result_submissions_v1 (id) on delete cascade,
  division text not null,
  place int,
  player text not null,
  go_id text,
  wins numeric,
  note text,
  needs_check boolean not null default false
);

alter table gt_private.result_settings_v1 enable row level security;
alter table gt_private.result_submissions_v1 enable row level security;
alter table gt_private.result_submission_files_v1 enable row level security;
alter table gt_private.result_upload_tickets_v1 enable row level security;
alter table gt_private.result_extracted_games_v1 enable row level security;
alter table gt_private.result_extracted_standings_v1 enable row level security;

-- Checklist: one entry per division and slot (rounds 1..n, then 0 = final standings).
create or replace function gt_private.result_checklist_v1(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, gt_private as $$
  select coalesce(jsonb_agg(jsonb_build_object('division', d.name, 'round', r.round,
           'files', (select count(*) from gt_private.result_submission_files_v1 f
                     where f.submission_id = s.id and f.division = d.name and f.round = r.round))
         order by d.ord, case when r.round = 0 then 999 else r.round end), '[]'::jsonb)
  from gt_private.result_submissions_v1 s
  cross join lateral (select x->>'name' name, greatest(1, least(20, coalesce((x->>'rounds')::int, 1))) rounds, o ord
                      from jsonb_array_elements(s.divisions) with ordinality t(x, o)) d
  cross join lateral (select generate_series(0, d.rounds) round) r
  where s.id = p_id;
$$;

create or replace function gt_private.result_refresh_status_v1(p_id uuid)
returns text language plpgsql security definer set search_path = public, gt_private as $$
declare missing int; st text;
begin
  select count(*) into missing from jsonb_array_elements(gt_private.result_checklist_v1(p_id)) c where (c->>'files')::int = 0;
  update gt_private.result_submissions_v1
     set status = case when status in ('incomplete', 'pending') then (case when missing = 0 then 'pending' else 'incomplete' end) else status end,
         updated_at = now()
   where id = p_id returning status into st;
  return st;
end $$;

create or replace function gt_private.result_clean_divisions_v1(p jsonb)
returns jsonb language plpgsql immutable as $$
declare res jsonb := '[]'::jsonb; x jsonb; n text; seen text[] := '{}';
begin
  for x in select * from jsonb_array_elements(coalesce(p, '[]'::jsonb)) loop
    n := btrim(coalesce(x->>'name', ''));
    if n = '' or n = any(seen) then continue; end if;
    seen := seen || n;
    res := res || jsonb_build_array(jsonb_build_object('name', left(n, 60),
             'rounds', greatest(1, least(20, coalesce((x->>'rounds')::int, 1)))));
  end loop;
  if jsonb_array_length(res) = 0 then raise exception 'NO_DIVISIONS'; end if;
  return res;
end $$;

-- Signed-in user: events already sent in around a date, to fill in instead of sending twice.
create or replace function public.gt_result_find_events_v1(p_query text, p_date date default null)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private as $$
begin
  if auth.uid() is null then raise exception 'SIGN_IN'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'event_name', s.event_name, 'event_date', s.event_date,
           'venue', s.venue, 'organizer', s.organizer, 'divisions', s.divisions, 'status', s.status,
           'checklist', gt_private.result_checklist_v1(s.id)) order by s.event_date desc)
    from (select * from gt_private.result_submissions_v1 s
          where s.status <> 'rejected'
            and (p_date is null or s.event_date between p_date - 3 and p_date + 3)
            and (length(btrim(coalesce(p_query, ''))) < 2 or s.event_name ilike '%' || btrim(p_query) || '%')
          order by s.event_date desc limit 10) s), '[]'::jsonb);
end $$;

-- Signed-in user: start a submission (or add divisions to an existing one).
create or replace function public.gt_result_submit_v1(p_event_name text, p_event_date date, p_venue text, p_organizer text,
                                                      p_divisions jsonb, p_existing uuid default null)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare sid uuid; cur jsonb; add jsonb; x jsonb;
begin
  if auth.uid() is null then raise exception 'SIGN_IN'; end if;
  add := gt_private.result_clean_divisions_v1(p_divisions);
  if p_existing is not null then
    select divisions into cur from gt_private.result_submissions_v1 where id = p_existing and status <> 'rejected' for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    for x in select * from jsonb_array_elements(add) loop
      if not exists (select 1 from jsonb_array_elements(cur) c where c->>'name' = x->>'name') then cur := cur || jsonb_build_array(x); end if;
    end loop;
    update gt_private.result_submissions_v1 set divisions = cur, updated_at = now() where id = p_existing;
    sid := p_existing;
  else
    if p_event_date > (now() at time zone 'Asia/Bangkok')::date then raise exception 'FUTURE_DATE'; end if;
    insert into gt_private.result_submissions_v1 (event_name, event_date, venue, organizer, divisions, created_by)
    values (btrim(p_event_name), p_event_date, nullif(btrim(coalesce(p_venue, '')), ''), nullif(btrim(coalesce(p_organizer, '')), ''), add, auth.uid())
    returning id into sid;
  end if;
  perform gt_private.result_refresh_status_v1(sid);
  return jsonb_build_object('id', sid, 'checklist', gt_private.result_checklist_v1(sid));
end $$;

-- Signed-in user: one-time ticket for one file upload to the Drive web app.
create or replace function public.gt_result_upload_ticket_v1(p_submission uuid, p_division text, p_round int)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare t uuid; u text;
begin
  if auth.uid() is null then raise exception 'SIGN_IN'; end if;
  if not exists (select 1 from jsonb_array_elements(gt_private.result_checklist_v1(p_submission)) c
                 where c->>'division' = p_division and (c->>'round')::int = p_round) then raise exception 'BAD_SLOT'; end if;
  if (select count(*) from gt_private.result_upload_tickets_v1 where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'TOO_MANY';
  end if;
  select upload_url into u from gt_private.result_settings_v1 where id = 1;
  if u is null then raise exception 'UPLOAD_NOT_READY'; end if;
  insert into gt_private.result_upload_tickets_v1 (submission_id, division, round, user_id)
  values (p_submission, p_division, p_round, auth.uid()) returning ticket into t;
  return jsonb_build_object('ticket', t, 'upload_url', u);
end $$;

-- Called by the Apps Script web app (anon key) after it saved the file in Drive. The ticket proves who sent it.
create or replace function public.gt_result_file_attach_v1(p_ticket uuid, p_drive_file_id text, p_file_name text, p_mime text, p_size bigint)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare t gt_private.result_upload_tickets_v1;
begin
  update gt_private.result_upload_tickets_v1 set used_at = now()
   where ticket = p_ticket and used_at is null and created_at > now() - interval '2 hours'
   returning * into t;
  if t.ticket is null then raise exception 'BAD_TICKET'; end if;
  insert into gt_private.result_submission_files_v1 (submission_id, division, round, drive_file_id, file_name, mime, size_bytes, uploaded_by)
  values (t.submission_id, t.division, t.round, left(p_drive_file_id, 100), left(p_file_name, 200), left(p_mime, 100), p_size, t.user_id);
  return jsonb_build_object('ok', true, 'status', gt_private.result_refresh_status_v1(t.submission_id));
end $$;

-- Apps Script asks before saving, so files with a bad ticket never reach Drive.
create or replace function public.gt_result_ticket_ok_v1(p_ticket uuid)
returns boolean language sql stable security definer set search_path = public, gt_private as $$
  select exists (select 1 from gt_private.result_upload_tickets_v1
                 where ticket = p_ticket and used_at is null and created_at > now() - interval '2 hours');
$$;

-- Signed-in user: what I have sent and where it stands.
create or replace function public.gt_my_result_submissions_v1()
returns jsonb language sql stable security definer set search_path = public, gt_private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'event_name', s.event_name, 'event_date', s.event_date,
           'status', s.status, 'admin_note', s.admin_note, 'divisions', s.divisions,
           'checklist', gt_private.result_checklist_v1(s.id)) order by s.created_at desc), '[]'::jsonb)
  from gt_private.result_submissions_v1 s
  where s.created_by = auth.uid()
     or exists (select 1 from gt_private.result_submission_files_v1 f where f.submission_id = s.id and f.uploaded_by = auth.uid());
$$;

-- Admin: queue, upload URL and status changes.
create or replace function public.gt_admin_result_queue_v1(p_status text default null)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private as $$
begin
  if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED'; end if;
  return jsonb_build_object(
    'upload_url', (select upload_url from gt_private.result_settings_v1 where id = 1),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'event_name', s.event_name, 'event_date', s.event_date,
        'venue', s.venue, 'organizer', s.organizer, 'status', s.status, 'admin_note', s.admin_note, 'created_at', s.created_at,
        'submitter', (select coalesce(u.raw_user_meta_data->>'full_name', u.email) from auth.users u where u.id = s.created_by),
        'checklist', gt_private.result_checklist_v1(s.id),
        'files', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'division', f.division, 'round', f.round,
                    'drive_file_id', f.drive_file_id, 'file_name', f.file_name, 'extracted', f.extracted_at is not null)
                    order by f.division, f.round, f.id), '[]'::jsonb)
                  from gt_private.result_submission_files_v1 f where f.submission_id = s.id),
        'games', (select count(*) from gt_private.result_extracted_games_v1 g where g.submission_id = s.id),
        'needs_check', (select count(*) from gt_private.result_extracted_games_v1 g where g.submission_id = s.id and g.needs_check))
      order by case s.status when 'extracted' then 0 when 'pending' then 1 when 'incomplete' then 2 else 3 end, s.created_at desc)
      from gt_private.result_submissions_v1 s where p_status is null or s.status = p_status), '[]'::jsonb));
end $$;

create or replace function public.gt_admin_result_settings_v1(p_upload_url text)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
begin
  if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED'; end if;
  if p_upload_url !~ '^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec$' then raise exception 'BAD_URL'; end if;
  update gt_private.result_settings_v1 set upload_url = p_upload_url, updated_at = now() where id = 1;
  return jsonb_build_object('upload_url', p_upload_url);
end $$;

create or replace function public.gt_admin_result_set_status_v1(p_id uuid, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
begin
  if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED'; end if;
  if p_status not in ('pending', 'confirmed', 'rejected') then raise exception 'BAD_STATUS'; end if;
  if p_status = 'rejected' and length(btrim(coalesce(p_note, ''))) < 4 then raise exception 'REASON_REQUIRED'; end if;
  update gt_private.result_submissions_v1 set status = p_status, admin_note = nullif(btrim(coalesce(p_note, '')), ''), updated_at = now()
   where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_status = 'pending' then perform gt_private.result_refresh_status_v1(p_id); end if;
  return jsonb_build_object('id', p_id, 'status', (select status from gt_private.result_submissions_v1 where id = p_id));
end $$;

revoke all on function gt_private.result_checklist_v1(uuid), gt_private.result_refresh_status_v1(uuid) from public, anon, authenticated;
revoke all on function public.gt_result_find_events_v1(text, date), public.gt_result_submit_v1(text, date, text, text, jsonb, uuid),
  public.gt_result_upload_ticket_v1(uuid, text, int), public.gt_my_result_submissions_v1(),
  public.gt_admin_result_queue_v1(text), public.gt_admin_result_settings_v1(text), public.gt_admin_result_set_status_v1(uuid, text, text)
  from public, anon;
grant execute on function public.gt_result_find_events_v1(text, date), public.gt_result_submit_v1(text, date, text, text, jsonb, uuid),
  public.gt_result_upload_ticket_v1(uuid, text, int), public.gt_my_result_submissions_v1(),
  public.gt_admin_result_queue_v1(text), public.gt_admin_result_settings_v1(text), public.gt_admin_result_set_status_v1(uuid, text, text)
  to authenticated;
revoke all on function public.gt_result_file_attach_v1(uuid, text, text, text, bigint), public.gt_result_ticket_ok_v1(uuid) from public;
grant execute on function public.gt_result_file_attach_v1(uuid, text, text, text, bigint), public.gt_result_ticket_ok_v1(uuid) to anon, authenticated;
