# GO TOURNAMENT — EXECUTION CHECKLIST / แผนลงมือทำเมื่อ Vercel พร้อม
**Last reviewed:** 2026-10-27 (Asia/Bangkok) — academy registry DB + UI code checkpoint
**Canonical URL:** https://go-tournament.vercel.app
**Repo:** sawitree2168-sys/go-competition
**Branch:** codex/go-tournament-vite-migration
**Vercel project:** prj_rHlHu3BfpaZ0MpWfIgqosklwzwWK
**Supabase project:** bqyokjwuxyzyiripijbs
**Purpose:** Do not re-plan from scratch. Continue tasks in dependency order. Distinguish code, DB, deployment, and end-to-end tests.
**Current blocker:** Vercel POST deployment returns HTTP 402 api-deployments-free-per-day; latest confirmed production website uses older deployed code, while newer APIs exist only on GitHub.

## How to use this file
- In next conversation: "เปิด docs/GO_TOURNAMENT_EXECUTION_CHECKLIST.md แล้วทำรายการที่ยังไม่ผ่านตามลำดับ ตรวจเว็บจริงก่อนติ๊กเสร็จ".
- Check off [x] ONLY after the Acceptance Criteria are independently verified; label [~] for code-complete/not deployed; [ ] for pending.
- No automatic background execution is implied. Each session must continue by explicit user request or a separately approved scheduled task.
- No fake athlete/event/payment records. Use transaction rollback tests; actual live data only with user-authorized source.
- Respect ALL user-approved visual references through numbered screen 105 and additional non-numbered art; use docs/GO_TOURNAMENT_UI_MASTER_INVENTORY.md and docs/MEDIA_STORAGE_POLICY.md.
- Financial data, IDs, youth photos, proof and password flows require review of RBAC/RLS and privacy before publication.
- Always update this file's status and timestamp on completion, with test evidence URL/deployment SHA.

## Phase 0 — release blocking / go-live gate
- [ ] **GT-001 | P0 | Vercel quota, branch & domain.** WHEN deployment quota permits, deploy latest SHA of codex/go-tournament-vite-migration to project prj_rHlHu3BfpaZ0MpWfIgqosklwzwWK; inspect BUILD output, READY status, and custom domain branch mapping. Rebuild/publish only once for consolidated changes; do not spend quota on documentation-only commits. Acceptance: https://go-tournament.vercel.app/ is on latest intended SHA, renders no 404 and mobile navigation works.
- [ ] **GT-002 | P0 | New API smoke / authentication.** Verify /api/admin/tournaments, /api/admin/tournament-divisions, /api/admin/tournament-summary, /api/admin/tournament-albums, /api/admin/tournament-registrations, /api/admin/tournament-media, /api/admin/tournament-news. Acceptance: each anonymous GET returns 401 (not 404); invalid UUID 400 after valid staff bearer; 403 for unprivileged roles; authorized Owner reads 200; no personal data leaks.
- [ ] **GT-003 | P0 | Owner browser E2E.** Test OTP login from desktop + Android, /admin/tournaments year selector, create one user-approved REAL draft only, add division, read summaries, save Drive folder draft, create news draft; inspect errors and no duplicate submission. Acceptance: refreshed browser shows persistent rows and correct status, regular user cannot write. Do NOT manufacture live event just for tests.
- [~] **GT-004 | P0 | Approved mockup mapping (NO REDESIGN).** User has already approved screens 1–33; four additional original composite uploads (sets 4–7, screens 16–33) catalogued in docs/APPROVED_UI_REFERENCE_PAGES_16-33.md and packaged into 18 screen references for download. Next: transfer binary assets to durable approved hosted storage, implement interactive Next.js UI corresponding to existing art, verify 1–33 and responsive Android/desktop. Acceptance: all actual UI routes and assets match the user-approved designs, without fake event data; latest Vercel tested.

