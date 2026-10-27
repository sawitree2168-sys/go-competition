# GO TOURNAMENT – pending registration creation checkpoint – 2026-10-27
**Status: database policy installed/tested, GitHub API and Admin UI code committed; browser/production integration NOT verified.**

## Delivered
- Supabase RLS policy `gt_registrations_owner_admin_pending_insert_v1`: active Owner/Admin may INSERT only if `registration_status='pending' AND payment_status='pending'`. Existing verified tournament+division composite FK remains, and unique `(tournament_id,athlete_id)` prevents duplicate athlete in one event.
- Existing authenticated staff API `app/api/admin/tournament-registrations/route.ts` now offers POST with tournament UUID, division UUID, GO ID. It checks existing event, matching division, existing GO ID, existing registration, and submits pending-only row. 409 duplicate, 400 invalid, 401 unauthorized, 403 role forbidden, 404 missing GO ID.
- GET staff registrations returns `role` for role-specific action rendering.
- `app/admin/tournaments/[id]/registrations/page.tsx` adds Owner/Admin-only form with GO ID, division options and confirmation before pending add. Reviewer remains read-only.
- No new athlete creation, claims, payment, registration confirmation, or event/participant simulation. Pending does NOT reserve capacity and does NOT change bank/payment state.

## Executed DB regression checks (all rolled back)
1. Owner inserts pending record using real RLS permissions, attempts duplicate via ON CONFLICT DO NOTHING: count remains exactly 1, pending payment 1.
2. Unprivileged authenticated UUID attempts pending INSERT: RLS denied as insufficient_privilege. A prior false test selected 0 test rows due to RLS and was corrected to use pre-captured temporary IDs; the corrected test passed.
3. Owner attempts direct confirmed+verified INSERT via this policy: RLS denied.
4. Verified permanent `gt_tournaments` count 0, `gt_registrations` count 0 and rollback test GO IDs count 0. No test data retained.

## Limitations before release
- GitHub source has NOT been run through typecheck/build or an Owner browser E2E with real authorized existing athlete + event; no claim that form is live or production-ready.
- Seat capacity constraints and collision-safe registration enrollment/fee snapshot are NOT built. This POST only creates a staff-managed pending record, and must not become public signup endpoint.
- Missing strict event state machine, audit columns/registration fee snapshot, consent/guardian flow, academy grouping, verified payment allocation, staff results/referee/Swiss standings, and GO FAN.
- Check Vercel domain latest SHA, first test staging with real permissioned staff after deployment. Never fabricate real registrations or assert payment verified without ledger confirmation.