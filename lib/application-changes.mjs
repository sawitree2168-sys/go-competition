// Withdraw / swap / change division: the organiser's conditions as the applicant sees them.

export const KIND_LABEL = { withdraw: "ถอนตัว", swap: "เปลี่ยนคน", division: "เปลี่ยนรุ่น" };

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
/** "2026-11-20" → "20 พ.ย. 2569" */
export function thaiShort(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso ?? "")) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

/** Refund percent on a day (ISO): first tier whose date has not passed, else the "after" percent. */
export function refundPercent(policy, day) {
  if (!policy) return 0;
  const tiers = [...(policy.refund_tiers ?? [])].sort((a, b) => String(a.until).localeCompare(String(b.until)));
  const t = tiers.find((x) => String(x.until) >= day);
  return t ? Number(t.percent) : Number(policy.refund_after_percent ?? 0);
}

/** Lines that explain the refund rule, e.g. ["คืน 100% ถึง 20 พ.ย. 2569", "คืน 50% ถึง 25 พ.ย. 2569", "หลังจากนั้นคืน 0%"]. */
export function refundLines(policy) {
  if (!policy) return [];
  const tiers = [...(policy.refund_tiers ?? [])].sort((a, b) => String(a.until).localeCompare(String(b.until)));
  const out = tiers.map((t) => `คืน ${t.percent}% ถ้าขอถึง ${thaiShort(t.until)}`);
  const after = Number(policy.refund_after_percent ?? 0);
  out.push(tiers.length ? (after ? `หลังจากนั้นคืน ${after}%` : "หลังจากนั้นไม่คืนเงิน") : after ? `คืน ${after}%` : "ไม่คืนเงิน");
  return out;
}

/** Can this action be requested today? → { ok, why } where why is a Thai reason when not. */
export function actionState(policy, kind, today, eventDate) {
  if (!policy) return { ok: false, why: "ผู้จัดยังไม่เปิดให้ขอเปลี่ยนแปลง กรุณาติดต่อผู้จัด" };
  if (eventDate && today > eventDate) return { ok: false, why: "การแข่งขันผ่านไปแล้ว" };
  const allow = { withdraw: policy.allow_withdraw, swap: policy.allow_swap, division: policy.allow_division }[kind];
  const until = { withdraw: policy.withdraw_until, swap: policy.swap_until, division: policy.division_until }[kind];
  if (!allow) return { ok: false, why: `งานนี้ไม่เปิดให้${KIND_LABEL[kind]}` };
  if (until && today > until) return { ok: false, why: `${KIND_LABEL[kind]}ได้ถึง ${thaiShort(until)} (เลยกำหนดแล้ว)` };
  return { ok: true, why: until ? `ได้ถึง ${thaiShort(until)}` : "" };
}

/** Money for a request, mirroring gt_application_request_v1. */
export function requestMoney(app, kind, today, newDivision) {
  const paid = app.paid ? Number(app.fee ?? 0) : 0;
  if (kind === "withdraw") {
    const pct = refundPercent(app.policy, today);
    return { refund: Math.round(paid * pct) / 100, percent: pct, charge: 0 };
  }
  if (kind === "swap") return { refund: 0, percent: null, charge: Number(app.policy?.swap_fee ?? 0) };
  const nd = (app.divisions ?? []).find((d) => d.id === newDivision);
  const diff = nd ? Math.max(0, Number(nd.fee ?? 0) - Number(app.fee ?? 0)) : 0;
  return { refund: 0, percent: null, charge: Number(app.policy?.division_fee ?? 0) + diff };
}

export const REQUEST_REASONS = {
  NOT_FOUND: "ไม่พบใบสมัคร ตรวจเลขอ้างอิงและเบอร์โทรที่ใช้สมัคร",
  LOCKED: "ลองผิดหลายครั้ง กรุณารอ 1 ชั่วโมงแล้วลองใหม่ หรือติดต่อผู้จัด",
  NOT_ACTIVE: "ใบสมัครนี้ถูกยกเลิกหรือถอนตัวแล้ว",
  EVENT_PASSED: "การแข่งขันผ่านไปแล้ว",
  NOT_ALLOWED: "ผู้จัดไม่เปิดให้ทำรายการนี้",
  PAST_DEADLINE: "เลยกำหนดวันที่ผู้จัดตั้งไว้แล้ว",
  PENDING_EXISTS: "มีคำขอที่รอผู้จัดตรวจอยู่แล้ว ยกเลิกคำขอเดิมก่อน",
  BANK: "กรอกธนาคาร ชื่อบัญชี และเลขบัญชีสำหรับรับเงินคืน",
  DIVISION: "เลือกรุ่นใหม่ (ต้องไม่ใช่รุ่นเดิม)",
  FULL: "รุ่นนี้เต็มแล้ว",
  ATHLETE: "ค้นหาและเลือกนักกีฬาคนใหม่",
  NAME: "กรอกชื่อและนามสกุลของคนใหม่",
  BIRTH: "เลือกวันเดือนปีเกิดของคนใหม่",
  RANK: "เลือกระดับฝีมือของคนใหม่",
  PHONE: "กรอกเบอร์ติดต่อของคนใหม่",
  SAME_PERSON: "คนใหม่ต้องไม่ใช่คนเดิม",
  DUPLICATE: "คนนี้สมัครรุ่นนี้อยู่แล้ว",
  SLIP: "แนบสลิปค่าธรรมเนียม",
  SLIP_INVALID: "สลิปนี้ใช้ไม่ได้หรือเคยใช้แล้ว กรุณาแนบใหม่",
  ACCEPT: "ติ๊กยืนยันว่าอ่านเงื่อนไขแล้ว",
  UPLOAD: "อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่",
  NETWORK: "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่",
};
export const requestReason = (c) => REQUEST_REASONS[c] ?? "ทำรายการไม่สำเร็จ กรุณาลองใหม่";

/** Status chip of an application. */
export function applicationStatus(app) {
  if (app.status === "rejected") return { label: "ยกเลิก / ไม่ผ่าน", tone: "bad" };
  if (app.registration === "cancelled" || app.registration === "withdrawn") return { label: "ถอนตัวแล้ว", tone: "bad" };
  if (app.status === "approved") return { label: "ยืนยันแล้ว", tone: "ok" };
  return { label: app.paid ? "รอตรวจสอบการชำระเงิน" : "รอผู้จัดตรวจสอบ", tone: "wait" };
}
