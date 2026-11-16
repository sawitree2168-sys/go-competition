// Athlete profile: outcome of each game row (from gt_athlete_games_v1) and the stats shown on the page.

const FORFEITS = new Set(["black_win_forfeit", "white_win_forfeit", "double_forfeit"]);

/**
 * Outcome from the athlete's point of view.
 * @returns {"win"|"loss"|"draw"|"bye"|"pending"}
 */
export function outcome(row, athleteId) {
  if (row.kind === "bye") return "bye";
  if (row.state !== "verified") return "pending";
  if (row.result_code === "draw") return "draw";
  if (row.winner_id && row.winner_id === athleteId) return "win";
  return "loss";   // includes double loss / double forfeit
}

export const isForfeit = (row) => FORFEITS.has(row.result_code ?? "");

/** Games that count in the stats: decided games against an opponent (byes and pending games excluded). */
export function decided(rows, athleteId) {
  return rows.filter((r) => r.kind === "match").map((r) => ({ ...r, outcome: outcome(r, athleteId) })).filter((r) => r.outcome !== "pending");
}

/** Totals for the header tiles / stats tab. */
export function summary(rows, athleteId) {
  const games = decided(rows, athleteId);
  const events = new Set(rows.map((r) => r.tournament_id));
  const count = (o) => games.filter((g) => g.outcome === o).length;
  const wins = count("win"), losses = count("loss"), draws = count("draw");
  const byColour = (c) => {
    const g = games.filter((x) => x.colour === c);
    return { played: g.length, wins: g.filter((x) => x.outcome === "win").length, losses: g.filter((x) => x.outcome === "loss").length, draws: g.filter((x) => x.outcome === "draw").length };
  };
  const perEvent = [...events].map((id) => {
    const g = games.filter((x) => x.tournament_id === id);
    const any = rows.find((r) => r.tournament_id === id);
    return { tournament_id: id, title: any.title, event_date: any.event_date, played: g.length,
      wins: g.filter((x) => x.outcome === "win").length, losses: g.filter((x) => x.outcome === "loss").length, draws: g.filter((x) => x.outcome === "draw").length };
  });
  return {
    events: events.size, played: games.length, wins, losses, draws,
    winRate: games.length ? wins / games.length : 0,
    black: byColour("black"), white: byColour("white"), perEvent,
  };
}

/** Opponents met, most games first, then name. */
export function opponents(rows) {
  const m = new Map();
  for (const r of rows) {
    if (r.kind !== "match" || !r.opponent_id) continue;
    const cur = m.get(r.opponent_id) ?? { id: r.opponent_id, name: r.opponent_name ?? "", institution: r.opponent_institution, rank: r.opponent_rank, photo: r.opponent_photo, games: 0 };
    cur.games += 1;
    m.set(r.opponent_id, cur);
  }
  return [...m.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name, "th"));
}

/** Head-to-head against one opponent, newest first. */
export function headToHead(rows, athleteId, opponentId) {
  const games = decided(rows, athleteId).filter((r) => r.opponent_id === opponentId);
  return {
    games, played: games.length,
    wins: games.filter((g) => g.outcome === "win").length,
    losses: games.filter((g) => g.outcome === "loss").length,
    draws: games.filter((g) => g.outcome === "draw").length,
  };
}

/** "62.5%" style. */
export const percent = (x) => `${Math.round(x * 1000) / 10}%`;
