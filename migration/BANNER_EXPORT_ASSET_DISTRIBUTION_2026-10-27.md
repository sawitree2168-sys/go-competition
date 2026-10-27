# GO TOURNAMENT — BANNER DISTRIBUTION CHECKPOINT (2026-10-27)

## What was actually completed
- Verified source ZIPs exist in active conversation runtime: public `GO_TOURNAMENT_PUBLIC_BANNERS_V2_9_FILES.zip` (9 distinct webp variants), functional `GO_TOURNAMENT_FUNCTION_BANNERS_V2_18_FILES.zip` (18 distinct webp variants).
- Uploaded **both complete ZIP archives** to `03_BANNERS_WEB_EXPORT` in Google Drive:
  - Public (gallery/calendar/contact): https://drive.google.com/file/d/11eirUJlV4sH4Qy20iznkj5f73vie5U3T/view
  - Functional (payment/registration status/check-in/pairing/referee/admin): https://drive.google.com/file/d/1EWP2xVxdQkGuKeZBRwV8TEI4TWmOYibr/view
- Updated corresponding 27 rows of Asset Register (ASSET_REGISTER 23–31, 33–50) so column G links to the **archive containing the asset**, column H deliberately remains blank, and status explicitly records: archived in Drive, but not uploaded as individual image objects to website storage, not published.
- Created `app/components/SiteSectionBanner.tsx` to wrap published-only `SiteHeroMedia` with real Thai HTML title, description, and alternate compact staff banner layout.
- Modified existing `app/schedule/page.tsx` to render responsive `calendar` slot heading and keep the authenticated/actual tournament list unchanged.
- Modified existing `app/admin/tournaments/page.tsx` to use short `admin` media slot and preserve space for day-of-event table actions.
- These are committed to GitHub branch `codex/go-tournament-vite-migration`. **No Vercel deploy and no live end-to-end/browser tests** were performed.

## Remaining release gates
1. Unpack both ZIPs and upload each selected approved WebP via authenticated Owner/Admin media manager to the public `gt-site-assets` bucket. Do not use Drive ZIP download links as HTML `<img>` sources; never expose secret/private Drive images.
2. Confirm images show exact expected design, dimensions, crop, and the official user-provided logo in the global Header only. AI sample scores/events must not appear as live data.
3. For each slot/device enter the resulting actual public Storage URL in `gt_site_media`, draft first, approve only after user visual sign-off, then manually publish. `gt_site_media` does **not** have a separate row for every asset until the upload exists; do not seed nonexistent URLs.
4. Build/typecheck production, test anonymous publication filtering, test Owner/Admin upload/approval and staff role protection, test responsive views at 390px, 768px and 1440px.
5. Verify first deployment SHA and real website URLs after Vercel quota allows. Only then mark Live.
6. Later implement consented/future Sheet-to-DB sync; Sheet edits are currently editorial only.

## Canonical record
Drive root: https://drive.google.com/drive/folders/1y4-J6kx7uQpGhLfgu5cqGm5Dg0vsM03k
Asset register: https://docs.google.com/spreadsheets/d/1wSoV5JoQJgNeUmV85_1T9RU8SATa8uRZSApYpTyFdUM/edit
