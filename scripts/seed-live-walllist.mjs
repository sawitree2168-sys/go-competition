import {readFileSync} from 'node:fs';
const rows=JSON.parse(readFileSync(new URL('../data/profile-history/walllist-linked-v1.json',import.meta.url),'utf8')).items;
if(rows.some(r=>r.source_tab!=='Walllist'||r.link_status!=='matched_name_and_id'))throw Error('Unverified seed');
const json=JSON.stringify(rows);if(json.includes('$walllist_seed$'))throw Error('Invalid delimiter');
process.stdout.write("insert into gt_private.history_walllist_results_v2(source_key,go_id,payload) select value->>'source_key',value->>'go_id',value from jsonb_array_elements($walllist_seed$"+json+"$walllist_seed$::jsonb) on conflict(source_key) do nothing;\n");
