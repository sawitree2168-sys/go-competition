// Institution portal: turns gt_academy_overview_v1 rows into the numbers and wording on the page.

/** Buddhist-era year of an ISO date ("2026-10-01" → 2569). */
export const thaiYear = (date) => (date ? Number(String(date).slice(0, 4)) + 543 : null);

/** Years that appear in the records, newest first (current year always offered). */
export function yearsOf(records, today = new Date()) {
  const set = new Set(records.map((r) => thaiYear(r.date)).filter(Boolean));
  set.add(today.getFullYear() + 543);
  return [...set].sort((a, b) => b - a);
}

/**
 * Competitions in the records (for the "ทุกรายการ" filter), newest first, optionally only one year.
 * @param {{tournament_id: string, title: string, date: string|null}[]} records
 * @param {number|null} [year]
 */
export function eventsOf(records, year = null) {
  const seen = new Map();
  for (const r of records) {
    if (year && thaiYear(r.date) !== year) continue;
    if (!seen.has(r.tournament_id)) seen.set(r.tournament_id, { id: r.tournament_id, title: r.title, date: r.date });
  }
  return [...seen.values()].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
}

/**
 * year: Buddhist year or null (all); event: tournament id or "" (all).
 * @template {{tournament_id: string, date: string|null}} T
 * @param {T[]} records
 * @param {{year?: number|null, event?: string}} [f]
 * @returns {T[]}
 */
export function filterRecords(records, { year = null, event = "" } = {}) {
  return records.filter((r) => (!year || thaiYear(r.date) === year) && (!event || r.tournament_id === event));
}

/** Top tiles: students, competitions entered, games, wins, losses (draws kept apart). */
export function totals(records, students) {
  const t = { students: students.length, events: new Set(records.map((r) => r.tournament_id)).size, games: 0, wins: 0, losses: 0, draws: 0 };
  for (const r of records) { t.games += r.games; t.wins += r.wins; t.losses += r.losses; t.draws += r.draws; }
  return t;
}

export const placeLabel = (pos) => (pos === 1 ? "ชนะเลิศ" : pos === 2 ? "รองชนะเลิศ" : pos === 3 ? "อันดับ 3" : pos ? `อันดับ ${pos}` : "");
export const winsLine = (r) => (r && r.games ? `ชนะ ${r.wins} จาก ${r.games} เกม` : "ยังไม่มีผล");
const rate = (r) => (r.games ? r.wins / r.games : 0);

/**
 * One line per student for "รายงานการแข่งขัน": latest competition, "ชนะ 4 จาก 5 เกม", and a highlight.
 * @returns {{student, latest, line: string, note: string, tone: "gold"|"up"|"plain"}[]}
 */
export function studentReport(records, students) {
  const by = new Map(students.map((s) => [s.id, []]));
  for (const r of records) by.get(r.athlete_id)?.push(r);
  const rows = [];
  for (const s of students) {
    const mine = (by.get(s.id) ?? []).slice().sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
    const played = mine.filter((r) => r.games > 0);
    const latest = played[0] ?? mine[0] ?? null;
    let note = "ยังไม่ได้ลงแข่ง", tone = "plain";
    if (latest && latest.pos && latest.pos <= 3 && latest.games) { note = placeLabel(latest.pos); tone = "gold"; }
    else if (played.length >= 2 && rate(played[0]) > rate(played[1])) { note = "ชนะมากกว่าครั้งก่อน"; tone = "up"; }
    else if (latest) note = "รอติดตามพัฒนาการ";
    rows.push({ student: s, latest, line: winsLine(latest), note, tone });
  }
  const order = { gold: 0, up: 1, plain: 2 };
  return rows.sort((a, b) => order[a.tone] - order[b.tone]
    || (a.tone === "gold" ? (a.latest?.pos ?? 9) - (b.latest?.pos ?? 9) : 0)
    || (b.latest?.wins ?? -1) - (a.latest?.wins ?? -1) || a.student.name.localeCompare(b.student.name, "th"));
}

/**
 * Win/loss per student over the filtered records (for "สถิติ").
 * @template {{id: string, name: string}} S
 * @param {any[]} records
 * @param {S[]} students
 * @returns {{student: S, events: number, games: number, wins: number, losses: number, draws: number, rate: number|null}[]}
 */
