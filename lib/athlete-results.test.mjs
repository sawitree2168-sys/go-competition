import test from 'node:test';import assert from 'node:assert/strict';
import {filterAthleteResults,athleteResultsHref,recordedStats} from './athlete-results.mjs';
const events=[{title:'E',divisions:[{division:'D',people:[{go_id:'GO1',full_name:'ก ข',wins:2,losses:1},{go_id:'004',full_name:'ก ข',wins:3,losses:2},{go_id:'GO2',full_name:'ก ข',wins:8,losses:0},{go_id:'005',full_name:'ค ง',wins:4,losses:1}]}]}];
test('personal results exclude other IDs and unrelated names',()=>{const rows=filterAthleteResults(events,{goId:'GO1',name:'ก ข'});assert.deepEqual(rows[0].divisions[0].people.map(p=>p.go_id),['GO1','004']);assert.equal(recordedStats(events,{go_id:'GO1',full_name:'ก ข'}).wins,5);assert.equal(filterAthleteResults(events,{goId:'GO9',name:'ไม่พบ'}).length,0);});
test('result links carry identity and an empty search keeps all results',()=>{assert.match(athleteResultsHref({go_id:'GO1',full_name:'ก ข'}),/go_id=GO1/);assert.equal(filterAthleteResults(events,{}),events);});
