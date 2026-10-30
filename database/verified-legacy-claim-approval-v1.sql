create or replace function gt_private.prevent_legacy_duplicate_v5() returns trigger language plpgsql security definer set search_path=pg_catalog as $$begin
if auth.uid() is not null and exists(select 1 from gt_private.legacy_dan_directory_v5 where regexp_replace(btrim(full_name),'\s+',' ','g')=regexp_replace(btrim(new.full_name),'\s+',' ','g')) and not exists(select 1 from public.gt_athlete_claim_requests c join public.gt_staff_members s on s.user_id=auth.uid() where s.active and s.role in ('owner','admin') and c.go_id=new.go_id and c.status='approved' and c.reviewed_by=auth.uid() and c.requester_user_id=new.claimed_by) then raise exception 'DUPLICATE_REVIEW_REQUIRED';end if;return new;end$$;
create or replace function gt_private.approve_legacy_claim_v1(p_claim uuid,p_note text) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare c public.gt_athlete_claim_requests; r gt_private.history_identity_registry_v1; aid uuid;
begin
if auth.uid() is null or not exists(select 1 from public.gt_staff_members where user_id=auth.uid() and active and role in ('owner','admin')) then raise exception 'APPROVAL_FORBIDDEN';end if;
if length(btrim(p_note)) not between 12 and 500 then raise exception 'NOTE_REQUIRED';end if;
select * into c from public.gt_athlete_claim_requests where id=p_claim for update;
if not found or c.status<>'pending' then raise exception 'CLAIM_NOT_PENDING';end if;
if c.requester_user_id=auth.uid() then raise exception 'SELF_APPROVAL_FORBIDDEN';end if;
if not exists(select 1 from public.gt_claim_review_checks where claim_id=p_claim and reviewer_id=auth.uid() and identity_checked and relationship_checked and go_id_checked and duplicate_checked) then raise exception 'REVIEW_REQUIRED';end if;
select * into r from gt_private.history_identity_registry_v1 where go_id=c.go_id;
if not found then raise exception 'REGISTRY_ID_NOT_FOUND';end if;
perform pg_advisory_xact_lock(hashtextextended(c.go_id,0));
select id into aid from public.gt_athletes where go_id=c.go_id and claimed_by is not null and claimed_by<>c.requester_user_id;
if found then raise exception 'ALREADY_LINKED';end if;
update public.gt_athlete_claim_requests set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),review_note=btrim(p_note) where id=p_claim;
insert into public.gt_athletes(go_id,full_name,current_rank,claimed_by,profile_public) values(c.go_id,r.full_name,nullif(r.source_rank,''),c.requester_user_id,false) on conflict(go_id) do update set claimed_by=excluded.claimed_by where public.gt_athletes.claimed_by is null or public.gt_athletes.claimed_by=excluded.claimed_by returning id into aid;
if aid is null then raise exception 'ALREADY_LINKED';end if;
return jsonb_build_object('status','approved','athlete_id',aid,'go_id',c.go_id);
end$$;
revoke all on function gt_private.approve_legacy_claim_v1(uuid,text) from public,anon;grant execute on function gt_private.approve_legacy_claim_v1(uuid,text) to authenticated;
create or replace function public.gt_approve_legacy_claim_v1(p_claim uuid,p_note text) returns jsonb language sql security invoker set search_path=pg_catalog as $$select gt_private.approve_legacy_claim_v1(p_claim,p_note)$$;
revoke all on function public.gt_approve_legacy_claim_v1(uuid,text) from public,anon;grant execute on function public.gt_approve_legacy_claim_v1(uuid,text) to authenticated;