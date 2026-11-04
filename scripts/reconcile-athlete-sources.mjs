/**
 * Deterministic identity reconciliation before any athlete write.
 * No fuzzy matching, no writes, and no sensitive authentication fields.
 */
export const normalizeName = value => String(value ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
export const validGoId = value => /^GO[0-9A-Za-z-]+$/.test(String(value ?? ""));

export function reconcileAthleteSources(sources, existingAthletes = []) {
  const byGoId = new Map(), byName = new Map(), existing = new Map();
  const blocked = [], ready = [], pending = [];
  for (const row of existingAthletes) {
    if (!validGoId(row.go_id)) throw new Error("Existing athlete has invalid GO ID");
    existing.set(row.go_id, row);
  }
  for (const row of sources) {
    const goId = String(row.goId ?? "").trim(), fullName = normalizeName(row.fullName);
    const sourceKey = String(row.sourceKey ?? "").trim(), sourceSystem = String(row.sourceSystem ?? "").trim();
    if (!sourceKey || !sourceSystem || !validGoId(goId) || !fullName) {
      blocked.push({ sourceSystem, sourceKey, goId, reason: "invalid_source_identity" }); continue;
    }
    const record = { sourceSystem, sourceKey, goId, fullName, rank: String(row.rank ?? "").trim() };
    if (!byGoId.has(goId)) byGoId.set(goId, []);
    byGoId.get(goId).push(record);
    if (!byName.has(fullName)) byName.set(fullName, new Set());
    byName.get(fullName).add(goId);
  }
  for (const [goId, records] of byGoId) {
    const names = new Set(records.map(x => x.fullName));
    const existingAthlete = existing.get(goId);
    const sameNameMultipleIds = records.some(x => byName.get(x.fullName).size > 1);
    if (names.size > 1 || (existingAthlete && normalizeName(existingAthlete.full_name) !== records[0].fullName)) {
      blocked.push({ goId, reason: "go_id_name_conflict", records }); continue;
    }
    if (sameNameMultipleIds) {
      pending.push({ goId, reason: "same_name_different_go_ids", records }); continue;
    }
    // Existing profiles keep their UUID, claim and current rank; rank observations are separate.
    ready.push({ goId, fullName: records[0].fullName, existingAthleteId: existingAthlete?.id ?? null, records });
  }
  return { ready, pending, blocked, totals: { sourceRows: sources.length, readyIds: ready.length, pendingIds: pending.length, blockedGroups: blocked.length } };
}
