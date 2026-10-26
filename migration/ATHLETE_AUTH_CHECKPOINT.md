# GO TOURNAMENT — Athlete account lookup checkpoint (2026-10-26)

## Implemented on Preview branch
- POST /api/athletes/search requires a Supabase Auth bearer session. Server verifies token via /auth/v1/user.
- All reads of gt_athletes use the end-user JWT plus publishable key, so gt_athletes RLS limits rows to claimed_by = auth.uid().
- Search is scoped to linked profiles **only**. A not_linked response does not establish that the athlete does not exist elsewhere; never use it to auto-create a duplicate.
- No service_role key; no GO MASTER sheet or mock athlete results.
- Browser page supports existing-account email magic-link flow via supabase-js with shouldCreateUser:false. New-account registration and athlete ownership claim are intentionally not enabled.
- Supabase public-config endpoint returns only URL + publishable key (browser-safe). Secrets must never be returned.
- GO TOURNAMENT Thai-language site metadata updated.

## Important limitations and release gates
- Verify Supabase Auth Site URL and allowed Redirect URLs for the Preview hostname before claiming end-to-end email login works.
- Verify authenticated account has a legitimately claimed athlete; existing gt_athletes was empty at prior inspection.
- Sign-in emails can consume Supabase Auth email rate limits; protect with authentication rate limits/CAPTCHA before public opening.
- Add staff-reviewed athlete claim for previously unclaimed records; identify parent/guardian authorization requirements for minors.
- Never equate no linked athlete with absence from master database. No public name enumeration or unauthorized profile disclosure.
- This branch remains a Next.js Preview; complete Vite source migration is not finished.
