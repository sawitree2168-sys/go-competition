# GO TOURNAMENT — Pairing integrity checkpoint (2026-10-28)

## Scope priority change
User requested stop revisiting payment and move to competition-day operations; no payment code touched in this checkpoint. Existing check-in API at `app/api/admin/tournament-checkins/route.ts` and check-in UI actions in `app/admin/tournaments/[id]/registrations/page.tsx` were confirmed already present; do not duplicate them.

## Implemented in Supabase
1. `gt_matches_no_repeat_active_opponents_v1`: unordered unique partial index on (tournament_id,division_id,LEAST(black_athlete_id,white_athlete_id),GREATEST(...)) WHERE state <> 'void'. Rejects same opponents across rounds even on color reversal; void matches can be replaced.
2. `gt_matches_one_board_per_athlete_round_v1`: BEFORE insert/update trigger with tournament/division/round transaction advisory lock; rejects assigning either black or white athlete to a second active match in same round. Ensures two matches sharing one athlete cannot be persisted by an API or manual command even if concurrent.
3. Both changes tested in BEGIN/ROLLBACK fixture transactions: reverse-color repeat rejected; unrelated pair accepted (2 valid distinct opponents). Same-round duplicate player rejected; disjoint match accepted (2 valid boards). No test records committed.

## Important release limits
These database guardrails DO NOT complete the Swiss/McMahon pairing algorithm, BYE handling, double-forfeit adjudication UI, result confirmation flow, audit trails, or SOS/SOSOS rankings. Pending payment integration deliberately remains deferred. Current match table has nonnullable black/white athlete IDs so BYE requires separate design before practical pairing UI.
After completing pairing engine, test Thammasat double-no-show and Lamphun rematch cases as named regression scenarios, without altering actual historic events.
Compilation of current GitHub branch and authenticated browser E2E still **NOT verified**. Do not call production deployment ready or guarantee visual parity with approved 1–105 references.
