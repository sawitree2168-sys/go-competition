"""Build bounded, idempotent INSERT statements from the reviewed offline payload.
Run only through privileged tooling; no write RPC is exposed to browsers.
"""
import json,pathlib,hashlib
from urllib.parse import quote
root=pathlib.Path(__file__).resolve().parents[1]
p=json.loads((root/'data/history-2026-import.json').read_text())
out=root/'.history-import-sql';out.mkdir(exist_ok=True)
def lit(v):return 'null' if v is None else "'"+str(v).replace("'","''")+"'"
def j(v):return lit(json.dumps(v,ensure_ascii=False,separators=(',',':'))) +'::jsonb'
steps=[]
digest=hashlib.sha256(json.dumps(p,sort_keys=True).encode()).hexdigest()
steps.append("do $$ begin if exists(select 1 from gt_private.history_central_batches_v1 where id="+lit(p['batch'])+" and payload_hash<>"+lit(digest)+") then raise exception 'Import batch contents changed: create a reviewed revision before importing'; end if; end $$;\ninsert into gt_private.history_central_batches_v1(id,payload_hash,summary) values("+','.join([lit(p['batch']),lit(digest),j(p['summary'])])+") on conflict(id) do nothing;")
def insert(table,cols,rows):
 chunk=[];size=0
 for row in rows:
  value='('+','.join(row)+')';chunk.append(value);size+=len(value)
  if size>24000:
   steps.append(f"insert into {table}({cols}) values "+','.join(chunk)+' on conflict do nothing;');chunk=[];size=0
 if chunk:steps.append(f"insert into {table}({cols}) values "+','.join(chunk)+' on conflict do nothing;')
insert('public.gt_history_people','id,go_id,full_name',[[lit(x['id']),lit(x['go_id']),lit(x['name'])] for x in p['people']])
insert('public.gt_history_events','id,title,event_year,event_date,date_status,source_url',[[lit(x[k]) for k in ('id','title','year','date','date_status','source_url')] for x in p['events']])
insert('gt_private.history_identity_links_v1','namespace,identifier,person_id,basis,observed_name',[[lit(x[k]) for k in ('namespace','identifier','person_id','basis','observed_name')] for x in p['links']])
urls={x['key']:x['url'] for x in p['sources']}

def public_match_source(game):
 source = game['evidence']['source']
 if source == 'onego:2026':
  event_id = quote(game['event_id'], safe='')
  return f'https://go-competition.vercel.app/results/history/{event_id}'
 return urls[source]

insert('public.gt_history_matches','id,event_id,player_a,player_b,winner,result,kind,division,round_label,board_label,source_url,import_batch',[[lit(x[k]) for k in ('id','event_id','a','b','winner','result','kind','division','round','board')]+[lit(public_match_source(x)),lit(p['batch'])] for x in p['games']])
insert('gt_private.history_match_evidence_v1','match_id,payload',[[lit(x['id']),j(x['evidence'])] for x in p['games']])
insert('gt_private.history_central_review_v1','review_key,reason,details,batch_id',[[lit(x['key']),lit(x['reason']),j(x['details']),lit(p['batch'])] for x in p['reviews']])
insert('gt_private.history_player_observations_v1','source_key,person_id,event_id,division,placing_no,payload',[[lit(x[k]) for k in ('key','person_id','event_id','division','placing')]+[j(x['payload'])] for x in p['observations']])
insert('gt_private.history_source_snapshots_v1','source_key,content_hash,source_url,payload,batch_id',[[lit(x['key']),lit(x['hash']),lit(x['url']),j(x['payload']),lit(p['batch'])] for x in p['sources']])
for i,s in enumerate(steps):(out/f'{i:03}.sql').write_text(s)
(out/'all.sql').write_text('begin;\n'+'\n'.join(steps)+'\ncommit;')
print(json.dumps({'statements':len(steps),'characters':sum(map(len,steps))}))
