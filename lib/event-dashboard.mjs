// Event dashboard ("ภาพรวมการสมัคร"): seats per division and the status chip.

/** Status of one division from entrants and the seat limit. tone: open | near | last | full | none */
export function seatStatus(count, limit) {
  const n = Math.max(0, Number(count) || 0);
  if (!limit || limit <= 0) return { tone: "none", label: "เปิดรับ", left: null, waitlist: 0 };
  const left = limit - n;
  if (left <= 0) return { tone: "full", label: "เต็ม", left: 0, waitlist: -left };
  if (left <= 3) return { tone: "last", label: `เหลือ ${left} ที่`, left, waitlist: 0 };
  if (left <= limit * 0.2) return { tone: "near", label: "ใกล้เต็ม", left, waitlist: 0 };
  return { tone: "open", label: "ว่าง", left, waitlist: 0 };
}

/** Totals for the four stat cards. rows: [{ count, limit }] */
export function seatSummary(rows) {
  let entrants = 0, seats = 0, left = 0, waitlist = 0;
  for (const r of rows) {
    const s = seatStatus(r.count, r.limit);
    entrants += Math.max(0, Number(r.count) || 0);
    if (r.limit > 0) { seats += r.limit; left += s.left; waitlist += s.waitlist; }
  }
  return { entrants, seats, left, waitlist };
}

/** Registration window chip relative to today (ISO dates). */
export function registrationWindow(open, close, today) {
  if (open && today < open) return { tone: "soon", date: open, text: "เปิดรับสมัคร" };
  if (close && today > close) return { tone: "closed", date: close, text: "ปิดรับสมัครแล้ว" };
  if (close) return { tone: "open", date: close, text: "ปิดรับสมัคร" };
  return { tone: "open", date: null, text: "เปิดรับสมัคร" };
}
