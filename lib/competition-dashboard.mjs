/** A published pairing replaces the teaching fixtures even before the event date. */
export function boardMode(available, matches, byes) {
  if (!available) return "error";
  return matches.some(m => m.state !== "void") || byes.length ? "live" : "demo";
}

/** Never publish fabricated rankings alongside real pairings or verified results. */
export function standingsMode(available, mode, standings) {
  if (!available || mode === "error") return "error";
  const recorded = standings.some(s => Number(s.wins) + Number(s.losses) + Number(s.draws ?? 0) + Number(s.byes) > 0);
  return mode === "live" || recorded ? "live" : "demo";
}

export function divisionProgress(matches, byes, rounds) {
  const active = matches.filter(m => m.state !== "void");
  const pools = new Set([...active, ...byes].map(m => m.pool_label ?? ""));
  const lastRound = Math.max(0, ...active.map(m => m.round_number), ...byes.map(b => b.round_number));
  const complete = pools.size > 0 && [...pools].every(pool => {
    const ms = active.filter(m => (m.pool_label ?? "") === pool);
    const bs = byes.filter(b => (b.pool_label ?? "") === pool);
    return Math.max(0, ...ms.map(m => m.round_number), ...bs.map(b => b.round_number)) >= rounds
      && ms.every(m => m.state === "verified");
  });
  return { lastRound, complete, played: active.some(m => m.state === "verified") };
}

/** Latest round is independent per pool; an unfinished pool is not hidden by another pool. */
export function latestPairings(matches, byes, pool = "*") {
  const active = matches.filter(m => m.state !== "void" && (pool === "*" || (m.pool_label ?? "") === pool));
  const bs = byes.filter(b => pool === "*" || (b.pool_label ?? "") === pool);
  const latest = new Map();
  for (const row of [...active, ...bs]) latest.set(row.pool_label ?? "", Math.max(latest.get(row.pool_label ?? "") ?? 0, row.round_number));
  return {
    matches: active.filter(m => m.round_number === latest.get(m.pool_label ?? "")),
    byes: bs.filter(b => b.round_number === latest.get(b.pool_label ?? "")),
  };
}
