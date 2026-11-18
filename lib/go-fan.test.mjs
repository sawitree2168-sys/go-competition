import test from 'node:test';
import assert from 'node:assert/strict';
import { fanKey, fanOutcome, readFanFollows } from './go-fan.mjs';
test('a follow survives pairing publication despite a title or whitespace change, without merging divisions',()=>{
 assert.equal(fanKey('event','div','ด.ช. กิตติพงศ์ วัฒนกุล'),fanKey('event','div','กิตติพงศ์วัฒนกุล'));
 assert.notEqual(fanKey('event','div1','กิตติพงศ์'),fanKey('event','div2','กิตติพงศ์'));
});
test('provisional winners never appear as confirmed results',()=>{
 assert.equal(fanOutcome({state:'pending',winner_athlete_id:'a'},'a').kind,'waiting');
 assert.equal(fanOutcome({state:'verified',result_code:'draw'},'a').kind,'draw');
 assert.equal(fanOutcome({state:'verified',result_code:'double_forfeit'},'a').label,'แพ้');
});
test('result colour follows the selected athlete rather than always the winning side',()=>{
 const m={state:'verified',result_code:'white_win',black_athlete_id:'b',white_athlete_id:'w',winner_athlete_id:'w',result_margin:'R'};
 assert.deepEqual(fanOutcome(m,'w'),{kind:'win',label:'ชนะ',detail:'W+R'});
 assert.equal(fanOutcome(m,'b').kind,'loss');
});
test('damaged browser storage cannot crash the public page or restore invalid records',()=>{
 assert.deepEqual(readFanFollows('broken'),[]);
 assert.deepEqual(readFanFollows('{}'),[]);
 assert.deepEqual(readFanFollows('[null,{"key":2}]'),[]);
 const saved={key:'event:div:name',eventId:'event',name:'ชื่อ',divisionName:'1–2 คิว',notify:false};
 assert.equal(readFanFollows(JSON.stringify([saved]))[0].notify,false);
});
