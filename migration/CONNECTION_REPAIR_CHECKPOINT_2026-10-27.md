# GO TOURNAMENT — Connection Repair Checkpoint (2026-10-27)

## Verified current connection stack
- GitHub repo sawitree2168-sys/go-competition; branch codex/go-tournament-vite-migration.
- Supabase project bqyokjwuxyzyiripijbs; migrations applied successfully.
- Vercel project prj_rHlHu3BfpaZ0MpWfIgqosklwzwWK; go-tournament.vercel.app is verified and assigned to branch codex/go-tournament-vite-migration.
- Vercel deployment creation returned HTTP 402 api-deployments-free-per-day (quota) on this date. Latest READY deployment was older commit 8ced96b31b05bc6eec9a67863be5c706a87cafbc; latest GitHub changes NOT proven deployed. Do not claim live browser functionality.
- Existing deployed API /api/tournaments returned HTTP 200 (published events empty); recently introduced /api/admin/tournaments, tournament-divisions, tournament-summary, tournament-albums returned 404 from currently deployed website at last audit.

## Changes completed THIS work period (real Supabase, GitHub only)
- Supabase migration gt_private_storage_buckets_staff_upload_v1: six private buckets:
  gt-athlete-photos (5 MB image), gt-academy-logos (3 MB image),
  gt-event-featured (8 MB image), gt-payment-slips (10 MB image/PDF),
  gt-certificates (10 MB PDF), gt-verification-docs (10 MB image/PDF).
  Confirmed all six rows in storage.buckets with public=false. RLS storage.objects SELECT/INSERT only active owner/admin. No UPDATE or DELETE policies added; do not expose or issue public media URLs.
- Supabase migration gt_media_draft_insert_staff_v1 permits owner/admin to register unpublished event media tied to tournament UUID.
- Supabase migration gt_athletes_verified_staff_read_v1 permits active staff read athlete names for internal organizer list. No public athlete listing permission.
- Supabase migration gt_news_draft_staff_insert_v1 permits owner/admin to create news in draft status only.
- GitHub app/api/admin/tournament-media/route.ts: staff GET media metadata per event; owner/admin POST draft only and validate event ID + file extension path.
- GitHub app/admin/tournaments/[id]/media/page.tsx: OTP-verified Owner/Admin preview uploader; uploads to private gt-event-featured bucket and records metadata; only staff previews via signed URL. Does not claim public publication.
- GitHub app/api/admin/tournament-registrations/route.ts: staff-only per-event registrant list with associated athlete name, GO ID, division and registration/payment statuses; row limit safety.
- GitHub app/api/admin/tournament-news/route.ts: staff GET news and owner/admin POST draft news per event.
- GitHub app/admin/tournaments/page.tsx: selected-event panel loads & shows registrations, payment statuses, draft news, media upload link, and previously implemented summary, financial overview and Drive folder draft.
- SQL rollback tests passed: verified owner could insert/read draft news, media attached to draft tournament without leaving test rows; verified all six buckets and policies; no actual tournament/athlete/payment invented.
- GDPR/PDPA: never make profile photos or slips public by default, retain exact event links and consent gating.

## Remaining major blockers/features
P0 Vercel quota and deployment latest branch; test actual Owner UI and unauth 401 for new API paths after deployment.
P0 No production tested end-to-end registration create/fees snapshot/payment upload + verify + reconciliation; avoid counting unverified slips as money received.
P0 Existing historical Sheets not live migrated/normalized. Reconcile before importing, with dedupe and backups; legacy table is separate.
P1 No active referee/checkin Swiss pairing + standings + result approval workflow tied to new GT backend.
P1 No certificate generation or automated rank/result-driven issuance.
P1 No public/news publishing & consent-approved images; new media/news only private drafts.
P1 Role scoping currently global staff rather than organizer per tournament; implement before multi-organizer use.
P2 Annual analytics/export/audit and long-term retention.

## Safe acceptance process after Vercel quota
1. Deploy a single current branch build when quota available; confirm SHA and branch-bound domain.
2. Check route /admin/tournaments renders newest version and /admin/tournaments/<event_uuid>/media.
3. Check /api/admin/tournaments, /api/admin/tournament-summary, /api/admin/tournament-registrations, /api/admin/tournament-news, /api/admin/tournament-media return 401 anonymously.
4. Authenticate real Owner; read genuine records (currently none), create only user-authorized tournament/draft, add division and featured gallery; test upload and signed preview on mobile.
5. Check errors and access for nonstaff and reviewer, and no public slips/photos.
6. Only mark production READY when full flow tested. No background work promise.
