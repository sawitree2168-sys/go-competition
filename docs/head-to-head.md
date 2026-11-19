# สถิติการพบกัน

Route /head-to-head?a=GO_ID&b=GO_ID&year=2026; year omitted means all imported years. Linked from site navigation, menu, athlete directory cards/table and central profile. Search uses existing public directory RPC through /api/athletes/search (min 2 chars, max 80, max30 results). No private fields or elevated database credentials.

Data: gt_history_profile_v1(p_go_id:left.go_id,p_year:null). Only match rows whose opponent_go_id equals the selected right GO ID; never infer identity by fuzzy name. Use left history as canonical, deduplicate by match ID, never concatenate both athletes' mirrored histories. Reverse wins/losses for the right card. Percent denominator = confirmed played win+loss+draw. Pending, bye, walkover and not_played are excluded and counted separately. Zero denominator is —, not 0%. Same player is blocked. No data means not yet found in system, not never played. Do not invent event dates or replace imported IDs. Current historical import is partial, predominantly year2569, and the UI states this.

Exports use the existing CompetitionPanel PNG/PDF with athlete photo toggle. Filters/search/share controls outside export or marked data-export-ignore. Share copies current safe pair/year URL. Rectangular athlete photos reuse approved shared portraits, including Chayapol's uploaded photo. CSS keeps cards side by side on mobile; match table is horizontally scrollable for legibility.

Checks: node tests/head-to-head.mjs, npx tsc --noEmit, npm run build. Real database sanity case GO41250826 versus GO443250826: 2 played games, 1 win, 1 loss, 50% each at time of implementation.
