import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {historicalRoundGames} from './historical-rounds.mjs';
import {athleteNameKey} from './athlete-results.mjs';
const sources=JSON.parse(fs.readFileSync(new URL('../data/historical-round-sources.json',import.meta.url),'utf8'));
const tu=JSON.parse(fs.readFileSync(new URL('../data/thammasat-2026-games-source.json',import.meta.url),'utf8'));
test('Lamphun resolves 144 reciprocal games and four explicit non-played rounds',()=>{
 const r=historicalRoundGames(sources[0]);assert.equal(r.issues.length,0);assert.equal(r.games.filter(g=>g.whiteId).length,144);assert.equal(r.games.filter(g=>g.notPlayed).length,4);
 const ch= r.games.filter(g=>g.blackName==='ชยพล พันธเสน'||g.whiteName==='ชยพล พันธเสน');
 assert.equal(ch.length,4);assert.deepEqual(ch.map(g=>g.blackName==='ชยพล พันธเสน'?g.whiteName:g.blackName),['ชยณัฐ หงษ์หนึ่ง','ณัฐวุฒิ กำบังตน','ธนัฐ จันทร์ขจรชัย','ธนัท รัตนะประเทศ']);assert.ok(ch.every(g=>g.colourKnown===false));
});
test('official Buddy and Mingle wall lists have no conflicting reciprocal results',()=>{for(const [index,count] of [[2,80],[3,12]]){const r=historicalRoundGames(sources[index]);assert.equal(r.issues.length,0);assert.equal(r.games.length,count);}});
test('Thammasat final game records reproduce every final standings record, including byes and the documented correction',()=>{
 assert.equal(tu.games.length,671);const slots=new Set();
 for(const g of tu.games)for(const id of [g.blackId,g.whiteId].filter(Boolean)){const key=`${g.division}|${g.round}|${id}`;assert.ok(!slots.has(key),key);slots.add(key);}
 for(const p of sources[1].players){let wins=0,losses=0,byes=0;for(const g of tu.games.filter(g=>g.division===p.division&&(athleteNameKey(g.blackName)===athleteNameKey(p.name)||athleteNameKey(g.whiteName)===athleteNameKey(p.name)))){const black=athleteNameKey(g.blackName)===athleteNameKey(p.name);if(g.code==='BYE'){byes++;wins++;}else if(g.code==='DOUBLE_FORFEIT')losses++;else if((black&&g.code.startsWith('BLACK'))||(!black&&g.code.startsWith('WHITE')))wins++;else losses++;}
 assert.deepEqual([wins,losses,byes],[p.wins,p.losses,p.byes],`${p.division}: ${p.name}`);}
 assert.equal(tu.games.find(g=>g.sourceId==='M1784319048265_1_T8_7').originalCode,'BLACK_WIN');
});
test('non-reciprocal and missing opponents are held back, without inventing games',()=>{const s={event:'x',players:[{division:'D',placing:1,playerRef:'a',name:'A',rounds:['2+']},{division:'D',placing:2,playerRef:'b',name:'B',rounds:['1+']}]};const r=historicalRoundGames(s);assert.equal(r.games.length,0);assert.equal(r.issues.length,2);});
