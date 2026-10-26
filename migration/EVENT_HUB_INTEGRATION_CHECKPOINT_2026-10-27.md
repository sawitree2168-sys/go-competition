# GO TOURNAMENT — EVENT HUB INTEGRATION CHECKPOINT (2026-10-27)

## Implemented in Supabase project bqyokjwuxyzyiripijbs
- Migration gt_staff_event_dashboard_read_scope_v1: RLS-protected SELECT access to gt_registrations, gt_matches, gt_tournament_news, gt_tournament_media, gt_certificates for active staff; gt_payments and gt_tournament_expenses ONLY active Owner/Admin. No anonymous grants or public financial access.
- Migration gt_album_draft_staff_only_v1: Owner/Admin may create or edit gt_tournament_albums DRAFT only, published=false and consent_checked=false; no public album visibility. Gallery consent/publication review is a separate future workflow.
- Tested authenticated Owner can read event-linked tables and create/modify album with SQL transaction rollback. Tests leave zero residual test events.
- Tested unrelated authenticated UUID cannot read private event, payment or registration rows. Existing public published tournament policy remains.

## Implemented on branch codex/go-tournament-vite-migration
- app/api/admin/tournament-summary/route.ts: token/session+staff verified event-specific summary, counts real divisions/registrations/confirmed registrations/verified-payment flags/matches/verified results/news/media/certificates. Owner/Admin-only finance (verified payment records and expense totals). Financial totals do not sum payment allocations and double-count a group payment.
- app/api/admin/tournament-albums/route.ts: staff GET album; Owner/Admin PUT one validated Drive folders URL on a tournament (draft only), no auto publication. Does not upload or copy bulk images into Vercel.
- app/admin/tournaments/page.tsx: on selecting tournament, load division list + event summary + Drive album; display honest 0 empty data and financial only to authorized role. Save Drive album draft via form.
- Existing draft create / division create APIs are preserved.

## Still not complete
- No actual browser E2E with Owner login, and latest GitHub not confirmed deployed on go-tournament.vercel.app. Vercel deployment quota/automation may require later release.
- Sheet import and dedupe remains pending. Legacy table public.registrations has one row; do not mix it with verified gt_registrations.
- Financial amounts due/fee snapshot, private slip upload, verification and refundable/reconciliation flows not connected. Live banking transactions are not yet verified automatically.
- Public news/gallery display, certificate issuing, and actual Swiss pairing workflow not yet connected. Existing mockup pages are visual only.
- Albums only saved as drafts; publishing requires appropriate guardian/photo consent review.
- Tournament creation/management role scoping is global active staff; per-organizer ownership and event-level permissions still need design and migration.
- Avoid unreviewed publication: no public-facing publish action in new Admin.

## Recheck after deploy
1. Latest deployment SHA matches branch head.
2. /admin/tournaments renders form and selected tournament summary, no fake data.
3. /api/admin/tournament-summary and /api/admin/tournament-albums return 401 without bearer.
4. Owner login can list existing tournaments, create real draft with user-approved details, add divisions, edit Drive album draft.
5. Reviewer cannot access finance.
6. Never claim rollout fully done until all verifications complete.
