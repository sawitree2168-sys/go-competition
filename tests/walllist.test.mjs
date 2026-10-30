import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseWalllist} from '../lib/competition/walllist.ts';
const source=JSON.parse(fs.readFileSync(new URL('../data/walllist/seacon-2025-september.json',import.meta.url),'utf8'));
test('rejects all non-Walllist tabs and malformed headers',()=>{
 for(const tab of ['Pairing','MacMahon','Backup','ผลการแข่งขัน'])assert.throws(()=>parseWalllist(tab,source.rows));
 assert.throws(()=>parseWalllist('Walllist',[['unrecognized layout']]));
});
test('preserves all source rows, ranks, names and reported round count',()=>{
 const groups=parseWalllist(source.sheet,source.rows);
 assert.equal(groups.length,10);assert.equal(groups.reduce((n,g)=>n+g.rows.length,0),212);
 for(const group of groups)for(const row of group.rows){
  const original=source.rows[row.sourceRow-1];assert.equal(row.name,original[1]);assert.equal(row.place,original[0]);assert.equal(row.rounds.length,group.afterRound);
 }
 assert.equal(groups[2].rows[7].place,'-8');
});
test('keeps absent participant placeholders distinct and scores unchanged',()=>{
 const groups=parseWalllist(source.sheet,source.rows);
 assert.equal(groups.flatMap(g=>g.rows).filter(r=>r.placeholder).length,5);
 assert.equal(groups[0].rows[0].points,'5');assert.equal(groups[0].rows[0].sos,'14');assert.equal(groups[0].rows[0].sosos,'66');
});
