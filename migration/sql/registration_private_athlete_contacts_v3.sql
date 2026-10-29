create table public.gt_athlete_contacts_v3 (
athlete_id uuid primary key references public.gt_athletes(id),
owner_id uuid not null references auth.users(id),
contact_name text not null check (char_length(contact_name) between 1 and 200),
contact_phone text not null check (char_length(contact_phone) between 8 and 20),
updated_at timestamptz not null default now()
);
alter table public.gt_athlete_contacts_v3 enable row level security;
revoke all on public.gt_athlete_contacts_v3 from anon, authenticated;
grant select,insert,update on public.gt_athlete_contacts_v3 to authenticated;
create policy gt_contact_owner_select on public.gt_athlete_contacts_v3 for select to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.gt_athletes a where a.id=athlete_id and a.claimed_by=(select auth.uid())));
create policy gt_contact_owner_insert on public.gt_athlete_contacts_v3 for insert to authenticated with check(owner_id=(select auth.uid()) and exists(select 1 from public.gt_athletes a where a.id=athlete_id and a.claimed_by=(select auth.uid())));
create policy gt_contact_owner_update on public.gt_athlete_contacts_v3 for update to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.gt_athletes a where a.id=athlete_id and a.claimed_by=(select auth.uid()))) with check(owner_id=(select auth.uid()) and exists(select 1 from public.gt_athletes a where a.id=athlete_id and a.claimed_by=(select auth.uid())));

