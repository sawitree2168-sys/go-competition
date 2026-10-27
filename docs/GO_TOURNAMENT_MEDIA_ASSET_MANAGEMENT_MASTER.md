# GO TOURNAMENT — MEDIA ASSET MANAGEMENT MASTER
Updated: 2026-10-27 Asia/Bangkok
State: Google Drive root folders + native Google Sheet asset register CREATED and READ VERIFIED. Website media registry/API/UI source now implemented; Sheet auto-sync still NOT enabled. Vercel unchanged.

## Brand rule — IMPORTANT
The sole approved GO TOURNAMENT official logo is the uploaded 1448×1086 original image at:
https://drive.google.com/file/d/1a1Cc5Bvh8QnObGp94au3UuMYB2k0Ll11/view
Original filename in Drive: GO_TOURNAMENT_OFFICIAL_LOGO_MASTER.png
SHA-256 from uploaded bytes: ca1075b5df631237e537675554287569dabb0fc44b95f1c499ff8de1dadc2097
NEVER fabricate, redraw, or use an AI-generated substitute. Logo imagery in prior mockups may be incorrect; official image overrides it.

GitHub home route app/page.tsx updated to REMOVE previous incorrect /visual/logo.jpg header; currently uses typographic GO TOURNAMENT placeholder while we prepare a production-hosted exact source binary and perform QA. **Do not claim official logo is installed on web yet**. Drive original is private; do not insert private Drive view link as an <img> public URL or turn on broad sharing without approval.

## Source-of-truth links
Drive root: https://drive.google.com/drive/folders/1y4-J6kx7uQpGhLfgu5cqGm5Dg0vsM03k
Asset Register (native Google Sheet): https://docs.google.com/spreadsheets/d/1wSoV5JoQJgNeUmV85_1T9RU8SATa8uRZSApYpTyFdUM/edit
Subfolders:
01_OFFICIAL_LOGO — ID 1urVquamI7l8dlrEwhDqvZuptaDtZkDT-
02_BANNERS_MASTER — ID 1O0BwCxcMvxVsUtFEdYtxDwGE24p_5csq
03_BANNERS_WEB_EXPORT — ID 1YKISIMv_NeZhbmdP1_lLmaGSL-Vic1QG
04_PAGE_MOCKUPS — ID 1_L6Rlc_0gvOE2HFb-_O_xd0RA7LoKumO
05_EVENT_POSTERS — ID 1WopwKyNKoX3PjkphMJmD30gL-KJvX5pe
06_PUBLIC_EVENT_PHOTOS — ID 16TrWRtsT6dRDzx_WEgP-lU3QIMTm0jaZ
07_ARCHIVE_REPLACED — ID 1eatg7rBAAYOeY-B3A2ka-WIrCBE6wfxw

## Sheets tabs
- ASSET_REGISTER: Asset ID, category, target route, device, pixel size, version filename, original Drive link, web asset URL, status, approver, update date, version, notes.
- GUIDE: process for naming, reviewing, editing, replacement, archiving, QA.
- ASSET_CHANGELOG: history and review of edits/replacements.

## Actual production media workflow
1. Designer uploads original to the appropriate private/editor-access Drive folder.
2. Export optimized desktop/tablet/mobile versions with predictable unique version filename; NEVER overwrite approved original.
3. Register all 3 variants and their Drive file references in Asset Register. Reject missing/duplicate asset ID.
4. Owner reviews exact imagery, Thai lettering, official logo and safe focal area. Mark Approved in the sheet.
5. Approved deployer publishes website images to controlled static assets (GitHub public/ + Vercel deployment) or proper image CDN/object storage with deliberate public read. A normal Google Drive share link is not reliable production image CDN.
6. Enter **public website asset URL** in Sheet. Website reads those URLs only after safe manifest deployment/config integration; an edit to the sheet ALONE does NOT yet change the live website.
7. For later edits, create a new version, obtain approval, update manifest and test 390px/768px/1440px, then archive previous version and record rollback location.
8. Never delete an active version until all routes and responsive variants are replaced and verified. Preserve event images/child privacy according to MEDIA_STORAGE_POLICY.

## Next technical enhancement for edit-without-deploy
Introduce a **server-side approved public media manifest** with a public-only whitelist of route/component and asset URLs, validated asset domain, fallback URL, ETag/cache expiry and rollback to last approved version. For write UI, Owner changes Sheet statuses and a secured sync job validates/reads approved rows and updates the public manifest or asset service; not a browser query of a private spreadsheet. This requires service credentials / connection setup and authenticated testing. Do not ship arbitrary external URLs from Sheet directly to <img> without validation.

## Homepage status
- 3 SVG background banners at public/banners/home/home_desktop.svg, home_tablet.svg, home_mobile.svg committed (not same as AI mockup) and selected by <picture>.
- User requested bright contemporary Go tournament imagery, with exact official brand logo as above.
- Homepage visually staged, awaiting corrected production logo integration, mobile QA, build and deployment.


## Live media registry implementation — 2026-10-27 (additional work)
- Supabase migration gt_site_media_catalog_public_approved_slots_v1 added `gt_site_media` (slot + device PK, asset URL, editor ref, draft/approved/published/archived, attribution, RLS). Anonymous can SELECT only published, while owner/admin can manage.
- Seeded THREE home SVG backgrounds as draft only; none published. They are reference images rather than approved official designs.
- Public `app/api/site-media/route.ts` returns only published media for given slot. Admin `app/api/admin/site-media/route.ts` supports authenticated Owner/Admin read, draft create and explicit status-update approval with allowed URL validation.
- Admin UI `app/admin/site-media/page.tsx` loads and updates entries and links to the Drive folder / Google Sheet; `app/admin/tournaments/page.tsx` has a nav link.
- `app/components/SiteHeroMedia.tsx` resolves three variant URL slots dynamically on homepage; `app/page.tsx` uses it, along with `SiteOfficialLogo` which only displays real official logo after separately published as site media. Until then display a neutral text wordmark, NOT fake logo.
- Sheet is editorial source only. Updating its cells alone does NOT change production. Use Admin media publish as interim manual approved push; fully automated Sheet sync requires server-side Google authorization/audit.
- NEVER use private Drive link as web image URL; uploaded exact logo is safe in private Drive, pending public web hosting of optimized versions and official approval. After first Vercel deployment, changing published config URLs needs no new deployment so long as the target image bytes are already hosted.
- **Not yet QA:** TypeScript build, anonymous/owner browser GET/POST/PUT tests, 390px/768px/1440px responsive screenshot compare, production deployment.


## Follow-up: Public website asset upload enabled in code
- New public Supabase storage bucket `gt-site-assets` with 6 MB cap, PNG/JPEG/WebP only; configured public on purpose because logos and website banners are publicly displayed. NEVER upload student photos, slips, verification IDs, or private media into this bucket.
- Storage INSERT/SELECT RLS requires an active Owner/Admin from gt_staff_members and restricts folder prefix to logos/ or banners/. No overwrite policy: versioned immutable UUID paths prevent accidental replacement.
- Admin `app/admin/site-media/page.tsx` offers image file upload using authenticated Supabase client, then populates public URL into form; **still requires explicit draft save and approval/publication**. Uploading alone does not mark a row published.
- Public API uses narrow column grants for anonymous viewers (only slot/device/asset ID/public URL/alt/updated timestamp); anonymous cannot read private Drive file IDs or edit rows, verified with DB privilege query.
- Browser uploader and production integration remain UNTESTED. New official logo exact image is stored in Drive; after first deploy the Owner can upload web-optimized logo using this page and approve/publish `brand-logo` slot without new deployment for its URL switch.
