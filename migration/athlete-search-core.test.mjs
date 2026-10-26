import test from 'node:test';
import assert from 'node:assert/strict';
import { searchAthleteByName } from './athlete-search-core.mjs';
test('invalid name never calls backend', async () => {
 let called=false; const r=await searchAthleteByName(' ',async()=>{called=true;return []});
 assert.equal(r.status,'invalid'); assert.equal(called,false);
});
test('empty verified response is not_found', async () => {
 assert.equal((await searchAthleteByName('สมชาย',async()=>[])).status,'not_found');
});
test('backend outage must be error not not_found', async () => {
 assert.equal((await searchAthleteByName('สมชาย',async()=>{throw new Error('offline')})).status,'error');
});
test('invalid API response must be error', async () => {
 assert.equal((await searchAthleteByName('สมชาย',async()=>({}))).status,'error');
});
test('results are sanitized and capped', async () => {
 const r=await searchAthleteByName('  เด็ก  ดี ',async (query)=>{
  assert.equal(query,'เด็ก ดี');
  return [{athleteId:'',displayName:'bad'},...Array.from({length:25},(_,i)=>({athleteId:String(i+1),displayName:'เด็ก ดี'}))];
 });
 assert.equal(r.status,'found'); assert.equal(r.items.length,20);
});