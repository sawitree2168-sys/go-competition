# Multi-year import review checkpoint

2026-10-30

- 7,491 raw reciprocal-matched rows in gt_private.history_multiyear_raw_v1, private RLS/no client grants; not published.
- 1,156 legacy Dan-to-GO-ID mappings verified by same Dan number and whitespace-normalized name against identity registry.
- All 7,491 raw rows resolve both Dan numbers through crosswalk. This does not establish event metadata correctness or account ownership.
- 283 review observations persisted to gt_private.history_import_review_v1: 233 non-reciprocal observations, 47 non-round layouts requiring adapters, 3 conflicts affecting 2 source keys.
- Conflicting keys quarantined: 010266:1:3:575:808; 130169:21:6:646:766.
- 55 rows have blank event_title_raw. Titles collected from nearby headers can be division labels only; event identification remains pending.
- Extractor must be improved for parallel side-by-side event blocks, duplicates whose header row shifts across source versions, arbitrary placeholders (Dan 999 must not be assumed always BYE), and source file IDs/provenance.
- Existing unique raw source key is staging identity only, not canonical cross-file match identity. Do not publish aggregate totals from this table.
- Pending: event/division normalization, conflict resolution, all non-round layouts, KYU round-level sources, production publication gate and API authorization, profile/H2H integration, end-to-end and performance checks.

This checkpoint supersedes any earlier implication that the historical import or website integration was complete.