## Phase 1 — athlete registration and event setup
- [ ] **GT-005 | P0 | Single authoritative data model.** Review legacy public.registrations and Google Sheets Tournaments/Divisions/Players/Payments, map identifiers to gt_tournaments/gt_divisions/gt_athletes/gt_registrations. Make a backup and dedupe report; never blind import or overwrite. Acceptance: written field map, duplicates reviewed, 0 unexpected inserted rows, reconciled import totals.
- [ ] **GT-006 | P0 | Tournament & division settings.** Add date/time/location/organizer, fees, capacity, board size, games, pairing mode (optional), round rules, deadline, public publish review, per-tournament organizer permission. Keep old gt_* integrity. Acceptance: admin can edit draft, clone event into another year without copying registrations/payments; public sees only approved published events.
- [ ] **GT-007 | P0 | Athlete ID / academy association.** Reuse stable athlete UUID+GO ID; prevent duplicate profiles; claim via validated proof/guardian consent, not name match alone; academy UUID/logo and membership permissions. Acceptance: same athlete across multiple years always resolves to one profile; role-scoped photo editing.
- [ ] **GT-008 | P0 | Registration workflow.** Event -> division -> verified athlete -> consent -> fee snapshot -> registration -> confirmation and capacity management; support academy/group entries without double-registration; retry idempotency and cancellation. Acceptance: one athlete+event+division registration invariant, counts match database and correct fee recorded, no unverified payment displayed as paid.

## Phase 2 — money & private proof
- [ ] **GT-009 | P0 | Payments and slip upload.** Connect gt_payments -> gt_payment_allocations -> gt_registrations and gt_payment_proofs -> private gt-payment-slips bucket; allow one payment across multiple signups; private staff-only review and audit, discounts/refunds/partial payments; scanned image not proof of bank settlement. Acceptance: upload/review/verify/reject/refund outcomes, no duplicate allocation or revenue; unauth 401, outsider no slip access.
- [ ] **GT-010 | P1 | Finance reconciliation.** Display expected fees vs submitted/verified/waived/refunded vs event expenses, zero double counting and category exports. Acceptance: hand-verified test cases include one group transfer paying 3 athletes, partial payment, cancelled registration, rejected slip; Dashboard ties back to ledger.

## Phase 3 — competition operations
- [ ] **GT-011 | P1 | Onsite check-in and referee roles.** Tournament -> division checkin, queue/search, offline/error states, clear large touch targets, role-based referee vs admin permissions. Acceptance: field test with 10-year-old-style operator clarity and no accidental double check-in.
- [ ] **GT-012 | P1 | Swiss pairing optional.** Division switch pairing_enabled, configurable rounds, R1 school avoidance if possible, BYE, SOS/SOSOS and locked rounds. Acceptance: deterministic fixture tests for odd/even groups, clashes and tie-break, no repeat pair when possible; manual result workflow when pairing disabled.
- [ ] **GT-013 | P1 | Match submission, verification & standings.** Referee submits, authorized admin verifies, lock round, recompute placements from verified match results only; profile statistics update from published standings. Acceptance: undo/correction audit, SOS/SOSOS regression tests, no premature leaderboard publish.
- [ ] **GT-014 | P1 | Certificates & awards.** Generate participant/placement certificates linked to athlete/event/division and verified results; private PDFs with controlled public access where authorized. Acceptance: correct Thai names/divisions/ranks and downloadable history, never issue fake results.

## Phase 4 — news and media
- [~] **GT-015 | P1 | News draft & featured media staging.** DB RLS, draft API, private image upload form added to GitHub; awaits GT-001 + mobile Owner E2E. After verification implement draft editing, publish approval, ordering and public article views. Acceptance: admin saves edits without Vercel redeploy, public only approved news/photos.
- [~] **GT-016 | P1 | Drive albums.** Admin draft Drive-folder URL linked by tournament ID implemented in GitHub; must verify on live site, then implement consent-aware publication (public Viewer permission checked) and 'ดู/ดาวน์โหลดภาพทั้งหมด' link. Keep bulk originals on Google Drive; only 6–12 optimized highlights in private Storage until approved. Acceptance: broken/restricted Drive links handled, no bulk duplication to Vercel.
- [~] **GT-017 | P1 | Supabase Storage safeguards.** Six private buckets created (athlete photos, academy logos, event featured, payment slips, certificates, verification docs); need complete owner/guardian/edit/referee policies and signing/upload test on browser. Acceptance: unauthorized cannot read media/slips and upload paths are strictly bound to correct owner/event.

