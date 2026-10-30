create or replace function gt_private.submit_legacy_claim_v2(p_query text,p_relationship text,p_consent boolean) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare target text; matches integer; cid uuid;begin
if auth.uid() is null then raise exception 'CLAIM_AUTH_REQUIRED';end if;
if not p_consent or p_relationship not in ('self','parent_guardian','teacher_authorized') or length(btrim(p_query)) not between 3 and 200 then raise exception 'CLAIM_INPUT_INVALID';end if;
select count(*),min(go_id) into matches,target from gt_private.history_identity_registry_v1 where go_id=btrim(p_query) or regexp_replace(full_name,'[[:space:]​‌‍﻿]','','g')=regexp_replace(btrim(p_query),'[[:space:]​‌‍﻿]','','g');
if matches<>1 then raise exception 'IDENTITY_REVIEW_REQUIRED';end if;
perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||target,0));
select id into cid from public.gt_athlete_claim_requests where requester_user_id=auth.uid() and go_id=target and status='pending' limit 1;
if cid is not null then return jsonb_build_object('status','pending','request_id',cid,'existing',true);end if;
insert into public.gt_athlete_claim_requests(go_id,requester_user_id,relationship,consent_confirmed) values(target,auth.uid(),p_relationship,true) returning id into cid;
return jsonb_build_object('status','submitted','request_id',cid,'existing',false);
end$$;
revoke all on function gt_private.submit_legacy_claim_v2(text,text,boolean) from public,anon;grant execute on function gt_private.submit_legacy_claim_v2(text,text,boolean) to authenticated;
create or replace function public.gt_submit_legacy_claim_v2(p_query text,p_relationship text,p_consent boolean) returns jsonb language sql security invoker set search_path=pg_catalog as $$select gt_private.submit_legacy_claim_v2(p_query,p_relationship,p_consent)$$;
revoke all on function public.gt_submit_legacy_claim_v2(text,text,boolean) from public,anon;grant execute on function public.gt_submit_legacy_claim_v2(text,text,boolean) to authenticated;
-- Rollback integration test
begin;do $$declare u uuid:=gen_random_uuid();a jsonb;b jsonb;begin
insert into auth.users(id,email,aud,role) values(u,'claim-name-test-'||u||'@example.invalid','authenticated','authenticated');
perform set_config('request.jwt.claim.sub',u::text,true);set local role authenticated;
a:=public.gt_submit_legacy_claim_v2('ชยพล พันธเสน','self',true);
b:=public.gt_submit_legacy_claim_v2('GO41250826','self',true);
if a->>'request_id'<>b->>'request_id' or b->>'existing'<>'true' then raise exception 'DUPLICATE_REQUEST_TEST_FAILED';end if;
begin perform public.gt_submit_legacy_claim_v2('ธีระชัย เจนเสถียร','self',true);raise exception 'AMBIGUOUS_ACCEPTED';exception when others then if SQLERRM<>'IDENTITY_REVIEW_REQUIRED' then raise;end if;end;
if exists(select 1 from public.gt_athletes where go_id='GO41250826') then raise exception 'PREMATURE_PROFILE_ACCESS';end if;
reset role;end$$;rollback;