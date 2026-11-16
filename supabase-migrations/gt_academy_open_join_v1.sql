-- Institution portal (16 Nov 2026, ครูเล็ก): a teacher who confirms their institution can use it straight away.
-- No approval step. "ครู" and "เจ้าของสถาบัน" are titles only: both can add students, enter competitions as a
-- group, share results and follow their students. Group entries still go to the organiser for acceptance.
-- The site owner can still remove anyone (gt_platform_decide_academy_staff_v1 → revoked); a removed person
-- cannot re-join that institution by themselves.

create or replace function public.gt_academy_join_v1(p_name text, p_role text default 'teacher')
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare v_uid uuid := auth.uid(); v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
        v_id uuid; v_prev text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'SIGNED_OUT'); end if;
  if length(v_name) < 2 or length(v_name) > 160 then return jsonb_build_object('ok', false, 'error', 'NAME'); end if;
  if p_role not in ('manager', 'teacher') then return jsonb_build_object('ok', false, 'error', 'ROLE'); end if;
  perform pg_advisory_xact_lock(hashtextextended(norm_inst(v_name), 77));
  select id into v_id from gt_academies where norm_inst(name) = norm_inst(v_name);
  if v_id is not null then
    select status into v_prev from gt_academy_staff where academy_id = v_id and user_id = v_uid;
    if v_prev = 'revoked' then return jsonb_build_object('ok', false, 'error', 'REVOKED'); end if;
  end if;
  if v_prev is null and (select count(*) from gt_academy_staff where user_id = v_uid and status = 'active') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'TOO_MANY_INST');
  end if;
  if v_id is null then
    insert into gt_academies (name, status, created_by) values (v_name, 'active', v_uid) returning id into v_id;
  end if;
  insert into gt_academy_staff (academy_id, user_id, role, status, granted_by)
  values (v_id, v_uid, p_role, 'active', v_uid)
  on conflict (academy_id, user_id) do update set role = excluded.role, status = 'active';
  return jsonb_build_object('ok', true, 'academy_id', v_id, 'status', 'active');
end $$;
revoke all on function public.gt_academy_join_v1(text, text) from public, anon;
grant execute on function public.gt_academy_join_v1(text, text) to authenticated;

-- Anyone still waiting from the old approval flow gets in now.
update public.gt_academy_staff set status = 'active' where status = 'pending';