## Phase 5 — reporting and operations
- [ ] **GT-018 | P2 | Annual dashboard for ~40+ events/year.** Filter by Bangkok event year, event/academy/athlete, unique competitor counts, registered vs paid vs checked-in, verified cash expenses, official results; paginate/exports. Acceptance: totals reconcile to per-event ledger and one athlete competing in multiple events is not wrongly counted as distinct people.
- [ ] **GT-019 | P2 | Reliability and backup.** Database export/backup policy, Drive originals, private proof retention, permission regression tests, event cancellation/archive, duplicate guards and deployment/rollback procedure. Acceptance: restore rehearsal and privacy/access audit, no secrets embedded in public frontend.

## Existing assets and already-implemented pieces — do NOT recreate
- SQL gt_* events/divisions/athletes/registrations/matches + newly-added payments, allocations, proofs, album, news, media, certificates, expenses.
- Six private buckets verified via storage.buckets; staff storage SELECT/INSERT policies need later review.
- Github API: app/api/admin/tournaments, tournament-divisions, tournament-summary, tournament-albums, tournament-registrations, tournament-media, tournament-news; helpers at app/api/admin/tournament-auth.ts.
- GitHub Admin frontend: app/admin/tournaments/page.tsx and app/admin/tournaments/[id]/media/page.tsx.
- Image storage convention: docs/MEDIA_STORAGE_POLICY.md.
- Audit/checkpoints: migration/CONNECTION_GAP_AUDIT_2026-10-27.md and migration/CONNECTION_REPAIR_CHECKPOINT_2026-10-27.md.
- All prior migration and SQL rollback test successes are **not** equivalent to production/browser E2E passing.

## Latest completed coding checkpoint (2026-10-27)
- [~] **GT-024 | P0 | Event applicant roster page.** Added real authenticated staff-only read-only UI at `app/admin/tournaments/[id]/registrations/page.tsx` with search, rank/name/GO ID, division filters, registration/payment status filters, per-division totals, filtered CSV export; linked from the Admin tournament page. Existing API `app/api/admin/tournament-registrations/route.ts` uses verified gt_* schema. **GitHub code only; no build, deployment, Owner E2E, or payment verification yet.** See `docs/GO_TOURNAMENT_UI_ROUTE_DATA_CROSSWALK.md`.
- [~] **GT-025 | P0 | Academy live status visuals 96–100 selected for mapping.** Images found, confirmed `gt_athletes` currently has no academy_id column and event registrations have no institute membership. Must design explicit institution membership and role scoping before real student progress dashboard; do not invent school assignments.

## Immediate resume steps — no re-planning
1. Read this checklist, latest git file and deployment SHA; inspect whether quota reopened. If still 402, **do not repeatedly submit deployments**; proceed with remaining GitHub/SQL work without changing billing.
2. If quota reopened, consolidate changes, deploy once, test GT-001 and GT-002; verify mobile rendering.
3. Continue first incomplete P0 item and record result here using [x]/[~]/[ ] and evidence, even if task is partly done.
4. Never mark phases complete while payment/private data/security end-to-end workflows are missing.

## Phase 6 — designs added after screen 33 (user approved; no redesign)
- [~] **GT-020 | P0 | Master UI inventory up to screen 105.** Initial 73 top-level image files analyzed, duplicates identified, range-to-module map saved. Next verify remaining missing range boards 34–44,86–90 and exact assets, and upload originals to durable project location; no manual redesign. Acceptance: each approved image has stable asset path and linked UI module/route/revision status.
- [ ] **GT-021 | P0 | Academy mass-registration + student live tracking.** Implement visual flows from screens 91–100 including per-student division assignment, fees, shared payments, institutional membership scoping, live results and exports. Acceptance: group registration 6 students does not create duplicate athletes, allocation always equals source payment and errors don't create partial registrations.
- [ ] **GT-022 | P1 | Verified athlete Head-to-Head.** Implement mobile athlete comparison and desktop referee matchup modal from unnumbered images; query approved match results by stable athlete UUIDs, filters by event and result and correct win/loss denominator. Acceptance: symmetry of win/loss; empty/zero-match scenario doesn't display invented history or divide by zero; referee can avoid repeat pairings if rules permit.
- [ ] **GT-023 | P1 | Login/password recovery and role choice screen 101–105.** Translate approved desktop/mobile visuals into secure auth flows, isolate academy staff vs referee vs owner/admin permissions. Acceptance: no account discovery leak; user cannot self-select higher privilege; valid reset/OTP and safe fallbacks.


