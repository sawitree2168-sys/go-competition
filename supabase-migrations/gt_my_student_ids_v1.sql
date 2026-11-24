-- Teachers / institution owners: the athletes of every institution they run, so competition pages can mark
-- "นักเรียนของเรา" next to those names (24 พ.ย. 2569). Only active staff links count — the platform admin does
-- not get every athlete of every institution.
create or replace function public.gt_my_student_ids_v1()
returns jsonb language sql stable security definer set search_path = public, gt_private, pg_temp as $$
  with mine as (
    select ac.id, ac.name from gt_academy_staff s join gt_academies ac on ac.id = s.academy_id
    where s.user_id = auth.uid() and s.status = 'active' and ac.status = 'active'
  )
  select jsonb_build_object(
    'academies', coalesce((select jsonb_agg(name order by name) from mine), '[]'::jsonb),
    'ids', coalesce((select jsonb_agg(distinct x.athlete_id) from mine cross join lateral gt_private.academy_students(mine.id) x), '[]'::jsonb))
$$;
revoke all on function public.gt_my_student_ids_v1() from public, anon;
grant execute on function public.gt_my_student_ids_v1() to authenticated;
