# GO TOURNAMENT — Claim workflow database regression test (2026-10-26)

## Result
**Database-layer transaction regression: PASS.** Complete multi-user browser/API E2E test: **NOT YET RUN**.

Project `bqyokjwuxyzyiripijbs`, branch `codex/go-tournament-vite-migration`, canonical domain `https://go-tournament.vercel.app`.

## Checks executed
1. In a `BEGIN; ... ROLLBACK;` transaction with Supabase role `authenticated` and the registered owner UUID simulated as `auth.uid()`, submit a pending claim through RLS INSERT.
2. Verify the same principal can SELECT its claim.
3. Submit a second identical pending `go_id`; `unique_violation` expected and asserted.
4. Insert a checklist review through RLS INSERT as active staff and read it back.
5. Duplicate review by the same reviewer and claim; `unique_violation` expected and asserted.
6. In a second transaction, switch simulated `auth.uid()` to an unrelated UUID; verify it cannot see the first principal's claim or staff review.
7. Verify that unrelated UUID cannot INSERT a review; an insufficient privilege / RLS exception is expected and asserted.
8. Restore owner UUID; own claim remains visible in the test transaction.
9. After both ROLLBACKs, verify **gt_athlete_claim_requests=0, gt_claim_review_checks=0, gt_claim_review_audit=0, gt_athletes=0**.
10. `anon` and `authenticated` cannot UPDATE/DELETE reviews or EXECUTE `gt_approve_athlete_claim`.
11. Live Vercel GET `/athletes/claim` and `/admin/claim-review` each returned HTTP 200 with expected headings.

## Limitations
- These are **SQL role simulations**, not real login tokens sent to Next.js HTTP APIs. The positive flow uses a single already-verified owner principal for the submission and review paths; it is not a real multi-actor test.
- Do not describe this as having verified complete applicant-to-admin browser workflow.
- The production database contains no athlete profile fixtures or real pending requests; this is intentional.
- No claim was approved, profile owner changed, or fake production athlete created.
- Approval remains disabled. Next gate: two separately verified accounts, real auth sessions, controlled athlete record and test request; safely clean fixtures after verification. Add rate limiting and staff evidence handling before launch.

## Security
All INSERTs were rolled back. Testing approval is intentionally excluded. Review notes should not contain national IDs or unredacted documents. Never use the GO MASTER Supabase project.
