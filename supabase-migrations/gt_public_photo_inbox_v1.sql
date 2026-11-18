-- Anonymous photo intake. Private files, capability-scoped upload and receipt, platform-admin-only review.
create table public.gt_photo_inbox_v1(
 id uuid primary key default gen_random_uuid(), token_hash text not null,
 athlete_name text not null default '',event_name text not null default '',note text not null default '',
 status text not null default 'uploading' check(status in ('uploading','pending','draft','approved','rejected')),
 files jsonb not null default '[]',draft jsonb not null default '{}',admin_note text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(), reviewed_by uuid
);
alter table public.gt_photo_inbox_v1 enable row level security;
revoke all on public.gt_photo_inbox_v1 from public,anon,authenticated;
grant select on public.gt_photo_inbox_v1 to authenticated;
create policy gt_photo_inbox_admin_read on public.gt_photo_inbox_v1 for select to authenticated using(public.gt_is_platform_admin_v1());
create table gt_private.photo_review_log_v1(id bigint generated always as identity primary key,submission_id uuid not null references public.gt_photo_inbox_v1(id),actor uuid not null,action text not null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
alter table gt_private.photo_review_log_v1 enable row level security;
revoke all on gt_private.photo_review_log_v1 from public,anon,authenticated;
create table gt_private.crowd_games_v1(
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.gt_photo_inbox_v1(id),event_name text not null,event_date date not null,division text not null,
 round_number int not null check(round_number between 1 and 30),black_id uuid not null references public.gt_athletes(id),white_id uuid not null references public.gt_athletes(id),
 result_code text not null check(result_code in ('black_win','white_win','black_win_forfeit','white_win_forfeit','draw','double_loss','double_forfeit')), approved_by uuid not null,approved_at timestamptz not null default now(),
 check(black_id<>white_id),unique(event_name,event_date,division,round_number,black_id,white_id)
);
alter table gt_private.crowd_games_v1 enable row level security;
revoke all on gt_private.crowd_games_v1 from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('gt-result-intake','gt-result-intake',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create or replace function public.gt_photo_intake_start_v1(p_token uuid,p_athlete text default '',p_event text default '',p_note text default '') returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v uuid;
begin
 if p_token is null then raise exception 'BAD_TOKEN'; end if;
 perform pg_advisory_xact_lock(89172641);
 if (select count(*) from public.gt_photo_inbox_v1 where created_at>now()-interval '1 hour')>=200 then raise exception 'TOO_MANY'; end if;
 if (select count(*) from public.gt_photo_inbox_v1 where token_hash=md5(p_token::text) and created_at>now()-interval '1 hour')>=10 then raise exception 'TOO_MANY'; end if;
 insert into public.gt_photo_inbox_v1(token_hash,athlete_name,event_name,note) values(md5(p_token::text),left(coalesce(p_athlete,''),160),left(coalesce(p_event,''),200),left(coalesce(p_note,''),1500)) returning id into v;
 return v;
end $$;
revoke all on function public.gt_photo_intake_start_v1(uuid,text,text,text) from public;
grant execute on function public.gt_photo_intake_start_v1(uuid,text,text,text) to anon,authenticated;
-- Header capability authorizes INSERT only; no anonymous SELECT, UPDATE, DELETE or listing.
create or replace function public.gt_photo_upload_allowed_v1(p_name text) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare tok text; sid text;
begin
 tok=coalesce(current_setting('request.headers',true),'{}')::jsonb->>'x-gt-upload-token';sid=split_part(p_name,'/',1);
 if tok is null or length(tok)<>36 or length(sid)<>36 or p_name !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$' then return false; end if;
 return exists(select 1 from public.gt_photo_inbox_v1 s where s.id::text=sid and s.token_hash=md5(tok) and s.status='uploading' and s.created_at>now()-interval '2 hours')
 and (select count(*) from storage.objects o where o.bucket_id='gt-result-intake' and split_part(o.name,'/',1)=sid)<12;
end $$;
revoke all on function public.gt_photo_upload_allowed_v1(text) from public;
grant execute on function public.gt_photo_upload_allowed_v1(text) to anon,authenticated;
create policy gt_photo_intake_insert on storage.objects for insert to anon,authenticated with check(bucket_id='gt-result-intake' and public.gt_photo_upload_allowed_v1(name));
create policy gt_photo_intake_admin_read on storage.objects for select to authenticated using(bucket_id='gt-result-intake' and public.gt_is_platform_admin_v1());
create or replace function public.gt_photo_intake_finish_v1(p_id uuid,p_token uuid,p_files jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f jsonb;
begin
 perform 1 from public.gt_photo_inbox_v1 where id=p_id and token_hash=md5(p_token::text) and status='uploading' for update;
 if not found then raise exception 'BAD_RECEIPT'; end if;
 if jsonb_typeof(p_files)<>'array' or jsonb_array_length(p_files) not between 1 and 12 then raise exception 'BAD_FILES'; end if;
 for f in select value from jsonb_array_elements(p_files) loop
  if split_part(f->>'path','/',1)<>p_id::text or not exists(select 1 from storage.objects where bucket_id='gt-result-intake' and name=f->>'path') then raise exception 'FILE_NOT_SAVED'; end if;
 end loop;
 update public.gt_photo_inbox_v1 set status='pending',files=p_files,updated_at=now() where id=p_id;
 return jsonb_build_object('id',p_id,'status','pending');
end $$;
revoke all on function public.gt_photo_intake_finish_v1(uuid,uuid,jsonb) from public;
grant execute on function public.gt_photo_intake_finish_v1(uuid,uuid,jsonb) to anon,authenticated;
create or replace function public.gt_photo_receipt_v1(p_id uuid,p_token uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',id,'status',status,'files',jsonb_array_length(files),'created_at',created_at,'admin_note',admin_note) from public.gt_photo_inbox_v1 where id=p_id and token_hash=md5(p_token::text);
$$;
revoke all on function public.gt_photo_receipt_v1(uuid,uuid) from public;
grant execute on function public.gt_photo_receipt_v1(uuid,uuid) to anon,authenticated;
create or replace function public.gt_photo_review_v1(p_id uuid,p_draft jsonb,p_action text,p_note text default '') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.gt_photo_inbox_v1; g jsonb; code text; b uuid; w uuid; ev text; dv text; dt date; rn int; cnt int=0;
begin
 if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED' using errcode='42501'; end if;
 select * into old from public.gt_photo_inbox_v1 where id=p_id and status<>'uploading' for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_action not in ('draft','approve','reject') or jsonb_typeof(p_draft)<>'object' or octet_length(p_draft::text)>100000 then raise exception 'BAD_DRAFT'; end if;
 if p_action='approve' then
  ev=btrim(p_draft->>'event');dv=btrim(p_draft->>'division');dt=(p_draft->>'date')::date;
  if ev is null or length(ev)<3 or dv is null or length(dv)<1 or dt is null or dt>current_date then raise exception 'EVENT_REQUIRED'; end if;
  for g in select value from jsonb_array_elements(coalesce(p_draft->'games','[]')) loop
   if coalesce((g->>'selected')::boolean,false) is not true then continue; end if;
   b=(g->>'black_id')::uuid;w=(g->>'white_id')::uuid;rn=(g->>'round')::int;code=g->>'result';
   if b is null or w is null or b=w or rn is null or rn not between 1 and 30 or code is null or code not in ('black_win','white_win','black_win_forfeit','white_win_forfeit','draw','double_loss','double_forfeit') then raise exception 'CHECK_PLAYERS_AND_RESULT'; end if;
   -- Lock the unordered event/round pair before checking conflicting duplicates across submissions.
   perform pg_advisory_xact_lock(hashtextextended(ev||dt::text||dv||rn::text||least(b::text,w::text)||greatest(b::text,w::text),11));
   if exists(select 1 from gt_private.crowd_games_v1 c where c.event_name=ev and c.event_date=dt and c.division=dv and c.round_number=rn and (c.black_id in(b,w) or c.white_id in(b,w)) and not(c.black_id=b and c.white_id=w and c.result_code=code)) then raise exception 'CONFLICTING_RESULT'; end if;
   insert into gt_private.crowd_games_v1(submission_id,event_name,event_date,division,round_number,black_id,white_id,result_code,approved_by) values(p_id,ev,dt,dv,rn,b,w,code,auth.uid()) on conflict(event_name,event_date,division,round_number,black_id,white_id) do nothing;
   cnt=cnt+1;
  end loop;
  if cnt=0 then raise exception 'SELECT_GAMES'; end if;
 end if;
 update public.gt_photo_inbox_v1 set draft=p_draft,status=case p_action when 'approve' then case when exists(select 1 from jsonb_array_elements(coalesce(p_draft->'games','[]')) as pending_row(value) where coalesce((pending_row.value->>'selected')::boolean,false)=false) then 'draft' else 'approved' end when 'reject' then 'rejected' else 'draft' end,admin_note=left(p_note,1000),reviewed_by=auth.uid(),updated_at=now() where id=p_id;
 insert into gt_private.photo_review_log_v1(submission_id,actor,action,before_data,after_data) values(p_id,auth.uid(),p_action,to_jsonb(old),p_draft);
 return jsonb_build_object('ok',true,'approved_games',cnt);
end $$;
revoke all on function public.gt_photo_review_v1(uuid,jsonb,text,text) from public,anon;
grant execute on function public.gt_photo_review_v1(uuid,jsonb,text,text) to authenticated;
create or replace function public.gt_crowd_games_public_v1(p_athlete uuid default null) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'event',c.event_name,'date',c.event_date,'division',c.division,'round',c.round_number,'black_id',c.black_id,'white_id',c.white_id,'black_name',b.full_name,'white_name',w.full_name,'black_school',b.school_name,'white_school',w.school_name,'black_photo',b.avatar_url,'white_photo',w.avatar_url,'result',c.result_code,'approved_at',c.approved_at) order by c.event_date desc,c.round_number),'[]') from gt_private.crowd_games_v1 c join public.gt_athletes b on b.id=c.black_id join public.gt_athletes w on w.id=c.white_id where p_athlete is null or p_athlete in(c.black_id,c.white_id);
$$;
revoke all on function public.gt_crowd_games_public_v1(uuid) from public;
grant execute on function public.gt_crowd_games_public_v1(uuid) to anon,authenticated;
