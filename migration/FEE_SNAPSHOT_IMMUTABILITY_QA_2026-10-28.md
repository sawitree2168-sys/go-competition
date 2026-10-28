# GO TOURNAMENT — Registration fee integrity QA — 2026-10-28

## Business rule
- Default fee per event: Kyu 500 THB/person, Dan 600 THB/person.
- Owner/Admin may change event fee defaults and override each division fee.
- At registration creation, trigger snapshots the division fee into `gt_registrations.fee_snapshot_thb`.
- Existing registration fees **must not be silently recalculated** when event/division prices change.
- `payment_status='pending'` means not financially verified. Fee owed does not prove money was received.
- Friendship or uncategorized divisions must be explicitly priced; do not guess a default from appearance.

## Changes and verification in this checkpoint
1. Inspected actual fee API source `app/api/admin/tournament-divisions/route.ts` and confirmed correction of over-escaped numeric validation and Kyu/Dan name matching in commit `45b923b0deaa5d53e79501a68c89f9debb7f6b95`.
2. Ran 12 local Node checks for monetary validation/classification, including 500, 600.50, 0, negative value rejection, 3-decimal rejection, scientific notation rejection, Thai Kyu/Dan, English Kyu/Dan and Friendship nonclassification. **12 passed**.
3. Added trigger `gt_registration_fee_snapshot_immutable_v1` (function `gt_protect_registration_fee_snapshot_v1`) on `public.gt_registrations`. It rejects any UPDATE attempt to rewrite an existing snapshot (SQLSTATE 23514); distinct-null comparisons are handled explicitly.
4. Applied a Supabase BEGIN/ROLLBACK test: create draft event and fee 500, add pending registration, change division fee to 700, verify historical registration still 500 and not paid; attempt direct UPDATE of historical fee to 700 and confirm CHECK VIOLATION, then rollback all sample records. **Passed**.
5. Read Vercel deployment history: latest observed READY preview SHA `49d9cf96b94d4cf1928dae70f9af2fb567f744d0`. Its build logs showed Next.js build completed successfully and included /fan, /schedule, /site-map, /faq, /api/fan, /api/tournaments/[id]. The newest GitHub code / fee changes may be ahead of this SHA. **A READY preview is NOT production E2E QA**.

## Remaining gates
- Owner/Admin actual browser save/change operation + authorized Reviewer denied test.
- Typecheck/build at current exact GitHub HEAD; do not infer from older READY deployment.
- Build complete financial approval and audit workflow before accepting slips or marking registrations paid.
- Add controlled change/credit/fee-adjustment *transactions* if a legitimate refund or correction is needed later; never rewrite historical fee snapshots.
- Ensure event display and admin division form maintain Thai/English name detection, user-chosen Friendship fees, and responsive controls.
- Confirm deployment is not publicly promoted until all P0 event flows (registration/payment/check-in/pairing/referee/standings) are tested.
