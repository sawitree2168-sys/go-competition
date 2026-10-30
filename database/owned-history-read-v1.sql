create or replace function gt_private.owned_history_v1(p_go_id text) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
if auth.uid() is null or not exists(select 1 from public.gt_athletes where go_id=p_go_id and claimed_by=auth.uid()) then raise exception 'HISTORY_ACCESS_DENIED'; end if;
select jsonb_build_object('go_id',p_go_id,'coverage','ข้อมูลที่นำเข้าแล้วเท่านั้น ยังไม่ใช่ประวัติทั้งหมด','status','partial_review_pending','events',coalesce((select jsonb_agg(to_jsonb(s)-'source_key') from gt_private.history_event_summaries_v1 s where s.go_id=p_go_id),'[]'::jsonb),'pending_match_count',(select count(*) from gt_private.history_multiyear_raw_v1 m join gt_private.history_dan_crosswalk_v1 c on c.go_id=p_go_id where (m.payload->>'dan_a')::integer=c.dan_number or (m.payload->>'dan_b')::integer=c.dan_number)) into result;
return result;
end $$;
revoke all on function gt_private.owned_history_v1(text) from public,anon;
grant usage on schema gt_private to authenticated;
grant execute on function gt_private.owned_history_v1(text) to authenticated;
create or replace function public.gt_owned_history_v1(p_go_id text) returns jsonb language sql security invoker set search_path=pg_catalog as $$select gt_private.owned_history_v1(p_go_id)$$;
revoke all on function public.gt_owned_history_v1(text) from public,anon;
grant execute on function public.gt_owned_history_v1(text) to authenticated;