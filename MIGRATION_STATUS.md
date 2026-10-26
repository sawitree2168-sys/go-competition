# GO TOURNAMENT — Safe migration

Source of truth for migration: uploaded `go-tournament.zip` (Vite + React + TypeScript). This branch is isolated from main/production.

## Verified 2026-10-26
- Original GitHub main is an older Next.js project; do not overwrite or publish it without review.
- Uploaded Vite bundle exists; registration backend handlers and mock-data fallbacks need repair.
- Supabase `go-competition` is INACTIVE and cannot yet serve production data.
- Existing Vercel projects have ERROR deployments.
- No live athlete/payment/competition data was changed.

## Release gates
1. Restore/test database in a safe environment; enforce athlete identity and organization-based RLS.
2. Replace mock fallbacks with explicit empty/error states.
3. Validate individual and institutional bulk enrollment, payment confirmation, and persistent Athlete ID.
4. Test at mobile, tablet, desktop widths and deploy preview before production.

All 2026 design assets are visual references, not real athlete results. Registration should search for an existing athlete name before creating an account.
