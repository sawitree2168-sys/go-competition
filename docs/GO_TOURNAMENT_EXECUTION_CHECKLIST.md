# GO TOURNAMENT — EXECUTION CHECKLIST / แผนลงมือทำเมื่อ Vercel พร้อม
**Last reviewed:** 2026-10-27 (Asia/Bangkok) — UI Master Inventory pass 1
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
