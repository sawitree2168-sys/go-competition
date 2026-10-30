# Organizer event history sources
Read and staged 30 October 2026. All rows private; not published and not confirmed unique athletes.

| Event | Source | Tab | Result rows staged |
|---|---|---|---:|
| SEACON BANGKAE GO KYU WAR 2026 | https://docs.google.com/spreadsheets/d/14p3jmPKf6o1BFUdT0b-HflzMnEd8DfukDxGO0tRhZsM/edit | ผลการแข่งขัน B:L | 234 |
| Thammasat Open 2026 | https://docs.google.com/spreadsheets/d/1L__q1XZsVisuH2Q79zwqVP3kgiCGMXAz2Tsgld77JlY/edit | Standings A:L | 268 |
| Mingle GO Kyu War 2026 Dan | https://docs.google.com/spreadsheets/d/17EAh751b4nORfxgfk4cpPj5YqivUX_fX9rIuQPVjqmw/edit | ชีต1 A:K | 8 |

Database: gt_private.organizer_event_sources_v1. Primary key file_id:tab:row prevents same-row reimport duplication only; not sufficient canonical event-result deduplication.
Seacon also has Walllist and rounds1–6: compare round sheets to final table, never count both copies.
Thammasat also has Pairings and Results: event summaries may overlap existing 69 records; do not add twice. Results log can contain edits and stale pairings; inspect latest locked pairing and final standings.
Mingle Dan table records Dan numbers, standings and three round tokens. Map Dan numbers then verify reciprocal results. Remaining KYU/Friendship results still need discovery; registration sheets are not results.
Source names can include school names or titles: preserve raw text, do not fuzzy-merge automatically.
Next: retain division block labels; confirm event dates; crosswalk identities; reconcile existing summary rows and per-round results; publish only verified batches.
