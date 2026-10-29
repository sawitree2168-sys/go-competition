# Account and athlete profile series — 30 October 2026

Approved reference: four light/dark mockups in conversation, original 3933.png GO logo. Existing transparent logo file matches the supplied image dimensions and alpha and is retained.

Routes implemented:
- /account: email/password login, signup, password visibility, confirmation prompt, password reset email. /account/recovery: password update using the signed recovery session. AccountGate uses the same form across protected pages.
- /athletes/connect: existing owned-athlete search and existing guarded claim-request backend; requests require organizer approval and never grant ownership by knowing a GO ID. Unknown athletes' private records are not enumerated. /athletes/search redirects here.
- /profile/edit: new/existing athlete form, existing drag/crop/zoom image workflow, private birth date/contact persistence. Existing GO ID/rank read-only. New ranks are null/unverified.
- /profile: owner-filtered read view, persisted avatar or approved stable default, permanent ID, private contact card, links to edit, schedule and my competitions. Multiple owned athlete selector.

Database additive migrations applied to go-competition only: account_profile_v4 and account_profile_v4_numbered_go_id. New authenticated invoker RPC calls private guarded creator; verified email required, normalized-name advisory lock and duplicate rejection, same-owner retry returns existing ID, per-owner daily creation limit. Existing rows unchanged. New GO IDs use private sequence starting 1000000. Sequence values may have gaps on rollback.

Birth dates remain in owner-only contact table, not public athlete rows. No INSERT policy added to public athlete table. No service credentials in browser. Existing rank/ownership protection retained.

Validation: webpack production build and TypeScript passed. Rollback fixtures confirmed new creation, stable retry ID, cross-account duplicate guard, private athlete/contact denial, rank protection. All fixture data rolled back. Existing 12 Node tests pass (search/head-to-head, not signup E2E). Security advisor unchanged: pre-existing leaked-password protection warning; no new RLS/function warnings.

Outstanding verification: actual signup confirmation email and recovery link redirect allowlist, signed-in browser flow using owner/guardian, viewport QA, deployed HTTP check. Do not claim production readiness or a fully tested signup-to-competition flow. No live tournament opened and no real registration/payment changed.
