# GO TOURNAMENT — Responsive Banner System (HOME first)
**Updated:** 2026-10-27 Asia/Bangkok
**Status:** THREE responsive homepage background assets staged in GitHub + page integration written. **NOT deployed, NOT browser QA or production build verified.**

## Approved style direction
Following user's GO FAN preference: bright contemporary competitive Go (หมากล้อม), navy/royal blue/white/gold with white/black stones, trophy, airy modern backdrop. Avoid dark old-fashioned imagery. Asset images are decorative; title, description and actual link buttons remain accessible React/HTML.

## HOME assets committed and read back from repo
| Target | GitHub path | Source design size | Format |
|---|---|---:|---|
| desktop | `public/banners/home/home_desktop.svg` | 1920×600 | scalable SVG |
| tablet | `public/banners/home/home_tablet.svg` | 1280×800 | scalable SVG |
| mobile | `public/banners/home/home_mobile.svg` | 800×1000 | scalable SVG |

The image generation contact sheet delivered in conversation is a DESIGN MOCKUP, not the same binary as the production-ready vector background assets. Production vector SVG files have stylized Go board, stones, trophy, gradients and confetti but no baked-in Thai copy, buttons, or links.

## Integrated route
- `app/page.tsx` renders HOME hero first, then UI overview images (preserved).
- `<picture>`: mobile max-width 639px, tablet max-width 1023px, desktop fallback. Uses banner backgrounds via public static paths.
- Foreground Thai main heading, subtitle, status, primary CTA /schedule, secondary CTA /athletes/search are real HTML so responsive and clickable.
- Existing site modules and Admin links preserved.
- Do not add a GO FAN public CTA pointing to an unimplemented route until GO FAN is actually built.

## Future banner workflow
- Repeat 3 assets for distinct PUBLIC sections: competition, result, news, rankings, athlete, FAN, FAQ. Admin dashboards use simpler UI headers to prioritize legibility rather than large hero artwork.
- Keep source variants in `public/banners/<module>/` as `<module>_desktop.svg`, `<module>_tablet.svg`, `<module>_mobile.svg`.
- For any generated photographic raster version, prepare optimized WEBP exports plus originals, preserve consent and license; prefer SVG where decoration is illustrated and reflows cleanly.
- Asset entry must include design approval, checksum, route and staged/deployed/verified statuses.
- Image text is decorative only; never turn fake mockup buttons into unclickable bitmap-only controls.

## Acceptance to clear before deploy
- [x] Source assets committed to GitHub and retrieved; paths exist.
- [x] Next.js homepage code committed; links preserved.
- [ ] Production build `npm run build` / TypeScript + visual preview on 360/390, 768, 1024, 1440px widths.
- [ ] User reviews rendered screenshot and approves exact appearance as distinct from the generated collage.
- [ ] Vercel single consolidated deployment after quota permits.
- [ ] Website page loads 3 correct responsive sources; no layout shift/broken images; actions work.


## New generated banner reference library — 2026-10-27
The user liked the prior individual banners and requested saving all designs and continuing remaining pages. Verified via Drive upload + Google Sheet read/write process:
- Previously liked 8 individual banner references stored in private creative Drive: news, rankings, calendar, contact, gallery, documents, FAQ, GO FAN.
- This session's 4 additional composite boards stored as files: 6-section draft, 12-section draft, 12-section alternate, 8-section alternate.
- Editorial registration: `GO TOURNAMENT — MEDIA ASSET REGISTER`, ASSET_REGISTER rows 7–18, status fields.
- Drive folder: https://drive.google.com/drive/folders/1O0BwCxcMvxVsUtFEdYtxDwGE24p_5csq
- Sheet: https://docs.google.com/spreadsheets/d/1wSoV5JoQJgNeUmV85_1T9RU8SATa8uRZSApYpTyFdUM/edit

