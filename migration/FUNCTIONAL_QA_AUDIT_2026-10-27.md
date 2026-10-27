# GO TOURNAMENT — Functional QA and safety checkpoint — 27 Oct 2026

## Ground rules
User priority: **functional complete site, audited competition results, no duplicate enrollments, no forced winner, no fictitious event data, no production release before passing build/E2E**. GO FAN has no login for spectators; published-only opt-in athlete visibility. Existing 105+ approved designs remain the visual reference; new banner work is deprioritized.

## Changes made in this session — source and DB
1. **Supabase result model:** added `gt_matches.result_code` enum-like CHECK ('black_win','white_win','double_forfeit') alongside preexisting `winner_athlete_id`, retaining legacy validated single-winner matches where result_code is NULL. Replaced original `gt_matches_check2` which prohibited verified winnerless outcomes. CURRENT effective constraint: `gt_matches_verified_outcome_v3`. Only a properly tagged double forfeit may be verified with a NULL winner.
2. **QA found an actual three-valued SQL CHECK bug:** preliminary v1 and v2 constraints passed an ambiguous winnerless match due to NULL => UNKNOWN, which Postgres CHECK permits. v3 explicitly uses COALESCE(..., false) for double-forfeit classification and correctly rejects untagged NULL winner.
3. **Verified transaction rollback test:** two allowed verified fixtures (black wins + double forfeit/no winner) and two forbidden fixtures (double_forfeit with a winner + untagged null winner) yielded exactly **2 accepted**. Database rollback confirmed zero tournaments, zero registrations, zero matches and zero test athletes.
4. **GO FAN privacy security:** public anon column-limited SELECT grants and RLS for athletes with `profile_public=true`. Public matches need verified state, verified_at, published tournament and *both* players opted into public visibility. Transaction RLS tests confirmed hidden athlete and pending/private-opponent matches invisible.
5. **Public `/api/fan`:** server REST fetch using publishable key only; validates search/ids; returns up to 20 public athlete records and up to 500 verified publicly visible matches. Limited by RLS (no bypass key). Search supports names or GO IDs.
6. **`/fan` Next.js:** no login, add/remove/clear up to 20 follows with browser localStorage; search consenting public athletes; refresh results; live result summary and double-forfeit explicit display; removing a followed athlete remains possible even when profile later becomes private. No athlete is auto opted in.
7. **Website navigation:** `/site-map` and homepage link to functional `/fan`.
8. **Vercel build blocker identified from build logs** in preview `dpl_GajvaqugTXE1aahgaX5CB7uuwE6p` for commit `b926751b01b6ec3e8c715446a49db2f45f66ea97`: `app/tournaments/[id]/page.tsx:19:105` had malformed useEffect cleanup syntax. Corrected in GitHub commit `5ca26a2956321a434af1d3e29e966ced14f95e95`. The latest fixed commit has **NOT YET produced a verified READY deployment**; no source-wide tsc/build/lint or browser tests have passed.

## Test evidence & exact statuses

| Scope | DB migration | Transaction QA | UI/API source | Latest Next build | Live E2E |
|---|---|---|---|---|---|
| Staff pending registration | Installed earlier | Passed rollback duplicate/permissions | Existing code | Pending | Pending |
| Double-forfeit match integrity | Installed v3 | **Passed strict accept/reject after 2 corrective refinements** | Referee edit workflow still missing | Pending | Pending |
| GO FAN opt-in privacy | Installed | Passed anon RLS negative tests | API + responsive multi-follow UI committed | Pending | Pending |
| Public event detail | Earlier source | Public RLS confirmed | Syntax bug repaired | **Not reverified** | Pending |
| Payment verification | Legacy table/buckets | Not E2E | Incomplete | Pending | Pending |
| Swiss/McMahon pairing, SOS/SOSOS | Not complete | No regression suite | Not end-to-end implemented | Pending | Pending |
| Official logo/banner system | Original stored in Drive | No browser QA | Media editor code only | Pending | Pending |

## Residual blockers — DO NOT CLAIM FINISHED
- Next.js entire branch needs successful production build and TS check at specific SHA; Vercel automatic previews may hit Hobby quota. No forced paid upgrade.
- GO FAN only returns results when athlete public flag is explicitly true and a verified match is public; there is no opt-in/guardian approval user flow yet. No private athlete information should be exposed.
- Current results query caps at 500 matches across selected athletes; larger history needs pagination and truthful partial-count indication before scale.
- Double forfeit point and SOS/SOSOS policies remain configurable-rule work. New `result_code` storage alone does **NOT** implement scoring, referee editing, audit logs, round locking or Swiss/McMahon.
- Pending staff registration does not enforce confirmed capacity/fee snapshots or collect payment; full application workflow is incomplete.
- No current tournament/match records in GT data, so real player browser E2E cannot be performed without authorized real event dataset.
- All original approved reference designs and outstanding UI routes from `docs/GO_TOURNAMENT_UI_MASTER_INVENTORY.md` still require mapping and integration; do not treat design board pages as functional routes.

## Immediate next action before any release
Build current SHA in a safe staging environment, inspect Vercel logs, fix compile/type errors and all 404 routes, then run role/preview/mobile browser tests. After build passes, create actual referee and event-day result submission with rules-based double-forfeit handling; only then implement official audited standings. Ensure backups and user approval of scoring rules before any live competition test.
