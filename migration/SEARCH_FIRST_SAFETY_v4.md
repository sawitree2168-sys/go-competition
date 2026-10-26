# GO TOURNAMENT migration v4 — 2026-10-26

Staged Vite source has been updated locally (complete v4 ZIP, not yet committed to GitHub):

- `services/googleSheetsApi.ts` `searchAthleteAccount`: removed hardcoded GViz direct search of spreadsheet `1jDFQJkG-FD2265ZnTjXjXesTe_cu6P6p2hnep_MpmnI` (GO MASTER), and local mock/StorageService fallback. Backend lookup must be configured and return a valid array or throw.
- `components/auth/LoginModal.tsx`: shows a visible error when lookup fails; does not mislabel an outage as 'no athlete found'.
- Local syntax validation: TypeScript transpile parser checked 76 TS/TSX files, zero syntax errors. This is **not** a typecheck or Vite build.
- Full npm install and build are **blocked** in the current tool runtime (`ENOTCACHED` offline and npm installer error online).
- Remaining blockers: migrate complete Vite tree; audit other legacy cross-project account methods, secure authentication/RLS and registration persistence; restore/replace inactive GO TOURNAMENT Supabase; deploy and test preview.

No Production data or domain was changed.
