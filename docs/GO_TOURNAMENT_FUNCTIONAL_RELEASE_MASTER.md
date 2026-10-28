# GO TOURNAMENT — FUNCTIONAL RELEASE MASTER
Decision 2026-10-27: STOP prioritizing banner creation. Build the actual interactive website from all approved references 1–105 + extra designs, then test before deploying.

## Non-negotiable acceptance
Each functional route gets these separate statuses: DESIGN approved, CODE created, DATA backed by verified APIs, TEST automated/browser verified, LIVE deployed and checked. A visual mockup is never a working UI.
Do not assert that 105 designs means 105 distinct routes; mobile variants often share one route.
Prioritize event-day legibility, large controls, official logo in header only, Thai Prompt/Sarabun license-compliant font stack.
Do not generate new imagery except when a real route requires missing imagery.
Never fabricate player data, event listings, result standings, payments or prize records from screenshots.
Public GO FAN must not require login; follows are device-local; public verified data only. Academy/owner staff still require auth for privileged features.

## Delivery order
1. Map every approved screen to a functional Next.js route, a UI component, a real API, and required RLS/access control.
2. Build complete P0 user flows: public published events; event details and division; identity checks; registration with idempotency; payment proof privately; staff approval; check-in; optional Swiss pairings; referee result; verified standings.
3. Public pages: GO FAN, results, rankings, profile, news, gallery, documents, announcements, FAQ, contact.
4. Academy bulk application, academy live dashboard, finance, certificates, reports, backups.
5. QA: typecheck/build, permission tests, 390px phone/768px tablet/1440px desktop, complete clickable route coverage, no fake payment/result states, then one Vercel deploy with exact SHA and browser E2E.

## Source status at project goal switch
| Route/feature | Source status | Remaining work |
|---|---|---|
| / homepage | CODE | responsive visual review and functioning nav |
| /schedule published events | CODE + published-data API | Browser tests, event detail workflow |
| /athletes/search and /athletes/claim | CODE (auth-restricted) | guardian/GO ID verified identity flow |
| /admin/tournaments | CODE | Owner E2E, event setup and registration end-to-end |
| /admin/tournaments/[id]/registrations | CODE, read-only | applicant/payment approval actions |
| /admin/academies | CODE | academy role/live workflow |
| /admin/site-media | CODE | upload and approval browser tests |
| /site-map and /faq | NEXT IMPLEMENTATION | link existing routes, accessible details |
| registration, payments, pairing, referee, standings | DESIGN/PARTIAL BACKEND | core implementation, real permission tests |
| /fan | DESIGN/SPEC ONLY | safe published athlete discovery + multi-follow dashboard |
| public results/rankings/news/gallery/docs/contact | DESIGN/PARTIAL BACKEND | public approved data and routes |

## Ready-to-deploy gates
- No fake or dead action buttons. Never link to an unknown route as if implemented.
- Unsupported functionality displays explicit pending state with safe alternative navigation.
- Confirm source exists in GitHub; only mark TEST after actual tests. Only mark LIVE after deployed SHA and functional real-browser test.
- Google Drive and Sheets are editorial stores; Supabase public-only media needs explicit publication, and change in Sheet alone does not update deployed site.
- Carry forward detailed tasks GT-001–GT-040 from docs/GO_TOURNAMENT_EXECUTION_CHECKLIST.md.
- Vercel quota has previously blocked deploy; continue developing in GitHub without promising production availability.
## First functional implementation checkpoint — 2026-10-27
- [CODE] Added /site-map: a responsive category navigation page with working links to confirmed routes only; modules not built are visibly disabled, never dead links.
- [CODE] Added /faq: actual native HTML details/summary accordion with public help and accurate unavailable features; no logins required.
- [CODE] Updated / with prominent /site-map, /schedule, /faq and separate /visual-overview navigation.
- [CODE] Replaced old incorrect AI logo on /visual-overview with SiteOfficialLogo published brand slot (text fallback until official logo actually hosted/approved).
- [CODE] Added /api/tournaments/[id]: strict UUID, published-only event and divisions, no hidden draft event leak, bounded and no-cache.
- [CODE] Added /tournaments/[id]: responsive event detail page with real event title/date/division names and truthful unavailable signup banner. No financial action.
- [CODE] Updated /schedule event cards to actually navigate to /tournaments/[id].
- [DATA checked] gt_tournaments and gt_divisions columns confirmed; public policies inspect and SELECT grants true; at checkpoint 0 tournaments, thus no real event to browser-test yet.
- [NOT DONE] Node/TSC build, browser event-detail E2E, admin auth E2E, production deployment. No live claim.

## Next real functional slice
Implement verified public athlete search for GO FAN separately from authenticated private GO ID claim; make fan local bookmark UI and safe public match/event snapshot, while honoring youth privacy. Then registration draft/verification and staff competition operations with transaction/RLS tests. Do not fabricate records to make pages look populated.

## Go-live release note
Vercel staging/prod not updated. Existing 105 numbered approved mockup screens plus extra designs are an inventory of visual references, NOT completed functional routes. Keep output statuses separate: DESIGN, CODE, DATA, TEST, LIVE.

## 2026-10-28 — OWNER'S NON-NEGOTIABLE COMPLETION TARGET FOR NEXT SESSION
The owner expressly requires **every page and user journey previously planned and approved to be completed, visually good, and truly usable on the website**. Do not substitute image boards, placeholder buttons, partial code, or untested deployments for finished work. Continue from verified source and checklist without asking the owner to restate this requirement.

**Visual acceptance:** each unique page/function represented by 1–105 approved screens and additional designs mapped to an actual route, responsive component, or documented justified shared variant. Keep approved navy/blue, white and gold visual language, only the exact official logo in Header, readable Thai text, spacious large staff controls. Compare built screens with references at desktop/tablet/mobile before sign-off. No visual redesign unless owner approves.

**Functional acceptance:** every visible interactive button/CTA routes or acts meaningfully; no false success or fictitious data; login/role separation, form validation, empty/error states, accessibility, and real Supabase persistence when appropriate. Whole registration -> fee snapshot -> payment validation -> check-in -> Swiss/McMahon (no repeats) -> referee results (including both absent/double forfeit) -> correct configured scores/SOS/SOSOS -> standings -> awards/history must pass transactional and role tests. GO FAN is no-login, opt-in public-data-only, multi-follow and supports removals. Payment must never be marked verified without real independent verification.

**Latest factual checkpoint:** admin Kyu/Dan price defaults 500/600 THB and per-division overrides committed, fee snapshot rollback test passed; `app/api/admin/tournament-divisions/route.ts` had a literal double-backslash regex defect fixed in GitHub commit `45b923b0deaa5d53e79501a68c89f9debb7f6b95`. Existing Vercel build previews previously ERROR due to syntax issue; no verified successful full latest-branch build/E2E after this commit. Do not describe current source as ready, completed, or live.

**First operations next session:** (1) inspect current branch SHA, latest Vercel build logs and source, run/verify build; (2) fix compilation/type/runtime blockers and check role-safe pricing persistence (default Kyu/Dan and fee overrides); (3) continue P0 match-day flows and register every route against approved design inventory; (4) test each completed vertical slice against real data or transaction-rollback fixtures; (5) track verified status DESIGN/CODE/DATA/TEST/LIVE in checklist and only release after all gates pass.

**Status language:** "implemented source" is not "tested", "preview READY" is not "production LIVE", and "designed" is not "working". All outstanding modules remain required deliverables; defer only with an explicit honest blocker and next action.