## 2026-10-27 Academy registry coding checkpoint (requires deployment)
- [~] **GT-026 | P0 | Academy registry DB (implemented).** New RLS-protected `gt_academies`, `gt_academy_memberships`, `gt_academy_staff` tables migrated. Owner/admin can create academy drafts and pending memberships only. Verified rollback-safe temporary GO ID link as active Owner; all test rows rolled back. **No permission for unverified academy staff to read athlete records.**
- [~] **GT-027 | P0 | Academy directory + GO ID linking UI (authored).** `app/admin/academies/page.tsx`, `app/api/admin/academies/route.ts`, `app/api/admin/academy-memberships/route.ts`; link to academy registry from `app/admin/tournaments/page.tsx`. GitHub only; not browser-tested or deployed. Note real academy list/member records still empty.
- [ ] **GT-028 | P0 | Academy membership approval / role-grant reviews.** Before academy staff accesses sensitive data, add verified evidence, owner approval, audit log, role-specific RLS tests and applicant child privacy. Do not auto-confirm by GO ID alone.
- [ ] **GT-029 | P0 | Academy batch registration with transaction, unique idempotency and fee allocations.** Next development stage; use academy-approved roster only, no direct write of money status as verified, protect across institutions.

Source of truth for this checkpoint: `migration/ACADEMY_REGISTRY_CHECKPOINT_2026-10-27.md`.


## Newly requested spectator experience — GO FAN
- [ ] **GT-030 | P1 | GO FAN guest multi-athlete following — NO LOGIN REQUIRED (user confirmed).** Parent/guardian/FC/spectator opens public GO FAN, taps follow on multiple approved public athletes from same or different academies, sees all results on one mobile dashboard. Store only chosen athlete UUIDs in same-browser localStorage with deduplication, clearing and sensible caps; do NOT create follower user accounts or RLS follow table. Build public-safe, limited API for published verified matches and consented athlete identities; no access to academy/private/guardian/payment records. Document device-local retention and no cross-device sync. Spec `docs/GO_FAN_MULTI_ATHLETE_FOLLOW_SPEC.md`; pending code, tests, deployed E2E.

## Responsive Home Banner — 2026-10-27 checkpoint
- [~] **GT-031 | P1 | Responsive HOME banner staged in GitHub.** Three 1920×600/1280×800/800×1000 SVG assets verified in `public/banners/home/` and `app/page.tsx` integrates `<picture>` responsive image sources; real heading/actions remain HTML. Bright GO FAN-inspired Go tournament style; prototype overview moved beneath hero. See `docs/GO_TOURNAMENT_RESPONSIVE_BANNER_MASTER.md`. NOT built/browser-tested/deployed and raster contact-sheet preview is not identical to live SVG. Next: compare 3 device screenshots, user visual approval, then single deploy when Vercel ready.

## 2026-10-27 Media-management + official-logo checkpoint
- [~] **GT-032 | P0 | Official brand logo correction.** User provided and approved exact 1448×1086 PNG; original uploaded to private Drive 01_OFFICIAL_LOGO and SHA256 recorded in docs/GO_TOURNAMENT_MEDIA_ASSET_MANAGEMENT_MASTER.md. Old wrong /visual/logo.jpg removed from app/page.tsx and replaced with neutral text pending exact file publish. Original official logo binary not yet hosted from GitHub/CDN, so web will NOT show it until final integration + deploy. Never regenerate logo using AI.
- [~] **GT-033 | P1 | Media asset management.** Created GO_TOURNAMENT_ASSETS parent + 7 folders, native Google Sheet with ASSET_REGISTER/GUIDE/ASSET_CHANGELOG tabs. Initial entries for official logo, 3 responsive HOME backgrounds, GO FAN reference. Direct Google Sheet edits DO NOT yet sync to deployed website. Future implement validated media manifest and secure owner-approved publishing bridge; proper CDN/static asset hosting, versioning, rollback, avoid hotlinking private Drive. See docs/GO_TOURNAMENT_MEDIA_ASSET_MANAGEMENT_MASTER.md.

