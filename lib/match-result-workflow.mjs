/**
 * Validates a referee-submitted result before it is eligible for verification.
 * Does not grant permissions or write to Supabase: the server must check
 * authenticated staff authorization and persist an audit trail separately.
 */
export function validateMatchResult(match, submission) {
  const errors=[];
  if (!match?.id || !match?.tournament_id || !match?.division_id) errors.push("missing_match_identity");
  if (!match?.black_athlete_id || !match?.white_athlete_id || match.black_athlete_id===match.white_athlete_id) errors.push("invalid_players");
  if (!["pending","submitted"].includes(match?.state)) errors.push("match_not_editable");
  if (!["black_win","white_win","double_forfeit"].includes(submission?.resultCode)) errors.push("invalid_result_code");
  const expected=submission?.resultCode==="black_win" ? match?.black_athlete_id :
    submission?.resultCode==="white_win" ? match?.white_athlete_id : null;
  if (submission?.resultCode==="double_forfeit" && submission?.winnerAthleteId != null) errors.push("double_forfeit_cannot_have_winner");
  if (submission?.resultCode!=="double_forfeit" && submission?.winnerAthleteId!==expected) errors.push("winner_result_mismatch");
  return {valid:errors.length===0,errors,normalized:errors.length?null:{
    winner_athlete_id:expected,result_code:submission.resultCode,state:"submitted",verified_at:null
  }};
}
export function validateVerification(match, reviewer) {
  const errors=[];
  if(match?.state!=="submitted") errors.push("must_be_submitted");
  if(!reviewer?.authenticated || !["owner","admin","reviewer"].includes(reviewer.role) || !reviewer.active) errors.push("staff_authorization_required");
  if(!["black_win","white_win","double_forfeit"].includes(match?.result_code)) errors.push("invalid_result_code");
  const expected=match?.result_code==="black_win" ? match.black_athlete_id :
    match?.result_code==="white_win" ? match.white_athlete_id : null;
  if(match?.winner_athlete_id!==expected) errors.push("winner_result_mismatch");
  return {valid:errors.length===0,errors};
}
