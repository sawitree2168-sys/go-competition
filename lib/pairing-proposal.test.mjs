import test from "node:test";
import assert from "node:assert/strict";
import {proposePairings} from "./pairing-proposal.mjs";
const p=(id,score)=>({id,score});
test("pairs distinct athletes without repeat opponents",()=>{
 const r=proposePairings([p("a",2),p("b",2),p("c",1),p("d",1)],[{black_athlete_id:"a",white_athlete_id:"b"}]);
 assert.equal(r.pairs.length,2);assert.equal(r.unpaired.length,0);
 assert.ok(r.pairs.every(x=>[x.firstAthleteId,x.secondAthleteId].sort().join("|")!=="a|b"));
});
test("flags unresolved pairing rather than inventing a match",()=>{
 const r=proposePairings([p("a",1),p("b",1)],[{black_athlete_id:"a",white_athlete_id:"b"}]);
 assert.equal(r.pairs.length,0);assert.equal(r.requiresManualReview,true);
});
test("does not mutate original standings",()=>{
 const players=[p("b",0),p("a",2)];proposePairings(players);assert.equal(players[0].id,"b");
});
test("rejects duplicate identity",()=>assert.throws(()=>proposePairings([p("a",1),p("a",2)])));
