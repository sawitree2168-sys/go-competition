-- Additive account/profile support; no changes to existing athlete identity or ranks.
create sequence if not exists gt_private.athlete_number_v4 start with 1000000;
revoke all on sequence gt_private.athlete_number_v4 from public,anon,authenticated;
alter table public.gt_athlete_contacts_v3 add column if not exists birth_date date;
create or replace function gt_private.create_owned_athlete_v4(p_name text,p_nickname text,p_school text,p_birth date,p_contact text,p_phone text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_uid uuid:=auth.uid(); v_name text:=regexp_replace(btrim(p_name),'\s+',' ','g'); v_id uuid; v_go text; v_existing public.gt_athletes%rowtype;
begin
 if v_uid is null or not exists(select 1 from auth.users where id=v_uid and email_confirmed_at is not null) then raise exception 'VERIFIED_ACCOUNT_REQUIRED' using errcode='42501';end if;
 if v_name is null or length(v_name)<2 or length(v_name)>200 or p_birth is null or p_birth>current_date or p_birth<date '1900-01-01' or length(coalesce(p_nickname,''))>100 or length(coalesce(p_school,''))>180 or length(btrim(coalesce(p_contact,''))) not between 1 and 200 or coalesce(p_phone,'') !~ '^\+?[0-9 ()-]{8,20}$' then raise exception 'INVALID_PROFILE';end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(v_name),417));
 select * into v_existing from public.gt_athletes where lower(regexp_replace(btrim(full_name),'\s+',' ','g'))=lower(v_name) order by created_at limit 1;
 if found then
  if v_existing.claimed_by=v_uid and exists(select 1 from public.gt_athlete_contacts_v3 where athlete_id=v_existing.id and owner_id=v_uid and birth_date=p_birth) then return jsonb_build_object('athlete_id',v_existing.id,'go_id',v_existing.go_id,'existing',true);end if;
  raise exception 'DUPLICATE_REVIEW_REQUIRED';
 end if;
 if (select count(*) from public.gt_athletes where claimed_by=v_uid and created_at>now()-interval '24 hours')>=5 then raise exception 'DAILY_LIMIT';end if;
 v_id:=gen_random_uuid();v_go:='GO'||nextval('gt_private.athlete_number_v4')::text;
 insert into public.gt_athletes(id,go_id,full_name,nickname,school_name,claimed_by,profile_public,current_rank) values(v_id,v_go,v_name,nullif(btrim(p_nickname),''),nullif(btrim(p_school),''),v_uid,false,null);
 insert into public.gt_athlete_contacts_v3(athlete_id,owner_id,contact_name,contact_phone,birth_date) values(v_id,v_uid,btrim(p_contact),btrim(p_phone),p_birth);
 return jsonb_build_object('athlete_id',v_id,'go_id',v_go,'existing',false);
end $$;
revoke all on function gt_private.create_owned_athlete_v4(text,text,text,date,text,text) from public,anon;
grant usage on schema gt_private to authenticated;
grant execute on function gt_private.create_owned_athlete_v4(text,text,text,date,text,text) to authenticated;
create or replace function public.gt_create_owned_athlete_v4(p_name text,p_nickname text,p_school text,p_birth date,p_contact text,p_phone text)
returns jsonb language sql security invoker set search_path=pg_catalog as $$ select gt_private.create_owned_athlete_v4(p_name,p_nickname,p_school,p_birth,p_contact,p_phone) $$;
revoke all on function public.gt_create_owned_athlete_v4(text,text,text,date,text,text) from public,anon;
grant execute on function public.gt_create_owned_athlete_v4(text,text,text,date,text,text) to authenticated;
