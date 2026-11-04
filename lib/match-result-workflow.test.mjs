import test from "node:test";
import assert from "node:assert/strict";
import {validateMatchResult,validateVerification} from "./match-result-workflow.mjs";
const m={id:"match",tournament_id:"event",division_id:"division",black_athlete_id:"black",white_athlete_id:"white",state:"pending"};
test("valid submission remains unverified",()=>{
 const x=validateMatchResult(m,{resultCode:"black_win",winnerAthleteId:"black"});
 assert.equal(x.valid,true);assert.equal(x.normalized.state,"submitted");assert.equal(x.normalized.verified_at,null);
});
test("rejects winner and result mismatch",()=>assert.equal(validateMatchResult(m,{resultCode:"black_win",winnerAthleteId:"white"}).valid,false));
test("double forfeit requires no winner",()=>{
 assert.equal(validateMatchResult(m,{resultCode:"double_forfeit",winnerAthleteId:null}).valid,true);
 assert.equal(validateMatchResult(m,{resultCode:"double_forfeit",winnerAthleteId:"black"}).valid,false);
});
test("staff verification is mandatory",()=>{
 const x=validateVerification({...m,state:"submitted",result_code:"black_win",winner_athlete_id:"black"},{authenticated:false,role:"reviewer",active:true});
 assert.equal(x.valid,false);
});
test("active reviewer can validate submitted result",()=>{
 const x=validateVerification({...m,state:"submitted",result_code:"white_win",winner_athlete_id:"white"},{authenticated:true,role:"reviewer",active:true});
 assert.equal(x.valid,true);
});
test("verified results cannot be overwritten through submission",()=>assert.equal(validateMatchResult({...m,state:"verified"},{resultCode:"black_win",winnerAthleteId:"black"}).valid,false));
