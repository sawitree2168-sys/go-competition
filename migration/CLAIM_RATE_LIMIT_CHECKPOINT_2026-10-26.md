# GO TOURNAMENT — Claim abuse protection checkpoint (2026-10-26)

## Changes deployed
- Installed `gt_guard_claim_submission_before_insert` trigger on `public.gt_athlete_claim_requests`.
- For each verified applicant user ID the trigger serializes concurrent requests and applies limits: max **3 pending** requests and max **5 total submissions in a rolling 24-hour window**.
- Existing case-insensitive one-pending-request-per-(user,GO ID) uniqueness remains intact.
- GET/POST claim API now maps `CLAIM_PENDING_LIMIT` and `CLAIM_DAILY_LIMIT` to user-friendly Thai HTTP 429 responses, and avoids exposing SQL error text.
- No service-role key added to browser.

## Testing
- SQL transaction with simulated authenticated Owner claims inserted unique test GO IDs; case-insensitive duplicate was correctly rejected; fourth pending request was rejected by trigger.
- Test changes were rolled back. Verified `gt_athlete_claim_requests=0`, `gt_claim_review_checks=0`, `gt_athletes=0` afterward.
- Confirmed trigger is enabled. Vercel commit `77f9108bce6b23d728348d1e6a8d1e1fefc02096` deployed READY with TypeScript build passing.
- Exact per-day limit branch and two-real-user browser submission have not been exercised end to end.
- Approval remains disabled to ordinary users; owner profile data unchanged.

## Remaining rollout gates
- Test two real accounts with verified email and explicit consent; user session must create claim and Owner session must review it using HTTP API.
- Protect email OTP requests against abuse and ensure redirection on stable domain.
- Rate-limit is per authenticated user, not global per IP; additional upstream anti-bot control needed before public launch.
- Do not enable GO ID approval until identity/guardian evidence handling and admin audit tests are complete.
