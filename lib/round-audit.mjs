/**
 * Pre-publication tournament round audit.
 * Pure/read-only; callers must authenticate referee/admin and perform
 * transactional persistence separately. Never silently publish a bad round.
 */
export function auditRound({tournamentId,divisionId,roundNumber,registrations,matches}) {
  const issues=[],registered=new Set(
    registrations.filter(r=>r.tournament_id===tournamentId&&r.division_id===divisionId&&r.registration_status!=="cancelled")
      .map(r=>r.athlete_id)
  );
  const round=matches.filter(m=>m.tournament_id===tournamentId&&m.division_id===divisionId&&m.round_number===roundNumber);
  const appearances=new Map();
  if(!tournamentId||!divisionId||!Number.isInteger(roundNumber)||roundNumber<1) issues.push({code:"invalid_round_identity"});
  for(const match of round) {
    const id=match.id;
    for(const athleteId of [match.black_athlete_id,match.white_athlete_id]) {
      if(!registered.has(athleteId))issues.push({code:"unregistered_player",matchId:id,athleteId});
      if(appearances.has(athleteId))issues.push({code:"player_appears_twice",matchId:id,athleteId,previousMatchId:appearances.get(athleteId)});
      appearances.set(athleteId,id);
    }
    if(match.black_athlete_id===match.white_athlete_id)issues.push({code:"self_pairing",matchId:id});
    if(match.state==="verified" && !match.verified_at)issues.push({code:"verified_without_timestamp",matchId:id});
    if(match.state==="verified") {
      const winner=match.result_code==="black_win"?match.black_athlete_id:match.result_code==="white_win"?match.white_athlete_id:null;
      if(!["black_win","white_win","double_forfeit"].includes(match.result_code)||winner!==match.winner_athlete_id)
        issues.push({code:"verified_outcome_mismatch",matchId:id});
    }
  }
  return {readyForPublication:issues.length===0,matchCount:round.length,issues,
    note:"Checks structural consistency only; referee must also approve pairings, byes, tie-breaks and color balance."};
}
