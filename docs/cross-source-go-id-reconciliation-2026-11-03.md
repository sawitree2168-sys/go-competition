# Cross-source GO ID reconciliation — 2026-11-03

Read-only comparison of:
- `1go Master / บัญชีนักกีฬา`: 1,162 complete Dan records in inspected ranges.
- `1go Master / ระดับคิว (Q)`: 2,178 complete Kyu records, rows 2–2300.

## Results
- Source rows with GO ID and name: **3,340**.
- Unique GO IDs across both sources: **3,339**.
- Cross-source duplicate GO ID: **1**.
- Duplicate ID with conflicting full names: **1**.
- Exact normalized full-name overlaps with *different* GO IDs across the two sources: **0**.
- Kyu duplicate-name groups within Kyu source: **3** (already pending identity review).

## P0 collision — block import for this GO ID
`GO106260826` appears with **different people**:
- Dan roster: `ภัควลัญชญ์ ทองวณิชนิยม` (source athlete `KYU69-K0558`, person `P-KYU-K0558`), with source note saying retained Kyu GO ID while Dan rank was unresolved.
- Kyu roster: `ชนัดดา ภูวนธรรม` (`K0008`, rank 1 Kyu).

**Do not overwrite, merge, rename, or assign a replacement GO ID automatically.** Preserve both source records and their provenance. Manual verification of authoritative identity/ID assignment is required.

## Staged import decision
- Exclude both records carrying the colliding GO ID pending resolution.
- Quarantine the 3 Kyu duplicate-name groups (6 records), without asserting they are the same person.
- Before any write, reconcile all remaining GO IDs against the live `gt_athletes` table, preserve existing UUIDs and claims, and check cross-source rank semantics.
- Never sum Dan+Kyu counts as unique athletes without deduplication.

No source sheet modifications, no production DB writes, no actual import executed.
