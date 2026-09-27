# Standings conversion

This importer converts legacy final standings into canonical match records without asking operators to retype every round.

## Source columns

- รุ่น
- อันดับ
- Player ID — pairing-program ID local to that event; never a Dan certificate number
- ชื่อ-นามสกุล
- ชนะ / แพ้ / Bye / คะแนน / SOS / SOSOS
- ผลงานแต่ละรอบ, for example `7+ | 2+ | 6+ | 3+`

## Interpretation

Within the same division, `7+` means the player beat the athlete whose final-place value is 7. It does not mean GO ID, Athlete ID, Dan certificate number, or rating.

The converter resolves the place to a source player and displays the athlete's full name. It also checks the reciprocal row at the same round:

- `7+` must correspond to `1-`
- `2-` must correspond to `5+`
- draws must appear as draws on both rows

Two reciprocal entries become one canonical match.

## Identity resolution

Names are valid source clues but are not silently merged across years.

- `matched`: organizer previously confirmed this exact source name/alias
- `needs_review`: similar spelling, duplicate full name, or conflicting information
- `new_athlete`: no candidate exists
- `unresolved`: imported but not reviewed

The pairing-program Player ID is scoped to the source file/event and must not be reused as a cross-event athlete identity. Dan certificate numbers are separate optional profile data.

## Blocking rules

The batch stays out of public pages when:

- an opponent place cannot be found;
- reciprocal outcomes disagree;
- a division contains duplicate places;
- notation is unsupported;
- identity resolution still needs organizer confirmation.

Raw notation is retained for audit, while public pages display athlete names and readable outcomes.
