-- Athletes choose their own institutions from their profile (24 พ.ย. 2569, rule from ครูเล็ก)
-- A student may study with several teachers, so one athlete can belong to many institutions, and every institution
-- can list the same student. Choosing an institution here makes the athlete a student there straight away (no wait
-- for the admin); it is stored as a verified membership with verified_by = the athlete's own account.
-- The athlete can remove only the institutions they added themselves; links made by an institution stay.

create or replace function public.gt_my_student_academies_v1()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare a gt_athletes;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'LOGIN'); end if;
  select * into a from gt_athletes where claimed_by = auth.uid() limit 1;
  if a.id is null then return jsonb_build_object('ok', false, 'error', 'NO_ATHLETE'); end if;
  return jsonb_build_object('ok', true,
    'mine', coalesce((select jsonb_agg(jsonb_build_object('id', ac.id, 'name', ac.name, 'self', m.verified_by = auth.uid()) order by ac.name)
                      from gt_academy_memberships m join gt_academies ac on ac.id = m.academy_id
                      where m.athlete_id = a.id and m.membership_status = 'verified' and ac.status = 'active'), '[]'::jsonb),
    'choices', coalesce((select jsonb_agg(jsonb_build_object('id', ac.id, 'name', ac.name) order by ac.name)
                         from gt_academies ac where ac.status = 'active' and ac.workspace_type = 'academy'), '[]'::jsonb));
end $$;

create or replace function public.gt_set_my_student_academy_v1(p_academy uuid, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a gt_athletes; m gt_academy_memberships;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select * into a from gt_athletes where claimed_by = auth.uid() limit 1;
  if a.id is null then raise exception 'บัญชีนี้ยังไม่ได้ผูกกับนักกีฬา'; end if;
  if not exists (select 1 from gt_academies where id = p_academy and status = 'active' and workspace_type = 'academy') then
    raise exception 'ไม่พบสถาบันนี้';
  end if;
  select * into m from gt_academy_memberships where academy_id = p_academy and athlete_id = a.id;
  if coalesce(p_on, false) then
    if (select count(*) from gt_academy_memberships where athlete_id = a.id and membership_status = 'verified') >= 10
       and coalesce(m.membership_status, '') <> 'verified' then
      raise exception 'เลือกได้ไม่เกิน 10 สถาบัน';
    end if;
    insert into gt_academy_memberships (academy_id, athlete_id, membership_status, verified_by, verified_at)
    values (p_academy, a.id, 'verified', auth.uid(), now())
    on conflict (academy_id, athlete_id) do update
      set membership_status = 'verified',
          verified_by = case when gt_academy_memberships.membership_status = 'verified' then gt_academy_memberships.verified_by else auth.uid() end,
          verified_at = case when gt_academy_memberships.membership_status = 'verified' then gt_academy_memberships.verified_at else now() end;
  else
    if m.id is null or m.membership_status <> 'verified' then return public.gt_my_student_academies_v1(); end if;
    if m.verified_by is distinct from auth.uid() then raise exception 'สถาบันนี้เพิ่มคุณเป็นนักเรียนไว้ ติดต่อสถาบันหากต้องการเอาออก'; end if;
    update gt_academy_memberships set membership_status = 'inactive', verified_by = null, verified_at = null where id = m.id;
  end if;
  return public.gt_my_student_academies_v1();
end $$;

revoke all on function public.gt_my_student_academies_v1(), public.gt_set_my_student_academy_v1(uuid, boolean) from public, anon;
grant execute on function public.gt_my_student_academies_v1(), public.gt_set_my_student_academy_v1(uuid, boolean) to authenticated;
