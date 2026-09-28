# Lamphun 2026 standings validation

Validated source: `ผลการแข่งขันทั้งหมด` in “หมากล้อม ผลการแข่งขัน 5 หมากกระดานหมากล้อม @ ลำพูน 2026”.

| Division | Athletes | Rounds | Canonical matches | Non-participation entries | Conflicts |
|---|---:|---:|---:|---:|---:|
| Open | 14 | 4 | 28 | 0 | 0 |
| U10 | 14 | 4 | 28 | 0 | 0 |
| U16 | 28 | 5 | 68 | 4 | 0 |
| WOMEN | 10 | 4 | 20 | 0 | 0 |
| **Total** | **66** | — | **144** | **4** | **0** |

Checks performed:

- reciprocal opponent and outcome agree for every played match;
- win/loss totals agree with round notation;
- duplicate player-side rows collapse to one canonical match;
- `×` and forms such as `28×` are non-participation, not losses, BYEs, or matches;
- pairing Player IDs remain scoped to this event and are never treated as Dan certificate numbers or central athlete IDs.

Identity comparison against `1go Master / Platform Database → บัญชีนักกีฬา`:

- 9 exact unique full-name matches;
- 57 entries require organizer review or creation as new athletes;
- incomplete names must never be linked automatically.

The review worksheet is `ตรวจเชื่อมลำพูน 2026` in the central workbook. No rows were published to Supabase or the public website during this validation.
