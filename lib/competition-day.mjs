/**
 * Pure helpers for the organiser's competition-day screens. No DB access here, so every rule
 * can be tested on its own (see competition-day.test.mjs).
 */
import { parseRankStrength } from "./swiss-round.mjs";

/** Score = wins + byes, counted only from verified results (same rule as gt_division_standings_v2). */
export function scoresFrom(athleteIds, matches, byes) {
  const score = new Map(athleteIds.map((id) => [id, 0]));
  const wins = new Map(athleteIds.map((id) => [id, 0]));
  for (const m of matches) {
    if (m.state !== "verified" || !m.winner_athlete_id) continue;
    if (wins.has(m.winner_athlete_id)) wins.set(m.winner_athlete_id, wins.get(m.winner_athlete_id) + 1);
  }
  for (const id of athleteIds) score.set(id, wins.get(id));
  for (const b of byes) if (score.has(b.athlete_id)) score.set(b.athlete_id, score.get(b.athlete_id) + 1);
  return { score, wins };
}

/**
 * Where a pool stands: the last published round, whether every game in it has a result,
 * and which round can be paired next (null when the last round is still being played or all rounds are done).
 */
export function roundState(matches, byes, totalRounds = 5) {
  const live = matches.filter((m) => m.state !== "void");
  const last = Math.max(0, ...live.map((m) => m.round_number), ...byes.map((b) => b.round_number));
  const pending = live.filter((m) => m.state !== "verified").length;
  const finished = pending === 0;
  return {
    lastRound: last,
    pending,
    finished,
    nextRound: finished && last < totalRounds ? last + 1 : null,
    complete: finished && last >= totalRounds,
  };
}

/**
 * Turns registrations into proposeSwissRound players. `strength` comes from the rank label when known;
 * a tiny seeded jitter breaks ties so equal players are drawn at random (and "สุ่มใหม่" can re-draw),
 * without ever overriding a real score or rank difference.
 */
/**
 * @param {{athlete_id: string, rank?: string | null}[]} registrations
 * @param {any[]} matches
 * @param {any[]} byes
 * @param {number | string} [seed]
 */
export function pairingPlayers(registrations, matches, byes, seed = 1) {
  const ids = registrations.map((r) => r.athlete_id);
  const { score } = scoresFrom(ids, matches, byes);
  const rand = mulberry32(hash(String(seed)));
  return registrations.map((r) => {
    const base = parseRankStrength(r.rank ?? "") ?? 0;
    return { id: r.athlete_id, score: score.get(r.athlete_id), strength: base + rand() * 0.01 };
  });
}

/** Friendship divisions: medal by number of wins, using the thresholds stored on the division. */
export function friendshipAward(wins, division) {
  if (division?.award_scheme && division.award_scheme !== "friendship_wins") return null;
  const g = division?.friendship_gold_min_wins ?? 4, s = division?.friendship_silver_min_wins ?? 3, b = division?.friendship_bronze_min_wins ?? 2;
  if (wins >= g) return "gold";
  if (wins >= s) return "silver";
  if (wins >= b) return "bronze";
  return null;
}

/**
 * Matches sheet entrants to divisions of the event. `keyOf` normalises a division name (divisionKey),
 * so "1-2 Kyu" (sheet) finds "1–2 คิว" (database). Unmatched rows are returned for the organiser to fix.
 */
export function mapEntrantsToDivisions(entrants, divisions, keyOf) {
  const byKey = new Map(divisions.map((d) => [keyOf(d.name), d.id]));
  const rows = [], unmatched = [];
  for (const e of entrants) {
    const id = byKey.get(keyOf(e.division_name || ""));
    if (id) rows.push({ source_row: e.source_row, division_id: id });
    else unmatched.push(e);
  }
  return { rows, unmatched };
}

/** Thai message for an error raised by the organiser database functions. */
export function staffErrorMessage(message = "") {
  const m = String(message);
  const table = [
    ["STAFF_ONLY", "บัญชีนี้ไม่มีสิทธิ์ผู้จัด"],
    ["POOLS_LOCKED_AFTER_PAIRING", "ออกคู่ไปแล้ว จึงเปลี่ยนสายไม่ได้ (ยกเลิกรอบที่ 1 ก่อน)"],
    ["ROUND_OUT_OF_SEQUENCE", "รอบไม่ต่อเนื่อง กรุณาโหลดหน้าใหม่"],
    ["PREVIOUS_ROUND_NOT_FINISHED", "ยังกรอกผลรอบก่อนไม่ครบทุกโต๊ะ"],
    ["PAIRING_MUST_COVER_EACH_PLAYER_ONCE", "รายชื่อในคู่ไม่ตรงกับผู้เล่นในสาย กรุณาโหลดหน้าใหม่แล้วจับคู่อีกครั้ง"],
    ["ONLY_LATEST_ROUND_CAN_BE_CANCELLED", "ยกเลิกได้เฉพาะรอบล่าสุด"],
    ["ROUND_HAS_RESULTS", "รอบนี้มีผลแล้ว จึงยกเลิกไม่ได้"],
    ["LATER_ROUND_ALREADY_PUBLISHED", "ออกคู่รอบถัดไปแล้ว จึงแก้ผลรอบนี้ไม่ได้"],
    ["duplicate key", "มีคู่นี้หรือโต๊ะนี้อยู่แล้ว กรุณาโหลดหน้าใหม่"],
    ["JWT", "หมดเวลาการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่"],
  ];
  for (const [code, text] of table) if (m.includes(code)) return text;
  return "ทำรายการไม่สำเร็จ: " + m.slice(0, 120);
}

function hash(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return h >>> 0;
}
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
