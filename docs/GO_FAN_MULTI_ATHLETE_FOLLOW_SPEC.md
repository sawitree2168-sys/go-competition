# GO FAN — Multi-athlete spectator following (2026-10-27)
Status: requirements written; no implementation or deployment yet.

## User goal
Parents, guardians, fans and spectators can follow MULTIPLE athletes on ONE screen, from the same or different academies, without frequently switching screens. Shares verified public competition data with academy tracking; does not inherit academy data permissions.

## Functional requirements
1. Follow/unfollow button in public athlete search, event participant list and athlete card.
2. Saved following list for signed-in fan; one follower may follow many athletes across events and academies.
3. GO FAN dashboard grouped by event; show athlete name/photo only if public-approved, division, round, table when published, status (upcoming/playing/waiting confirmation/final), latest approved result and last update.
4. Multi-athlete summaries with quick filters (event, division, playing, finished). No need to navigate to each athlete profile to know the status.
5. After event completes, show officially released W/L, standing, prize/certificate if published; preserve per-event history.
6. Mobile-first navy/gold consistent with user-approved visual mockups; large controls, clear status text+color and meaningful empty/error/loading states.
7. Refresh/poll efficient read-only public snapshot; never imply automatic push notifications unless later implemented and opted in.

## Privacy and authorization
- A fan is not automatically an authorized guardian or academy staff; following grants no private data access.
- Public only: published tournaments, released verified match results, consented athlete identity/profile. Hide private athlete data and unverified referee results.
- Private follow list scoped by authenticated user ID; RLS self-only. No follower count or list publicly exposed without explicit future policy.
- Do not expose contact info, personal ID, birth dates, payment slips, or internal student/academy records.
- Use stable athlete UUIDs; unique follower + athlete index, safe unfollow, pagination, rate limits and follow cap.
- For anonymous fans, design a guest-device option only if privacy and retention are reviewed; sync across devices needs login.

## Proposed implementation (verify schema before migration)
- Private table gt_athlete_follows(follower_user_id UUID, athlete_id UUID, created_at); unique(follower_user_id, athlete_id); self-only RLS.
- Approved public athlete discovery/search; approved event-level status endpoint derived from verified/public matches and events, not private staff endpoints.
- Pages: /fan overview and saved athletes; follow toggles on public athlete/event screens.
- Academy dashboards retain separate role permissions; overlap in display but not privileged API.

## Acceptance scenarios
- Parent follows two children; fan follows four players from three academies: show all on one screen.
- One playing, one waiting, one finished, one result pending verification: all statuses distinct and no unpublished winner revealed.
- After official final results, standings update and followed list persists after reload.
- Unfollow works; unapproved minor/private athlete does not leak via search/follow/API.
- Phone and desktop are legible; tests for stale updates, retries, duplicate follows and RLS.

## Checklist
- [ ] Verify athlete privacy and public release schema.
- [ ] Add RLS-protected follow table and tests.
- [ ] Add public-approved athlete/event status API and query limits.
- [ ] Build follow/search/dashboard UI referencing approved project visual direction.
- [ ] Test simultaneous follow statuses and cross-academy results.
- [ ] Build + deploy + E2E only when Vercel allows; record deployment SHA.