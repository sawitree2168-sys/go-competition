import test from 'node:test';
import assert from 'node:assert/strict';
import { boardMode, standingsMode, divisionProgress, latestPairings } from './competition-dashboard.mjs';
const m = (round, state='pending', pool='A') => ({round_number:round,state,pool_label:pool});
test('empty published board teaches; the first actual pairing replaces every demo row without a date guard', () => {
  assert.equal(boardMode(true, [], []), 'demo');
  assert.equal(boardMode(true, [m(1)], []), 'live');
  assert.equal(boardMode(true, [], [{round_number:1}]), 'live');
  assert.equal(boardMode(true, [m(1,'void')], []), 'demo');
});
test('failed reads never turn real competition into fictional fixtures', () => {
  assert.equal(boardMode(false, [], []), 'error');
  assert.equal(standingsMode(true,'error',[]),'error');
  assert.equal(standingsMode(false,'live',[]),'error');
});
test('real pairings remove fictional standings even while every score is zero', () => {
  assert.equal(standingsMode(true,'demo',[]),'demo');
  assert.equal(standingsMode(true,'live',[{wins:0,losses:0,byes:0}]),'live');
  assert.equal(standingsMode(true,'demo',[{wins:1,losses:0,byes:0}]),'live');
});
test('a finished pool cannot mark an unfinished pool complete', () => {
  assert.equal(divisionProgress([m(5,'verified','A'),m(4,'verified','B')],[],5).complete,false);
  assert.equal(divisionProgress([m(5,'verified','A'),m(5,'pending','B')],[],5).complete,false);
  assert.equal(divisionProgress([m(5,'verified','A'),m(5,'verified','B')],[],5).complete,true);
});
test('latest pairings include each pool’s latest round and actual byes', () => {
  const a=m(2,'verified','A'),b=m(1,'pending','B');
  assert.deepEqual(latestPairings([m(1,'verified','A'),a,b],[]).matches,[a,b]);
  assert.deepEqual(latestPairings([a,b],[{round_number:2,pool_label:'B'}],'B').matches,[]);
});
