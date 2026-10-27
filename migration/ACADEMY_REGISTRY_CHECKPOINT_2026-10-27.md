# GO TOURNAMENT — Academy Register + Pending Membership Checkpoint
Date: 2026-10-27
Current state: **Supabase schema migrated + Github APIs/UI authored; NOT deployed, NOT production browser tested.**

## Purpose
Approved UI reference: academy bulk registration pages 91–95 and institute student monitoring pages 96–100, plus individual academy dashboard board. The initial safe groundwork stores *institution identity* and *pending linkage* to a **pre-existing** athlete GO ID. It does not silently approve school/guardian authority, register students to a tournament, or create financial entries.

## Supabase migration successfully applied
Migration `gt_academy_private_registry_pending_memberships_v1`:
- `gt_academies`: UUID, unique name, draft/active/archived, created_by; no unverified auto publish.
- `gt_academy_memberships`: academy_id, athlete_id, membership_status (pending/verified/inactive), verified_by, verified_at, unique (academy_id,athlete_id). A verified member must have a verifier and timestamp; drafts remain pending.
- `gt_academy_staff`: academy_id, auth user_id, role (manager/teacher/viewer), status (pending/active/revoked), granted_by.
- RLS on all; only active global owner/admin can GET draft academies/member association, INSERT draft academy/pending memberships. Academy staff has **no self-service access** yet; grant / confirmation flow still to be developed.
- **No public SELECT** and no arbitrary UPDATE privileges granted to authenticated. No editing/verification/activation tools authored yet. No new athlete rows, payment rows or event registrations migrated.

## New authenticated code in GitHub
- `app/api/admin/academies/route.ts`: GET staff registries, POST create draft academy, name validation, unique conflict response.
- `app/api/admin/academy-memberships/route.ts`: GET membership records joined on authenticated athlete profiles (through verified global staff read), POST using pre-existing GO ID and unique academy membership. Creates pending only; 409 for duplicate. No auto athlete signup.
- `app/admin/academies/page.tsx`: Owner/Admin OTP, select existing academy, create draft institution, find existing GO ID, view pending/verified badge and total; app styling aligned with approved navy/gold mobile-first UI.
- `app/admin/tournaments/page.tsx`: navigation link to academy registry.

## Validation performed
- Read live `gt_*` columns before migration, confirmed no academy membership model existed.
- Applied migration and verified by rollback transaction as active owner JWT: creates a **temporary** athlete and academy and pending membership, selects both through RLS as authenticated, then rolls back transaction.
- Query confirmed 0 remaining fake athletes / fake academies and 0 real membership records.
- The Owner/Reviewer/Academy role browser tests and TypeScript production build are **not yet performed**.
- Vercel deployment not attempted; release only after single consolidated build and quota check.

## Next tasks
1. Implement **academy verification workflow** (validated guardian/institution consent and document review, audit log) with controlled role-scoped access; do not expose academy's membership to an unverified teacher.
2. Create secure academy organizer enrollment batches tied to tournament/division/GO ID, including capacity, fee snapshot, idempotency, and fee payment allocations. Pending students must not become eligible automatically.
3. Develop screens 91–95 full batch registration UX, and 96–100 academy live tracking using verified `gt_matches`, avoiding mock UI sample scores and invoices.
4. Check TypeScript build, endpoint anonymous 401 / unauthorized 403 / role access / no duplicate membership when deployment permits. Update checklist with verified SHA and route evidence.
5. Confirm parental consent and privacy for minors, private academy uploads in Supabase, do not publish student list by default.
