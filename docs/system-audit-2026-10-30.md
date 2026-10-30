# GO TOURNAMENT system audit — 30 October 2026

Baseline: account-profile-v4 at ba5eda86b95cb6741c3097f828b68af8eceebdb7. Isolated repair branch: codex/system-audit-walllist. Preserve concurrent account work; do not replace it with the older poster branch.

| System | Evidence / usable portion | Remaining gap and next action |
|---|---|---|
| Event listing and detail | Existing deployed preview APIs returned 200 for ZEER, eight divisions, fee defaults Kyu/Friendship 500 and Dan 600 | Whole user journey and responsive visual QA still pending |
| Homepage posters | Fixed list API to include existing poster_url and homepage to prefer saved event poster via shared helper | ZEER saved URL currently null; approved fallback exists. Historical original posters unverified. Full-poster modal remains separate PR #4 |
| Historical results | Added /results using only one recorded Walllist snapshot; division select, name/club search, all round values, points, SOS, SOSOS and source link | Limited to September Seacon 2025; 10 groups, 212 source rows including 5 explicit placeholders. No automatic refresh, identity linking, extra rounds or new athletes |
| Results navigation | Homepage, site map and old /overview/results now lead to actual /results | Other overview routes remain outlines; no blanket completion claim |
| Historical multi-year import | Current source checkpoint records private raw staging | 283 review observations; event metadata, duplicate keys and identity joins unresolved. Owner correction: future result imports must use Walllist only. Do not publish raw staged aggregates |
| Registration / payment | Pages and guarded submission backend exist; deployed payment API returns 200 | Real registration remains disabled, original QR absent. Need owner/guardian staging E2E; do not enable event merely to test |
| Account / athlete profile | Latest branch has login, recovery, profile edit, identity connection, owned-history API; checkpoint reports build and rollback checks | Actual email confirmation/recovery, signed-in owner browser and viewport checks not verified in this audit |
| Staff approval and check-in | Code provides actions and role checks | Local backend env absent; APIs fail closed 503. Real authorized workflow not tested here |
| Head-to-head | Input validation exists | Endpoint explicitly returns 503; no real query implementation. Needs verified identity and match facts before enabling |
| Pairing / referee / live standings | Overview contains planned screens | No functional route for these workflows in inspected tree. Implement and test separately; historical import never substitutes for a live tournament engine |
| News / gallery / rankings / documents | Media/admin APIs partially present | Public overview pages still placeholders. Need approved published content and real read paths |
| Hosting | Vercel project go-competition has READY previews; audited deployed SHA 5e4d3db9158c5201190e16d907eca7a6db9e003e | Vercel SSO protects previews. Public production availability and authenticated browser E2E not established |

## Validation
- Walllist parser rejects other tabs and unsupported headers; preserves source rank strings (including -8), names, rows and scores; flags placeholders without allocating athlete IDs.
- TypeScript and webpack build passed before final navigation/poster adjustments; final build recorded in subsequent checkpoint.
- New results/parser ESLint passed. HTTP checks: seven page routes 200, rendered Walllist label, three owner APIs reject anonymous requests 401, invalid event ID 400. Staff endpoints without backend env return 503, which is not a role E2E pass.
- Browser visual QA unavailable in this environment: previous Chromium downloads returned invalid archives. Do not claim phone/tablet/desktop visual checks.
- Live API reads used the existing protected preview through the Vercel connector; private /api/me/history fetch was blocked at deployment authentication, so its response must not be interpreted as app authorization evidence.
- No production data, payments, identity or enrollment altered by this audit. Result snapshot is read-only source data; no derived ranking/medal calculation.
