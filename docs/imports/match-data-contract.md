# Match import data contract

## Flow

Google Sheet → Next.js validation API → Supabase staging → organizer review → publish to canonical match tables → public website.

The public website never reads the master spreadsheet directly.

## Source

- Spreadsheet: `1go Master / Platform Database`
- Tab: `นำเข้าประวัติแมตช์`
- Stable identity: `<spreadsheet id>:<sheet name>:<รหัสแมตช์>`

## Blocking validation

A batch is rejected when any row has:

- no stable match ID;
- missing event/division/round;
- missing player GO ID or name;
- missing opponent unless the result is BYE;
- the same athlete on both sides;
- inconsistent paired results (win/loss, loss/win, draw/draw);
- a duplicate match ID in the same batch;
- no explicit verification flag.

This first version is intentionally all-or-nothing: operators fix visible sheet rows and rerun, so partially imported events cannot silently appear.

## Privacy and security

Only match fields required for statistics are accepted. Passwords, PIN hashes, dates of birth, phone numbers, emails, addresses, guardian data, and internal notes are not part of this contract. The import endpoint requires a server secret and staging tables have RLS enabled with no browser policies.

## Publish boundary

Staging is not public. A later reviewed publish transaction will resolve event/division/athlete IDs, write canonical matches, calculate Kyu-only rating ledger entries, refresh snapshots, and mark the batch as published.
