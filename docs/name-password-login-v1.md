# Athlete name/password login — 30 October 2026

Athletes search their full name, select an existing GO ID if names collide, confirm the verified Dan registration number where available, and enter their own password. No athlete email or activation email is required. Existing parent/staff email sign-in remains available under a separate collapsed section.

First setup and forgotten passwords: owner/admin verifies identity, GO ID, relationship and duplicates, records a review note, and issues a random 96-bit temporary setup code. The athlete enters that code and chooses a password (minimum 8 characters). Code expires after 24 hours, is stored only as SHA-256, is consumed atomically once, and is invalidated by replacement. Code failure after consumption requires admin reissue. Plaintext passwords and setup codes are not stored in Google Sheets. Admin sees the setup code once on `/admin/athlete-access`.

Supabase Edge Function `athlete-login` uses the managed server-side service key to resolve the auth identifier, but never returns private email/user UUID in public lookup. Password login is delegated to Supabase Auth and uses its real sessions and ownership policies. The Next route forwards requests using existing runtime configuration; no service secret is added to Vercel or browser code.

Service-only RPCs access private tables with RLS and explicit deny grants for anon/authenticated. Private SQL functions have fixed search paths. Public requests are throttled per normalized name and action in persistent database counters. Issuance requires server-verified owner/admin role, explicit identity confirmation and audit note. No auth based on name or Dan number alone. Existing shared parent accounts and staff accounts cannot use the athlete reset mechanism. Confirmed conflicting ID GO106260826 is held for review. No new GO IDs allocated. First verified issuance can create a private profile for the existing registry ID, preserving history links.

## Verification
- Next webpack production build + TypeScript passed.
- 9 Edge handler tests with mocked Supabase boundary passed, plus 6 result/history regression tests.
- SQL rollback tests passed: unauthorized issuer, wrong code, replay, replacement, expiry, ownership overwrite, shared account protection, audit and denied direct RPC access. No test users or profiles persisted.
- Deployed Edge v1 ACTIVE; live public name search returns the expected registry GO ID; guest code issuance returns 401.
- Supabase advisors: new private tables have RLS with intentionally no public policies; existing leaked-password protection warning remains.
- Real owner/admin signed-in issuance → real athlete password → profile in a browser is still unverified. Mobile/desktop and dark/light visual checks are pending. Vercel protected-origin approval was rejected in the prior session; do not bypass it.

## Data/operational limits
Registry is the previously imported 3,448-row snapshot, not live synchronization with Sheets. Unknown names and conflicting identities require review. Codes are issued through the web admin screen, not editable plaintext Sheet password columns. The existing active owner account is retained. Source and frontend deployment are tracked in Project Master.

## Self registration update — 30 October 2026
Owner explicitly replaces admin-issued first setup with self registration. Unused existing registry IDs may now choose a password, repeat it, confirm own/guardian identity and obtain a real session immediately. No email/activation/admin approval. Dan numbers are checked where supplied by the directory. This is self-asserted public-registry matching, NOT verified identity; name/GO ID/Dan number are public facts and someone knowing them could claim an unused ID first. Existing owned profiles, any pre-existing profile row (including unclaimed), staff accounts, and held conflict GO106260826 cannot be overwritten. No fresh GO IDs are allocated, unknown registry names still require a registry update.

Creation is serialized per GO ID in a service-only RPC with a private audit row; losing duplicate requests delete only their own unused Auth user. Unknown RPC transport errors retain the Auth user because a committed linkage may exist. Credentials stay hashed in Supabase Auth, not in Sheets or admin tables. Password recovery remains authorized admin code issuance. Profile registration remains private by default. /account now redirects to /profile instead of the homepage after successful session and ownership lookup.
