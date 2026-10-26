# GO TOURNAMENT implementation checkpoint — 2026-10-26

## Verified live state
- Supabase project `bqyokjwuxyzyiripijbs` returned `ACTIVE_HEALTHY`.
- Migration `go_tournament_isolated_core_rls` returned success.
- Created in `public`: `gt_athletes`, `gt_tournaments`, `gt_divisions`, `gt_registrations`, `gt_matches`, all with RLS enabled.
- Existing `public.registrations` and `public.test` were left unchanged; a direct SQL query returned one legacy registration (the approximate list_tables row count earlier showed zero).
- New athlete / tournament / match tables have zero records. No fabricated records were inserted.
- New published tournament and division SELECT policies exist; athlete owner-only SELECT exists. No public write policies; matches/registrations currently deny client access.
- Vercel preview scoped only to GitHub branch `codex/go-tournament-vite-migration`: `GO_TOURNAMENT_SUPABASE_URL` and encrypted `GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY` configured; no service_role used.
- Added read-only `/api/tournaments` which queries only `published=true`, and live states in `/schedule` (loading, empty, error).
- Added mobile H2H view `/athletes/head-to-head` but its API deliberately returns 503 pending secured verified-match reading.
- Vercel preview build at commit `c40c8b043fceaa371a484b9d772cadbd5c97eda1` returned READY.
- HTTP testing via public browsing was blocked / unavailable, so functioning response body was NOT independently verified.

## Next gating work
1. Authenticated athlete claim and server ownership checks. No search of private athlete data through anon APIs.
2. Restrict/refine database policies for organizer staff, verify payment approvals server-side, add school membership model.
3. Smoke test Preview route in authenticated Vercel context; verify RLS with distinct roles and published/hidden fixtures in staging.
4. Migrate complete Vite UI source from prior staging ZIP in a coordinated review without overwriting Next.js branch accidentally.
5. No production promotion before end-to-end registration and match tests.
