import test from "node:test";
import assert from "node:assert/strict";
import {projectStandings} from "./tournament-standings.mjs";
const r=id=>({athlete_id:id,division_id:"d",registration_status:"confirmed"});
const m=(id,black,white,winner,state="verified")=>({id,division_id:"d",black_athlete_id:black,white_athlete_id:white,winner_athlete_id:winner,state,verified_at:"2026-11-01T00:00:00Z"});
test("counts only verified results within a division",()=>{
 const x=projectStandings([r("a"),r("b"),r("c")],[m("1","a","b","a"),m("2","a","c","c","pending")],"d");
 assert.equal(x.find(z=>z.athleteId==="a").wins,1);assert.equal(x.find(z=>z.athleteId==="c").played,0);
});
test("does not invent tie-breaks",()=>{
 const x=projectStandings([r("a"),r("b")],[m("1","a","b","a")],"d");
 assert.equal(x[0].tieBreakStatus,"not_calculated");
});
test("rejects duplicate match",()=>assert.throws(()=>projectStandings([r("a"),r("b")],[m("1","a","b","a"),m("1","a","b","a")],"d")));
