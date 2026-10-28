# GO TOURNAMENT — ALL PAGES FIRST: website-wide preview

Date: 2026-10-28. User requested the whole website overview FIRST: every functional area should have a visible, clickable page even before certain data, integrations, and rules are completed. The approved layout/visual references 1–105 and extras remain the target design.

## Implemented in GitHub in this pass
- `app/overview/page-catalog.ts`: 28 explicit planned feature pages, with approved-reference number mappings, grouping and next data integration work.
- `app/overview/page.tsx`: one public, responsive overview page divided into 7 groups (public, athlete, registration, competition, staff, academy, account). All 28 page shells have real clickable links.
- `app/overview/[slug]/page.tsx`: actual Next.js page route for each of the 28 slugs, visually structured with appropriate section header, relevant table headers, empty state, honest integration notes, related page links, and mobile-safe layout.
- Homepage links `/overview` prominently. `/site-map` also links `/overview`, keeping fully implemented route navigation separate from visual shell navigation.
- No demo athletes, fake live results, fake bank transactions, made-up event dates or public access to privileged data.

## Scope and definitions
- 28 distinct pages **are source-code page shells** sharing a dynamic route, not 28 independent complete feature implementations.
- UI references 1–105 include desktop/mobile variants and states of the same route; do not state that 105 routes are required or completed.
- The overview hub is the entry point for exploring ALL known functional sections in one place. Existing real routes such as `/schedule`, `/fan`, `/faq`, `/admin/tournaments` and `/athletes/search` remain separate, untouched in function.
- Some approved reference intervals 34–44 and 86–90 still await exact source mapping. Those unknown screens cannot honestly be marked implemented solely based on the 28 shell list.
- Page shells use shared modern Thai-friendly navy/white/gold UI components and real HTML; they are placeholders for later detailed visual matching against approved art.
- No user-facing announcement of full working app, completed payment or tournament readiness is authorized by this milestone.

## Follow-up priorities
1. Verify successful Next.js `npm run build` for exact current Git SHA; fix any compile and route errors.
2. Audit screen references against each page route, one by one, adding source-equivalent sections and interaction layouts.
3. Migrate functional routes into the same coherent navigation/design system, but protect staff/academy routes with real RBAC.
4. Connect data only when DB and rules are verified. Registration fee 500 Kyu / 600 Dan editable, fee snapshot immutable; referee double forfeit, Swiss no-repeat pairing, McMahon and SOS/SOSOS remain critical test obligations.
5. Capture 390/768/1440px screenshots and compare with approved mockups before public Vercel release.

## Status gate
CODE: 28 overview shells + navigation committed. DATA: not implemented for these 28 shell pages. TEST: not yet build/browser validated. LIVE: not confirmed. Do not mark shell creation as full site completion.