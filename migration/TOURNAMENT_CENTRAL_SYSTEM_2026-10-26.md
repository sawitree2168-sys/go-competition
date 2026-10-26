# GO TOURNAMENT — Central Tournament Operations Checkpoint
Date: 2026-10-26. Scope: GO TOURNAMENT only.

## Confirmed live Supabase (project bqyokjwuxyzyiripijbs)
Existing tables: gt_tournaments, gt_divisions, gt_registrations, gt_athletes, gt_matches, gt_staff_members and athlete claim tables.
As checked on 2026-10-26: 0 rows in gt_tournaments, gt_divisions, gt_registrations, gt_matches; legacy public.registrations has 1 row not migrated (do not treat as a verified event signup). No synthetic athletes/events inserted.

### Added via migration gt_tournament_central_ledger_media_certificates_v1 (success)
- gt_payments: payment submissions and verified/rejected/refunded ledger per tournament.
- gt_payment_allocations: split ONE payment across MULTIPLE athlete registrations, no double-counting payments in event revenue.
- gt_payment_proofs: separate private slip references and upload provenance.
- gt_tournament_media: featured cover/poster/news media per tournament, only public when approved.
- gt_tournament_albums: Google Drive full-gallery folder URL, publication flag and consent check.
- gt_tournament_news: per-event news drafts/publications.
- gt_certificates: per-event athlete certificates.
- gt_tournament_expenses: event cost ledger.
All 8 tables verified RLS enabled, zero public/authenticated grants, zero RLS policies; therefore **not yet available through client API**. This is intentional until authorization rules and authenticated server endpoints pass tests. No destructive modifications; do not open payment slip tables publicly.

## One source of truth
Supabase public.gt_* is the forward-looking central store for online GO TOURNAMENT operations. Import legacy Google Sheets and historic registrations only after source mapping, dedupe by athlete/registration identity, organizer approval, backup and reconciliation; never blindly copy entire sheets. Event year is read from start_at in Asia/Bangkok local timezone (do not generate annual sheets or duplicate event tables).

Relational spine:
Tournament UUID -> Divisions -> Registrations -> Athlete UUID
Tournament UUID -> Matches -> Athletes / Divisions
Tournament UUID -> Payments -> Payment Allocations -> Registrations
Payment -> Private Proof(s)
Tournament UUID -> Album Drive folder, Featured Media, News, Expenses
Tournament UUID + Athlete UUID -> Certificates

## Reconciliation & accounting requirements before go-live
- There is no amount due field on gt_registrations yet. Add immutable fee quote or registration charge snapshot before payment workflow is enabled.
- Validate allocation payment+registration tournament IDs match, summed allocations <= verified/received amount, protect payment status with staff-only audit transactions; implement as transactional service or database constraints/triggers.
- Refunds, discounts, waived fees, complimentary entries, partial payments and group payments require explicit policies; never aggregate sum(registration fees) as verified cash revenue.
- Issuance of certificates must depend on approved competition outcomes, and official standing records must be determined from verified matches.
- Private slips/document buckets and guardian/photo consent needed.
- Explicit event ownership organizer/staff assignment not yet implemented.

## UI to build
Admin /admin/tournaments: year selector, actual event list, create/edit draft, counts (no fake data).
Admin /admin/tournaments/[id]: Tabs Overview; Divisions; Applicants; Payments + private slip review; Check-in; Pairing+Results; Standings; Certificates; News; Gallery/Drive; Expenses; Audit and exports.
Public pages only published tournament and approved content, and must not disclose private contact/payment data.
At most 40 or more tournaments per year is handled by queries using tournament ID, indexed child tables and year filtering, not separate spreadsheets.

## Deployment caution
Recent Vercel deployment quota exceeded; DB schema is deployed and verified independently of frontend. No claim that new UI or APIs have been deployed yet. Original mockup pages are a separate display milestone.

## Next technical steps
1. Baseline existing Google Sheets references and identify authoritative historical records without overwriting data.
2. Add organizer ownership and staff-scoped permissions, RLS and strict server API endpoints.
3. Implement event-centric admin page fetching live status counts and associated tables (empty states).
4. Implement fees/payments workflow with validations + private slip storage, test transactions and reconciliation.
5. Implement published news, gallery link and featured photos.
6. Implement verified standings/certificates from match results and archive/extract annual reports.
7. End-to-end test 2 accounts with separate roles, zero synthetic records persisted to production, verify actual Vercel website after deployment capacity resumes.