**IMPORTANT quality and deployment gates:** Composite boards are visual design studies only, not individually exported 1920×600, 1280×800, 800×1000 production-ready binaries. AI-drawn copies of the logo in image mockups are NOT the authoritative brand mark. Final web banners must omit/cover those copies and overlay the exact official uploaded logo, with HTML text set in licensed Prompt or Sarabun (separate from art). Generated sample athletes, medals, event dates and stats are not real. No images were auto-published to Supabase/Vercel from these reference uploads.

Remaining distinct banners before project-wide coverage: event detail, payment, participant check-in, referee, pairing, standings admin, certificate, institution batch registration, institution live tracking, and role-specific admin (unless already available in accepted references). For these functional screens, a banner should be light or omit it to preserve event-day legibility.


## 2026-10-27 – closure of three pending public banner backgrounds
- New V2 source designs for gallery, calendar and contact were reviewed from previously liked rendered references. Fresh standalone backgrounds created locally with **no embedded logo or live text**; text and official header logo should be DOM elements, not baked into bitmaps.
- Nine real WebP files prepared: `gallery_{desktop,tablet,mobile}.webp`, `calendar_{desktop,tablet,mobile}.webp`, `contact_{desktop,tablet,mobile}.webp`. Target sizes respectively 1920×600, 1280×800, 800×1000. A zip `GO_TOURNAMENT_PUBLIC_BANNERS_V2_9_FILES.zip` was created as a conversation artifact and verified locally, **not yet deployed or copied into GitHub or Drive**.
- Two source contact boards uploaded to creative Drive: IDs `1lXdCZwLdOoO-b8wzA1dgM789L5n7IksS` and `1aTUAfBF8HUlmjwbeZjcTtl3kdEQ_y50y`. Both are reference-only, not production-ready exports.
- Registered 11 new records in the editorial Google Sheet (rows 21–31), nine WebP entries honestly marked `created local / waiting for upload` with empty website URLs. Do not publish before exact file upload, approval and visual review.
- Production usage: import WebPs to approved public media storage, set slot `gallery`/`calendar`/`contact` for each device in `gt_site_media`, check approved and published status via Owner/Admin Media Manager after integration deploy. The existing homepage component can be reused on those public routes once corresponding pages are created.
- Before publish verify Thai titles, accessibility, crop, and that any AI sample people are imagery only, not real competitors.


## 2026-10-27 — registration/payment and staff-operation banners V2
- Visual reference board for functional pages uploaded to Drive: https://drive.google.com/file/d/12X2ieAO013OPCWkwWfnJ0IblFvdU-Ebv/view . This is a **reference**, not deployable hero artwork.
- Authored **18 individual WebP background assets**, with **no baked-in logo or text**, organized by: payment, registration_status, checkin, pairing, referee and admin, each in desktop/tablet/mobile.
- Public payment/status backgrounds: desktop 1920×600, tablet 1280×800, mobile 800×1000.
- Staff-facing checkin/pairing/referee/admin banners: compact desktop 1600×320, tablet 1200×320, mobile 800×380 to maximize screen space for tables/actions.
- Generated conversation artifact: `GO_TOURNAMENT_FUNCTION_BANNERS_V2_18_FILES.zip` with 18 WebPs + 6-item preview + SHA256 manifest CSV. **Local conversation artifact only**; not yet uploaded to public Storage or committed to site assets. Do not claim any of these are live.
- Wrote 19 editorial registration records into `ASSET_REGISTER` starting row 32, with honest asset-hosting status pending. The Drive link above is only the composite board; the 18 actual WebP exports need uploading.
- Font policy: use licensed Thai Prompt or Sarabun in HTML headings and controls. The exact official owner-provided GO TOURNAMENT logo remains a separate Header image. Never add a second logo in the hero, or embed fake UI values in artwork.
- These are DESIGN assets; no payments, athlete statuses, pairings, or referee match results are invented or changed by this work.
- Release gates: owner reviews render, upload final WebPs to `gt-site-assets`, register and publish via Owner/Admin media editor, responsive QA, first Vercel deployment and E2E status review.
