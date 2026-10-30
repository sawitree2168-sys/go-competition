import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {linkedHistoryFor} from '../lib/competition/linked-history.ts';
const data=JSON.parse(fs.readFileSync(new URL('../data/profile-history/walllist-linked-v1.json',import.meta.url),'utf8'));
test('only approved 155 rows are indexed without inventing dates',()=>{assert.equal(data.items.length,155);assert(data.items.every(r=>r.event_date===null&&r.source_tab==='Walllist'));assert(!data.items.some(r=>r.go_id==='GO-347-180769'||r.go_id==='GO106260826'));});
test('selects exact GO ID only, no name/partial ID fallback',()=>{const id=data.items[0].go_id;const result=linkedHistoryFor(id,data.items);assert(result.length>0);assert(result.every(r=>r.go_id===id));assert.deepEqual(linkedHistoryFor(id.slice(0,-1),data.items),[]);});
test('duplicate source keys and unreviewed sources fail closed',()=>{assert.throws(()=>linkedHistoryFor(data.items[0].go_id,[...data.items,data.items[0]]));assert.throws(()=>linkedHistoryFor('GO1',[{...data.items[0],source_tab:'Pairing'}]));assert.throws(()=>linkedHistoryFor('GO1',[{...data.items[0],link_status:'pending'}]));});