## GT-032 | Site Media Manager and official logo source — 2026-10-27
- [~] Supabase: `gt_site_media` table and public-only published RLS, verified anon sees zero unpublished rows and Owner sees three HOME drafts (transaction rollback tests), no fake athlete/event rows.
- [~] APIs: `/api/site-media` public released images only, `/api/admin/site-media` Owner/Admin read/create draft/approve/publish with URL validation.
- [~] UI: `/admin/site-media` shows Drive+Sheet references and slot+device edit controls, linked from Admin center. `SiteHeroMedia` + `SiteOfficialLogo` dynamically resolve published rows on homepage, safe fallback before publication.
- [x] Drive: official user-uploaded logo master stored privately, not a fabricated logo. Sheet media register has 3 tabs and Drive links to original.
- [ ] Upload actual approved official logo binary to public static host, review web variants, enter its public hosted URL in site-media database, explicitly publish, verify correct on all screens. Private Drive URL MUST NOT be used as an image src.
- [ ] Build/typecheck, browser Owner E2E, visual review, Vercel deployment. Sheet-to-Supabase auto sync is NOT implemented; manual controlled publishing via Admin is interim. See `docs/GO_TOURNAMENT_MEDIA_ASSET_MANAGEMENT_MASTER.md`.

## 2026-10-27 media manager API and storage progress
- [~] **GT-033 | P0 | Central picture management.** Drive folder + Sheet catalog made; Supabase media slots and Owner/Admin API/UI on GitHub. Three HOME references seeded as DRAFT; none auto-published. Website Home uses approved-only media endpoint with neutral fallback. Owner/admin-controlled public `gt-site-assets` storage bucket, PNG/JPEG/WebP up to 6MB and no overwrites; front-end upload form written. Anon cannot access private Drive metadata and sees no drafts; database security tests passed.
- [ ] **GT-034 | P0 | Official brand logo go-live.** Official uploaded PNG safely stored in private Drive; webpage references ONLY published `brand-logo` image, using text placeholder until proper public web asset hosted. Upload exact approved logo via site media admin, link brand-logo entry in Sheet, approve/publish, verify desktop/mobile. No fake AI re-drawn logo.
- [ ] **GT-035 | P1 | Sheet sync to media publication.** Editorial spreadsheet complete. Secure Google OAuth/Apps Script sidecar or controlled connected-app push needed to map Sheet changes -> Supabase `gt_site_media`. Current Owner/Admin manual portal changes take effect without redeploy **after initial Vercel release**, but changing private Sheet itself does NOT auto sync yet. Must test credentials, idempotency, rollbacks.

## 2026-10-27 — function-specific visual banner asset checkpoint
- [~] **GT-036 | P1 | Registration/payment and Admin/Referee banners V2.** Created 18 individual logo-free, text-free WebP backgrounds: payment, registration status, check-in, pairing, referee and admin × 3 devices. Staff banners use compact height; public backgrounds retain original Desktop/Tablet/Mobile format. Complete ZIP and SHA256 manifest are local conversation artifacts; 19 editorial rows added to Google Sheet; composite reference board uploaded to Drive. **Not yet binary-hosted on the site, not approved/published, no production tests.** Details `docs/GO_TOURNAMENT_RESPONSIVE_BANNER_MASTER.md`.


## 2026-10-27 archive + route integration checkpoint
- [~] **GT-037 | P0 | Preserve real banner export files.** Uploaded 2 source ZIPs containing 9 public WebPs and 18 functional WebPs into Drive 03_BANNERS_WEB_EXPORT; verified spreadsheet rows 23–31 and 33–50 now reference the containing ZIP in column G, while web URL column H is still intentionally empty. Individual WebP objects **not yet on public Storage**, no approval/publish.
- [~] **GT-038 | P1 | Reusable route-bound responsive banner UI.** Added `app/components/SiteSectionBanner.tsx`; wired existing `/schedule` to `calendar` and `/admin/tournaments` to compact `admin` responsive slot; original real-data lists/forms preserved. NOT typechecked, deployed, browser tested. See `migration/BANNER_EXPORT_ASSET_DISTRIBUTION_2026-10-27.md`.
