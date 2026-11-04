/**
 * Split a division into pools (สาย A/B…) at random, while spreading players from the same
 * institution as evenly as possible so club-mates rarely meet inside a pool.
 * Pool sizes never differ by more than one. Pure and deterministic for a given seed,
 * so the organiser can re-draw (new seed) or reproduce a draw exactly.
 */
/**
 * @param {{id: string, institution?: string}[]} entrants
 * @param {{pools?: string[], seed?: number | string}} [options]
 * @returns {Map<string, string>}
 */
export function assignPools(entrants, { pools = ["A", "B"], seed = Date.now() } = {}) {
  const ids = new Set();
  for (const e of entrants) {
    if (!e?.id || ids.has(e.id)) throw new Error("Missing or duplicate athlete ID");
    ids.add(e.id);
  }
  if (pools.length < 1) throw new Error("At least one pool is required");

  const rand = mulberry32(hashSeed(seed));
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const key = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ") || `__none__${Math.floor(rand() * 1e9)}`;
  const groups = new Map();
  for (const e of shuffle(entrants)) {
    const k = key(e.institution);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  // Largest institutions first: they constrain the split most.
  const ordered = shuffle([...groups.values()]).sort((a, b) => b.length - a.length);

  const cap = Math.ceil(entrants.length / pools.length);
  const size = new Map(pools.map((p) => [p, 0]));
  const result = new Map();
  for (const group of ordered) {
    const inPool = new Map(pools.map((p) => [p, 0]));
    for (const e of group) {
      const open = pools.filter((p) => size.get(p) < cap);
      const best = shuffle(open).sort((a, b) => inPool.get(a) - inPool.get(b) || size.get(a) - size.get(b))[0];
      result.set(e.id, best);
      size.set(best, size.get(best) + 1);
      inPool.set(best, inPool.get(best) + 1);
    }
  }
  return result;
}

function hashSeed(seed) {
  const s = String(seed);
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return h >>> 0;
}
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
