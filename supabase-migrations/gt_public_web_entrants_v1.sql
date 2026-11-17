-- Web sign-ups listed next to the organiser's Google Form rows (17 Nov 2026, ครูเล็ก: "แสดงผลทั้งใน sheet และในหน้าเว็บ").
-- Same public fields as gt_public_entrants: name, institution, division, payment state. No phone, birth date or slip.
create or replace function public.gt_public_web_entrants_v1(p_tournament uuid) returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'full_name', clean_name_v1(a.full_name), 'institution', coalesce(a.club, ''), 'division_id', a.division_id, 'division', d.name,
           'payment_status', case
             when a.status = 'approved' and r.payment_status = 'verified' then 'ชำระเงินแล้ว'
             when a.status = 'approved' then 'รออัปเดต'
             when w.slip_path is not null then 'รอตรวจสลิป'
             else 'รอผู้จัดตรวจ' end,
           'created_at', a.created_at) order by a.created_at), '[]'::jsonb)
  from gt_web_applications a
  join gt_tournaments t on t.id = a.tournament_id and t.published
  join gt_divisions d on d.id = a.division_id
  left join web_application_details_v1 w on w.application_id = a.id
  left join gt_registrations r on r.id = a.registration_id
  where a.tournament_id = p_tournament and a.status in ('pending', 'approved')
    and (r.id is null or r.registration_status = 'confirmed')
$$;
revoke all on function public.gt_public_web_entrants_v1(uuid) from public;
grant execute on function public.gt_public_web_entrants_v1(uuid) to anon, authenticated;
