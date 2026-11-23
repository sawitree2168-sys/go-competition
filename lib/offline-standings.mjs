/**
 * Standings of one pool, computed in the browser (no database) — the same rules as gt_division_standings_v3,
 * for the offline pairing desk.
 * score = wins + byes + ½ per draw · SOS / SOSOS over games really played (forfeits are not games);
 * the event's bye rule own_score adds (byes + forfeit wins) × own score / own SOS.
 * Withdrawn players are listed after the others without a position.
 * @param {{athlete_id: string, status: string, pool_label?: string | null}[]} regs  status: confirmed | withdrawn
 * @param {{black_athlete_id: string, white_athlete_id: string, winner_athlete_id: string | null, result_code: string | null, state: string}[]} matches
 * @param {{athlete_id: string}[]} byes
 * @param {string | null} byeMode  "own_score" | anything else
 */
export function poolStandings(regs, matches, byes, byeMode) {
  const games = [];
  for (const m of matches) {
    if (m.state !== "verified") continue;
    games.push({ p: m.black_athlete_id, o: m.white_athlete_id, rc: m.result_code, win: m.winner_athlete_id });
    games.push({ p: m.white_athlete_id, o: m.black_athlete_id, rc: m.result_code, win: m.winner_athlete_id });
  }
  const scored = games.map((g) => ({
    p: g.p, o: g.o,
    pts: g.rc === "draw" ? 0.5 : g.win === g.p ? 1 : 0,
    played: !["black_win_forfeit", "white_win_forfeit", "double_forfeit"].includes(g.rc ?? ""),
    won: g.win === g.p, drew: g.rc === "draw",
    fwin: (g.rc === "black_win_forfeit" || g.rc === "white_win_forfeit") && g.win === g.p,
  }));
  const own = byeMode === "own_score";
  const rows = regs.map((r) => {
    const mine = scored.filter((g) => g.p === r.athlete_id);
    const b = byes.filter((y) => y.athlete_id === r.athlete_id).length;
    const gp = mine.reduce((s, g) => s + g.pts, 0);
    return {
      athlete_id: r.athlete_id, withdrawn: r.status === "withdrawn",
      wins: mine.filter((g) => g.won).length,
      losses: mine.filter((g) => !g.won && !g.drew).length,
      draws: mine.filter((g) => g.drew).length,
      forfeit_wins: mine.filter((g) => g.fwin).length,
      byes: b, score: gp + b, sos: 0, sosos: 0, pos: null,
    };
  });
  const by = new Map(rows.map((x) => [x.athlete_id, x]));
  const sumOver = (x, key) => scored.filter((g) => g.p === x.athlete_id && g.played).reduce((s, g) => s + (by.get(g.o)?.[key] ?? 0), 0);
  for (const x of rows) x.sos = sumOver(x, "score") + (own ? (x.byes + x.forfeit_wins) * x.score : 0);
  for (const x of rows) x.sosos = sumOver(x, "sos") + (own ? (x.byes + x.forfeit_wins) * x.sos : 0);
  const cmp = (a, b) => b.score - a.score || b.sos - a.sos || b.sosos - a.sosos;
  const active = rows.filter((x) => !x.withdrawn).sort(cmp);
  active.forEach((x, i) => { x.pos = i > 0 && cmp(active[i - 1], x) === 0 ? active[i - 1].pos : i + 1; });
  return [...active, ...rows.filter((x) => x.withdrawn).sort(cmp)];
}
