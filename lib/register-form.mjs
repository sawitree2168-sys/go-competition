// Web sign-up from the event poster: pure helpers shared by the page and its tests.

export const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const RANKS = [...Array.from({ length: 30 }, (_, i) => `${30 - i} คิว`), ...Array.from({ length: 9 }, (_, i) => `${i + 1} ดั้ง`)];
export const SCHOOL_LEVELS = [
  "อนุบาล", ...[1, 2, 3, 4, 5, 6].map((n) => `ประถมศึกษาปีที่ ${n}`), ...[1, 2, 3, 4, 5, 6].map((n) => `มัธยมศึกษาปีที่ ${n}`),
  "ปวช.", "ปวส.", "มหาวิทยาลัย", "ทำงานแล้ว", "อื่น ๆ",
];
export const MAX_ACADEMIES = 5;

const pad = (n) => String(n).padStart(2, "0");

/** "2014-03-15" from day / month (1–12) / Buddhist year, or "" when incomplete or not a real date. */
export function birthIso(day, month, beYear) {
  const d = Number(day), m = Number(month), y = Number(beYear) - 543;
  if (!d || !m || !beYear || y < 1900) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Whole years between a birth date and today (both ISO dates); null when not computable. */
export function ageOn(birth, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(today ?? "")) return null;
  const [by, bm, bd] = birth.split("-").map(Number), [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 ? age : null;
}

/** Buddhist years offered in the birth-year picker: newest first, from age 3 back to 1940. */
export function beYears(todayIso) {
  const y = Number((todayIso ?? "").slice(0, 4)) || new Date().getFullYear();
  return Array.from({ length: y - 3 - 1940 + 1 }, (_, i) => y - 3 - i + 543);
}

export const phoneDigits = (raw) => String(raw ?? "").replace(/\D/g, "");
export const phoneOk = (raw) => /^0\d{8,9}$/.test(phoneDigits(raw));

/** "5–6 คิว" → {kind:"kyu", lo:5, hi:6} · "1-2 ดั้ง"/"Dan" → dan · เฟรนชิพ → friendship · otherwise null. */
export function divisionRange(name) {
  const s = String(name ?? "");
  if (/เฟรนชิพ|friendship/i.test(s)) return { kind: "friendship" };
  const kind = /ดั้ง|dan/i.test(s) ? "dan" : /คิว|kyu/i.test(s) ? "kyu" : null;
  const m = s.match(/(\d+)\s*[–-]\s*(\d+)/) ?? s.match(/(\d+)/);
  if (!kind || !m) return null;
  const a = Number(m[1]), b = Number(m[2] ?? m[1]);
  return { kind, lo: Math.min(a, b), hi: Math.max(a, b) };
}

/** Does this rank belong in this division? "fit" | "out" | "any" (friendship) | "unknown". */
export function divisionFit(name, rank) {
  const r = divisionRange(name);
  if (!r) return "unknown";
  if (r.kind === "friendship") return "any";
  const m = String(rank ?? "").match(/^(\d+)\s*(คิว|ดั้ง)$/);
  if (!m) return "unknown";
  const kind = m[2] === "ดั้ง" ? "dan" : "kyu", n = Number(m[1]);
  return kind === r.kind && n >= r.lo && n <= r.hi ? "fit" : "out";
}

export const baht = (n) => `${Number(n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท`;

/** Reasons from gt_register_v1 (and the same checks in the browser) → message + the step to fix it. */
export const REASONS = {
  NAME: { text: "กรอกชื่อและนามสกุล", step: 1 },
  BIRTH: { text: "เลือกวันเดือนปีเกิดให้ครบ", step: 1 },
  PHONE: { text: "กรอกเบอร์ติดต่อ 9–10 หลัก ขึ้นต้นด้วย 0", step: 1 },
  RANK: { text: "เลือกระดับฝีมือ", step: 1 },
  PHOTO: { text: "อัปโหลดรูปไม่สำเร็จ กรุณาเลือกรูปใหม่", step: 1 },
  PHOTO_CONSENT: { text: "ติ๊กยินยอมให้แสดงรูปบนเว็บไซต์ (หรือลบรูปออก)", step: 1 },
  SCHOOL: { text: "ชื่อโรงเรียนหรือชั้นเรียนยาวเกินไป", step: 1 },
  ACADEMY: { text: `เลือกสถาบันได้ไม่เกิน ${MAX_ACADEMIES} แห่ง`, step: 1 },
  ATHLETE: { text: "ค้นหาและเลือกชื่อของคุณในแท็บ “มีข้อมูลแล้ว”", step: 1 },
  MODE: { text: "เลือก “สมัครใหม่” หรือ “มีข้อมูลแล้ว”", step: 1 },
  DIVISION: { text: "เลือกรุ่นแข่งขัน", step: 1 },
  FULL: { text: "รุ่นนี้เต็มแล้ว กรุณาเลือกรุ่นอื่น", step: 1 },
  SLIP: { text: "แนบสลิปการชำระเงิน", step: 2 },
  SLIP_INVALID: { text: "สลิปนี้ใช้ไม่ได้หรือเคยใช้สมัครแล้ว กรุณาแนบใหม่", step: 2 },
  ACCEPT: { text: "ติ๊กยืนยันข้อมูลและยอมรับกติกาการแข่งขัน", step: 2 },
  DUPLICATE: { text: "ชื่อนี้สมัครรุ่นนี้ไว้แล้ว (รอผู้จัดตรวจ หรืออนุมัติแล้ว)", step: 1 },
  SHEET_DUPLICATE: { text: "ชื่อนี้อยู่ในรายชื่อรุ่นนี้แล้ว (สมัครผ่าน Google Form) ไม่ต้องสมัครซ้ำ ดูได้ที่หน้ารายชื่อผู้สมัคร", step: 1 },
  PAYMENT_NOT_READY: { text: "ผู้จัดยังไม่เปิดรับชำระเงินออนไลน์ของงานนี้ กรุณาติดต่อผู้จัด", step: 2 },
  NOT_WEB: { text: "งานนี้ไม่ได้รับสมัครผ่านเว็บ", step: 1 },
  CLOSED: { text: "ไม่อยู่ในช่วงเวลารับสมัคร", step: 1 },
  NOT_FOUND: { text: "ไม่พบรายการแข่งขันนี้ หรือยังไม่เผยแพร่", step: 1 },
  BUSY: { text: "มีผู้สมัครพร้อมกันจำนวนมาก กรุณารอสักครู่แล้วลองใหม่", step: 2 },
  UPLOAD: { text: "อัปโหลดไฟล์ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่", step: 2 },
  NETWORK: { text: "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่", step: 2 },
};
export const reasonText = (code) => REASONS[code]?.text ?? "ระบบขัดข้อง กรุณาลองใหม่";
export const firstStep = (codes) => Math.min(...codes.map((c) => REASONS[c]?.step ?? 2), 2);

/** Same checks as the database, so people see every missing item before the round trip. */
export function checkStep1(f) {
  const e = [];
  if (f.mode === "new") {
    if (!f.firstName?.trim() || !f.lastName?.trim()) e.push("NAME");
    if (!f.birth) e.push("BIRTH");
    if (f.photo && !f.photoConsent) e.push("PHOTO_CONSENT");
    if ((f.academies?.length ?? 0) > MAX_ACADEMIES) e.push("ACADEMY");
  } else if (f.mode === "existing") {
    if (!f.goId) e.push("ATHLETE");
  } else e.push("MODE");
  if (!RANKS.includes(f.rank)) e.push("RANK");
  if (!phoneOk(f.phone)) e.push("PHONE");
  if (!f.division) e.push("DIVISION");
  return e;
}

export function checkStep2(f, { fee, paymentReady }) {
  const e = [];
  if (Number(fee) > 0 && !paymentReady) e.push("PAYMENT_NOT_READY");
  if (Number(fee) > 0 && !f.slip) e.push("SLIP");
  if (!f.accept) e.push("ACCEPT");
  return e;
}

/** Slip files people can attach (10 MB, same as the storage bucket). */
export function slipProblem(file) {
  if (!file) return "";
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) return "แนบได้เฉพาะรูป JPG / PNG / WEBP หรือ PDF";
  if (file.size > 10 * 1024 * 1024) return "ไฟล์ใหญ่เกิน 10 MB";
  return "";
}
export const slipExt = (type) => ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" })[type] ?? "jpg";

/** Name comparison between the web form and the organiser's sheet: no spaces or invisible characters, lower case. */
export const nameKey = (s) => String(s ?? "").replace(/[\s\u200b-\u200d\ufeff]+/g, "").toLowerCase();
