# Kyu identity preflight — 2026-11-03

Source: 1go Master / Platform Database, `ระดับคิว (Q)`, read-only.
Inspected ranges: `A2:I575`, `A576:I1150`, `A1151:I1725`, `A1726:I2300`.

## Measured
- Rows returned: **2,178**
- Complete GO ID + name rows: **2,178**
- Unique GO IDs: **2,178**
- Duplicate GO ID groups: **0**
- Duplicate normalized-name groups: **3**, covering **6** records
- Missing identity rows: **0**
- Invalid GO ID pattern: **0**

Existing `ตัวตนรอยืนยัน_v1` tab explicitly lists three pending duplicate-name cases; never merge these GO IDs automatically.

Supabase currently contains one athlete GO ID, and must be reconciled before importing anything. The same GO ID can appear across Dan/Kyu source tabs; count unique IDs across sources, not sum row counts.

## Next integration gate
1. Export the full Dan/Kyu source data with provenance and stable source row IDs.
2. Compute cross-source GO ID intersections and conflicting names/ranks; quarantine collisions.
3. Compare all candidate GO IDs with existing `gt_athletes`; preserve claimed profiles and existing UUIDs.
4. Generate import manifest and review totals; do not import until conflicts and authorization are resolved.

No personal data copied into this report. No production database writes or Sheet edits.
