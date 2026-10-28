# GO TOURNAMENT — INTERACTIVE UI STRUCTURE REVIEW (2026-10-28)

## User-reported problem
Approved UI references and rich visual designs exist but website appears static, quiet, and image-first with little obvious functioning navigation. User additionally reports current medal award artwork is not aesthetically acceptable. Final requirement: visually match the approved design and operate as a real tournament website.

## Root cause confirmed in GitHub
- Homepage `app/page.tsx` previously presented a large static overview image `/visual/overview.jpg` and `ดูภาพรวมเว็บไซต์ GO TOURNAMENT ทุกหน้า` link before meaningful operational sections.
- The hero contained a system-status wall of text and only two CTAs. Role-specific navigation was dispersed across static-looking cards and a text-only `site-map`.
- Design preview should never be treated as functional UI, and awards graphics have not been user-approved for production.

## Real code changes committed
- New `app/components/HomeInteractiveHub.tsx`, responsive client component, user-selectable tabs for **spectator/fan**, **athlete/guardian**, **organizer/Admin**, and **referee**.
- Each role tab changes its heading and step sequence immediately; actionable cards use real existing routes (`/schedule`, `/fan`, `/athletes/search`, `/athletes/claim`, `/admin/tournaments`, `/admin/site-media`). Missing flows display clearly unavailable states and are not dead links.
- Added disclosure button for detailed current system availability and data privacy; keyboard-accessible actual buttons and Next.js links, min. 44px targets, responsive 2-up/4-up tab layout.
- In `app/page.tsx`, removed dominant large design collage and large early preview link; inserted interactive role hub directly after hero. Design references now secondary compact card late in homepage. Do not silently replace existing approved assets, official branding or back-end links.
- No simulated athletes, match results, payments or medal award counts are shown. Official logo stays separately managed and published via media slot.

## Work still required — no misleading 'complete' claim
- These changes exist **on branch only** until an exact commit SHA passes Next.js build and browser/screenshot QA. The previous READY Preview at SHA `5f62a21ee9a8d5662c274935bbfe06d684a00638` predates these latest UI commits; this is not visual evidence for new hub.
- Compare final UI against numbered reference artworks (1–105+), prioritize desktop/tablet/mobile home, participant flow, role dashboard, fast referee controls; fix spacing and type after screenshot comparison.
- Award medal imagery is **not approved**. Keep it out of actual user-result UI until revised visual is reviewed. Do not invent real medals to make dashboards appear busy.
- Staff check-in, Swiss/McMahon pairing with no repeats, double-forfeit workflow, verified standings/SOS/SOSOS, financial verification, public enrolment and role E2E are still incomplete.
- Verify build, route links (including roles) and responsive accessibility; test anonymous privacy and Owner/Admin permissions before treating as deploy ready.

## Separation of status
DESIGN reference ≠ CODE committed ≠ BUILD passed ≠ E2E verified ≠ public LIVE. User-facing statements must name which stage has been achieved.