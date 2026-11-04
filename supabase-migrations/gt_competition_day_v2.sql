-- Competition day v2: organisers (owner/admin) may read the Google Form entrant list of any event,
-- including events that are not yet published (needed to import and rehearse before publishing).
-- Additive only: the existing public policy is unchanged.
drop policy if exists gt_public_entrants_staff_read_v1 on public.gt_public_entrants;
create policy gt_public_entrants_staff_read_v1 on public.gt_public_entrants
  for select to authenticated
  using (exists (select 1 from public.gt_staff_members s
                 where s.user_id = (select auth.uid()) and s.active and s.role = any (array['owner','admin'])));
