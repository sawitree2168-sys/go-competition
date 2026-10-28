-- Must be run inside BEGIN with migration installed, ending ROLLBACK. No fixture survives.
create temporary table test_ids as select gen_random_uuid() u,gen_random_uuid() other,gen_random_uuid() event,gen_random_uuid() division,gen_random_uuid() athlete,gen_random_uuid() receipt;
grant select,update on test_ids to authenticated,anon;
insert into auth.users(id,email) select u,'registration-fixture-'||u||'@example.invalid' from test_ids;
insert into auth.users(id,email) select other,'registration-fixture-'||other||'@example.invalid' from test_ids;
insert into public.gt_athletes(id,go_id,full_name,current_rank,claimed_by,photo_path) select athlete,'T'||athlete,'นักกีฬาทดสอบชั่วคราว','2 คิว',u,u||'/profile.jpg' from test_ids;
insert into public.gt_tournaments(id,title,status,published,event_date,registration_open_date,registration_close_date) select event,'Rollback-only test','draft',false,current_date+10,current_date-1,current_date+1 from test_ids;
insert into public.gt_divisions(id,tournament_id,name,entry_fee_thb,seats_limit,pairing_enabled) select division,event,'1–2 คิว',500,1,false from test_ids;
insert into public.gt_event_payment_settings_v2(tournament_id,bank_name,account_name,account_number,registration_enabled) select event,'ธนาคารทดสอบ','บัญชีทดสอบ','0000000000',true from test_ids;
update public.gt_tournaments set published=true where id=(select event from test_ids);
insert into storage.objects(bucket_id,name,metadata) select 'gt-athlete-photos',u||'/profile.jpg','{"mimetype":"image/jpeg"}'::jsonb from test_ids;
insert into storage.objects(bucket_id,name,metadata) select 'gt-payment-slips',u||'/proof.jpg','{"mimetype":"image/jpeg"}'::jsonb from test_ids;
select set_config('request.jwt.claim.sub',(select u::text from test_ids),true);
set local role authenticated;
do $$declare blocked boolean:=false;begin
 begin perform public.gt_submit_application_v2(event,division,athlete,u||'/proof.jpg','image/jpeg',1,now()-interval '1 minute') from test_ids; exception when others then if sqlerrm='AMOUNT_MISMATCH' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'INVALID_AMOUNT_ACCEPTED';end if;
 blocked:=false;
 begin update public.gt_athletes set current_rank='1 คิว' where id=(select athlete from test_ids);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'VERIFIED_RANK_MUTABLE';end if;
end $$;
do $$declare rid uuid; again uuid; n int; begin
 select public.gt_submit_application_v2(event,division,athlete,u||'/proof.jpg','image/jpeg',500,now()-interval '1 minute') into rid from test_ids;
 select public.gt_submit_application_v2(event,division,athlete,u||'/proof.jpg','image/jpeg',500,now()-interval '1 minute') into again from test_ids;
 if rid is null or rid<>again then raise exception 'IDEMPOTENCY_FAILED';end if;
 select count(*) into n from public.gt_registrations where id=rid and registration_status='pending' and payment_status='pending' and fee_snapshot_thb=500;
 if n<>1 then raise exception 'REGISTRATION_STATE_FAILED';end if;
 select count(*) into n from public.gt_application_receipts_v2 where registration_id=rid and submitted_by=auth.uid();
 if n<>1 then raise exception 'RECEIPT_FAILED';end if;
 update test_ids set receipt=rid;
end $$;
select set_config('request.jwt.claim.sub',(select other::text from test_ids),true);
do $$declare n int;blocked boolean:=false;begin
 select count(*) into n from public.gt_registrations where id=(select receipt from test_ids);
 if n<>0 then raise exception 'CROSS_ACCOUNT_READ_LEAK';end if;
 select count(*) into n from public.gt_application_receipts_v2 where registration_id=(select receipt from test_ids);
 if n<>0 then raise exception 'CROSS_ACCOUNT_PROOF_LEAK';end if;
 begin perform public.gt_submit_application_v2(event,division,athlete,u||'/proof.jpg','image/jpeg',500,now()-interval '1 minute') from test_ids;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'CROSS_ACCOUNT_SUBMIT_ALLOWED';end if;
end $$;
reset role;
-- A second owned athlete cannot bypass a full division.
insert into public.gt_athletes(go_id,full_name,current_rank,claimed_by,photo_path) select 'T'||gen_random_uuid(),'Capacity fixture','2 คิว',u,u||'/profile.jpg' from test_ids;
select set_config('request.jwt.claim.sub',(select u::text from test_ids),true);
set local role authenticated;
do $$declare blocked boolean:=false; aid uuid;begin
 select id into aid from public.gt_athletes where full_name='Capacity fixture' and claimed_by=auth.uid();
 begin perform public.gt_submit_application_v2(event,division,aid,u||'/proof.jpg','image/jpeg',500,now()-interval '1 minute') from test_ids;exception when others then if sqlerrm='DIVISION_FULL' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'CAPACITY_EXCEEDED';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare n int;begin
 select count(*) into n from public.gt_division_roster_v2((select event from test_ids),(select division from test_ids));
 if n<>0 then raise exception 'PENDING_REGISTRATION_PUBLIC';end if;
end $$;
reset role;
select 'PASS: atomic submit, fee snapshot, duplicate protection, amount validation, full-division denial, verified-rank protection, owner reads, cross-account denial, private proof and public roster filtering' as result;
