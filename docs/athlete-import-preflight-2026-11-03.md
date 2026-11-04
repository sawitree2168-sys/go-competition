# Athlete import preflight — 2026-11-03

Source: 1go Master / Platform Database, tab `บัญชีนักกีฬา` (read-only).

## Actual bounded reads
- `A2:P750`
- `A751:P1361`
- `A2801:P3013`

These reads do **not** establish a full export of every tab, all Kyu players, or all legacy match history. Empty middle rows and one record near the bottom were observed.

## Aggregate findings (no personal data stored)
- Nonempty rows in inspected ranges: **1,201**
- Rows with nonempty GO ID and full name: **1,162**
- Unique GO IDs among those rows: **1,162**
- Duplicate GO ID groups in that subset: **0**
- Duplicate full-name groups in that subset: **0**
- Invalid GO ID pattern in that subset: **0**
- Rank type for those complete rows: **DAN: 1,162**
- Remaining nonempty rows missing one or more required fields: **39** (not ready for import)

## Verification boundaries
- Supabase `gt_athletes` had 1 row at last read; do not overwrite or assume the 1,162 rows are new.
- The sample cannot establish identity equivalence using name alone.
- No import to Supabase has occurred; no source Sheet was edited.
- Next: audit Kyu tab and existing Supabase GO IDs, create a complete dry-run reconciliation manifest, quarantine incomplete/ambiguous records, then review and run an idempotent staged import.

Code: `scripts/preflight-athletes.mjs`.
