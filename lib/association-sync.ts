// อัปเดตข้อมูลสมาคมอัตโนมัติ: อ่านชีท "ทำเนียบดั้งไทยปี69" แล้วแปลงเป็นข้อมูลสำหรับ gt_sync_association_v1.
// Port of scripts/import-history-2026.py (wall lists + direct A/B result tables), used only for tabs that are
// not on the site yet. Nothing is guessed: a result enters only when both sides agree (reciprocal wall list
// or explicit ชนะ/แพ้ pair); anything else goes to the review list.
import { createHash } from "node:crypto";

export const ASSOCIATION_SHEET_ID = "1-Dl1blZgqCVLDwPEevfEevLI_ve-X6cCOIUD1TlQyV4";
export const DIRECTORY_TAB = "รวม";

export type Tab = { tab: string; gid: number | null; rows: string[][] };
export type RegistryPerson = { go_id: string; name: string; dan: number | null };

const sha = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

/** Same normalisation as the Python importer: drop brackets, titles, trailing dan marks and spaces. */
export function norm(s: unknown): string {
  let t = String(s ?? "").replace(/\[[^\]]*\]/g, "");
  t = t.trim().replace(/^(ด\.ช\.|ด\.ญ\.|นาย|นางสาว|นาง)\s*/, "");
  t = t.replace(/\s*\d+\s*(?:dan|ดั้ง|d)\*?\s*$/i, "").replace(/\s+\d+\s*$/, "");
  return t.replace(/[\s​-‍﻿]/g, "").toLowerCase();
}
export function integer(s: unknown): number | null {
  const v = Number(String(s ?? "").replace(/,/g, "").trim());
  return String(s ?? "").trim() !== "" && Number.isFinite(v) && Number.isInteger(v) ? v : null;
}
const num = (s: unknown): number | null => {
  const t = String(s ?? "").replace(/,/g, "").trim();
  if (!t || t === "-") return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

/** Tab "151169" = 15/11/2569 (DDMMYY, Buddhist Era) → "2026-11-15". */
export function tabDate(tab: string): string | null {
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(tab.trim());
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = 2500 + +m[3] - 543;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- แท็บ "รวม": ทำเนียบดั้ง + คะแนน
export function parseDirectory(rows: string[][]) {
  const head = rows.findIndex((r) => String(r[0] ?? "").trim() === "เลขที่ดั้ง");
  if (head < 0) throw new Error("แท็บรวม: ไม่พบหัวตาราง เลขที่ดั้ง");
  const h = rows[head].map((v) => String(v ?? "").trim());
  const col = (name: string) => h.findIndex((v) => v === name);
  const cName = col("ชื่อ-สกุล"), cYear = col("ปีที่ได้ดั้ง"), cRank = col("ระดับดั้ง"), cDiamond = col("เพชร"), cMax = col("คะแนนสูงสุดที่เคยได้");
  if ([cName, cRank].some((c) => c < 0)) throw new Error("แท็บรวม: หัวคอลัมน์เปลี่ยน");
  const dates = h.map((v, i) => { const m = /วันที่\s*(\d{6})/.exec(v); const d = m ? tabDate(m[1]) : null; return d ? { i, d } : null; })
    .filter((x): x is { i: number; d: string } => !!x).sort((a, b) => a.d.localeCompare(b.d));
  const directory: { dan: string; name: string; rank: string; diamond: boolean; awarded_raw: string | null; awarded_year: number | null; max_score: number | null }[] = [];
  const ratings: { dan: number; date: string; score: number; played: boolean }[] = [];
  for (const r of rows.slice(head + 1)) {
    const dan = integer(r[0]);
    const name = String(r[cName] ?? "").trim().replace(/\s+/g, " ");
    if (dan === null || !name) continue;
    // (ชื่อในวงเล็บ) = เลขดั้งที่ประมูลไป ยังไม่ได้สอบผ่าน: เว็บแสดงแค่ว่าประมูลแล้ว ไม่มีระดับ ไม่มีคะแนน
    // (ชีทเขียนระดับว่า "กิตติมศักดิ์" แต่ไม่มีดั้งกิตติมศักดิ์ จึงไม่เก็บค่านี้)
    const auctioned = /^\(.*\)$/.test(name);
    const yearRaw = cYear >= 0 ? String(r[cYear] ?? "").trim() : "";
    // ปีที่ได้ดั้ง (พ.ศ.): keep only plausible years; typos such as 2652 or a ค.ศ. 1962 are left out, not guessed.
    const yMatch = /(\d{4})\s*$/.exec(yearRaw);
    const thisYearBE = new Date().getUTCFullYear() + 543;
    const y = yMatch && +yMatch[1] >= 2400 && +yMatch[1] <= thisYearBE ? yMatch : null;
    directory.push({
      dan: String(dan), name, rank: auctioned ? "" : String(r[cRank] ?? "").trim().replace(/^กิตติมศักดิ์$/, ""),
      diamond: cDiamond >= 0 && String(r[cDiamond] ?? "").trim() !== "",
      awarded_raw: yearRaw || null, awarded_year: y ? +y[1] : null,
      max_score: !auctioned && cMax >= 0 ? num(r[cMax]) : null,
    });
    if (auctioned) continue;
    let prev: number | null = null;
    for (const { i, d } of dates) {
      const s = num(r[i]);
      if (s === null) continue;
      if (prev === null || s !== prev) ratings.push({ dan, date: d, score: s, played: prev !== null });
      prev = s;
    }
  }
  return { directory, ratings };
}

// ---------------------------------------------------------------- แท็บวันที่: ผลการแข่งขัน
type Game = { id: string; event_id: string; division: string; round: string; board: string | null; a: string; b: string | null; winner: string | null; kind: string; result: string; source_url: string; evidence: Record<string, unknown> };

export function parseCompetitionTabs(tabs: Tab[], registry: RegistryPerson[], batch: string) {
  const dans = new Map<number, RegistryPerson>();
  const names = new Map<string, RegistryPerson[]>();
  for (const p of registry) {
    if (p.dan !== null && !dans.has(p.dan)) dans.set(p.dan, p);
    const k = norm(p.name); names.set(k, [...(names.get(k) ?? []), p]);
  }
  const people = new Map<string, { id: string; name: string; go_id: string | null }>();
  const links: { namespace: string; identifier: string; person_id: string; basis: string; observed_name: string }[] = [];
  const events: { id: string; title: string; year: number; date: string | null; date_status: string; source_url: string }[] = [];
  const games: Game[] = [];
  const reviews = new Map<string, { key: string; reason: string; details: unknown }>();
  const observations: { key: string; person_id: string; event_id: string; division: string; placing: number; payload: unknown }[] = [];
  const sources: { key: string; hash: string; url: string; payload: unknown }[] = [];
  const review = (key: string, reason: string, details: unknown) => reviews.set(`${key}:${reason}`, { key, reason, details });
  const teams = new Set(["iq-up", "goaddicted", "brightgo", "dragongo", "gomaster", "sualisensei", "trinitygoacademy", "happygoacademy", "gohouse", "gofamily", "happygenius", "thinkkub", "บ้านโกะbyครูได๋", "ครูเตอร์สอนหมากล้อม", "aigokarnmaklom", "wangmakgo", "mr.goacademy", "gosense"]);

  const person = (dan: unknown, name: unknown, event: string): string => {
    const d = integer(dan), p = d !== null ? dans.get(d) : undefined;
    const n = norm(name);
    const suffix = p && n.startsWith(norm(p.name)) ? n.slice(norm(p.name).length) : null;
    // A matching number alone is not enough: the names must agree too.
    if (p && suffix !== null && (suffix === "" || teams.has(suffix) || suffix.startsWith("โรงเรียน"))) {
      people.set(p.go_id, { id: p.go_id, name: p.name, go_id: p.go_id });
      links.push({ namespace: "association_dan", identifier: String(d), person_id: p.go_id, basis: suffix ? "dan_name_and_explicit_institution_suffix" : "dan_and_normalized_name", observed_name: String(name) });
      return p.go_id;
    }
    if (d === null && (names.get(n)?.length ?? 0) === 1) {
      const q = names.get(n)![0];
      people.set(q.go_id, { id: q.go_id, name: q.name, go_id: q.go_id });
      return q.go_id;
    }
    const key = "local:" + sha([event, String(dan ?? "None"), n]).slice(0, 24);
    people.set(key, { id: key, name: String(name ?? "").trim(), go_id: null });
    review(key, p ? "identity_name_mismatch" : "identity_unresolved", { dan, name, candidate: p?.go_id ?? null, event });
    return key;
  };

  for (const t of tabs) {
    const rows = t.rows, tab = t.tab, event = "association:" + tab;
    const title = rows.length ? (rows[0].find((v) => String(v ?? "").trim()) ?? "").toString().trim() : "";
    const source_url = `https://docs.google.com/spreadsheets/d/${ASSOCIATION_SHEET_ID}/edit${t.gid !== null ? `#gid=${t.gid}` : ""}`;
    if (!title) { review(event, "event_edition_review", { tab }); continue; }
    sources.push({ key: event, hash: sha(rows), url: source_url, payload: { tab, rows } });
    const date = tabDate(tab);
    events.push({ id: event, title, year: date ? +date.slice(0, 4) : 2026, date, date_status: date ? "verified" : "year_only", source_url });
    const before = games.length;

    // Wall lists: "รอบ N" columns, opponent place + result sign, checked from both sides.
    const headers: [number, [number, number][]][] = [];
    rows.forEach((r, i) => {
      const rc: [number, number][] = [];
      r.forEach((v, j) => { const m = /^รอบ\s*(\d+)$/.exec(String(v ?? "").trim()); if (m) rc.push([j, +m[1]]); });
      if (rc.length && r.length > 2 && ["Name", "ชื่อ-สกุล"].includes(String(r[1] ?? "").trim())) headers.push([i, rc]);
    });
    const consumed = new Set<number>();
    headers.forEach(([hi, roundcols], hIndex) => {
      const end = headers[hIndex + 1]?.[0] ?? rows.length;
      const players = new Map<number, { row: number; r: string[]; id: string; dan: number | null }>();
      const division = hi > 1 ? (rows[hi - 1].slice(0, 2).find((v) => String(v ?? "").trim()) ?? "ไม่ระบุรุ่น").toString().trim() : "ไม่ระบุรุ่น";
      for (let i = hi + 1; i < end; i++) {
        const r = rows[i];
        if (!(r.length > 2 && integer(r[0]) !== null && r[1] && !/^[\d.,\s]+$/.test(String(r[1])))) continue;
        const place = integer(r[0])!;
        if (players.has(place)) { review(`${event}:${hi}:${i}`, "duplicate_place", { row: i + 1 }); continue; }
        const pid = person(r[2], r[1], event);
        players.set(place, { row: i + 1, r, id: pid, dan: integer(r[2]) }); consumed.add(i);
        observations.push({ key: `${event}:${hi}:${i}`, person_id: pid, event_id: event, division, placing: place, payload: { source_row: i + 1, values: r } });
      }
      const seen = new Set<string>();
      for (const [place, a] of players) {
        for (const [c, rnd] of roundcols) {
          const token = String(a.r[c] ?? "").trim();
          if (!token) continue;
          const key = `${event}:wall:${hi + 1}:${rnd}:${place}`;
          const m = /^(\d+)\s*([+\-=])$/.exec(token);
          if (!m) { review(key, "round_token_review", { token, row: a.row }); continue; }
          const opp = +m[1], sign = m[2], pair = `${Math.min(place, opp)}-${Math.max(place, opp)}-${rnd}`;
          if (seen.has(pair)) continue;
          seen.add(pair);
          const b = players.get(opp);
          if (!b || opp === place) { review(key, "opponent_missing", { token, row: a.row }); continue; }
          const back = String(b.r[c] ?? "").replace(/\s/g, "");
          if (back !== `${place}${{ "+": "-", "-": "+", "=": "=" }[sign]}`) { review(key, "non_reciprocal_result", { a_row: a.row, b_row: b.row, a: token, b: back }); continue; }
          if (a.id === b.id) { review(key, "self_match", { row: a.row }); continue; }
          games.push({ id: `${event}:wall:${hi + 1}:r${rnd}:p${Math.min(place, opp)}-${Math.max(place, opp)}`, event_id: event, division, round: String(rnd), board: null,
            a: a.id, b: b.id, winner: sign === "+" ? a.id : sign === "-" ? b.id : null, kind: "played", result: sign === "=" ? "draw" : "decisive", source_url,
            evidence: { source: event, rows: [a.row, b.row], verification: "reciprocal_walllist", dan_a: a.dan, dan_b: b.dan } });
        }
      }
    });

    // Direct A/B tables: two "เลขที่ดั้ง" columns and an explicit ชนะ/แพ้/เสมอ on each side.
    let header: [number, number, string[]] | null = null, division = "ไม่ระบุรุ่น";
    rows.forEach((r, i) => {
      const ids = r.map((v, j) => (["เลขที่ดั้ง", "เลขดั้ง"].includes(String(v ?? "").trim()) ? j : -1)).filter((j) => j >= 0);
      if (ids.length >= 2 && ids[0] < 12) {
        header = [ids[0], ids[1], r];
        if (i && rows[i - 1]?.[0] && !String(rows[i - 1][0]).startsWith("คู่ที่")) division = String(rows[i - 1][0]).trim();
        return;
      }
      if (!header) return;
      const [ia, ib, h] = header;
      if (r.length <= ib + 1 || !r[ia + 1] || !r[ib + 1] || integer(r[ia]) === null || integer(r[ib]) === null) return;
      if (consumed.has(i) && ia === 0) return;
      const res = (v: unknown) => ["ชนะ", "แพ้", "เสมอ"].includes(String(v ?? "").trim());
      const left = r.slice(ia + 2, ib).filter(res).map((v) => String(v).trim());
      const right = r.slice(ib + 2, Math.min(r.length, ib + 6)).filter(res).map((v) => String(v).trim());
      if (!left.length) return;
      const key = `${event}:direct:${i + 1}`;
      const rnd = ia >= 2 && ["รอบ", "รอบที่", "รอบการแข่งขัน"].includes(String(h[0] ?? "").trim()) ? String(r[0] ?? "").trim() : "";
      const okPair = !right.length || ["ชนะ|แพ้", "แพ้|ชนะ", "เสมอ|เสมอ"].includes(`${left[0]}|${right[0]}`);
      if (!rnd || !okPair) { review(key, "direct_round_or_result_review", { row: i + 1, values: r.slice(0, ib + 6) }); return; }
      const a = person(r[ia], r[ia + 1], event), b = person(r[ib], r[ib + 1], event);
      if (a === b) return;
      games.push({ id: key, event_id: event, division, round: rnd, board: ia === 2 ? String(r[1] ?? "") : null, a, b,
        winner: left[0] === "ชนะ" ? a : left[0] === "แพ้" ? b : null, kind: "played", result: left[0] === "เสมอ" ? "draw" : "decisive", source_url,
        evidence: { source: event, rows: [i + 1], verification: "explicit_result", dan_a: integer(r[ia]), dan_b: integer(r[ib]) } });
    });
    if (games.length === before) review(event, "event_adapter_pending", { title, rows: rows.length });
  }
  const unique = [...new Map(games.map((g) => [g.id, g])).values()];
  return {
    batch, people: [...people.values()], links: [...new Map(links.map((l) => [`${l.namespace}|${l.identifier}`, l])).values()],
    events, games: unique, reviews: [...reviews.values()], observations, sources,
    summary: { tabs: tabs.map((t) => t.tab), events: events.length, games: unique.length, reviews: reviews.size },
  };
}

/** New dan numbers that belong to an existing profile: same normalised name, exactly one profile, no dan yet. */
export function newDanLinks(directory: { dan: string; name: string }[], registry: RegistryPerson[]) {
  const knownDans = new Set(registry.filter((p) => p.dan !== null).map((p) => p.dan));
  const byName = new Map<string, RegistryPerson[]>();
  for (const p of registry) { const k = norm(p.name); byName.set(k, [...(byName.get(k) ?? []), p]); }
  const out: { dan: number; go_id: string }[] = [];
  for (const d of directory) {
    const dan = Number(d.dan);
    if (knownDans.has(dan) || /^\(.*\)$/.test(d.name)) continue;
    const same = byName.get(norm(d.name)) ?? [];
    if (same.length === 1 && same[0].dan === null) out.push({ dan, go_id: same[0].go_id });
  }
  return out;
}
