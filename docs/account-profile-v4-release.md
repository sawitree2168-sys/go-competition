# Account/profile release evidence — 30 October 2026

Code commit: d41f80aacb78cae62a13d8db89c77295ed903a1c.
Vercel preview: dpl_Bz5PKLevkgBLkrfEEresm6JFfdWf READY.
Start URL: https://go-competition-2nemxq8fc-sawitree2168-sys.vercel.app/account
Authenticated deployment fetch: /account, /athletes/connect, /profile/edit?new=1, /profile HTTP 200. /api/me/athletes without application bearer token HTTP 401.

Production webpack build/TypeScript passed. New athlete SQL tests inside rollback: creation, existing ID on retry, cross-account duplicate guard, rank change denied, private profile/contact read denied. Fixture users and athletes confirmed zero afterward. Anon RPC execute permission false. Existing 12 Node tests pass.

Browser inspection: actual built account page with public auth configuration, via managed static preview; desktop light/dark, signup tab and confirmation field; 390px dark login page rendered without clipping in observed viewport. This is NOT authenticated owner E2E or a full visual acceptance of all four pages. PNG logo SHA256 matches uploaded 3933.png exactly.

Remaining: real owner signup/confirmation/recovery email and redirect allowlist test; authenticated profile/photo/contact browser flow and complete mobile/desktop light/dark QA for pages 2–4. No production promotion, live event activation, real enrollment or payment test. Existing leaked-password-protection warning remains unchanged; no new DB advisor warnings.
