import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedLiveMatches,groupHistoricalMatches,historicalSourceUrl} from '../lib/competition/live-history.ts';
const row={source_key:'row1',go_id:'GO1',athlete_name:'นักกีฬา ทดสอบ',event_title:'ชื่อรายการตามต้นทาง',event_date:null,source_file_year:'2563',source_tab:'010164',source_header_row:'2',source_rows:[4,15],round_no:'1',opponent_name:'คู่แข่ง ทดสอบ',opponent_dan:'99',result:'win',review_status:'metadata_pending',imported_at:'2026-10-30'};
test('live read never accepts another ID, conflicts or duplicate source rows',()=>{assert.deepEqual(ownedLiveMatches('GO1',[row]),[row]);assert.throws(()=>ownedLiveMatches('GO2',[row]));assert.throws(()=>ownedLiveMatches('GO1',[{...row,review_status:'conflicting_result'}]));assert.throws(()=>ownedLiveMatches('GO1',[row,row]));});
test('grouping preserves rounds and never combines different source blocks',()=>{const groups=groupHistoricalMatches([{...row,source_key:'r3',round_no:'3'},row,{...row,source_key:'r2',round_no:'2'},{...row,source_key:'other-block',source_header_row:'59'}]);assert.equal(groups.length,2);assert.deepEqual(groups[0].items.map(r=>r.round_no),['1','2','3']);assert.ok(groups[0].items.every(r=>r.event_date===null));});
test('source links preserve exact sheet tab and source rows, unknown provenance stays unlinked',()=>{const u=new URL(historicalSourceUrl(row));assert.equal(u.hostname,'docs.google.com');assert.equal(decodeURIComponent(u.hash),"#range='010164'!A4:Z15");assert.equal(historicalSourceUrl({...row,source_file_year:'unknown'}),null);});

import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {linkedHistoryFor} from '../lib/competition/linked-history.ts';
const routeSource=readFileSync(new URL('../app/api/me/history/route.ts',import.meta.url),'utf8').replace(/^import .*;$/mg,'');
const routeJs=ts.transpileModule(routeSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function routeFixture({anonymous=false}={}){
 let payload={go_id:'GO1',read_mode:'live_database',legacy_matches:[row],walllist_events:[],events:[],checked_at:'now',coverage:'live'};
 const exports={};let calls=0;
 vm.runInNewContext(routeJs,{exports,account:async()=>anonymous?{error:Response.json({}, {status:401})}:{base:'https://example.invalid',headers:{}},response:(body,status=200)=>Response.json(body,{status}),ownedLiveMatches,linkedHistoryFor,fetch:async()=>{calls++;return Response.json(payload)},URL,Response,AbortSignal});
 return {get:()=>exports.GET(new Request('https://example.invalid/api/me/history?go_id=GO1')),set:p=>payload=p,calls:()=>calls};
}
test('profile API reads current database on every request instead of a bundled snapshot',async()=>{const f=routeFixture();const first=await f.get();assert.equal(first.status,200);assert.equal((await first.json()).history.legacy_matches.length,1);f.set({go_id:'GO1',read_mode:'live_database',legacy_matches:[row,{...row,source_key:'row2',round_no:'2'}],walllist_events:[],events:[],checked_at:'later',coverage:'live'});const second=await f.get();assert.equal((await second.json()).history.legacy_matches.length,2);assert.equal(f.calls(),2);});
test('profile API rejects anonymous callers and wrong ownership payloads',async()=>{const anon=routeFixture({anonymous:true});assert.equal((await anon.get()).status,401);assert.equal(anon.calls(),0);const f=routeFixture();f.set({go_id:'GO2'});assert.equal((await f.get()).status,503);});
