# Search index integration checkpoint
30 October 2026

Prepared data/staging/athlete-history-index-v1.json in source control; private staging only, no public API added.
- 3,339 distinct GO ID records combined from the master account and KYU table. Not a verified count of unique people.
- 69 event summaries read; all 69 reference GO IDs absent from these identity tables. This is a concrete broken join, not absence of history.
- 3 normalized names have multiple ID candidates. Do not merge automatically.
- Unique-name candidate mapping for 0 event summaries; 69 unresolved. Candidates are not confirmed ownership or confirmed identity matches.

Target: canonical identity table + source-ID aliases + event facts + match facts + precomputed per-athlete/head-to-head summaries. Query indexed local database, not Google Sheets on each request. Persist every source row, import batch and coverage. Import repeat must be idempotent. Do not derive opponents from aggregate wins; do not conflate BYE with played wins.

Next: validate source IDs against ผู้เล่นจากการแข่งขัน/ฐานบุคคล/Registration Master; resolve aliases, then materialize verified index into database and test actual search API plus profile. Existing head-to-head API currently returns 503; it is not yet implemented. No runtime speed claim or full-system completion claim is supported.
