-- Owner-authorized self enrollment for unused registry IDs only.
-- This is self-asserted registry matching, not verified proof of identity.
create table gt_private.athlete_self_registration_audit_v1 (
 id bigint generated always as identity primary key,
 go_id text not null unique,
 user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 method text not null default 'self_asserted_name_and_registry'
);
alter table gt_private.athlete_self_registration_audit_v1 enable row level security;
revoke all on gt_private.athlete_self_registration_audit_v1 from public,anon,authenticated;
create function public.gt_athlete_self_register_v1(p_go_id text,p_name text,p_dan text,p_user uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare candidate jsonb;
begin
 if p_go_id='GO106260826' or p_user is null then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_go_id,0));
 if exists(select 1 from public.gt_athletes where go_id=p_go_id or claimed_by=p_user)
 or exists(select 1 from public.gt_staff_members where user_id=p_user)
 or not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null)
 then return false;end if;
 select v into candidate from jsonb_array_elements(public.gt_athlete_login_lookup_v1(p_name)) v where v->>'go_id'=p_go_id;
 if candidate is null or candidate->>'user_id' is not null
 or (candidate->>'dan_number' is not null and candidate->>'dan_number' is distinct from p_dan)
 then return false;end if;
 insert into public.gt_athletes(go_id,full_name,current_rank,claimed_by,profile_public)
 values(p_go_id,candidate->>'full_name',nullif(candidate->>'source_rank',''),p_user,false);
 insert into gt_private.athlete_self_registration_audit_v1(go_id,user_id) values(p_go_id,p_user);
 return true;
end$$;
revoke all on function public.gt_athlete_self_register_v1(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.gt_athlete_self_register_v1(text,text,text,uuid) to service_role;
