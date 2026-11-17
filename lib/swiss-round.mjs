/**
 * Swiss round proposal for ONE division. Pure function: no DB writes, no publishing.
 *
 * Rules (ครูเล็ก with ครูชาญ, 17 Nov 2026, the way Thai Go events are paired):
 * 1. Never a rematch. If no pairing without one exists: requiresManualReview.
 * 2. Same score first, from the top score group down. Nobody moves to another score group (ปัดขึ้น/ปัดลง)
 *    unless the history makes it necessary; then as few and as small moves as possible.
 * 3. Whoever has already been moved to another score group is not moved again if someone else can be.
 * 4. Avoid players from the same institution, and brothers/sisters (same surname), meeting each other.
 *    Round 1 has no scores yet, so this decides round 1, together with a random draw ("สุ่มใหม่" redraws).
 *    Later rounds: only between pairings that are equally good on rules 2–3 (never a move for it).
 * 5. Bye: once per player, to the lowest score group (the one that leaves the best pairing).
 *
 * How: every candidate pair has a cost, weighted so a rule always outranks the ones after it:
 *   score gap² × 1,000,000 + (each player moved again) × 10,000 + same institution 100 + same surname 100.
 * Branch and bound finds the cheapest whole round (first answer = greedy, then only strictly better
 * ones replace it), with a step limit for very large late rounds.
 *
 * Colour: the athlete who has played black more often takes white. If equal, the stronger
 * athlete (higher `strength`) takes white, as is customary in even games. Final tie: by id.
 * Table 1 = highest scores; the bye is listed last.
 *
 * The result is a proposal for referee/admin approval before anything is written.
 */

// Per search. Small and mid-size fields finish far below it; very large late rounds stop here with the best pairing found so far.
const MAX_STEPS = 80_000;
const W_GAP = 1_000_000, W_REFLOAT = 10_000, W_CLUB = 100, W_FAMILY = 100;

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
 * Institutions a player belongs to, normalised so spellings of one club match:
 * "Black stone go" = "Blackstone Go", "IQ-UP" = "IQ-Up", "รร สาธิต…" = "สาธิต…".
 * "Trinity GO Silom / สาธิตจุฬาฯ" counts as both.
 * @param {string | null | undefined} label
 */
export function institutionKeys(label) {
  return String(label ?? "").split(/[\/,|]/).map((x) => x.toLowerCase()
    .replace(/^\s*(โรงเรียน|รร\.?|ร\.ร\.)\s*/, "")
    .replace(/[^0-9a-z\u0E00-\u0E7F]+/g, "")).filter((x) => x.length >= 2);
}

/**
 * Surname for the brothers/sisters rule: everything after the first name, without the title in front
 * (ด.ช./ด.ญ./นาย/นางสาว/น.ส./นาง), spaces or dots. "" when there is no surname.
 * @param {string | null | undefined} fullName
 */
export function surnameKey(fullName) {
  const bare = String(fullName ?? "").replace(/[\u00a0\u200b-\u200d\ufeff]/g, "").trim()
    .replace(/^(ด\.ช\.|ด\.ญ\.|น\.ส\.|นางสาว\s|นาย\s|นาง\s)\s*/, "");
  const i = bare.search(/\s/);
  return i < 0 ? "" : bare.slice(i + 1).replace(/[\s.]+/g, "").toLowerCase();
}

/**
 * Athletes who have already been paired outside their score group (their score at that round differed
 * from the opponent's). Byes are not moves. Uses verified results of earlier rounds only.
 * @param {any[]} matches  rows with round_number, black/white_athlete_id, winner_athlete_id, result_code, state
 * @param {any[]} byes     rows with round_number, athlete_id
 */
export function floatedAthletes(matches, byes = []) {
  const live = matches.filter((m) => m.state !== "void" && Number.isFinite(m.round_number));
  const rounds = [...new Set(live.map((m) => m.round_number))].sort((a, b) => a - b);
  const score = new Map();
  const add = (id, v) => score.set(id, (score.get(id) ?? 0) + v);
  const out = new Set();
  for (const r of rounds) {
    for (const m of live.filter((x) => x.round_number === r)) {
      if ((score.get(m.black_athlete_id) ?? 0) !== (score.get(m.white_athlete_id) ?? 0)) { out.add(m.black_athlete_id); out.add(m.white_athlete_id); }
    }
    for (const m of live.filter((x) => x.round_number === r && x.state === "verified")) {
      if (m.result_code === "draw") { add(m.black_athlete_id, 0.5); add(m.white_athlete_id, 0.5); }
      else if (m.winner_athlete_id) add(m.winner_athlete_id, 1);
    }
    for (const b of byes.filter((x) => x.round_number === r)) add(b.athlete_id, 1);
  }
  return out;
}

