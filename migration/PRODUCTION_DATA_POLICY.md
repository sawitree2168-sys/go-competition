# GO TOURNAMENT — production data safety gate

2026-10-26: local Vite staging `App.tsx` was patched to allow `INITIAL_TOURNAMENTS` only when `import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true'`. On API failure production must show empty/error states rather than synthetic records. `.env.example` now has a blank API endpoint and `VITE_ENABLE_DEMO_DATA=false`.

Local build is BLOCKED because `vite` binary is absent; typecheck is BLOCKED because `@types/node` is missing. No successful build, database integration, or Vercel publish is claimed. The complete sanitized application is still a local ZIP, not yet uploaded into this GitHub branch.

Before merging/deploying: audit `googleSheetsApi.ts` and `storageService.ts` for additional mock/local fallbacks, introduce server-side athlete identity verification and scoped authorization/RLS, test persistence for individual and institutional registrations, and verify signed-in permissions. Never write production athlete records just to make mockups look populated.
