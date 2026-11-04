/**
 * GO TOURNAMENT athlete import preflight.
 * Usage: node scripts/preflight-athletes.mjs exported-master.csv
 * Read-only. No network requests, database writes, or secrets.
 * Export 1go "บัญชีนักกีฬา" as UTF-8 CSV before running.
 */
import { readFileSync } from "node:fs";

export function parseCsv(source) {
  const rows = []; let row = [], cell = "", quoted = false;
  source = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(cell); if (row.some(x => x !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  row.push(cell); if (row.some(x => x !== "")) rows.push(row);
  return rows;
}

export function inspectAthletes(csv) {
  const rows = parseCsv(csv);
  const headers = rows.shift() ?? [];
  const required = ["GO ID", "ชื่อ-นามสกุล", "ระดับปัจจุบัน"];
  for (const name of required) if (!headers.includes(name)) throw new Error(`Missing column: ${name}`);
  const index = Object.fromEntries(headers.map((h, i) => [h, i]));
  const get = (row, key) => String(row[index[key]] ?? "").trim();
  const goIds = new Map(), names = new Map(), blocked = [], candidates = [];
  for (const [i, row] of rows.entries()) {
    const line = i + 2, goId = get(row, "GO ID"), name = get(row, "ชื่อ-นามสกุล");
    const rank = get(row, "ระดับปัจจุบัน");
    if (!/^GO[0-9A-Za-z-]+$/.test(goId) || !name) {
      blocked.push({ line, goId, reason: "missing_or_invalid_identity" }); continue;
    }
    if (goIds.has(goId)) {
      blocked.push({ line, goId, reason: "duplicate_go_id", otherLine: goIds.get(goId) });
      continue;
    }
    goIds.set(goId, line);
    const normalizedName = name.replace(/\s+/g, " ").toLocaleLowerCase("th");
    const siblings = names.get(normalizedName) ?? [];
    siblings.push({ line, goId }); names.set(normalizedName, siblings);
    candidates.push({ line, goId, fullName: name, rank, personId: get(row, "person_id"), accountStatus: get(row, "account_status") });
  }
  const ambiguous = [...names.values()].filter(group => group.length > 1);
  const ambiguousIds = new Set(ambiguous.flat().map(x => x.goId));
  return {
    sourceRows: rows.length,
    readyForReview: candidates.filter(x => !ambiguousIds.has(x.goId)).length,
    blocked,
    sameNameNeedsManualReview: ambiguous,
    candidates: candidates.filter(x => !ambiguousIds.has(x.goId)),
    note: "Dry-run only. Do not auto-merge names or import without matching existing Supabase GO IDs and approval."
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const file = process.argv[2];
  if (!file) { console.error("Usage: node scripts/preflight-athletes.mjs master.csv"); process.exitCode = 2; }
  else {
    try {
      const { candidates, ...report } = inspectAthletes(readFileSync(file, "utf8"));
      console.log(JSON.stringify(report, null, 2));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
