// Athlete accounts without e-mail: what the athlete typed, and calls to the "athlete-login" Edge Function.

/** "email" | "go" (GO ID) | "dan" (dan number) | "name" (full name with a space) | "unknown" */
export function identifierKind(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "unknown";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "email";
  const compact = s.toUpperCase().replace(/[\s,\-\u200B-\u200D\uFEFF]/g, "");
  if (/^GO\d{4,12}$/.test(compact)) return "go";
  if (/^\d{1,6}$/.test(compact)) return "dan";
  if (s.replace(/\s+/g, " ").includes(" ") && s.length >= 3) return "name";
  return "unknown";
}

export const IDENTIFIER_HELP = "อีเมล · รหัส GO (เช่น GO106260826) · เลขทะเบียนดั้ง · หรือ ชื่อ-นามสกุล";

/** Thai message for an identifier that cannot be used. */
export function identifierProblem(raw) {
  const k = identifierKind(raw);
  if (k === "unknown") return String(raw ?? "").trim() ? "กรุณากรอกชื่อและนามสกุล (เว้นวรรค) รหัส GO หรือเลขดั้ง" : "กรุณากรอกอีเมล รหัส GO เลขดั้ง หรือชื่อ-นามสกุล";
  return "";
}

/**
 * POST to the Edge Function. Never throws: { ok, status, data } where data has `message` on failure.
 * @param {string} action search | login | register | issue | set-password
 * @param {Record<string, unknown>} payload
 * @param {{accessToken?: string}} [opts]
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function callAthlete(action, payload, { accessToken } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, status: 0, data: { message: "ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง" } };
  try {
    const res = await fetch(`${url}/functions/v1/athlete-login`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: key, Authorization: `Bearer ${accessToken ?? key}` },
      body: JSON.stringify({ action, ...payload }),
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต" } };
  }
}
