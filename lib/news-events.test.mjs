import test from 'node:test';
import assert from 'node:assert/strict';
import {groupNewsEvents} from './news-events.mjs';
const story=(event,division,date='2026-11-15',complete=true)=>({id:division,event,division,date,complete,kind:'results',people:[{full_name:division}]});
test('one card per event preserves all divisions and searchable athletes',()=>{
 const rows=groupNewsEvents([story('A','Dan'),story('A','Kyu','2026-11-15',false),story('B','Dan')]);
 assert.equal(rows.length,2);assert.equal(rows[0].divisions.length,2);assert.equal(rows[0].people.length,2);assert.equal(rows[0].complete,false);assert.match(rows[0].body,/Dan \/ Kyu/);
});
test('separate editions and announcements remain distinct',()=>{
 const notice={id:'notice',kind:'announcement'};
 const rows=groupNewsEvents([story('A','Dan'),story('A','Dan','2025-11-15'),notice]);
 assert.equal(rows.length,3);assert.equal(rows[2],notice);assert.notEqual(rows[0].href,rows[1].href);
});
