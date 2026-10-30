begin;
do $$
declare uid uuid; baseline integer; d jsonb;
begin
 select claimed_by into uid from public.gt_athletes where go_id='GO41250826';
 if uid is null then raise exception 'TEST_ACCOUNT_MISSING';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 d:=public.gt_owned_history_v1('GO41250826');
 baseline:=jsonb_array_length(d->'legacy_matches');
 if baseline<>68 then raise exception 'EXPECTED_68_EXACT_NAME_MATCHES_GOT_%',baseline;end if;
 if exists(select 1 from jsonb_array_elements(d->'legacy_matches') m where m->>'go_id'<>'GO41250826' or m->>'athlete_name'<>'ชยพล พันธเสน') then raise exception 'WRONG_PERSON';end if;
 insert into gt_private.history_multiyear_raw_v1(source_key,payload,review_status)
 values('test-wrong-name-rollback',jsonb_build_object('dan_a',41,'dan_b',42,'name_a','คนละ คน','name_b','ทดสอบ คู่แข่ง','round',1,'winner_dan',41,'status','reciprocal_verified_event_metadata_pending'),'metadata_pending'),
 ('test-conflict-rollback',jsonb_build_object('dan_a',41,'dan_b',42,'name_a','ชยพล พันธเสน','name_b','ทดสอบ คู่แข่ง','round',1,'winner_dan',41,'status','reciprocal_verified_event_metadata_pending'),'conflicting_result');
 d:=public.gt_owned_history_v1('GO41250826');
 if jsonb_array_length(d->'legacy_matches')<>baseline then raise exception 'UNVERIFIED_ROWS_LEAKED';end if;
 insert into gt_private.history_multiyear_raw_v1(source_key,payload,review_status)
 values('test-live-update-rollback',jsonb_build_object('dan_a',41,'dan_b',42,'name_a','ชยพล พันธเสน','name_b','ทดสอบ คู่แข่ง','round',1,'winner_dan',41,'status','reciprocal_verified_event_metadata_pending'),'metadata_pending');
 d:=public.gt_owned_history_v1('GO41250826');
 if jsonb_array_length(d->'legacy_matches')<>baseline+1 then raise exception 'LIVE_UPDATE_NOT_VISIBLE';end if;
 if (d->>'pending_match_count')::integer<1 then raise exception 'CONFLICT_NOT_REPORTED';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin perform public.gt_owned_history_v1('GO41250826');raise exception 'OUTSIDER_READ';exception when others then if SQLERRM<>'HISTORY_ACCESS_DENIED' then raise;end if;end;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.gt_owned_history_v1('GO41250826');raise exception 'ANONYMOUS_READ';exception when others then if SQLERRM<>'HISTORY_ACCESS_DENIED' then raise;end if;end;
 if has_function_privilege('anon','public.gt_owned_history_v1(text)','execute') then raise exception 'ANON_RPC_GRANTED';end if;
end$$;
rollback;
