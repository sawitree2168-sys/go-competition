# Owner bootstrap and athlete-claim approval runbook

## Verified status
- Supabase project: `bqyokjwuxyzyiripijbs` (GO TOURNAMENT only).
- On first inspection `auth.users` = 0 and `gt_staff_members` = 0.
- Preview route `/admin/owner-setup` now allows users to request email verification, **without granting any staff role**.
- Supabase Auth must allow the exact Preview hostname in Authentication → URL Configuration → Redirect URLs. Do not change Site URL to the Preview if production uses another environment.
- Supabase default email sender/limits may prevent real delivery; verify with a controlled test.
- Approval function `gt_approve_athlete_claim(uuid,text)` was installed, but EXECUTE was revoked from PUBLIC, anon, and authenticated. Approval is **not live**.

## First-owner onboarding (manual trusted operator only)
1. The intended owner opens the Preview `/admin/owner-setup`, enters their OWN email, completes Supabase email verification.
2. An operator checks `auth.users`, confirms the right email and `email_confirmed_at is not null`. Do not rely on client-submitted email or user_metadata.
3. Owner grants are made ONLY after independently checking the individual. Do not copy/paste a suggested email address or a user-supplied UUID blindly.
4. After verification, a database operator can run the following parameterized SQL inside a trusted Supabase SQL Editor session, replacing both parameters with verified values:

```sql
begin;
with verified as (
  select id
  from auth.users
  where id = '<VERIFIED_AUTH_UUID>'::uuid
    and lower(email) = lower('<INDEPENDENTLY_VERIFIED_EMAIL>')
    and email_confirmed_at is not null
)
insert into public.gt_staff_members (user_id,role,active)
select id,'owner',true from verified
on conflict (user_id) do nothing;
-- Confirm exactly one row, correct owner identity, and inspect all current owners.
select s.user_id,s.role,s.active from public.gt_staff_members s where s.role='owner';
commit;
```

If no verified matching user is found, the insert does nothing. Confirm output before considering the account provisioned.

## Before enabling approval
- Independent identity and guardianship verification (especially minors).
- Admin review UI must show review evidence; never store IDs or proof docs publicly.
- Anti-abuse rate limits and session protection for claim creation.
- Authorization tests for unauthorized caller, reviewer role, own-claim approval, duplicate GO ID claim and retry/race.
- Audit logging, support process for correction and appeal, read-only audit export.
- Ensure that a teacher claiming a child profile does not automatically gain full parental access.
- Only then consider a narrowly authorized server-side approval endpoint. Never grant a browser service-role key.
