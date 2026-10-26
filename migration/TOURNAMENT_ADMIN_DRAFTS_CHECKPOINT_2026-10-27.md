# GO TOURNAMENT — Admin Tournament Drafts & Divisions Checkpoint
Date: 2026-10-27. This is a handoff checkpoint; no real competition/athlete inserted.

Completed database:
- Migration gt_staff_scoped_tournaments_divisions_v1 SUCCESS.
- gt_tournaments: active owner/admin/reviewer can SELECT drafts and published; only active owner/admin can INSERT unpublished draft; active owner/admin UPDATE permitted (publication controls must be restricted via audited server actions before releasing UI).
- gt_divisions: staff SELECT; owner/admin INSERT division into unpublished tournament; staff UPDATE only owner/admin.
- Existing public SELECT of published events remains.
- Existing payment/media/certificate tables remain RLS enabled and no client privileges. Do not expose slips.
- SQL transaction simulated an authenticated active owner using INSERT tournament + division + SELECT by FK, then ROLLBACK. Confirmed verification_rows_remaining=0.

New GitHub files:
- app/api/admin/tournament-auth.ts checks Supabase auth user / staff role via Bearer token.
- app/api/admin/tournaments/route.ts GET all staff-visible drafts/published and POST an unpublished draft title + Bangkok date.
- app/api/admin/tournament-divisions/route.ts GET divisions by tournament UUID and POST draft division with capacity.
- app/admin/tournaments/page.tsx frontend via OTP Supabase session, year filter, create tournament draft, select event, add divisions, clear status.
- Homepage links to admin/tournaments.

Not yet fully verified:
- Latest GitHub commit needs Vercel redeploy and **production URL should be checked for updated UI**, last checked served previous build.
- Full authenticated browser E2E create draft and division was not executed; SQL rollback test was executed.
- Reviewer negative test, invalid date tests, payment allocation transactional integrity and live google sheets import are still outstanding.
- There is no publish button; intentional to prevent unreviewed events being made public.
- The year selector is based on Bangkok start date.
- Existing legacy registrations row MUST NOT be imported blindly.

Next:
1. Confirm latest Vercel READY SHA equals current branch commit; verify /admin/tournaments UI and both unauth API 401.
2. Sign in as approved Owner, create an actual real tournament only with approved details. No fake live event.
3. Add role-safe admin record editing, organizer ownership & event financial reports, live Sheets migration after dedupe.
4. Build payment private storage and album editing following docs/MEDIA_STORAGE_POLICY.md.