/**
 * @param {{players: {id: string, score: number, strength?: number, draw?: number, institution?: string | null, surname?: string}[], previousMatches?: any[], previousByes?: any[]}} input
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
  const floated = floatedAthletes(previousMatches, previousByes.filter((b) => typeof b !== "string"));
  const firstRound = !previousMatches.some((m) => m.state !== "void") && previousByes.length === 0;

  const strength = (p) => (Number.isFinite(p.strength) ? p.strength : -Infinity);
  const draw = (p) => (Number.isFinite(p.draw) ? p.draw : 0);
  // Highest score first. Round 1: by the random draw. Later: rank (strength), then the draw.
  const ranked = [...players].sort((a, b) => b.score - a.score
    || (firstRound ? draw(a) - draw(b) : strength(b) - strength(a) || draw(a) - draw(b))
    || String(a.id).localeCompare(String(b.id)));
  const clubs = new Map(ranked.map((p) => [p.id, institutionKeys(p.institution)]));
  const family = new Map(ranked.map((p) => [p.id, p.surname ?? ""]));
  const sameClub = (a, b) => clubs.get(a.id).some((k) => clubs.get(b.id).includes(k));
  const sameFamily = (a, b) => Boolean(family.get(a.id)) && family.get(a.id) === family.get(b.id);
  const pairCost = (a, b) => {
    const gap = (a.score - b.score) ** 2;
    return gap * W_GAP + (gap ? ((floated.has(a.id) ? 1 : 0) + (floated.has(b.id) ? 1 : 0)) * W_REFLOAT : 0)
      + (sameClub(a, b) ? W_CLUB : 0) + (sameFamily(a, b) ? W_FAMILY : 0);
  };

  let steps = 0;
  let exhausted = false; // set when a search ran out of steps (the answer may then be good but not the best)
  // Lower bound for the players still to pair: every score group with an odd head count needs a
  // pair across groups, and one such pair can fix at most two groups.
  const floor = (list) => {
    const odd = new Map();
    for (const p of list) odd.set(p.score, !odd.get(p.score));
    const oddGroups = [...odd.values()].filter(Boolean).length;
    if (!oddGroups) return 0;
    const keys = [...odd.keys()].sort((x, y) => x - y);
    let minGap = Infinity; // smallest possible gap² of one cross-group pair (½-point gaps exist after draws)
    for (let i = 1; i < keys.length; i++) minGap = Math.min(minGap, (keys[i] - keys[i - 1]) ** 2);
    return Math.ceil(oddGroups / 2) * minGap * W_GAP;
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
      const tries = others.map((b, i) => ({ b, i, g: pairCost(a, b) })).filter((x) => !played.has(pairKey(a.id, x.b.id)))
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
  if (ranked.length % 2 === 0) {
    pairs = best(ranked)?.pairs ?? null;
  } else {
    // Bye: those without a previous bye first (then the rest), lowest score group first, bottom-up
    // inside it. Inside the first group that can be paired, keep the one that leaves the best pairing.
    const bottomUp = [...ranked].reverse();
    const pools = [bottomUp.filter((p) => !hadBye.has(p.id)), bottomUp.filter((p) => hadBye.has(p.id))];
    for (const pool of pools) {
      const scores = [...new Set(pool.map((p) => p.score))].sort((x, y) => x - y);
      for (const sc of scores) {
        let pick = null;
        for (const c of pool.filter((p) => p.score === sc)) {
          const rest = ranked.filter((p) => p.id !== c.id);
          const r = best(rest);
          if (r && (!pick || r.cost < pick.cost)) pick = { ...r, id: c.id };
          if (pick && pick.cost <= floor(rest)) break; // cannot do better
        }
        if (pick) { pairs = pick.pairs; byeAthleteId = pick.id; break; }
      }
      if (pairs) break;
    }
  }

  if (!pairs) {
    return {
      tables: [], byeAthleteId: null, unpaired: ranked.map((p) => p.id), requiresManualReview: true,
      reason: exhausted ? "search_limit_reached" : "no_pairing_without_rematch",
      warning: "No valid pairing found automatically. The referee must pair this round manually.",
    };
  }

  const byId = new Map(ranked.map((p) => [p.id, p]));
  const tables = pairs
    .map(([a, b]) => {
      const ca = colour.get(a.id), cb = colour.get(b.id);
      let white;
      if (ca !== cb) white = ca > cb ? a : b;
      else if (strength(a) !== strength(b)) white = strength(a) > strength(b) ? a : b;
      else white = String(a.id) < String(b.id) ? a : b;
      const black = white === a ? b : a;
      const scoreDifference = Math.abs(a.score - b.score);
      return {
        blackAthleteId: black.id, whiteAthleteId: white.id, scoreDifference,
        sameInstitution: sameClub(a, b), sameSurname: sameFamily(a, b),
        movedAgain: scoreDifference ? [a, b].filter((x) => floated.has(x.id)).map((x) => x.id) : [],
      };
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
