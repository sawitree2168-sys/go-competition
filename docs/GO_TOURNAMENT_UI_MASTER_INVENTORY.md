# GO TOURNAMENT — UI MASTER INVENTORY (2026-10-27)
**Status:** first full local asset pass completed; gaps are explicitly flagged. **Never stop at 33 pages.**
**User-supplied UI:** sequentially numbered screen compositions through **105**, plus extra single-page mockups (Head to Head mobile/desktop, GO MASTER institute tracking, mass-registration) and other variants.
**Verified inventory run:** 73 top-level image files in current working container (not 73 separate application routes). Exact SHA-256 inspection found **2 pairs of duplicate image bytes**. Additional 18 page crops under GO_TOURNAMENT_Approved_UI_Pages_16-33 are derived from earlier composites and must NOT count as new screen designs.
**Artifacts:** A downloadable working ZIP was made in conversation named GO_TOURNAMENT_UI_Master_Inventory_2026-10-27.zip with CSV (filename, SHA256, dimensions, grouping, status), JSON manifest, screen-range map, contact sheet, and 24 identified source artwork files. Local conversation ZIP is **not yet GitHub asset hosting**.

## Number-range screen mapping
| Screens | Functionality | Verification |
| --- | --- | --- |
| 1–15 | Initial website/mobile/admin design boards | inspect page labels individually before linking routes |
| 16–20 | Admin divisions, applicants, Swiss, results, standings | documented reference |
| 21–25 | News, calendar, live results, rankings, photo gallery | documented reference |
| 26–30 | Documents, gallery, announcement, FAQ, contact | documented reference |
| 31–33 | Desktop homepage, mobile homepage, mobile navigation | documented reference |
| 34–44 | Additional UI boards not fully reconciled | PENDING exact asset mapping |
| 45–50 | Athlete profile, rankings, news, gallery, award, institution | image set 10 |
| 51–55 | Athlete history, awards, stats, gallery, certificates | image set 11 |
| 56–60 | News listing/article/gallery/docs/alerts | image set 12 |
| 61–65 | Competition detail, registration, payment, status, FAQ | image set 13 |
| 66–70 | Registration receipt, entrants, results, awards, Admin | image set 14 |
| 71–75 | Admin tournament, pairings, referee result, standings, medals | image set 15 |
| 76–81 | Admin/Referee desktop dashboard, pairings, wall list, result, standings, announcement | image set 16 |
| 82–85 | Competition stats, athlete record, awards, gallery | image set 17 |
| 86–90 | Existing design set NOT yet identified in audited subset | PENDING exact asset mapping |
| 91–95 | Academy group enrollment: institute, student selection, eligibility, group billing, report | image set 19 |
| 96–100 | Academy student real-time monitoring and school-wide report | image set 20 |
| 101–105 | Login desktop/mobile, account recovery, role choice, sign-in safety/help | image set 21 |

## Identified example source image filenames
- Set 4: `3878.png` (16–20)
- Set 5: `3879.png` (21–25)
- Set 6: `3880.png` (26–30)
- Set 7: `3881.png` (31–33)
- Set 10: `c2de95d5-f1e6-4b93-ae58-e78faa2fbe1d.png` (45–50)
- Set 11: `436f7e74-90a4-4710-9947-b095e69703fe.png` (51–55)
- Set 12: `89d72a97-1543-400b-8f9f-4a7e5ceeb9d8.png` (56–60)
- Set 13: `4310183d-8da5-462a-8547-f41c3329609e.png` (61–65)
- Set 14: `10e06464-5f75-4ab9-8705-87576b7d2655.png` (66–70)
- Set 15: `2c32a3a0-6186-4480-b2bc-687cc28709c9.png` (71–75)
- Set 16: `26d17f81-9aaa-4451-aef3-4319d2545ed2.png` (76–81)
- Set 17: `63938da3-d31a-424e-8822-104bb5a8e217.png` (82–85)
- Set 19: `93ef3152-c466-41f1-86e6-ae7d566d766e.png` (91–95)
- Set 20: `1ffda8af-0144-4689-a399-b25d506f6ad7.png` (96–100)
- Set 21: `5567687f-3c20-4f02-afde-82afcca11249.png` (101–105)
- Extra group enrollment detailed: `0ff45403-053c-4e29-9f91-b035e3ce9c47.png`
- Extra GO MASTER event status board: `676a8283-daa8-460d-9bca-f4ed30d4a731.png`
- Head to Head mobile two phone boards: `aecc5cc3-f397-423c-84f3-9da02d789cbc.png`
- Head to Head desktop referee overlay: `3f0b6568-1de5-4063-bc74-e75726896919.png`

## Implementation mapping by module (build without redeploy)
1. **Admin:** screens 16–20, 70–81 + Head-to-Head desktop; implement roles, division options, fees and the approved visual states; connect gt_* only after verifying exact columns.
2. **Registration/payment:** screens 61–67 + 91–95; strict idempotency and fee snapshots, private slips and verification.
3. **Academy/staff:** screens 50, 91–100 plus GO MASTER dashboard; school-wide batch enrollment and tracking with proper academy-scoped permissions.
4. **Athlete/profile:** screens 45–55, 82–84 + Head-to-Head mobile; match summaries from verified results only.
5. **Public news:** screens 21–33, 56–60, 68–69, 85; approved-only media & Drive albums.
6. **Auth:** screens 101–105; verified reset and role gates, not just name-match account recovery.

## Implementation acceptance
- Separate **source artwork available**, **React UI coded**, **API/DB connected**, **deployed**, **E2E verified** for EVERY module.
- A reference screen may be desktop/mobile variants of the same route; do not promise exactly 105 Next.js routes.
- No sample players/scores/mock amounts from image designs into production data.
- Every URL to hosted images must be stable. Current source images are in conversation files, not yet uploaded into GitHub or Supabase.
- Full large event photos on Google Drive, selected compressed highlights in Supabase with appropriate permission.
- Use docs/GO_TOURNAMENT_EXECUTION_CHECKLIST.md for delivery priorities. Avoid extra deploy attempts while Vercel quota blocks.

## Next actions (ready to execute)
- [x] Enumerate source images and identify exact duplicate bytes in this workspace.
- [x] Map numbered board groups 16–33 and 45–105 where grounded by the user’s images.
- [ ] Audit screen numbers 34–44 and 86–90 against original artworks, confirm which images represent same page vs different revisions.
- [ ] Ingest approved binary assets into durable repo or private object store and record asset paths; **DO NOT claim completed** until fetched back successfully.
- [ ] Crosswalk each UI screen to actual Next.js route, component, API route and Supabase table (mark missing).
- [ ] Implement highest-priority missing functional UI on branch, run build/typecheck/regressions; deploy and browser-test when quota resumes.
