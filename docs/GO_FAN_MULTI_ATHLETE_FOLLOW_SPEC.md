# GO FAN — Multi-athlete spectator following (2026-10-27)
Status: requirements updated 2026-10-27: **NO LOGIN REQUIRED**. Implementation/deployment pending.

## User goal
Parents, guardians, fans and spectators can follow MULTIPLE athletes on ONE screen, from the same or different academies, without frequently switching screens. Shares verified public competition data with academy tracking; does not inherit academy data permissions.

## Functional requirements
1. Follow/unfollow button in public athlete search, event participant list and athlete card.
2. Open GO FAN instantly without login or account registration. Support selecting many publicly listed athletes across academies and events. Save followed athlete UUIDs in the device's browser storage (localStorage) so they remain after page reload.
3. GO FAN dashboard grouped by event; show athlete name/photo only if public-approved, division, round, table when published, status (upcoming/playing/waiting confirmation/final), latest approved result and last update.
4. Multi-athlete summaries with quick filters (event, division, playing, finished). No need to navigate to each athlete profile to know the status.
5. After event completes, show officially released W/L, standing, prize/certificate if published; preserve per-event history.
6. Mobile-first navy/gold consistent with user-approved visual mockups; large controls, clear status text+color and meaningful empty/error/loading states.
7. Refresh/poll efficient read-only public snapshot; never imply automatic push notifications unless later implemented and opted in.

## Privacy and authorization
- A fan is not automatically an authorized guardian or academy staff; following grants no private data access.
- Public only: published tournaments, released verified match results, consented athlete identity/profile. Hide private athlete data and unverified referee results.
- No follower identity or account is required. Save only athlete UUIDs and minimal UI settings in localStorage, never sensitive person details or payment information. A shared device may show previous follows; include an obvious Clear list button.
- Do not expose contact info, personal ID, birth dates, payment slips, or internal student/academy records.
- Use stable athlete UUIDs; client-side deduplication, safe unfollow, bounded selection, server-side rate limiting and query size cap.
- Guest device mode is mandatory/default. Followed selections persist only in the same browser/device; clearing browser data or using private browsing may erase them. No cross-device sync is promised.

## Proposed implementation (verify schema before migration)
- NO follower database table and NO Supabase Auth gate for default GO FAN. Store selected public athlete UUIDs locally under versioned key gofan:followed:v1; migrate/validate any future client changes carefully.
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
- [ ] Implement guest browser localStorage follow/unfollow (dedupe, cap, clear, corrupt-storage fallback), no login.
- [ ] Add public-approved athlete/event status API and query limits.
- [ ] Build follow/search/dashboard UI referencing approved project visual direction.
- [ ] Test simultaneous follow statuses and cross-academy results.
- [ ] Build + deploy + E2E only when Vercel allows; record deployment SHA.
## User-confirmed acceptance (2026-10-27)
**The GO FAN spectator feature must be immediately usable without login.** The follow action is a device-local bookmark, not a claimed family/guardian relationship. Search cards and score APIs must present only intentionally public/consented identities and official released results. The viewer can tap Follow, collect multiple athletes in one list, and refresh status without authentication. A login CTA must never block this primary flow. Do not accidentally apply this rule to Admin, Referee, academy management, payment, or other privileged areas.
