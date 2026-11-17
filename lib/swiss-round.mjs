/**
 * Swiss round proposal for ONE division. Pure function: no DB writes, no publishing.
 *
 * Rules applied:
 * - Never repeats an earlier pairing. If no pairing without a rematch exists, it returns
 *   requiresManualReview instead of forcing one.
 * - Players meet someone on the same score whenever the history allows it. Among all valid pairings
 *   it picks the one with the smallest score gaps (sum of squared differences, so one 2-point gap
 *   counts more than two 1-point gaps). Branch and bound: the first answer is the greedy one, then
 *   only strictly better pairings replace it, so ties keep the fold order below.
 *   (17 Nov 2026: the old search took the first valid pairing; in about 1 round in 10 that floated
 *   players across score groups needlessly, e.g. 2,2,1,1,1,1,0,0 paired 1v0 twice instead of 0v0.)
 * - Odd number of players: the bye goes to the lowest score group among athletes who have not had a
 *   bye yet; inside that group, to the one that leaves the best pairing (ties: the lowest placed).
 * - Table 1 = highest scores; table numbers increase as scores decrease. The bye is listed last.
 * - Inside a score group: top half v bottom half (1 v 5, 2 v 6 … with 8 players), the international Swiss way.
 * - Colour: the athlete who has played black more often takes white. If equal, the stronger
 *   athlete (higher `strength`) takes white, as is customary in even games. Final tie: by id.
 *
 * The result is a proposal for referee/admin approval before anything is written.
 */

// Per search. Small and mid-size fields finish far below it; very large late rounds stop here with the best pairing found so far.
const MAX_STEPS = 80_000;

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
  const ranked = [...players].sort(
    (a, b) => b.score - a.score || strength(b) - strength(a) || String(a.id).localeCompare(String(b.id)),
  );
  // Top half v bottom half inside each score group (international Swiss "fold"): with 8 players on the
  // same score, 1 v 5, 2 v 6, 3 v 7, 4 v 8, so the strongest do not meet in round 1. The search keeps the
  // first of equally good pairings, so interleaving the group as 1,5,2,6,3,7,4,8 gives exactly that.
  // Odd group of 5: 1,3,2,4,5 → 1 v 3, 2 v 4, and no. 5 (the lowest) floats down.
  // (17 Nov 2026, ครูเล็ก chose this over the old 1 v 2, 3 v 4.)
  const fold = (list) => {
    const out = [];
    for (let i = 0; i < list.length;) {
      let j = i;
      while (j < list.length && list[j].score === list[i].score) j++;
      const group = list.slice(i, j), half = Math.floor(group.length / 2);
      const top = group.slice(0, half), bottom = group.slice(half);
      for (let k = 0; k < bottom.length; k++) { if (k < top.length) out.push(top[k]); out.push(bottom[k]); }
      i = j;
    }
    return out;
  };
  const order = fold(ranked);

  let steps = 0;
  let exhausted = false; // set when a search ran out of steps (the answer may then be good but not the best)
  const gap = (a, b) => (a.score - b.score) ** 2;
  // Lower bound for the players still to pair: every score group with an odd head count needs a
  // pair across groups, and one such pair can fix at most two groups; each costs at least 1.
  const floor = (list) => {
    const odd = new Map();
    for (const p of list) odd.set(p.score, !odd.get(p.score));
    const oddGroups = [...odd.values()].filter(Boolean).length;
    if (!oddGroups) return 0;
    const keys = [...odd.keys()].sort((x, y) => x - y);
    let minGap = Infinity; // smallest possible cost of one cross-group pair (½-point gaps exist after draws)
    for (let i = 1; i < keys.length; i++) minGap = Math.min(minGap, (keys[i] - keys[i - 1]) ** 2);
    return Math.ceil(oddGroups / 2) * minGap;
  };
  /**
   * Cheapest pairing of `list` (best found within the step limit), or null when none exists.
   * @param {any[]} list
   * @returns {{ pairs: any[][], cost: number } | null}
   */
  const best = (list) => {
    let bestCost = Infinity;
    /** @type {any[][] | null} */
    let bestPairs = null;
    steps = 0; // each search gets the full step budget
    const target = floor(list); // reaching this cost proves the pairing is the best possible: stop there
    /** @type {(rest: any[], acc: any[][], cost: number) => void} */
    const go = (rest, acc, cost) => {
      if (bestCost <= target) return;
      if (!rest.length) { if (cost < bestCost) { bestCost = cost; bestPairs = acc; } return; }
      if (cost + floor(rest) >= bestCost) return;
      if (++steps > MAX_STEPS) { exhausted = true; return; }
      const [a, ...others] = rest;
      const tries = others.map((b, i) => ({ b, i, g: gap(a, b) })).filter((x) => !played.has(pairKey(a.id, x.b.id)))
        .sort((x, y) => x.g - y.g || x.i - y.i);
      for (const { b, i, g } of tries) {
        if (cost + g >= bestCost) break;
        go(others.filter((_, j) => j !== i), [...acc, [a, b]], cost + g);
        if (exhausted && bestPairs) return;
      }
    };
    go(list, [], 0);
    return bestPairs ? { pairs: bestPairs, cost: bestCost } : null;
  };

  let byeAthleteId = null;
  let pairs = null;
  if (order.length % 2 === 0) {
    pairs = best(order)?.pairs ?? null;
  } else {
    // Bye candidates: those without a previous bye first (then the rest), lowest score group first,
    // bottom-up inside it. Inside the first group that can be paired, keep the best pairing.
    const bottomUp = [...ranked].reverse();
    const pools = [bottomUp.filter((p) => !hadBye.has(p.id)), bottomUp.filter((p) => hadBye.has(p.id))];
    for (const pool of pools) {
      const scores = [...new Set(pool.map((p) => p.score))].sort((x, y) => x - y);
      for (const sc of scores) {
        let pick = null;
        for (const c of pool.filter((p) => p.score === sc)) {
          const r = best(fold(ranked.filter((p) => p.id !== c.id)));
          if (r && (!pick || r.cost < pick.cost)) pick = { ...r, id: c.id };
          if (pick && pick.cost <= floor(ranked.filter((p) => p.id !== c.id))) break; // cannot do better
        }
        if (pick) { pairs = pick.pairs; byeAthleteId = pick.id; break; }
      }
      if (pairs) break;
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
