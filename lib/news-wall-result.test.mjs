import test from 'node:test';
import assert from 'node:assert/strict';
import {wallResult} from './news-wall-result.mjs';
test('wall list shows results from each player perspective without inventing pending outcomes',()=>{
 const game={state:'verified',winner:'a'};
 assert.equal(wallResult(game,'a'),'win');assert.equal(wallResult(game,'b'),'loss');
 assert.equal(wallResult({...game,state:'pending'},'a'),'pending');
 assert.equal(wallResult({...game,winner:null},'a'),'pending');
 assert.equal(wallResult({...game,result:'draw'},'a'),'draw');
 assert.equal(wallResult({...game,result:'double_forfeit'},'a'),'loss');
 assert.equal(wallResult({bye:true},'a'),'bye');
});
