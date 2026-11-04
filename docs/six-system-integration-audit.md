# GO TOURNAMENT — Six-system integration audit (2026-11-03)

## Verified sources
1. 1go Master: `1jDFQJkG-FD2265ZnTjXjXesTe_cu6P6p2hnep_MpmnI` — GO ID, person, historical matches, rank history, registration master.
2. 2go Event Runtime: `1Zpiforp1UHaAd5NWr9s69PxLmL9FkPvYAQdFnVDcNO0` — Players, Checkin, Pairings, Results, Standings, Round Control, RefereeAssignments.
3. 3go Public Cache: `1yyPjZT741Brv5VIHnqJ5Ew-Fxs8bA2rtSpd-Zt2saKM` — public events, pairings, results, standings, search; TTL 30 seconds.
4. 4go Archive: `1-4pULkohBAzkiFN01N3D4eOqG9q_HifBIl7s8P2Z0bE` — closed-event archive and backup; do not duplicate legacy result rows.
5. 5go Access: `1-WaYNbLzRH70VA_69wjuIrxGjjEqJb1Vdadm_kN1zg8` — backend permission matrix, audit, rollout; stage-1 code review still pending.
6. 6go Finance: `1dhN3LYnFCrp09pX5UY-yuArevWFY6RxD2hy2Y7VR5Nk` — organizer billing; billing_enabled FALSE.

## Live inspection
- Supabase project `bqyokjwuxyzyiripijbs`: gt_athletes 1, gt_tournaments 1, gt_divisions 8, gt_registrations 0, gt_matches 0, gt_checkins 0 at inspection time.
- Next.js 16 repository: `sawitree2168-sys/go-competition`.
- Vercel preview deployments READY; production readiness and branch parity not yet verified.
- Main branch app/page.tsx contains hard-coded example event content; do not mistake this for live synced data.

## Source-of-truth contract (proposed; not yet implemented)
- Athlete identity: immutable GO ID mapped uniquely to Supabase athlete UUID; unresolved duplicate names go to review, NEVER auto-merge.
- Event-local `Players.playerId` and timestamp-name `athleteId` are NOT global athlete IDs. Introduce an explicit mapping `(event_id, legacy_player_id) -> go_id`.
- Event results: verified result in operational database is authoritative; published snapshots are read-only projections.
- Only finalized, idempotent match records enter permanent history; BYE/VOID do not count as played head-to-head games.
- Preserve rank-at-event and opponent IDs; never overwrite historic rank with current rank.
- Organizer fee ledger is separate from participant registration payments.
- Every write: authenticated backend role + scoped authorization + audit event + idempotency key.

## Rollout gates
1. Identify deployed production branch and review feature branch differences.
2. Audit actual API/auth/RLS routes and data model before any migration.
3. Export/backup legacy sheets; prepare dry-run counts and unresolved GO ID collision report.
4. Import small test batch into isolated test data; reconcile counts and profiles.
5. Test pairing, check-in, referee permissions, retry/idempotency, public cache, finalize, H2H.
6. Performance-test 1,000 athletes; approve production cutover only after all gates pass.

**Safety:** This file documents findings only. No live data was migrated, no Google Sheet was modified, and no production deployment was performed.
