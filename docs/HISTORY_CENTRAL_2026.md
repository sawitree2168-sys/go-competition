# Central competition history · 19 November 2026

The central history is live sporting data, independent of Auth accounts. Public
GO identities come from the existing registry (3,449 people). Canonical players
without verified GO links use event-scoped local IDs; no accounts are created.
An association Dan number links only with independent normalized name evidence.
Explicit institution suffixes are separated using a bounded allowlist. English
transliterations and conflicting identities remain unresolved.

## Imported scope

- 44 dated association source tabs, 2,826 source rows, plus 1go's 336 match rows.
- Previously verified Thammasat and Lamphun archives are included.
- 4,005 canonical records: 3,973 played games, 11 byes, 10 walkovers and 11
  non-played records. Only the 3,973 played games enter W/L/D percentages.
- 502 GO-linked athletes have played-game records in this imported set.
- 47 immutable, hashed source snapshots. Raw snapshots, identity evidence,
  rating observations and review details remain private.
- 40 event records, of which 29 currently have verified match records.

This is **partial verified coverage**, not every match played in 2569. Unresolved
round formats, name mismatches, non-reciprocal results, unconfirmed editions and
rating reversals stay in review. The 17 October rating cancellation is not a
new competition. The 2568 edition and unknown-event tabs are not forced into 2569.
Source update-tab dates are not competition dates. Exact dates are set only from
previously verified event archives or explicit 1go event dates; others show year.

## Facts and APIs

Public RLS-protected read-only tables: `gt_history_people`, `gt_history_events`,
`gt_history_matches`. No public write grants. Private tables store import batches,
source snapshots, identity evidence, reviews and player observations. These do
not change existing ownership checks or owner-only history RPCs.

`gt_history_stats_v1(text[], integer)` returns at most 60 requested GO identities.
`gt_history_profile_v1(text, integer)` returns one public profile, match history
and opponent statistics. Both are SECURITY INVOKER and read only public facts.
Win percentage = W / (W + L + D) × 100; zero played games returns null. Unresolved
opponents group by their local identity key, never just a potentially shared name.

Public route `/athletes/history/[goId]` shows 2569 verified statistics, a head to
head selector and summary / round-result views. The athlete directory reads the
same central match statistics. Existing event standings pages remain available.
The two systems are not summed, preventing standings and games being counted twice.

Thammasat's complete game log replaces the overlapping association rating
walllist in the canonical facts. It preserves explicit WO, double forfeits,
resignations and the previously documented correction. Cross-source league
records add provenance to the same game instead of adding duplicate games.

## Reproduce and validate

Run from the checkout:

```sh
python scripts/import-history-2026.py
python scripts/test_history_2026.py
python scripts/history-import-sql.py
npm run build
```

The generated payload and SQL are ignored working files. Apply the schema once
from `supabase-migrations/gt_history_central_v1.sql` using privileged migration
tooling. Review the payload summary and source evidence, then execute generated
`.history-import-sql/all.sql` as one transaction with a privileged database
connection. Do not expose a write RPC or put privileged credentials in the app.
Replaying an identical batch is idempotent. A changed batch hash raises an error;
source corrections require an explicit reviewed revision and affected-match diff.
Do not delete or reset existing history to reimport it.

Run `supabase-migrations/gt_history_central_checks.sql` for rollback-only reimport,
participant validity, date precision, symmetry, public-read and private-access
checks. Import tests cover determinism, unique occurrences, source overlap,
edition exclusion and strict identity matching. Production build includes types.

Follow-up work: resolve review items with source evidence, add the remaining team
and special-format adapters, confirm dates, and add reviewed English-name aliases.
New source revisions must reconcile into these canonical facts before statistics
are expanded. Coverage labels must remain until the unresolved source blocks pass.
