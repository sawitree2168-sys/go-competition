/**
 * Tournament standings projection from verified matches.
 * No DB writes. Does not assume tie-break or bye scoring rules.
 */
export function projectStandings(registrations, matches, divisionId) {
  if (!divisionId) throw new Error("divisionId required");
  const entrants=new Map();
  for (const r of registrations) {
    if (r.division_id !== divisionId || !r.athlete_id || r.registration_status === "cancelled") continue;
    if (entrants.has(r.athlete_id)) throw new Error("Duplicate registration for athlete");
    entrants.set(r.athlete_id,{athleteId:r.athlete_id,played:0,wins:0,losses:0,points:0,opponents:[]});
  }
  const seen=new Set();
  for (const m of matches) {
    if (m.division_id !== divisionId || m.state !== "verified" || !m.verified_at) continue;
    const black=entrants.get(m.black_athlete_id),white=entrants.get(m.white_athlete_id);
    if (!black || !white || black===white || ![m.black_athlete_id,m.white_athlete_id].includes(m.winner_athlete_id)) continue;
    if (seen.has(m.id)) throw new Error("Duplicate match ID");seen.add(m.id);
    for(const [current,other] of [[black,white],[white,black]]) {
      current.played++;current.opponents.push(other.athleteId);
      if(current.athleteId===m.winner_athlete_id){current.wins++;current.points++;}else current.losses++;
    }
  }
  return [...entrants.values()].sort((a,b)=>b.points-a.points || a.athleteId.localeCompare(b.athleteId))
    .map((x,i)=>({...x,provisionalPosition:i+1,tieBreakStatus:"not_calculated"}));
}
