import test from "node:test";
import assert from "node:assert/strict";
import { reconcileAthleteSources } from "./reconcile-athlete-sources.mjs";
const row = (sourceSystem,sourceKey,goId,fullName,rank="1 คิว") => ({sourceSystem,sourceKey,goId,fullName,rank});
test("preserves one identity across Kyu to Dan with stable GO ID", () => {
 const x=reconcileAthleteSources([row("kyu","K1","GO100","นักกีฬา ตัวอย่าง"),row("dan","D1","GO100","นักกีฬา ตัวอย่าง","1 ดั้ง")]);
 assert.equal(x.ready.length,1); assert.equal(x.ready[0].records.length,2); assert.equal(x.blocked.length,0);
});
test("quarantines different names assigned the same GO ID",()=>{
 const x=reconcileAthleteSources([row("kyu","K8","GO106260826","ชนัดดา ภูวนธรรม"),row("dan","D8","GO106260826","ภัควลัญชญ์ ทองวณิชนิยม")]);
 assert.equal(x.ready.length,0);assert.equal(x.blocked[0].reason,"go_id_name_conflict");
});
test("does not auto merge same names with different IDs",()=>{
 const x=reconcileAthleteSources([row("kyu","K1","GO100","ชื่อ ซ้ำ"),row("kyu","K2","GO200","ชื่อ ซ้ำ")]);
 assert.equal(x.ready.length,0);assert.equal(x.pending.length,2);
});
test("existing claimed profile retains existing UUID",()=>{
 const x=reconcileAthleteSources([row("kyu","K1","GO100","นักกีฬา ตัวอย่าง")],[{id:"existing-uuid",go_id:"GO100",full_name:"นักกีฬา ตัวอย่าง",claimed_by:"owner"}]);
 assert.equal(x.ready[0].existingAthleteId,"existing-uuid");
});
test("existing GO ID with a different name is quarantined",()=>{
 const x=reconcileAthleteSources([row("kyu","K1","GO100","คน ใหม่")],[{id:"existing-uuid",go_id:"GO100",full_name:"คน เดิม"}]);
 assert.equal(x.blocked[0].reason,"go_id_name_conflict");
});
