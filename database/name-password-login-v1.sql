-- No plaintext passwords or emails are exposed through these service-only RPCs.
create table gt_private.athlete_access_codes_v1 (
 go_id text primary key, user_id uuid not null references auth.users(id),
 code_hash text not null, expires_at timestamptz not null,
 issued_by uuid not null references auth.users(id), issued_at timestamptz not null default now(),
 consumed_at timestamptz, review_note text not null
);
alter table gt_private.athlete_access_codes_v1 enable row level security;
revoke all on gt_private.athlete_access_codes_v1 from public,anon,authenticated;
create table gt_private.athlete_access_audit_v1(id bigint generated always as identity primary key,go_id text not null,user_id uuid not null,admin_id uuid not null,note text not null,issued_at timestamptz not null default now());
alter table gt_private.athlete_access_audit_v1 enable row level security;
revoke all on gt_private.athlete_access_audit_v1 from public,anon,authenticated;
create table gt_private.athlete_login_limits_v1 (key text primary key, started_at timestamptz not null, attempts integer not null);
alter table gt_private.athlete_login_limits_v1 enable row level security;
revoke all on gt_private.athlete_login_limits_v1 from public,anon,authenticated;
create function public.gt_athlete_login_limit_v1(p_key text) returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare n integer;begin
 insert into gt_private.athlete_login_limits_v1 values(p_key,now(),1) on conflict(key) do update set
 attempts=case when gt_private.athlete_login_limits_v1.started_at<now()-interval '15 minutes' then 1 else gt_private.athlete_login_limits_v1.attempts+1 end,
 started_at=case when gt_private.athlete_login_limits_v1.started_at<now()-interval '15 minutes' then now() else gt_private.athlete_login_limits_v1.started_at end returning attempts into n;
 return n<=30;end$$;
create function public.gt_athlete_login_lookup_v1(p_name text) returns jsonb language sql security definer set search_path=pg_catalog as $$
 with candidates as (
 select r.go_id,r.full_name,r.source_rank from gt_private.history_identity_registry_v1 r
 union all select a.go_id,a.full_name,a.current_rank from public.gt_athletes a where not exists(select 1 from gt_private.history_identity_registry_v1 r where r.go_id=a.go_id)
 ), matched as (
 select c.go_id,c.full_name,c.source_rank,a.claimed_by as user_id,
 (select min(d.dan_number) from gt_private.legacy_dan_directory_v5 d where regexp_replace(d.full_name,'[[:space:]​‌‍﻿]','','g')=regexp_replace(c.full_name,'[[:space:]​‌‍﻿]','','g') having count(*)=1) as dan_number
 from candidates c left join public.gt_athletes a using(go_id)
 where regexp_replace(c.full_name,'[[:space:]​‌‍﻿]','','g')=regexp_replace(p_name,'[[:space:]​‌‍﻿]','','g')
 and c.go_id<>'GO106260826' -- confirmed conflicting identities, held for review
 order by c.go_id limit 20)
 select coalesce(jsonb_agg(to_jsonb(matched)),'[]'::jsonb) from matched;
$$;
create function public.gt_athlete_access_issue_v1(p_go_id text,p_user uuid,p_admin uuid,p_hash text,p_note text) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare r gt_private.history_identity_registry_v1; existing uuid;begin
 if not exists(select 1 from public.gt_staff_members where user_id=p_admin and active and role in ('owner','admin')) or length(btrim(p_note))<12 then raise exception 'REVIEW_REQUIRED';end if;
 if exists(select 1 from public.gt_staff_members where user_id=p_user and active) then raise exception 'STAFF_ACCOUNT_RECOVERY_REQUIRED';end if;
 if p_go_id='GO106260826' then raise exception 'ID_REVIEW_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_go_id,0));
 select * into r from gt_private.history_identity_registry_v1 where go_id=p_go_id;
 select claimed_by into existing from public.gt_athletes where go_id=p_go_id;
 if existing is not null and existing<>p_user then raise exception 'OWNER_CHANGED';end if;
 if not found and r.go_id is null then raise exception 'ID_NOT_FOUND';end if;
 if (select count(*) from public.gt_athletes where claimed_by=p_user)>1 then raise exception 'SHARED_ACCOUNT_REVIEW_REQUIRED';end if;
 if r.go_id is not null then
 insert into public.gt_athletes(go_id,full_name,current_rank,claimed_by,profile_public) values(r.go_id,r.full_name,nullif(r.source_rank,''),p_user,false)
 on conflict(go_id) do update set claimed_by=excluded.claimed_by where public.gt_athletes.claimed_by is null or public.gt_athletes.claimed_by=excluded.claimed_by;
 end if;
 insert into gt_private.athlete_access_audit_v1(go_id,user_id,admin_id,note) values(p_go_id,p_user,p_admin,btrim(p_note));
 insert into gt_private.athlete_access_codes_v1(go_id,user_id,code_hash,expires_at,issued_by,review_note)
 values(p_go_id,p_user,p_hash,now()+interval '24 hours',p_admin,btrim(p_note)) on conflict(go_id) do update set user_id=excluded.user_id,code_hash=excluded.code_hash,expires_at=excluded.expires_at,issued_by=excluded.issued_by,issued_at=now(),consumed_at=null,review_note=excluded.review_note;
end$$;
create function public.gt_athlete_access_consume_v1(p_go_id text,p_hash text) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid;begin
 update gt_private.athlete_access_codes_v1 c set consumed_at=now() where c.go_id=p_go_id and c.code_hash=p_hash and c.consumed_at is null and c.expires_at>now()
 and (select count(*) from public.gt_athletes where claimed_by=c.user_id)=1
 and not exists(select 1 from public.gt_staff_members where user_id=c.user_id and active)
 and exists(select 1 from public.gt_athletes a where a.go_id=c.go_id and a.claimed_by=c.user_id) returning user_id into uid;
 return uid;end$$;
revoke all on function public.gt_athlete_login_limit_v1(text),public.gt_athlete_login_lookup_v1(text),public.gt_athlete_access_issue_v1(text,uuid,uuid,text,text),public.gt_athlete_access_consume_v1(text,text) from public,anon,authenticated;
grant execute on function public.gt_athlete_login_limit_v1(text),public.gt_athlete_login_lookup_v1(text),public.gt_athlete_access_issue_v1(text,uuid,uuid,text,text),public.gt_athlete_access_consume_v1(text,text) to service_role;
