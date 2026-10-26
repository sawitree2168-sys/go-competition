import { readFileSync } from 'node:fs';
const path = new URL('../services/googleSheetsApi.ts', import.meta.url);
const code = readFileSync(path, 'utf8');
const checks = [
  { name: 'No cross-project GO MASTER athlete sheet ID in source', ok: !code.includes('1jDFQJkG-FD2265ZnTjXjXesTe_cu6P6p2hnep_MpmnI') },
  { name: 'Backend-backed search method exists', ok: code.includes("'searchAthleteAccount', 'GET'") },
];
for (const {name,ok} of checks) console.log(`${ok ? 'PASS' : 'BLOCK'} ${name}`);
if (checks.some(x=>!x.ok)) process.exitCode=1;