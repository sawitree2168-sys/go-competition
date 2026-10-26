/** H2H from verified board results only. No mock or local fallback. */
export function summarizeHeadToHead(matches, athleteA, athleteB) {
  if (!athleteA || !athleteB || athleteA === athleteB) throw new Error('Invalid athlete pair');
  if (!Array.isArray(matches)) throw new Error('Matches must be an array');
  const valid = new Map();
  for (const m of matches) {
    if (!m || typeof m.id !== 'string' || m.state !== 'verified' || !m.verified_at) continue;
    const players = [m.black_athlete_id, m.white_athlete_id];
    if (!(players.includes(athleteA) && players.includes(athleteB))) continue;
    if (m.winner_athlete_id !== athleteA && m.winner_athlete_id !== athleteB) continue;
    valid.set(m.id, m);
  }
  const games = valid.size;
  const winsA = [...valid.values()].filter(m => m.winner_athlete_id === athleteA).length;
  const winsB = games - winsA;
  return { games,
    athleteA: { id: athleteA, wins: winsA, losses: winsB, winPercent: games ? Number((winsA / games * 100).toFixed(1)) : null },
    athleteB: { id: athleteB, wins: winsB, losses: winsA, winPercent: games ? Number((winsB / games * 100).toFixed(1)) : null }
  };
}