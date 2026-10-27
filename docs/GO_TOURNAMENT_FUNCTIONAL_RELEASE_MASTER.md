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