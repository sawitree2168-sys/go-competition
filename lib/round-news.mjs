// Automatic news for the ข่าว tab: one item per finished round, written from verified results only.
// Scores follow the standings rule: win 1, draw ½, bye 1, everything else 0.

/** Numeric strength of a rank label ("7 คิว", "9 Kyu", "5k", "1 ดั้ง", "2d"); higher is stronger. null if unknown. */
export function rankValue(label) {
  const t = String(label ?? "").trim().toLowerCase();
  let m = t.match(/(\d+)\s*(?:k\b|kyu|คิว)/);
  if (m) return -Number(m[1]);
  m = t.match(/(\d+)\s*(?:d\b|dan|ดั้ง|ดั้น)/);
  if (m) return Number(m[1]) - 1;
  return null;
}

/** Compact rank for news text: "5k", "1d". */
export function rankShort(label) {
  const v = rankValue(label);
  if (v === null) return String(label ?? "").trim();
  return v < 0 ? `${-v}k` : `${v + 1}d`;
}

/** "2", "2½", "½". */
export function scoreText(x) {
  const whole = Math.floor(x), half = x - whole >= 0.5;
  return half ? (whole ? `${whole}½` : "½") : String(whole);
}

function nameList(names, max) {
  if (names.length <= max) return names.length > 1 ? `${names.slice(0, -1).join(", ")} และ${names.at(-1)}` : names[0] ?? "";
  return `${names.slice(0, max).join(", ")} และอีก ${names.length - max} คน`;
}

function resultShort(m) {
  const side = m.winner_athlete_id === m.black_athlete_id ? "B" : "W";
  if (m.result_margin === "R") return `${side}+R`;
  if (m.result_margin === "T") return `${side}+T`;
  if (m.result_margin) return `${side}+${m.result_margin}`;
  return `${side}+`;
}

/** How the round's games ended, e.g. "จบด้วยการยอมแพ้ 4 เกม และนับแต้ม 2 เกม". Empty when nothing is known. */
function endings(games) {
  let resign = 0, count = 0, time = 0, forfeit = 0, draw = 0;
  for (const m of games) {
    if (m.result_code === "draw") draw++;
    else if (m.result_code === "black_win_forfeit" || m.result_code === "white_win_forfeit" || m.result_code === "double_forfeit") forfeit++;
    else if (m.result_margin === "R") resign++;
    else if (m.result_margin === "T") time++;
    else if (m.result_margin && /\d/.test(m.result_margin)) count++;
  }
  const parts = [
    resign && `การยอมแพ้ ${resign} เกม`, count && `นับแต้ม ${count} เกม`, time && `หมดเวลา ${time} เกม`,
    draw && `เสมอ ${draw} เกม`, forfeit && `ชนะผ่าน (คู่ไม่มา) ${forfeit} เกม`,
  ].filter(Boolean);
  if (!parts.length) return "";
  return "จบด้วย" + (parts.length > 1 ? `${parts.slice(0, -1).join(" ")} และ${parts.at(-1)}` : parts[0]);
}

/**
 * News items for one pool, newest round first.
 * @param {{matches: any[], byes: {round_number:number, athlete_id:string}[], people: Record<string,{name:string, rank?:string|null}>}} input
 */
export function roundNews({ matches, byes, people }) {
  const nameOf = (id) => people[id]?.name ?? "ผู้เข้าแข่งขัน";
  const rounds = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b);
  const items = [];
  for (const r of rounds) {
    const games = matches.filter((m) => m.round_number === r);
    if (!games.length || games.some((m) => m.state !== "verified")) continue;   // only finished rounds

    const score = new Map();
    const add = (id, p) => score.set(id, (score.get(id) ?? 0) + p);
    for (const m of matches) {
      if (m.round_number > r || m.state !== "verified") continue;
      for (const id of [m.black_athlete_id, m.white_athlete_id]) {
        add(id, m.result_code === "draw" ? 0.5 : m.winner_athlete_id === id ? 1 : 0);
      }
    }
    for (const b of byes) if (b.round_number <= r) add(b.athlete_id, 1);

    const ranked = [...score].sort((a, b) => b[1] - a[1] || nameOf(a[0]).localeCompare(nameOf(b[0]), "th"));
    const top = ranked[0]?.[1] ?? 0;
    const leaders = ranked.filter(([, s]) => s === top).map(([id]) => nameOf(id));
    const second = ranked.find(([, s]) => s < top)?.[1];
    const chasers = second === undefined ? [] : ranked.filter(([, s]) => s === second).map(([id]) => nameOf(id));
    const perfect = top === r;
    const ends = endings(games);
    const tables = games.length;

    let headline, deck, lead;
    if (leaders.length === 1) {
      headline = perfect && r > 1 ? `${leaders[0]} ชนะรวด ${r} เกม ขึ้นนำเดี่ยว` : `${leaders[0]} ขึ้นนำเดี่ยว ${scoreText(top)} คะแนน`;
      deck = `จบรอบที่ ${r} ผู้นำเก็บ ${scoreText(top)} คะแนน${perfect ? "เต็ม" : ""}`
        + (second !== undefined ? ` ตามด้วย${chasers.length > 1 ? "กลุ่มไล่ล่า" : chasers[0]} ${scoreText(second)} คะแนน` : "");
      lead = second !== undefined ? `ตามมาด้วย ${nameList(chasers, 3)} (${scoreText(second)} คะแนน)` : "";
    } else {
      headline = `${leaders.length} ผู้เล่นนำร่วมที่ ${scoreText(top)} คะแนน`;
      deck = `รอบที่ ${r} แข่งครบ ${tables} กระดาน${ends ? ` ${ends}` : ""}`;
      lead = `ผู้นำร่วมได้แก่ ${nameList(leaders, 8)}`;
    }
    const body = `รอบที่ ${r} แข่งครบ ${tables} กระดาน${ends ? ` ${ends}` : ""}${lead ? ` ${lead}` : ""}`;

    const upsets = [];
    for (const m of games) {
      if (!m.winner_athlete_id || !["black_win", "white_win"].includes(m.result_code ?? (m.winner_athlete_id === m.black_athlete_id ? "black_win" : "white_win"))) continue;
      const loser = m.winner_athlete_id === m.black_athlete_id ? m.white_athlete_id : m.black_athlete_id;
      const wv = rankValue(people[m.winner_athlete_id]?.rank), lv = rankValue(people[loser]?.rank);
      if (wv === null || lv === null || lv - wv < 2) continue;   // winner at least two levels weaker
      upsets.push(`${nameOf(m.winner_athlete_id)} (${rankShort(people[m.winner_athlete_id]?.rank)}) ชนะ ${nameOf(loser)} (${rankShort(people[loser]?.rank)}) ${resultShort(m)}`);
    }

    items.push({ round: r, headline, deck, body, upsets, tables, leaderScore: top, leaders });
  }
  return items.reverse();
}
