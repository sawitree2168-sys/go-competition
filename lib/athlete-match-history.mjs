/**
 * Verified Go match history and head-to-head calculations.
 * Pure functions: no DB access, no profile changes, no invented matches.
 * Caller must supply only matches permitted by its authorization/RLS scope.
 */
export function verifiedMatches(matches) {
  return matches.filter(m =>
    m.state === "verified" &&
    Boolean(m.verified_at) &&
    Boolean(m.winner_athlete_id) &&
    [m.black_athlete_id,m.white_athlete_id].includes(m.winner_athlete_id) &&
    m.black_athlete_id !== m.white_athlete_id
  );
}
export function athleteHistory(matches, athleteId) {
  if (!athleteId) throw new Error("athleteId required");
  return verifiedMatches(matches)
    .filter(m => m.black_athlete_id === athleteId || m.white_athlete_id === athleteId)
    .map(m => ({
      matchId:m.id, tournamentId:m.tournament_id, divisionId:m.division_id,
      round:m.round_number, playedAt:m.verified_at,
      opponentId:m.black_athlete_id === athleteId ? m.white_athlete_id : m.black_athlete_id,
      result:m.winner_athlete_id === athleteId ? "win" : "loss",
      resultCode:m.result_code ?? null
    }));
}
export function headToHead(matches, firstAthleteId, secondAthleteId) {
  if (!firstAthleteId || !secondAthleteId || firstAthleteId === secondAthleteId) throw new Error("Two distinct athlete IDs required");
  const games=athleteHistory(matches,firstAthleteId).filter(m=>m.opponentId===secondAthleteId);
  return {firstAthleteId,secondAthleteId,games,played:games.length,firstWins:games.filter(g=>g.result==="win").length,secondWins:games.filter(g=>g.result==="loss").length};
}
