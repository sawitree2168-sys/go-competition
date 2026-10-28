# GO TOURNAMENT approved pages 1–7 — implementation checkpoint
Date: 2026-10-29 Asia/Bangkok
Source: existing sawitree2168-sys/go-competition, based on codex/approved-homepage at 9e2eab7. Isolated feature branch codex/approved-registration-pages. Not the separate ChatGPT Sites demonstration.

## Routes
1. `/` and `/schedule`: approved homepage/list, real published events.
2. `/tournaments/[id]`: compact event hero, theme memory, share/copy, expandable schedule/rules, sorted individual division links.
3. `/tournaments/[id]/divisions/[divisionId]`: real division/fee/board size and public confirmed opt-in roster. Tabs explicitly show unpublished states; pairing publication and standings remain outside this first-seven implementation and are NOT a working live feed.
4. `/tournaments/[id]/register`: account gate, owned athlete selection, division and fee, review, event-specific bank/QR, private proof upload, atomic server submission. Eligibility, Bangkok dates, capacity, ownership and amount checked in DB. Event registration stays DISABLED until owner E2E and event readiness.
5. `/registrations/[registrationId]`: owner-filtered data, separate application/payment/check-in status, immutable fee snapshot and private proof with 120-second signed read link.
6. `/profile`: owned athlete selection and personal profile updates; center-square photo crop, re-encode to 512px, private upload. Verified GO ID/rank/ownership cannot be changed by athlete. Manual crop positioning, new athlete account creation and verified rank/academy change requests remain pending; existing GO ID claim route retained.
7. `/my-competitions`: owned athlete selector, event phases, private application status. Event-day links currently open division view; personal round history is planned page 8, not claimed complete.

## Database changes applied
- Additive migration `approved_registration_pages_v2`: private guarded submission function and security-invoker public RPC, event-specific payment settings, private application receipts, self-only registration reads, private per-account photo/slip access, profile identity protection trigger.
- No approval/payment verification or live result records were fabricated.
- Added exactly eight user-approved ZEER divisions only when event had no divisions, using existing event fee defaults (Dan 600, Kyu/Friendship 500); capacities remain null (not invented).
- Configured bank details explicitly supplied by owner for ZEER: payment settings remain `registration_enabled=false`, QR absent.
- QR in uploaded transfer poster could NOT be decoded by zxing-cpp. It is NOT installed as a functioning payment QR. Need original bank-generated QR before activating that option.
- Public roster exposes only published-event + confirmed + athlete opt-in rows. It is not total enrollment count.
- Uploaded photos remain private. Publishing youth portraits across public pages is NOT enabled by merely setting profile_public.

## Evidence
- Next.js production webpack build and TypeScript passed before final visual QA.
- Existing Node tests 12/12 passed.
- Transaction-rollback tests passed for atomic enrollment, fee snapshot, duplicate submission, wrong amount, capacity, protected rank, self-only reads, cross-account denial, private proof and roster filtering. All fixture users/events/data rolled back.
- Security advisor: no new RLS exposure warning. Existing INFO tables with no policy stay default-denied; existing leaked-password protection setting is not changed.
- Local browser preview infrastructure unavailable (preview daemon cannot resolve linked Next dependency). Do not claim mobile/desktop browser QA from local server.
- Built-server HTTP checks attempted; outbound data calls intermittently time out in local sandbox. Direct Python public REST and roster RPC returned 200. Treat full HTTP smoke as NOT passed until deployed verification.

## Release gate / remaining
- Preview deployment and browser checks at phone/tablet/desktop.
- Owner/guardian authenticated browser test of own profile, photo, receipt and existing registrations; no credentials collected or privileged bypass used.
- Test registration submission in an isolated staging event with rollback/cleanup; do not open actual event or charge money for QA.
- Original bank QR; event contact/venue/rules/schedule from organizer.
- Organizer payment settings UI, approval/rejection/resubmission actions, new athlete creation, manual photo adjustment, and personal page-8 match stream still required. No "all seven fully operational" or production-ready claim until these gates pass.
