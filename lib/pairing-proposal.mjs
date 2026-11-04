/**
 * Deterministic Swiss-style pairing proposal. Does not mutate results or standings.
 * Ranking points and tie-breaks must be calculated and approved upstream.
 * The output is a proposal for a referee/admin, not a published draw.
 */
export function proposePairings(players, previousMatches = []) {
  const ids=new Set();
  for(const p of players) {
    if(!p.id || ids.has(p.id)) throw new Error("Missing or duplicate athlete ID");
    if(!Number.isFinite(p.score)) throw new Error("Score must be finite");
    ids.add(p.id);
  }
  const played=new Set(previousMatches.map(m=>[m.black_athlete_id,m.white_athlete_id].sort().join("|")));
  const sorted=[...players].sort((a,b)=>b.score-a.score || String(a.id).localeCompare(String(b.id)));
  const used=new Set(),pairs=[],unpaired=[];
  for(let i=0;i<sorted.length;i++) {
    const a=sorted[i];if(used.has(a.id))continue;
    let partner=null;
    for(let j=i+1;j<sorted.length;j++) {
      const b=sorted[j];
      if(used.has(b.id)||played.has([a.id,b.id].sort().join("|")))continue;
      partner=b;break;
    }
    if(!partner){unpaired.push(a.id);used.add(a.id);continue;}
    used.add(a.id);used.add(partner.id);
    pairs.push({firstAthleteId:a.id,secondAthleteId:partner.id,scoreDifference:Math.abs(a.score-partner.score)});
  }
  return {pairs,unpaired,requiresManualReview:unpaired.length>0,
    warning:"Proposal only. Validate bye policy, color balance, tie-breaks, divisions and referee approval before publishing."};
}
