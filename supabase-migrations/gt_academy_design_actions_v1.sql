-- Explicit additions link existing athletes; they never create duplicate athlete identities.
create or replace function public.gt_academy_search_students_v2(p_academy uuid,p_query text) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if coalesce(gt_private.academy_role(p_academy),'') not in ('active','admin') or auth.uid() is null then raise exception 'NOT_ALLOWED'; end if;
 if length(btrim(p_query))<2 then return '[]'; end if;
 return (select coalesce(jsonb_agg(x),'[]') from (select id,full_name,go_id,current_rank from public.gt_athletes where full_name ilike '%'||replace(replace(left(p_query,80),'%',''),'_','')||'%' or go_id=upper(p_query) order by full_name limit 30)x);
end $$;
create or replace function public.gt_academy_link_students_v2(p_academy uuid,p_athletes uuid[]) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a uuid;
begin
 if coalesce(gt_private.academy_role(p_academy),'') not in ('active','admin') or auth.uid() is null then raise exception 'NOT_ALLOWED'; end if;
 if cardinality(p_athletes) not between 1 and 100 then raise exception 'BAD_SELECTION'; end if;
 foreach a in array p_athletes loop
  if not exists(select 1 from public.gt_athletes where id=a) then raise exception 'ATHLETE_NOT_FOUND'; end if;
  insert into public.gt_academy_memberships(academy_id,athlete_id,membership_status,verified_by,verified_at) values(p_academy,a,'verified',auth.uid(),now()) on conflict(academy_id,athlete_id) do update set membership_status='verified',verified_by=auth.uid(),verified_at=now();
 end loop;
 return jsonb_build_object('ok',true,'count',cardinality(p_athletes));
end $$;
create or replace function public.gt_academy_roster_v2(p_academy uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if coalesce(gt_private.academy_role(p_academy),'') not in ('active','admin') then raise exception 'NOT_ALLOWED'; end if;
 return jsonb_build_object('can_add',public.gt_is_platform_admin_v1() or exists(select 1 from public.gt_academy_staff where academy_id=p_academy and user_id=auth.uid() and role='manager' and status='active'),'staff',(select coalesce(jsonb_agg(jsonb_build_object('name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)),'role',s.role)),'[]') from public.gt_academy_staff s join auth.users u on u.id=s.user_id where s.academy_id=p_academy and s.status='active'));
end $$;
create or replace function public.gt_academy_add_teacher_v2(p_academy uuid,p_email text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid;
begin
 if not(public.gt_is_platform_admin_v1() or exists(select 1 from public.gt_academy_staff where academy_id=p_academy and user_id=auth.uid() and role='manager' and status='active')) then raise exception 'NOT_ALLOWED'; end if;
 select id into u from auth.users where lower(email)=lower(btrim(p_email));
 if u is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 insert into public.gt_academy_staff(academy_id,user_id,role,status,granted_by) values(p_academy,u,'teacher','active',auth.uid()) on conflict(academy_id,user_id) do update set status='active',granted_by=auth.uid();
 return jsonb_build_object('ok',true);
end $$;
create or replace function public.gt_academy_self_join_v2(p_academy uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a uuid;
begin
 if auth.uid() is null then raise exception 'SIGN_IN'; end if;
 select id into a from public.gt_athletes where claimed_by=auth.uid() limit 1;
 if a is null then raise exception 'CLAIM_PROFILE_FIRST'; end if;
 if not exists(select 1 from public.gt_academies where id=p_academy and status='active') then raise exception 'ACADEMY_NOT_FOUND'; end if;
 insert into public.gt_academy_memberships(academy_id,athlete_id,membership_status,verified_by,verified_at) values(p_academy,a,'verified',auth.uid(),now()) on conflict(academy_id,athlete_id) do update set membership_status='verified',verified_by=auth.uid(),verified_at=now();
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.gt_academy_search_students_v2(uuid,text),public.gt_academy_link_students_v2(uuid,uuid[]),public.gt_academy_roster_v2(uuid),public.gt_academy_add_teacher_v2(uuid,text),public.gt_academy_self_join_v2(uuid) from public,anon;
grant execute on function public.gt_academy_search_students_v2(uuid,text),public.gt_academy_link_students_v2(uuid,uuid[]),public.gt_academy_roster_v2(uuid),public.gt_academy_add_teacher_v2(uuid,text),public.gt_academy_self_join_v2(uuid) to authenticated;
create or replace function public.gt_athlete_choose_institution_v2(p_name text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a uuid;ac uuid;n text:=btrim(p_name);
begin
 if auth.uid() is null then raise exception 'SIGN_IN'; end if;
 if n is null or length(n) not between 2 and 160 then raise exception 'BAD_NAME'; end if;
 select id into a from public.gt_athletes where claimed_by=auth.uid() limit 1;
 if a is null then raise exception 'CLAIM_PROFILE_FIRST'; end if;
 perform pg_advisory_xact_lock(hashtextextended(gt_private.norm_inst(n),77));
 select id into ac from public.gt_academies where gt_private.norm_inst(name)=gt_private.norm_inst(n) and status='active';
 if ac is null then insert into public.gt_academies(name,status,created_by) values(n,'active',auth.uid()) returning id into ac;end if;
 return public.gt_academy_self_join_v2(ac);
end $$;
revoke all on function public.gt_athlete_choose_institution_v2(text) from public,anon;
grant execute on function public.gt_athlete_choose_institution_v2(text) to authenticated;