export function studentStats(records, students) {
  return students.map((s) => {
    const mine = records.filter((r) => r.athlete_id === s.id);
    const t = totals(mine, [s]);
    return { student: s, events: t.events, games: t.games, wins: t.wins, losses: t.losses, draws: t.draws, rate: t.games ? Math.round((t.wins / t.games) * 100) : null };
  }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.games - a.games || a.student.name.localeCompare(b.student.name, "th"));
}

/**
 * Placings (for "ผลงาน"), best first.
 * @template {{id: string}} S
 * @param {any[]} records
 * @param {S[]} students
 * @returns {{athlete_id: string, division_id: string, title: string, division: string, date: string|null, pos: number, field: number|null, wins: number, games: number, student: S, label: string}[]}
 */
export function achievements(records, students) {
  const name = new Map(students.map((s) => [s.id, s]));
  return records.filter((r) => r.pos && r.games > 0 && name.has(r.athlete_id))
    .map((r) => ({ ...r, student: name.get(r.athlete_id), label: placeLabel(r.pos) }))
    .sort((a, b) => a.pos - b.pos || String(b.date ?? "").localeCompare(String(a.date ?? "")));
}

export const OUTCOME = {
  pending: { label: "รอผล", tone: "wait" },
  win: { label: "ชนะ", tone: "win" },
  loss: { label: "แพ้", tone: "loss" },
  draw: { label: "เสมอ", tone: "draw" },
  bye: { label: "บาย", tone: "info" },
};

export const APPLICATION_STATUS = {
  pending: "รอผู้จัดตรวจ",
  approved: "ผู้จัดรับแล้ว",
  rejected: "ไม่ผ่าน",
};
export const PAYMENT_STATUS = { pending: "รอชำระ / รอตรวจ", verified: "ชำระแล้ว", waived: "ยกเว้นค่าสมัคร", rejected: "ยอดไม่ถูกต้อง" };

/** Amount still to pay: entries not rejected and not yet paid. */
export function amountDue(items) {
  return items.filter((i) => i.status !== "rejected" && i.payment !== "verified" && i.payment !== "waived")
    .reduce((s, i) => s + (Number(i.fee) || 0), 0);
}

export const ROLE_LABEL = { manager: "เจ้าของสถาบัน", teacher: "ครู", admin: "เจ้าของระบบ" };

export function portalError(code) {
  return ({
    NOT_APPROVED: "รอเจ้าของระบบอนุมัติสิทธิ์ครูก่อน จึงจะเพิ่มนักเรียนหรือสมัครแข่งได้",
    NO_ACCESS: "บัญชีนี้ไม่มีสิทธิ์ดูสถาบันนี้",
    NAME: "กรุณากรอกชื่อและนามสกุล (มีเว้นวรรค)",
    RANK: "กรุณาเลือกระดับฝีมือ",
    ALREADY_HERE: "มีนักเรียนชื่อนี้ในสถาบันแล้ว",
    TOO_MANY: "เลือกได้ครั้งละไม่เกิน 60 คน",
    TOO_MANY_INST: "บัญชีหนึ่งดูแลได้ไม่เกิน 5 สถาบัน",
    REVOKED: "บัญชีนี้ถูกยกเลิกสิทธิ์ที่สถาบันนี้ กรุณาติดต่อผู้ดูแลระบบ",
    NONE: "กรุณาเลือกนักเรียนอย่างน้อย 1 คน",
    NOT_FOUND: "ไม่พบรายการแข่งขันนี้",
    NOT_WEB: "รายการนี้ไม่ได้เปิดรับสมัครผ่านเว็บ",
    CLOSED: "รายการนี้ปิดรับสมัครแล้ว",
    SIGNED_OUT: "กรุณาเข้าสู่ระบบ",
  })[code] ?? "ทำรายการไม่สำเร็จ กรุณาลองใหม่";
}

export const SKIP_REASON = { NOT_STUDENT: "ไม่ใช่นักเรียนของสถาบัน", RANK: "ยังไม่มีระดับฝีมือ", DUPLICATE: "สมัครรุ่นนี้ไว้แล้ว" };

export const baht = (n) => `${Number(n || 0).toLocaleString("th-TH")} บาท`;

/**
 * Ranking for "สถิติพัฒนาการ": students who played get 1, 2, 3… by win rate, then games played
 * (same rate and games = same rank). Students with no games keep rank null and stay at the end.
 * @template {{rate: number|null, games: number}} R
 * @param {R[]} rows already sorted by studentStats
 * @returns {(R & {rank: number|null})[]}
 */
