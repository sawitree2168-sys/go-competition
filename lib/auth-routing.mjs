// Login page helpers: where to go after signing in, safe "next" links, Thai error messages.

/** Only same-site paths ("/organizer/…"), never "//evil.com" or "https://…". */
export function safeNext(next) {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (next.startsWith("/login") || next.startsWith("/signup")) return null;
  return next;
}

/**
 * @param {{platform_role?: string|null, organizers?: {status: string}[]} | null} access result of gt_my_access_v1
 * @param {string|null} next requested page
 */
export function destinationFor(access, next) {
  const staff = Boolean(access?.platform_role) || (access?.organizers ?? []).some((o) => o.status === "active");
  const want = safeNext(next);
  if (want && (staff || !want.startsWith("/organizer"))) return want;
  return staff ? "/organizer" : "/account";
}

export const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s ?? "").trim());

/** Thai message for a Supabase auth error. */
export function authErrorMessage(message = "") {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (m.includes("email not confirmed")) return "ยังไม่ได้ยืนยันอีเมล กรุณากดลิงก์ยืนยันในอีเมลที่ได้รับ";
  if (m.includes("already registered") || m.includes("already been registered")) return "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบหรือกดลืมรหัสผ่าน";
  if (m.includes("password") && (m.includes("at least") || m.includes("weak") || m.includes("short"))) return "รหัสผ่านสั้นหรือคาดเดาง่ายเกินไป (อย่างน้อย 8 ตัวอักษร)";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) return "ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "ยังไม่ได้เปิดการเข้าสู่ระบบด้วย Google";
  if (m.includes("network") || m.includes("fetch")) return "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต";
  return "ทำรายการไม่สำเร็จ กรุณาลองใหม่";
}

export const MEMBER_ROLES = [
  { id: "athlete", label: "นักกีฬา" },
  { id: "parent", label: "ผู้ปกครอง" },
  { id: "teacher", label: "อาจารย์ / สถาบันสอนหมากล้อม" },
  { id: "organizer", label: "ผู้จัดการแข่งขัน" },
];
