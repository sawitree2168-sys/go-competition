# GO TOURNAMENT — Media & File Storage Policy
Status: APPROVED DESIGN DECISION (user confirmed 2026-10-26)
Project: GO TOURNAMENT only. Do not confuse with GO MASTER or other projects.

## Core decision: Hybrid gallery, keep Vercel small
1. Full tournament/event/camp photo albums live in a dedicated **Google Drive folder per event/tournament**. Staff uploads all originals to Drive in one batch. **Do not copy all originals to GitHub, Vercel, or Supabase Storage.**
2. Show only **6–12 selected, optimized featured images** per event in the GO TOURNAMENT website. Store featured thumbnails and cover images in Supabase Storage (or existing site assets for fixed design graphics), not in new deployment bundles. Typical photo web preview: WebP/AVIF where supported, max dimension ~1200–1600px, responsive thumbnails. Never rely on permanent public access to expiring Google/Canva thumbnail URLs.
3. Each tournament record is identified by an immutable internal tournament UUID, and its **gallery configuration** stores the official Drive folder URL, selected media asset references, captions/ordering, publication status, and timestamps. Changing images or the Drive link is an Admin data edit **without redeploying Vercel**.
4. The public tournament page shows featured images with a **“View/download all photos on Google Drive”** link to the tournament's verified Drive folder. Website users can use Google Drive for complete original-resolution photos.
5. In Admin, provide: field to paste a Drive folder URL, validate the URL and allowlist Drive host, upload/select/reorder featured photos, publish/unpublish gallery, preview, save. Treat display images as examples until approved photos exist. Do not synthesize actual athlete photos or event results.
6. Do not promise every Drive folder is public. For a public photo album, owner must explicitly configure Viewer access and inspect images/consents before publishing; otherwise the website should show “album access restricted” or hide the link. Avoid broad sharing of images of minors without appropriate consent.

## Separate file types by privacy
- Bulk competition atmosphere/event photos: **Google Drive album**, selective web previews in Supabase Storage, linked by tournament ID.
- Athlete profile photo: **Supabase Storage** with image revisions linked to stable athlete UUID/GO ID; only verified athlete or authorized guardian/editor can change it. Matching a full name is **not sufficient authorization**. Public access only with appropriate consent.
- Academy/school logos: **Supabase Storage** linked by stable academy ID; authorized academy editor controls upload, publication subject to approval.
- News pictures and tournament posters: optimized **Supabase Storage** items linked by news ID or tournament ID; large originals may be archived on Drive. CDN thumbnails and captions, no redeploy.
- Payment slips, identity/guardian evidence, private certificates: **private** buckets controlled by verified role and ownership/RLS/signed URLs; never put them in public Drive photo folders.
- Permanent app logo, core UI assets/mockups: tracked in GitHub / static website; this is distinct from ongoing event media.
- Backup: Drive can serve as organized originals/archive; database record metadata and backups require independent preservation/retention processes. Do not assume Drive links never change.

## Suggested logical data relationships (plan first; do not silently create production tables)
Tournament UUID -> event_gallery (drive_folder_url, status) -> gallery_featured_media records (storage_bucket, object_path, sort_order, alt/caption).
Athlete UUID -> profile_photo asset (with versions). Academy UUID -> logo asset. Registration UUID -> Payment UUID -> private payment_slip assets.
Actual schema names should follow existing `gt_*` naming and be checked against the live schema before a migration.

## Key UX and operations
- Event-day workflow: Admin creates/opens tournament -> uploads hundreds of originals to one dedicated Drive folder -> selects 6–12 highlights -> pastes Drive link -> verifies Drive Viewer rights and child consent -> publish -> public page shows highlights and “View all in Drive”.
- Changing gallery metadata should never trigger a Vercel deployment.
- Use file-size limits, compression, thumbnails, deduplication, admin access checks, and error states. Retain original filenames in Drive if useful; system object keys should use immutable IDs rather than Thai names.
- Link longevity: periodically validate link or allow admin to update it; external Drive file availability is not guaranteed.
- No secrets, personal documents, slips, or unverified user-supplied URLs embedded in HTML as trusted scripts.
- Vercel considerations: fewer static/deployed image bytes; media traffic will still incur storage and egress costs elsewhere. **This approach does not increase Vercel deployment-count quota**.

## Implementation status
This document fixes the project's **design convention**. The complete Admin gallery form, data schema, and public gallery connection are future implementation tasks, not claimed live functionality.
