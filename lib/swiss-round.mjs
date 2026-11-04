/**
 * Swiss round proposal for ONE division. Pure function: no DB writes, no publishing.
 *
 * Rules applied:
 * - Never repeats an earlier pairing. Uses backtracking, so it finds a pairing whenever one
 *   exists (a greedy pass can give up on solvable rounds). If none exists, it returns
 *   requiresManualReview instead of forcing a rematch.
 * - Odd number of players: the bye goes to the lowest-placed athlete who has not had a bye yet,
 *   provided the remaining athletes can still be paired.
 * - Table 1 = highest scores; table numbers increase as scores decrease. The bye is listed last.
 * - Colour: the athlete who has played black more often takes white. If equal, the stronger
 *   athlete (higher `strength`) takes white, as is customary in even games. Final tie: by id.
 *
 * The result is a proposal for referee/admin approval before anything is written.
 */

const MAX_STEPS = 250_000;

const pairKey = (a, b) => [a, b].sort().join("|");

/**
 * Turns a rank label into a number where higher = stronger.
 * Accepts "3k", "3 kyu", "3 คิว", "1d", "1 dan", "1 ดั้ง", and ranges like "13–14 คิว" (uses the stronger end).
 * Returns null when the label is not recognised.
 */
export function parseRankStrength(label) {
  if (typeof label !== "string") return null;
  const s = label.toLowerCase().replace(/\s+/g, "");
  const nums = (s.match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;
  if (/\dd$|dan|ดั้ง/.test(s)) return Math.max(...nums) - 1; // 1d = 0, 2d = 1, ...
  if (/\dk$|kyu|คิว/.test(s)) return -Math.min(...nums);       // 1k = -1, 15k = -15
  return null;
}

/**
 * @param {{players: {id: string, score: number, strength?: number}[], previousMatches?: any[], previousByes?: any[]}} input
 */
export function proposeSwissRound({ players, previousMatches = [], previousByes = [] }) {
  const ids = new Set();
  for (const p of players) {
    if (!p?.id || ids.has(p.id)) throw new Error("Missing or duplicate athlete ID");
    if (!Number.isFinite(p.score)) throw new Error("Score must be finite");
    ids.add(p.id);
  }

  const played = new Set();
  const colour = new Map([...ids].map((id) => [id, 0])); // +1 per black, -1 per white
  for (const m of previousMatches) {
    if (m.state === "void") continue;
    played.add(pairKey(m.black_athlete_id, m.white_athlete_id));
    if (colour.has(m.black_athlete_id)) colour.set(m.black_athlete_id, colour.get(m.black_athlete_id) + 1);
    if (colour.has(m.white_athlete_id)) colour.set(m.white_athlete_id, colour.get(m.white_athlete_id) - 1);
  }
  const hadBye = new Set(previousByes.map((b) => (typeof b === "string" ? b : b.athlete_id)));

  const strength = (p) => (Number.isFinite(p.strength) ? p.strength : -Infinity);
  const order = [...players].sort(
    (a, b) => b.score - a.score || strength(b) - strength(a) || String(a.id).localeCompare(String(b.id)),
  );

  let steps = 0;
  let exhausted = false;
  const solve = (list) => {
    if (!list.length) return [];
    if (++steps > MAX_STEPS) { exhausted = true; return null; }
    const [a, ...rest] = list;
    for (let i = 0; i < rest.length; i++) {
      if (played.has(pairKey(a.id, rest[i].id))) continue;
      const sub = solve(rest.filter((_, j) => j !== i));
      if (sub) return [[a, rest[i]], ...sub];
      if (exhausted) return null;
    }
    return null;
  };

  let byeAthleteId = null;
  let pairs = null;
  if (order.length % 2 === 0) {
    pairs = solve(order);
  } else {
    // Bye candidates from the bottom up: first those without a previous bye, then the rest.
    const bottomUp = [...order].reverse();
    const candidates = [...bottomUp.filter((p) => !hadBye.has(p.id)), ...bottomUp.filter((p) => hadBye.has(p.id))];
    for (const c of candidates) {
      pairs = solve(order.filter((p) => p.id !== c.id));
      if (pairs) { byeAthleteId = c.id; break; }
      if (exhausted) break;
    }
  }

  if (!pairs) {
    return {
      tables: [], byeAthleteId: null, unpaired: order.map((p) => p.id), requiresManualReview: true,
      reason: exhausted ? "search_limit_reached" : "no_pairing_without_rematch",
      warning: "No valid pairing found automatically. The referee must pair this round manually.",
    };
  }

  const byId = new Map(order.map((p) => [p.id, p]));
  const tables = pairs
    .map(([a, b]) => {
      const ca = colour.get(a.id), cb = colour.get(b.id);
      let white;
      if (ca !== cb) white = ca > cb ? a : b;
      else if (strength(a) !== strength(b)) white = strength(a) > strength(b) ? a : b;
      else white = String(a.id) < String(b.id) ? a : b;
      const black = white === a ? b : a;
      return { blackAthleteId: black.id, whiteAthleteId: white.id, scoreDifference: Math.abs(a.score - b.score) };
    })
    .sort((x, y) => {
      const sx = [byId.get(x.blackAthleteId).score, byId.get(x.whiteAthleteId).score];
      const sy = [byId.get(y.blackAthleteId).score, byId.get(y.whiteAthleteId).score];
      return Math.max(...sy) - Math.max(...sx) || (sy[0] + sy[1]) - (sx[0] + sx[1]);
    })
    .map((t, i) => ({ board: i + 1, ...t }));

  return {
    tables, byeAthleteId, unpaired: [], requiresManualReview: false,
    warning: "Proposal only. Referee must approve before the round is published.",
  };
}
