# ZEER GO KYU WAR 2026 — Event master (source-backed)
As of 2026-10-28 (Asia/Bangkok). User-provided official A4 illustration, no invented times or registration URLs.

## Approved public information
- Title: **ZEER GO KYU WAR 2026**
- Opening of registration: **Sunday 1 November 2026**
- Registration closing date: **Monday 30 November 2026**
- Event date: **Saturday 5 December 2026** (event start time NOT YET provided).
- Cancellation request **on or before 20 November 2026**: **100% refund** of fee paid.
- Cancellation **from 21 November 2026 onwards**: **non-refundable in all cases**, per organizer instruction.
- Standard registration fee: **Kyu 500 THB per person**, **Dan 600 THB per person**. Future events/individual divisions can override fee through Owner/Admin; recorded original fee snapshot remains fixed.
- Specific rank ranges, venue address, rules, payment recipient, registration form link, age groups and start times: **not provided** — never fabricate.

## Data and code
- One real Supabase `gt_tournaments` record created id `ce1382d9-1e1f-4697-8fe4-6a1a347d91eb`. `published=true` for the PUBLIC ANNOUNCEMENT while `status=draft` means the transactional registration workflow is NOT active. Idempotent event title + event date check used.
- Columns newly installed: `event_date`, `registration_open_date`, `registration_close_date`, `full_refund_through_date`, `refund_policy_text`, `poster_url`. Dates are DATE values so event hour is not invented.
- Public `/api/tournaments`, `/schedule`, `/api/tournaments/[id]`, `/tournaments/[id]` now include actual schedule + refund terms + standard fee; registration/payment buttons are NOT enabled.
- Authoritative original poster uploaded to private Drive: https://drive.google.com/file/d/1xhQH07rIb45usLfZ1moH4O3R61Ni1bpT/view — user may see with account, do NOT treat this as an anonymous image URL.
- Locally adapted poster asset: `ZEER_GO_KYU_WAR_2026_WEB.webp` 900px wide preserving full A4-like portrait (not cropped); optional horizontal preview `ZEER_GO_KYU_WAR_2026_PREVIEW.webp` 1200x630 letterboxed on navy; ZIP available as conversation artifact `ZEER_GO_KYU_WAR_2026_POSTER_WEB_PACKAGE.zip`.
- Public page has image container `max-h-[800px] w-full max-w-[560px] object-contain` for responsive uncropped display as soon as `poster_url` is assigned real Storage URL.
- Owner/Admin `/api/admin/tournament-poster` accepts a properly hosted public WebP only under `gt-site-assets/banners/tournaments/<tournament_id>/*.webp`. Admin event screen has an uploader; binary must be uploaded through the authenticated browser after the latest source build/deploy. At this checkpoint `poster_url IS NULL`; actual image NOT hosted or showing publicly.
- At the time of entry, no competition divisions were added because user gave Kyu/Dan price groups, not definitive exact category brackets. No real registrations created.

## Important acceptance gates
- Confirm latest branch SHA built successfully and actual Vercel deployment is READY before claiming public website updated.
- Confirm the official portrait poster is hosted in Supabase Storage and shown on page (not private Drive).
- Registration open date is the planned schedule; do not activate payments or submission without guardian/athlete consent, rate/duplicate checks, cancellation/request/refund ledger, and transaction verification.
- Test phone 390px, tablet 768px, desktop 1440px, no text clipping and correct Bangkok calendar dates.

## Verified responsive production artwork backup
- Optimized original-intact portrait WebP 900×1271 successfully uploaded to Drive exports: https://drive.google.com/file/d/1h0p2IvC38YVs7CR1iTO3rcNH3CAUbpuv/view .
- Original official A4 JPG preserved separately: https://drive.google.com/file/d/1xhQH07rIb45usLfZ1moH4O3R61Ni1bpT/view .
- Drive artifacts are not a public image serving origin; DO NOT set `poster_url` to these Drive links. Supabase Storage upload remains the required release gate.
