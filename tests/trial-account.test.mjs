import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTrialLogin,trialAccount} from '../lib/competition/trial-account.ts';
test('public fictional trial works without email or activation',()=>{assert(checkTrialLogin(trialAccount.name,'12345678'));assert(checkTrialLogin('  นักกีฬา   ทดลอง  ','12345678'));});
test('real names, IDs, and incorrect passwords cannot enter the trial',()=>{assert.equal(checkTrialLogin('กัญญาณัฐ รัตนวงค์','12345678'),false);assert.equal(checkTrialLogin('GO101260826','12345678'),false);assert.equal(checkTrialLogin(trialAccount.name,'wrong'),false);});