export function rankStats(rows) {
  let last = null, rank = 0;
  return rows.map((r, i) => {
    if (!r.games) return { ...r, rank: null };
    if (!last || last.rate !== r.rate || last.games !== r.games) rank = i + 1;
    last = r;
    return { ...r, rank };
  });
}

/**
 * One point per competition division a student played, oldest first, for the growth chart.
 * @param {any[]} records
 * @param {string} studentId
 * @returns {{key: string, date: string|null, title: string, division: string, games: number, wins: number, losses: number, draws: number, rate: number, pos: number|null, field: number|null}[]}
 */
export function studentGrowth(records, studentId) {
  return records.filter((r) => r.athlete_id === studentId && r.games > 0)
    .slice().sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || String(a.date ?? "").localeCompare(String(b.date ?? "")) || String(a.title).localeCompare(String(b.title)))
    .map((r) => ({ key: r.division_id, date: r.date ?? null, title: r.title, division: r.division, games: r.games, wins: r.wins,
                   losses: r.losses, draws: r.draws, rate: Math.round((r.wins / r.games) * 100), pos: r.pos ?? null, field: r.field ?? null }));
}

/**
 * Kyu level a division is played at — its strongest end (5-6 คิว → 5). Friendship 9×9 = 15, 13×13 = 13.
 * Dan divisions and divisions not split by skill (U10, ages, leagues) give null: never guess a dan level.
 * @param {string|null|undefined} name
 * @returns {number|null}
 */
export function kyuOfDivision(name) {
  const s = String(name ?? "").toLowerCase().replace(/\s+/g, " ");
  if (!s || /dan|ดั้ง/.test(s)) return null;
  if (/9\s*[x×]\s*9/.test(s)) return 15;
  if (/13\s*[x×]\s*13/.test(s)) return 13;
  const range = s.match(/(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*(?:kyu|คิว|k\b)/);
  if (range) return Math.min(Number(range[1]), Number(range[2]));
  const one = s.match(/(\d{1,2})\s*(?:kyu|คิว)/);
  return one ? Number(one[1]) : null;
}

/** "5 คิว" / "5 Kyu" → 5; dan or unknown → null. */
export function kyuOfRank(rank) {
  const s = String(rank ?? "").toLowerCase();
  if (!s || /dan|ดั้ง/.test(s)) return null;
  const m = s.match(/(\d{1,2})\s*(?:kyu|คิว|k\b)/);
  return m ? Number(m[1]) : null;
}

/**
 * "Consider moving up": the student's last two kyu-division results were both strong (1st place or ≥ 80% wins)
 * at the same level, or the latest one was won without losing. Kyu only — dan levels come from the association.
 * @param {any[]} records
 * @param {string} studentId
 * @returns {{kyu: number, division: string, reason: string}|null}
 */
export function moveUpHint(records, studentId) {
  const played = records
    .filter((r) => r.athlete_id === studentId && r.games > 0 && kyuOfDivision(r.division) !== null)
    .slice().sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  if (!played.length) return null;
  const strong = (r) => r.pos === 1 || r.wins / r.games >= 0.8;
  const [a, b] = played;
  const kyu = kyuOfDivision(a.division);
  if (kyu === 1) return null; // already the top kyu division: next step is the dan exam, which the association decides
  if (a.pos === 1 && a.wins === a.games && a.games >= 3) return { kyu, division: a.division, reason: `ชนะเลิศไม่แพ้เลยใน ${a.title}` };
  if (b && kyuOfDivision(b.division) === kyu && strong(a) && strong(b)) return { kyu, division: a.division, reason: "ผลงานดีต่อเนื่อง 2 รายการในรุ่นเดียวกัน" };
  return null;
}

/**
 * The division of an open event that fits a student's kyu level (the narrowest kyu range that contains it).
 * @param {{id: string, name: string}[]} divisions
 * @param {number|null} kyu
 */
export function suggestDivision(divisions, kyu) {
  if (kyu == null) return null;
  const fits = divisions.map((d) => {
    const s = String(d.name).toLowerCase();
    if (/dan|ดั้ง/.test(s)) return null;
    const r = s.match(/(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*(?:kyu|คิว|k\b)/);
    const lo = r ? Math.min(+r[1], +r[2]) : kyuOfDivision(d.name);
    const hi = r ? Math.max(+r[1], +r[2]) : lo;
    return lo != null && hi != null && kyu >= lo && kyu <= hi ? { d, width: hi - lo } : null;
  }).filter(Boolean).sort((x, y) => x.width - y.width);
  return fits[0]?.d ?? null;
}
