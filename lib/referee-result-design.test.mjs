import test from 'node:test';
import assert from 'node:assert/strict';
import {buildResult,formFromResult} from './referee-result.mjs';
test('normal results do not require a margin and remain normal when editing',()=>{for(const winner of ['black','white']){assert.deepEqual(buildResult({winner,method:'normal',margin:''}),{ok:true,code:winner+'_win',margin:null});assert.equal(formFromResult({result_code:winner+'_win',result_margin:null}).method,'normal');}});
test('absence and double loss remain distinct persisted codes',()=>{assert.equal(buildResult({winner:'black',method:'forfeit'}).code,'black_win_forfeit');assert.equal(buildResult({winner:null,method:'double_loss'}).code,'double_loss');assert.equal(buildResult({winner:null,method:'double_forfeit'}).code,'double_forfeit');});
