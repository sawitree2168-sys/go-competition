# GO TOURNAMENT — Connection Gap Audit
Date: 2026-10-27. Evidence: live Supabase schemas/policies/storage, current GitHub branch files, live Vercel URL responses.
No data or live security policy was changed during this audit.

## Current critical blocker: unreleased backend
- Live https://go-tournament.vercel.app/admin/tournaments returns HTTP 200 but serves older UI (no up-to-date live event summary).
- Live GET /api/admin/tournaments, /api/admin/tournament-divisions, /api/admin/tournament-summary and /api/admin/tournament-albums each return HTTP 404.
- Latest listed Vercel READY Git commit: ab035d78375b9077df1df02fcc45fb8b4141c8bc, older than the latest GitHub implementation. Fix deployment/alias first; verify authenticated endpoints (unauthenticated should return 401) then full Owner E2E.

## Data versus integration
- Supabase public tables exist: gt_athletes, gt_tournaments, gt_divisions, gt_registrations, gt_matches; gt_payments, gt_payment_allocations, gt_payment_proofs, gt_tournament_media, gt_tournament_albums, gt_tournament_news, gt_certificates, gt_tournament_expenses. They are not end-to-end feature proof.
- Database summary metadata currently estimates zero rows in all core gt_* tables except one gt_staff_members. Row estimates are not full counts; verify precise counts before importing or reporting.
- Supabase storage.buckets query returned ZERO buckets. Image, private slip, certificate upload cannot work until created with deliberate access policies.
- Confirmed GitHub routes: app/api/admin/tournaments, tournament-divisions, tournament-summary, tournament-albums. These are NOT live yet.
- No files at checked locations app/api/admin/payments, tournament-news, tournament-certificates, tournament-media, app/api/registrations, app/api/admin/checkin. This is *not proof* no equivalent feature exists elsewhere; it means no integrated API at expected paths.

## Recommended sequence and acceptance gates
P0 1) Release latest branch Vercel deployment, ensure intended domain alias points to its READY build; verify /admin/tournaments and 4 backend routes, 401 anonymous and Owner authorization.
P0 2) Build separate public/admin registration flow with immutable athlete+division+event links, fee snapshots, verified consent, capacity constraints; use gt_registrations as single source of truth. Review old Sheets and legacy public.registrations before migrating.
P0 3) Create private storage bucket(s) and owner/guardian RLS for payment slips and profile photos; add signed upload/download endpoints and proof review audit.
P1 4) Implement check-in/Swiss pairing/result confirmation/standings with locking and referee roles, official certificate issue tied to verified results.
P1 5) Implement tournament news CRUD and image storage; Drive album Admin API already drafted but publication/consent must be implemented.
P1 6) Implement live event finance ledger, payment allocations across registrations, expenses and reconciliation (do not count unpaid registration fees as received cash).
P2 7) Annual cross-event reporting, exports, audit logs, history and album link validity checks.

## Rules
Do not conflate successful migration with a working website; do not invent registrations, payment totals, or event histories. Maintain restricted permissions until user workflows are tested.
