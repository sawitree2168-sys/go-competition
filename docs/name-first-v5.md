# Name-first athlete access — 30 October 2026

User correction: first ask athlete full name, match legacy ID, route existing to ownership verification, new to signup. Never use athlete name as email and never grant private access solely from name.

Implemented NameFirst before AuthForm; plain text full-name input -> exact normalized-name check -> existing/new choice. Search outage stays error and offers no new registration. On sign-in, a matching owned athlete opens profile; otherwise prefilled connect page retains organizer claim approval. New athlete editor prefills checked name. Email remains a separate account verification step.

Legacy source discovered: native Google Sheet ทำเนียบดั้งไทยปี69, spreadsheet 1PXimvwXgS7Ms5yT-TQZfKFNxLhwKYELBTeCdGS3i-J4, tab รวม, A3:D1539. Read bounded name/dan fields only. Stored names and dan numbers in private RLS-protected directory, not public source files or fake athlete accounts. Verified source row: dan 41 ชยพล พันธเสน 4 dan. No fabricated historical GO ID, owner assignment or rank migration.

Public lookup returns found/not_found only; no email, contact, DOB, athlete IDs or ownership details. Request limiter is per server instance, not a global abuse guarantee. Private directory inaccessible by anon/authenticated table reads. Trigger blocks signed-in creation of duplicate legacy Dan names.

Coverage is Dan directory + current web athletes, NOT complete Kyu registry. Not-found wording explicitly says not found in connected sources; known previous IDs should go through organizer review. Legacy claim-to-profile materialization/import remains pending. Finding a legacy record does NOT mean a usable athlete profile/account has already been created.

Validation: production build passed before two small final adjustments; final TypeScript check. Anonymous-role SQL lookup returns found for verified source name and not_found for fixture name. Source unchanged. Deployment and HTTP checks recorded separately.
