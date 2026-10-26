# GO TOURNAMENT — Verification Report (2026-10-26)

## Status: PASS for server deployment / database guards; OWNER LOGIN E2E NOT YET VERIFIED

Environment: Vercel branch `codex/go-tournament-vite-migration`, canonical URL `https://go-tournament.vercel.app`, Supabase `bqyokjwuxyzyiripijbs`.

### Real HTTP checks (via authenticated Vercel account web fetch)
- GET / => HTTP 200
- GET /admin/athlete-claims => HTTP 200; appropriate Thai heading
- GET /athletes/search => HTTP 200; search UI exists
- GET /athletes/claim => HTTP 200; claim form UI exists
- GET /schedule => HTTP 200
- GET /api/tournaments => HTTP 200, JSON status=ok, tournaments=[] (genuine published query, no seeded competition data)
- GET /api/auth/public-config => HTTP 200, project URL and publishable key only
- GET /api/admin/athlete-claims without session through share-link tool => request blocked by deployment authentication before response; **cannot treat this as a verified application-level 401**.

### Supabase checks
- Project ACTIVE_HEALTHY.
- auth.users = 1, active Owner = 1, gt_athletes = 0, gt_athlete_claim_requests = 0, gt_claim_review_audit = 0.
- Anonymous SQL role cannot SELECT public.gt_staff_members or public.gt_athlete_claim_requests (permission denied).
- Authenticated SQL role with unrelated UUID sees 0 gt_staff_members and 0 claim requests.
- Authenticated SQL role with Owner's UUID sees its own active `owner` staff row.
- `anon` and `authenticated` both have no UPDATE rights on claims, and neither can execute `gt_approve_athlete_claim(uuid,text)`.
- Empty claim list means no real claim or approval flow can yet be asserted to pass.

### Explicit gates and issues
1. Browser-based magic link login AFTER Supabase Site URL and Redirect URL changes is not yet observed end-to-end. Owner last_sign_in_at since 2026-10-26 14:00 UTC was absent in the most recent check.
2. Authenticated GET /api/admin/athlete-claims using a real Owner session remains to be verified. Do not use a temporary/fabricated access token.
3. A real claim submission, readback, duplicate prevention and audit approval flow require consent-based test accounts and data.
4. `gt_approve_athlete_claim` deliberately has no client EXECUTE privilege; do not enable UI approval or claim production readiness.
5. Legacy `public.registrations` is preserved; no data was changed.
6. Do not conflate this Next.js staging branch with the full Vite migration; that migration remains incomplete.

### Next actions
- Owner requests a fresh magic link through `https://go-tournament.vercel.app/admin/athlete-claims`, confirms callback stays on this domain and reviews the displayed role.
- Once Owner session is confirmed, run application-level negative/positive auth tests and an independently documented limited test-claim path without editing athlete profiles.
- Add structured review evidence, rate limits, and audit authorization before enabling approval.
