// Referee console: "who won" + "how the game ended" → result code / margin for gt_referee_record_result_v2,
// the one-line summary shown before saving, and the reverse (prefill when correcting a saved result).

export const METHODS = [
  { v: "normal", label: "ชนะ", short: "ชนะ", winner: true, margin: true },
  { v: "R", label: "ชนะโดยยอมแพ้ (R)", short: "ยอมแพ้", winner: true },
  { v: "T", label: "ชนะเพราะหมดเวลา (T)", short: "หมดเวลา", winner: true },
  { v: "forfeit", label: "ชนะเพราะคู่ไม่มา (สายเกิน 15 นาที)", short: "คู่ไม่มา", winner: true },
  { v: "draw", label: "เสมอ (½–½)", short: "เสมอ", winner: false },
  { v: "double_loss", label: "แพ้ทั้งคู่ (0–0)", short: "แพ้ทั้งคู่", winner: false },
  { v: "double_forfeit", label: "ไม่มาทั้งคู่ (0–0)", short: "ไม่มาทั้งคู่", winner: false },
];

const byV = Object.fromEntries([...METHODS, { v: "count", label: "ชนะ", short: "ชนะ", winner: true, margin: true }].map((m) => [m.v, m]));
export const needsWinner = (method) => Boolean(byV[method]?.winner);

/** "6.5", "0.5", "12" — points won by when counted. */
export const validMargin = (s) => /^\d{1,3}(\.5)?$/.test(String(s ?? "").trim()) && Number(s) > 0;

/**
 * @returns {{ok: true, code: string, margin: string|null} | {ok: false, error: string}}
 */
export function buildResult({ winner, method, margin }) {
  const m = byV[method];
  if (!m) return { ok: false, error: "กรุณาเลือกวิธีจบเกม" };
  if (!m.winner) return { ok: true, code: method, margin: null };
  if (winner !== "black" && winner !== "white") return { ok: false, error: "กรุณาเลือกผู้ชนะ" };
  if (method === "normal") {
    if (String(margin ?? "").trim() && !validMargin(margin)) return { ok: false, error: "กรุณาใส่แต้มที่ถูกต้อง เช่น 6.5 หรือเว้นว่างไว้" };
    return { ok: true, code: `${winner}_win`, margin: String(margin ?? "").trim() ? String(Number(margin)) : null };
  }
  if (method === "forfeit") return { ok: true, code: `${winner}_win_forfeit`, margin: null };
  if (method === "count") {
    if (!validMargin(margin)) return { ok: false, error: "กรุณาใส่แต้มที่ชนะ เช่น 6.5" };
    return { ok: true, code: `${winner}_win`, margin: String(Number(margin)) };
  }
  return { ok: true, code: `${winner}_win`, margin: method };
}

/** "โต๊ะ03 · หมากดำชนะ · ยอมแพ้" */
export function summaryLine({ board, winner, method, margin, names }) {
  const t = `โต๊ะ${String(board ?? "").padStart(2, "0")}`;
  const m = byV[method];
  if (!m) return t;
  if (!m.winner) return `${t} · ${m.short}`;
  if (winner !== "black" && winner !== "white") return `${t} · เลือกผู้ชนะ`;
  const who = `หมาก${winner === "black" ? "ดำ" : "ขาว"}ชนะ${names?.[winner] ? ` (${names[winner]})` : ""}`;
  const how = method === "count" || method === "normal"
    ? (validMargin(margin) ? `ชนะ ${Number(margin)} แต้ม` : "ชนะ") : m.short;
  return `${t} · ${who} · ${how}`;
}

/** Saved result → form values. */
export function formFromResult({ result_code: code, result_margin: margin }) {
  if (!code) return { winner: null, method: "R", margin: "" };
  if (code === "draw" || code === "double_loss" || code === "double_forfeit") return { winner: null, method: code, margin: "" };
  const winner = code.startsWith("black") ? "black" : "white";
  if (code.endsWith("_forfeit")) return { winner, method: "forfeit", margin: "" };
  if (margin === "R" || margin === "T") return { winner, method: margin, margin: "" };
  if (margin && validMargin(margin)) return { winner, method: "normal", margin };
  return { winner, method: "normal", margin: "" };
}
