// Competition-day timing helpers (Thai time). Pure functions, tested in event-day.test.mjs.

const TZ = "Asia/Bangkok";

/** Today's date in Thailand as YYYY-MM-DD. */
export function thaiToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Minutes since midnight, Thai time. */
export function thaiMinutes(now = new Date()) {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":").map(Number);
  return h * 60 + m + now.getSeconds() / 60;
}

/** "9:05" / "09:05" → minutes since midnight, or null. */
export function parseHHMM(text) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(text ?? "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Minutes from now until a planned time ("HH:MM") — negative when late.
 * null when there is no time, or the event is not today (a countdown on another day would mislead).
 */
export function minutesUntil(hhmm, eventDate, now = new Date()) {
  const at = parseHHMM(hhmm);
  if (at === null) return null;
  if (eventDate && eventDate !== thaiToday(now)) return null;
  let d = at - thaiMinutes(now);
  // a schedule that runs past midnight: 00:10 seen at 23:50 is 20 minutes away, not 23 hours late
  if (d < -12 * 60) d += 24 * 60;
  else if (d > 12 * 60) d -= 24 * 60;
  return d;
}

/** "อีก 4 นาที" / "ตอนนี้" / "เลยมา 3 นาที" / "อีก 1 ชม. 5 นาที". */
export function countdownText(min) {
  if (min === null || min === undefined) return "";
  const r = Math.round(min);
  if (r === 0) return "ถึงเวลาแล้ว";
  const a = Math.abs(r), h = Math.floor(a / 60), m = a % 60;
  const span = h ? `${h} ชม.${m ? ` ${m} นาที` : ""}` : `${m} นาที`;
  return r > 0 ? `อีก ${span}` : `เลยมา ${span}`;
}

/** How urgent a planned time is: late (past), soon (≤ 10 min), later, or none. */
export function urgency(min) {
  if (min === null || min === undefined) return "none";
  if (min < 0) return "late";
  if (min <= 10) return "soon";
  return "later";
}

/** "3:20" elapsed since a timestamp (ms). */
export function elapsedText(sinceMs, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - sinceMs) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
