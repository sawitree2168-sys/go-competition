import test from "node:test";
import assert from "node:assert/strict";
import { athleteHistory,headToHead } from "./athlete-match-history.mjs";
const m=(id,black,white,winner,state="verified",verified_at="2026-10-01T10:00:00Z")=>({id,black_athlete_id:black,white_athlete_id:white,winner_athlete_id:winner,state,verified_at,tournament_id:"event",division_id:"division",round_number:1,result_code:"B+R"});
test("history retains verified wins and losses across events",()=>{
 const data=[m("one","a","b","a"),m("two","b","a","b"),m("pending","a","b","a","pending",null)];
 const history=athleteHistory(data,"a");assert.deepEqual(history.map(x=>x.result),["win","loss"]);assert.equal(history.length,2);
});
test("head to head excludes other opponents",()=>{
 const data=[m("one","a","b","a"),m("two","b","a","b"),m("other","a","c","a")];
 const x=headToHead(data,"a","b");assert.deepEqual([x.played,x.firstWins,x.secondWins],[2,1,1]);
});
test("unverified or invalid winner is never counted",()=>{
 const data=[m("unverified","a","b","a","submitted",null),m("bad","a","b","c")];
 assert.equal(athleteHistory(data,"a").length,0);
});
test("head to head requires distinct identities",()=>assert.throws(()=>headToHead([],"a","a")));
