create or replace function public.gt_photo_review_v1(p_id uuid,p_draft jsonb,p_action text,p_note text default '') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.gt_photo_inbox_v1; g jsonb; code text; b uuid; w uuid; ev text; dv text; dt date; rn int; cnt int=0;
begin
 if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED' using errcode='42501'; end if;
 select * into old from public.gt_photo_inbox_v1 where id=p_id and status<>'uploading' for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_action not in ('draft','approve','reject') or jsonb_typeof(p_draft)<>'object' or octet_length(p_draft::text)>100000 then raise exception 'BAD_DRAFT'; end if;
 if p_action='approve' then
  ev=btrim(p_draft->>'event');dv=btrim(p_draft->>'division');dt=(p_draft->>'date')::date;
  if ev is null or length(ev)<3 or dv is null or length(dv)<1 or dt is null or dt>current_date then raise exception 'EVENT_REQUIRED'; end if;
  for g in select value from jsonb_array_elements(coalesce(p_draft->'games','[]')) loop
   if coalesce((g->>'selected')::boolean,false) is not true then continue; end if;
   b=(g->>'black_id')::uuid;w=(g->>'white_id')::uuid;rn=(g->>'round')::int;code=g->>'result';
   if b is null or w is null or b=w or rn is null or rn not between 1 and 30 or code is null or code not in ('black_win','white_win','black_win_forfeit','white_win_forfeit','draw','double_loss','double_forfeit') then raise exception 'CHECK_PLAYERS_AND_RESULT'; end if;
   -- Lock the unordered event/round pair before checking conflicting duplicates across submissions.
   perform pg_advisory_xact_lock(hashtextextended(ev||dt::text||dv||rn::text||least(b::text,w::text)||greatest(b::text,w::text),11));
   if exists(select 1 from gt_private.crowd_games_v1 c where c.event_name=ev and c.event_date=dt and c.division=dv and c.round_number=rn and (c.black_id in(b,w) or c.white_id in(b,w)) and not(c.black_id=b and c.white_id=w and c.result_code=code)) then raise exception 'CONFLICTING_RESULT'; end if;
   insert into gt_private.crowd_games_v1(submission_id,event_name,event_date,division,round_number,black_id,white_id,result_code,approved_by) values(p_id,ev,dt,dv,rn,b,w,code,auth.uid()) on conflict(event_name,event_date,division,round_number,black_id,white_id) do nothing;
   cnt=cnt+1;
  end loop;
  if cnt=0 then raise exception 'SELECT_GAMES'; end if;
 end if;
 update public.gt_photo_inbox_v1 set draft=p_draft,status=case p_action when 'approve' then case when exists(select 1 from jsonb_array_elements(coalesce(p_draft->'games','[]')) as pending_row(value) where coalesce((pending_row.value->>'selected')::boolean,false)=false) then 'draft' else 'approved' end when 'reject' then 'rejected' else 'draft' end,admin_note=left(p_note,1000),reviewed_by=auth.uid(),updated_at=now() where id=p_id;
 insert into gt_private.photo_review_log_v1(submission_id,actor,action,before_data,after_data) values(p_id,auth.uid(),p_action,to_jsonb(old),p_draft);
 return jsonb_build_object('ok',true,'approved_games',cnt);
end $$;
revoke all on function public.gt_photo_review_v1(uuid,jsonb,text,text) from public,anon;
grant execute on function public.gt_photo_review_v1(uuid,jsonb,text,text) to authenticated;
