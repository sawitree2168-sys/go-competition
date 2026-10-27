# GO TOURNAMENT — APPROVED UI REFERENCE SCREENS 16–33
Status: USER-APPROVED DESIGNS, not new design tasks. Screens 16–33 are only one numbered subset; **33 is NOT the total number of mockups made for this project.** Additional approved/generated mockups outside the numbered range require an inventory before claiming any total.
2026-10-27: User supplied full-resolution visual compositions for sets 4–7 in this conversation, four 1536×1024 PNG files. Preserve these designs and map UI implementation to them. Do NOT suggest remaking 25 pages as an alternative; the user explicitly said she already designed them.

## Design catalog and implementation targets
| Screen | UI reference | Functional implementation target |
|---|---|---|
| 16 | Admin division management | Event-specific divisions/settings/fee/round capacity |
| 17 | Applicant approval | Registration search, review, payment check, confirm |
| 18 | Swiss pairing | Conditional pairing enabled, rounds, generate/edit/lock |
| 19 | Match result submission | Referee result & admin verification |
| 20 | Standings and scores | Computed validated score, SOS/SOSOS |
| 21 | News & activities | Published tournament news/list |
| 22 | Event calendar | Year/month filter, competitions |
| 23 | Live results | Public verified round status only |
| 24 | Annual rankings | Cross-event eligible athlete ranking |
| 25 | Photo gallery | Approved highlights, per-event albums |
| 26 | Documents/downloads | Staff-approved PDFs, rules, forms |
| 27 | Event photo collection | Google Drive full albums, optimized highlights |
| 28 | Announcements | Official updates per tournament |
| 29 | FAQ | Categorized help |
| 30 | Contact us | Verified contact channels |
| 31 | Desktop homepage | Hero, event cards, news, rankings, summary |
| 32 | Mobile homepage | Same data, responsive mobile layout |
| 33 | Mobile full menu | Clear navigation, active routes |

## Source artwork
- Set 4 source user upload: 3878.png; pages 16–20
- Set 5 source user upload: 3879.png; pages 21–25
- Set 6 source user upload: 3880.png; pages 26–30
- Set 7 source user upload: 3881.png; pages 31–33

An offline approved image-reference package was generated in the conversation as GO_TOURNAMENT_Approved_Mockups_16-33.zip, containing four original PNG compositions and 18 page-specific reference crops with manifest.json.
**Note:** Local conversation assets and sandbox ZIP are not automatically GitHub repository assets. Do not claim the artwork is already on Vercel or permanent Supabase media until files have actually been uploaded/verified. Use existing Canva asset IDs or a supported binary upload workflow if transferring to hosted assets.

## Exact design and accessibility rule
- Primary theme navy, cobalt, metallic gold, white; preserve existing GO TOURNAMENT branded logo.
- Use these screen shots as APPROVED VISUAL SPECS. Images alone are not interactive user interfaces; implement Next.js React pages and APIs accordingly.
- Prioritize large touch targets, legible Thai font, visible event-day status and clear operator actions.
- Mobile UX modeled at typical 390px width; desktop responsive page 31.
- Keep app domain https://go-tournament.vercel.app and event/athlete/academy IDs stable.
- No fabricated news, athletes, results, prizes, dates or metrics from reference mockups should appear as actual records.
- Some UI refs display sample GO CHAMPIONSHIP 2026 etc.; these are examples until real event record verified.
- No massive original galleries bundled into Vercel: full images on Drive; approved 6–12 thumbnails in Supabase Storage.
- After deployed, test each route 16–33 against these visual references and mark exact deviations in checklist.

## Mapping to execution checklist
docs/GO_TOURNAMENT_EXECUTION_CHECKLIST.md:
- GT-004 becomes verify-and-implement APPROVED design references 1–33, **not redesign**.
- GT-011–014 implement UI screens 16–20.
- GT-015–016 implement screens 21,25–28.
- GT-018 implement screen 24 and home statistics.
- Home responsive targets screens 31–33.
- Next stage: build pages and real interactions from these approved specs and wire Supabase; batch deployment when Vercel quota is available.


## Additional designs outside the numbered 1–33 inventory (not yet reconciled)
Past project design context includes separate image/mockup concepts beyond the sequentially numbered screens:
- Athlete account search desktop UI (GO ID search, player result list, account selection).
- Athlete account search mobile UI.
- Athlete-versus-athlete Matchup/head-to-head/statistics dashboard UI.
- Composite dashboard board containing athlete profile, application, menus and account tabs.
These references must be checked for duplication against numbered screens and stored assets before a new sequential screen number is assigned. No inferred total is authorized.

## Inventory standard
Track per *design asset* and per *functional screen* separately. A single composite may contain multiple screens, and desktop/mobile variants may represent one route; duplicated drafts and revisions must not inflate functional route counts.
Record: asset_id, source (conversation/Drive/GitHub), original image link or asset path, screen title, desktop/mobile, functional route, approved/revision/pending, linked backend feature, imported-to-repo? deployed? verified? Never claim an asset was physically copied into GitHub merely because its location was documented in a Markdown index.
Do not cap implementation at 33. First reconcile ALL approved references, then implement without redesigning user's work.
