-- Read current imported history at request time; never grant ownership by name.
create index if not exists history_raw_dan_a_v2 on gt_private.history_multiyear_raw_v1 ((payload->>'dan_a'));
create index if not exists history_raw_dan_b_v2 on gt_private.history_multiyear_raw_v1 ((payload->>'dan_b'));
create or replace function gt_private.owned_history_v1(p_go_id text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb; registry_name text; dan text; matches jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.gt_athletes where go_id=p_go_id and claimed_by=auth.uid()) then raise exception 'HISTORY_ACCESS_DENIED';end if;
 select full_name into registry_name from gt_private.history_identity_registry_v1 where go_id=p_go_id;
 -- Require the existing exact-ID crosswalk AND a unique directory name/number.
 select c.dan_number::text into dan from gt_private.history_dan_crosswalk_v1 c
 where c.go_id=p_go_id and c.basis='same_dan_number_and_normalized_name'
 and p_go_id<>'GO106260826'
 and (select count(*) from gt_private.legacy_dan_directory_v5 d where replace(d.dan_number,',','')=c.dan_number::text)=1
 and exists(select 1 from gt_private.legacy_dan_directory_v5 d where replace(d.dan_number,',','')=c.dan_number::text
 and regexp_replace(d.full_name,'[[:space:]​‌‍﻿]','','g')=regexp_replace(registry_name,'[[:space:]​‌‍﻿]','','g'));
 with candidates as (
  select m.*,true as side_a from gt_private.history_multiyear_raw_v1 m where dan is not null and m.payload->>'dan_a'=dan
  union all
  select m.*,false as side_a from gt_private.history_multiyear_raw_v1 m where dan is not null and m.payload->>'dan_b'=dan
 ), eligible as (
  select * from candidates m
  where review_status='metadata_pending' and payload->>'status'='reciprocal_verified_event_metadata_pending'
  and payload->>'dan_a'<>payload->>'dan_b'
  and payload->>'winner_dan' in (payload->>'dan_a',payload->>'dan_b')
  and payload->>'round' ~ '^[1-9][0-9]*$'
  and regexp_replace(case when side_a then payload->>'name_a' else payload->>'name_b' end,'[[:space:]​‌‍﻿]','','g')=regexp_replace(registry_name,'[[:space:]​‌‍﻿]','','g')
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'source_key',source_key,'go_id',p_go_id,'athlete_name',registry_name,
  'event_title',nullif(payload->>'event_title_raw',''),'event_date',payload->>'event_date',
  'source_file_year',payload->>'source_file_year','source_tab',payload->>'source_tab',
  'source_header_row',payload->>'source_header_row','source_rows',payload->'source_rows',
  'round_no',payload->>'round','opponent_name',case when side_a then payload->>'name_b' else payload->>'name_a' end,
  'opponent_dan',case when side_a then payload->>'dan_b' else payload->>'dan_a' end,
  'result',case when payload->>'winner_dan'=dan then 'win' else 'loss' end,
  'review_status',review_status,'imported_at',imported_at
 ) order by payload->>'source_file_year' desc,payload->>'source_tab',payload->>'source_header_row',(payload->>'round')::integer,source_key),'[]'::jsonb) into matches from eligible;
 select jsonb_build_object('go_id',p_go_id,'read_mode','live_database','checked_at',now(),
 'coverage','ดึงข้อมูลที่เชื่อมไว้ในฐานระบบอัตโนมัติ ไม่ใช่ประวัติทุกแหล่ง รายการที่ข้อมูลยังขัดแย้งจะไม่แสดง',
 'events',coalesce((select jsonb_agg(to_jsonb(s)) from gt_private.history_event_summaries_v1 s where s.go_id=p_go_id),'[]'::jsonb),
 'legacy_matches',matches,
 'walllist_events',coalesce((select jsonb_agg(w.payload order by w.source_key) from gt_private.history_walllist_results_v2 w where w.go_id=p_go_id),'[]'::jsonb),
 'pending_identity_count',(select count(*) from gt_private.history_multiyear_raw_v1 m where dan is not null and (m.payload->>'dan_a'=dan or m.payload->>'dan_b'=dan) and m.review_status='metadata_pending' and regexp_replace(case when m.payload->>'dan_a'=dan then m.payload->>'name_a' else m.payload->>'name_b' end,'[[:space:]​‌‍﻿]','','g') is distinct from regexp_replace(registry_name,'[[:space:]​‌‍﻿]','','g')), 
 'pending_match_count',(select count(*) from gt_private.history_multiyear_raw_v1 m where dan is not null and (m.payload->>'dan_a'=dan or m.payload->>'dan_b'=dan) and m.review_status<>'metadata_pending')) into result;
 return result;
end$$;
