// Easy login: calls to the "easy-login" Edge Function (one sign-in box for every role).

/**
 * POST to the Edge Function. Never throws: { ok, status, data } where data has `message` on failure.
 * @param {"login"|"create"|"forgot"|"profile"|"reset"} action
 * @param {Record<string, unknown>} payload
 * @param {{accessToken?: string}} [opts]
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function callEasy(action, payload, { accessToken } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, status: 0, data: { message: "ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง" } };
  try {
    const res = await fetch(`${url}/functions/v1/easy-login`, {
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

/** Thai label for each easy-account kind. */
export const KIND_LABEL = {
  owner: "แอดมินระบบ", pairing: "แอดมินจับคู่", organizer: "ผู้จัดงาน", institution: "เจ้าของสถาบัน",
  teacher: "ครูในสถาบัน", freelance: "ครูอิสระ", athlete: "นักกีฬา", referee: "กรรมการ",
};

/** dd/mm/yyyy (Buddhist or Christian year) or yyyy-mm-dd → yyyy-mm-dd, else "". */
export function toIsoDate(raw) {
  const s = String(raw ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    if (!m) return "";
    d = +m[1]; mo = +m[2]; y = +m[3];
  }
  if (y > 2400) y -= 543;
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Name to show for a signed-in user: accounts made by the easy login have an internal address
 * (…@easy.go-tournament.invalid / …@athlete.go-tournament.invalid) that must never be shown.
 * @param {{email?: string|null, user_metadata?: Record<string, unknown>}|null|undefined} user
 */
export function shownName(user) {
  const email = String(user?.email ?? "");
  if (email && !/\.go-tournament\.invalid$/i.test(email)) return email;
  const m = user?.user_metadata ?? {};
  return String(m.display_name || m.full_name || m.name || "บัญชีของฉัน");
}
