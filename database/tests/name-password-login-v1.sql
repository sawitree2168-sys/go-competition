begin;
do $$
declare staff uuid:=gen_random_uuid(); athlete_user uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); gid text:='TEST'||replace(gen_random_uuid()::text,'-',''); gid2 text:='TEST'||replace(gen_random_uuid()::text,'-',''); actual uuid; begin
 insert into auth.users(id,email,aud,role) values(staff,staff||'@example.invalid','authenticated','authenticated'),(athlete_user,athlete_user||'@example.invalid','authenticated','authenticated'),(other_user,other_user||'@example.invalid','authenticated','authenticated');
 insert into public.gt_staff_members(user_id,role,active) values(staff,'admin',true);
 insert into gt_private.history_identity_registry_v1(go_id,full_name,source_tab) values(gid,'นักกีฬาทดสอบ ระบบรหัสผ่าน','test-only-rollback');
 if jsonb_array_length(public.gt_athlete_login_lookup_v1('นักกีฬาทดสอบ ระบบรหัสผ่าน'))<>1 then raise exception 'LOOKUP_FAILED';end if;
 begin perform public.gt_athlete_access_issue_v1(gid,athlete_user,other_user,'hash','ทดสอบผู้ไม่มีสิทธิ์');raise exception 'UNAUTHORIZED_ACCEPTED';exception when others then if SQLERRM<>'REVIEW_REQUIRED' then raise;end if;end;
 perform public.gt_athlete_access_issue_v1(gid,athlete_user,staff,'hash1','ทดสอบยืนยันตัวตนและเลขทะเบียน');
 if public.gt_athlete_access_consume_v1(gid,'wrong') is not null then raise exception 'WRONG_CODE_ACCEPTED';end if;
 actual:=public.gt_athlete_access_consume_v1(gid,'hash1');if actual is distinct from athlete_user then raise exception 'VALID_CODE_FAILED';end if;
 if public.gt_athlete_access_consume_v1(gid,'hash1') is not null then raise exception 'REPLAY_ACCEPTED';end if;
 perform public.gt_athlete_access_issue_v1(gid,athlete_user,staff,'hash2','ทดสอบรหัสใหม่ยกเลิกรหัสเดิม');
 if public.gt_athlete_access_consume_v1(gid,'hash1') is not null then raise exception 'OLD_CODE_ACCEPTED';end if;
 update gt_private.athlete_access_codes_v1 set expires_at=now()-interval '1 second' where go_id=gid;
 if public.gt_athlete_access_consume_v1(gid,'hash2') is not null then raise exception 'EXPIRED_CODE_ACCEPTED';end if;
 begin perform public.gt_athlete_access_issue_v1(gid,other_user,staff,'hash3','ทดสอบห้ามเปลี่ยนเจ้าของบัญชี');raise exception 'OWNER_OVERWRITTEN';exception when others then if SQLERRM<>'OWNER_CHANGED' then raise;end if;end;
 insert into public.gt_athletes(go_id,full_name,claimed_by) values(gid2,'นักกีฬาทดสอบ บัญชีร่วม',athlete_user);
 begin perform public.gt_athlete_access_issue_v1(gid,athlete_user,staff,'hash4','ทดสอบบัญชีดูแลหลายคน');raise exception 'SHARED_ACCOUNT_RESET';exception when others then if SQLERRM<>'SHARED_ACCOUNT_REVIEW_REQUIRED' then raise;end if;end;
 if (select count(*) from gt_private.athlete_access_audit_v1 where go_id=gid)<>2 then raise exception 'AUDIT_FAILED';end if;
 if has_function_privilege('anon','public.gt_athlete_login_lookup_v1(text)','execute') or has_function_privilege('authenticated','public.gt_athlete_access_issue_v1(text,uuid,uuid,text,text)','execute') then raise exception 'RPC_EXPOSED';end if;
end$$;
rollback;
