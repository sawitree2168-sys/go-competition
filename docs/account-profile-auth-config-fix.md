# Account preview configuration incident — 30 October 2026

User screenshot showed AccountGate error ระบบเข้าสู่ระบบยังไม่พร้อม. Reproduced /api/auth/public-config HTTP 503 on the previously delivered preview 2nemxq8fc.
Root cause: Supabase URL and publishable key were scoped only to earlier Git branches; deployment was created using a SHA ref. Page HTML HTTP 200 did not prove runtime readiness. Prior release verification was incomplete.

Fix: configured only GO_TOURNAMENT_SUPABASE_URL and GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY for preview branch codex/account-profile-v4 using the same existing GO TOURNAMENT project. No service-role key added, no other environments changed. New deployment requested from branch ref (not SHA): dpl_GH8ncEfWMczvEPFH9xF9ErjnKYoC, go-competition-xsey33u1f-sawitree2168-sys.vercel.app.

Required checks before handoff: deployment READY; public config HTTP 200/status ok and expected project URL; private athlete endpoint 401 without user token; no claims of authenticated signup/owner E2E from these checks.
