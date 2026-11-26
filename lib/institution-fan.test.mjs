import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scopeFanData} from './institution-fan.ts';
const scope={id:'academy-a',name:'Academy A',students:[{id:'member',name:'สมชาย ใจดี'}]};
const division={people:[['other',{name:'คู่แข่ง'}]],matches:[{id:'match'}],standings:[{athlete_id:'other'}]};
const data={events:[],event:null,divisions:[division],checkedAt:'now',participants:[{key:'a',athleteId:'member',name:'สมชาย ใจดี',institution:'Another affiliation'},{key:'b',athleteId:'other',name:'คนนอก',institution:'Academy A'}]};
test('membership uses athlete IDs, including multiple affiliations; institution text cannot add outsiders',()=>assert.deepEqual(scopeFanData(data,scope).participants.map(p=>p.key),['a']));
test('opponents, match records and complete rankings remain available',()=>assert.equal(scopeFanData(data,scope).divisions,data.divisions));
test('public GO FAN remains unchanged',()=>assert.equal(scopeFanData(data),data));
test('pre-pairing names match only when both lists are unambiguous',()=>{
 const d={...data,participants:[{key:'pending',athleteId:null,name:'นายสมชาย ใจดี'}]};
 assert.equal(scopeFanData(d,scope).participants.length,1);
 assert.equal(scopeFanData({...d,participants:[...d.participants,{...d.participants[0],key:'duplicate'}]},scope).participants.length,0);
 assert.equal(scopeFanData(d,{...scope,students:[...scope.students,{id:'duplicate',name:'สมชาย ใจดี'}]}).participants.length,0);
});
test('an identified outsider with the same name is never selected',()=>assert.equal(scopeFanData({...data,participants:[{athleteId:'outsider',name:'สมชาย ใจดี'}]},scope).participants.length,0));
