begin;
do $$
declare u uuid:=gen_random_uuid(); u2 uuid:=gen_random_uuid(); gid text:='TEST'||replace(gen_random_uuid()::text,'-','');
begin
 insert into auth.users(id,email,aud,role,email_confirmed_at) values(u,u||'@example.invalid','authenticated','authenticated',now()),(u2,u2||'@example.invalid','authenticated','authenticated',now());
 insert into gt_private.history_identity_registry_v1(go_id,full_name,source_tab) values(gid,'ทดสอบสมัคร ด้วยตนเอง','test-only-rollback');
 if public.gt_athlete_self_register_v1(gid,'ชื่อ ผิด','',u) then raise exception 'WRONG_NAME_ACCEPTED';end if;
 if public.gt_athlete_self_register_v1('GO106260826','ทดสอบสมัคร ด้วยตนเอง','',u) then raise exception 'HELD_ID_ACCEPTED';end if;
 if not public.gt_athlete_self_register_v1(gid,'ทดสอบสมัคร ด้วยตนเอง','',u) then raise exception 'REGISTER_FAILED';end if;
 if public.gt_athlete_self_register_v1(gid,'ทดสอบสมัคร ด้วยตนเอง','',u2) then raise exception 'OWNER_OVERWRITTEN';end if;
 if public.gt_athlete_self_register_v1(gid,'ทดสอบสมัคร ด้วยตนเอง','',u) then raise exception 'DUPLICATE_ACCEPTED';end if;
 if not exists(select 1 from public.gt_athletes where go_id=gid and claimed_by=u and not profile_public) then raise exception 'PRIVATE_PROFILE_MISSING';end if;
 if (select count(*) from gt_private.athlete_self_registration_audit_v1 where go_id=gid)<>1 then raise exception 'AUDIT_MISSING';end if;
 if has_function_privilege('anon','public.gt_athlete_self_register_v1(text,text,text,uuid)','execute') or has_function_privilege('authenticated','public.gt_athlete_self_register_v1(text,text,text,uuid)','execute') then raise exception 'RPC_EXPOSED';end if;
end$$;
rollback;
