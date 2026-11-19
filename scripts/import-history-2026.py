"""Deterministic, offline import preparation. Never writes source Sheets or guesses dates.
Outputs private import payload; apply transactionally with privileged SQL tooling.
"""
import json,re,hashlib,collections,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
def norm(s):
 s=re.sub(r'\[[^\]]*\]','',str(s or ''))
 s=re.sub(r'^(ด\.ช\.|ด\.ญ\.|นาย|นางสาว|นาง)\s*','',s.strip())
 s=re.sub(r'\s*\d+\s*(?:dan|ดั้ง|d)\*?\s*$','',s,flags=re.I)
 s=re.sub(r'\s+\d+\s*$','',s)
 return re.sub(r'[\s\u200b-\u200d\ufeff]','',s).lower()
def integer(s):
 try:
  v=float(str(s).replace(',','').strip());return int(v) if v.is_integer() else None
 except (ValueError,TypeError):return None
def sha(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
def prepare():
 src=read('data/association-2026-source.json');registry=read('data/history-identity-links.json')
 dans={p['dan']:p for p in registry if p['dan'] is not None};names=collections.defaultdict(list)
 for p in registry:names[norm(p['name'])].append(p)
 people={p['go_id']:{'id':p['go_id'],'name':p['name'],'go_id':p['go_id']} for p in registry}
 events=[];games=[];reviews=[];links=[];sources=[];observations=[]
 def person(dan,name,event):
  d=integer(dan);p=dans.get(d)
  # A matching number alone is insufficient. Names must independently agree.
  suffix=norm(name)[len(norm(p['name'])):] if p and norm(name).startswith(norm(p['name'])) else None
  teams={'iq-up','goaddicted','brightgo','dragongo','gomaster','sualisensei','trinitygoacademy','happygoacademy','gohouse','gofamily','happygenius','thinkkub','บ้านโกะbyครูได๋','ครูเตอร์สอนหมากล้อม','aigokarnmaklom','wangmakgo','mr.goacademy','gosense'}
  if p and (suffix=='' or suffix in teams or suffix and suffix.startswith('โรงเรียน')):
   links.append({'namespace':'association_dan','identifier':str(d),'person_id':p['go_id'],'basis':'dan_and_normalized_name' if not suffix else 'dan_name_and_explicit_institution_suffix','observed_name':name})
   return p['go_id']
  if d is None and len(names[norm(name)])==1:
   p=names[norm(name)][0];return p['go_id']
  key='local:'+sha([event,str(dan),norm(name)])[:24]
  people[key]={'id':key,'name':str(name).strip(),'go_id':None}
  reviews.append({'key':key,'reason':'identity_unresolved' if not p else 'identity_name_mismatch','details':{'dan':dan,'name':name,'candidate':p['go_id'] if p else None}})
  return key
 for t in src['tabs']:
  rows=t['rows'];tab=t['tab'];event='association:'+tab;title=next((str(v).strip() for v in rows[0] if v), '') if rows else ''
  source_url=f"https://docs.google.com/spreadsheets/d/{src['spreadsheetId']}/edit#gid={t['gid']}"
  sources.append({'key':event,'hash':sha(rows),'url':source_url,'payload':{'tab':tab,'rows':rows}})
  if tab=='171069':
   reviews.append({'key':event,'reason':'rating_reversal_not_new_matches','details':{'title':title}});continue
  if tab in ('211268','030269','210269','210869') or not title:
   reviews.append({'key':event,'reason':'event_edition_review','details':{'title':title}});continue
  title={'240769':'ธรรมศาสตร์ โอเพ่น 2026','151169':'LOTUS’S × BUDDY GO Championship 2026'}.get(tab,title)
  date={'151169':'2026-11-15','160569':'2026-05-16','240769':'2026-07-18','071169':'2026-11-07','081169':'2026-11-08'}.get(tab)
  events.append({'id':event,'title':title,'year':2026,'date':date,'date_status':'verified' if date else 'year_only','source_url':source_url})
  headers=[]
  for i,r in enumerate(rows):
   # Several source editions use Thai headings; rounds must be explicit columns.
   roundcols=[(j,int(m.group(1))) for j,v in enumerate(r) if (m:=re.fullmatch(r'รอบ\s*(\d+)',str(v).strip()))]
   if roundcols and len(r)>2 and str(r[1]).strip() in ('Name','ชื่อ-สกุล'):
    headers.append((i,roundcols))
  consumed=set()
  for hi,roundcols in headers:
   end=next((j for j,_ in headers if j>hi),len(rows));players={}
   division=next((str(v).strip() for v in rows[hi-1][:2] if v),'ไม่ระบุรุ่น') if hi else 'ไม่ระบุรุ่น'
   if hi==1:division='1 Dan' if tab=='160569' else '1–2 Dan' if tab=='151169' else 'ไม่ระบุรุ่น'
   for i in range(hi+1,end):
    r=rows[i]
    if len(r)>2 and integer(r[0]) and r[1] and not re.fullmatch(r'[\d.,\s]+',str(r[1])):
     place=integer(r[0])
     if place in players:
      reviews.append({'key':f'{event}:{hi}:{i}','reason':'duplicate_place','details':{'row':i+1}});continue
     pid=person(r[2],r[1],event);players[place]={'row':i+1,'r':r,'id':pid,'dan':integer(r[2])};consumed.add(i)
     observations.append({'key':f'{event}:{hi}:{i}','person_id':pid,'event_id':event,'division':division,'placing':place,'payload':{'source_row':i+1,'values':r}})
   seen=set()
   for place,a in players.items():
    for col,rnd in roundcols:
     token=str(a['r'][col] or '').strip() if col<len(a['r']) else ''
     if not token:continue
     m=re.fullmatch(r'(\d+)\s*([+\-=])',token)
     key=f'{event}:wall:{hi+1}:{rnd}:{place}'
     if not m:
      reviews.append({'key':key,'reason':'round_token_review','details':{'token':token,'row':a['row']}});continue
     opp,sign=int(m[1]),m[2];pair=tuple(sorted((place,opp)))+(rnd,)
     if pair in seen:continue
     seen.add(pair);b=players.get(opp)
     if not b or opp==place:
      reviews.append({'key':key,'reason':'opponent_missing','details':{'token':token,'row':a['row']}});continue
     back=str(b['r'][col] or '').strip() if col<len(b['r']) else ''
     expected=f"{place}{ {'+':'-','-':'+','=':'='}[sign]}"
     if re.sub(r'\s','',back)!=expected:
      reviews.append({'key':key,'reason':'non_reciprocal_result','details':{'a_row':a['row'],'b_row':b['row'],'a':token,'b':back}});continue
     if a['id']==b['id']:
      reviews.append({'key':key,'reason':'self_match','details':{'a':a,'b':b}});continue
     games.append({'id':f'{event}:wall:{hi+1}:r{rnd}:p{min(place,opp)}-{max(place,opp)}','event_id':event,'division':division,'round':str(rnd),'board':None,'a':a['id'],'b':b['id'],'winner':a['id'] if sign=='+' else b['id'] if sign=='-' else None,'kind':'played','result':'draw' if sign=='=' else 'decisive','evidence':{'source':event,'rows':[a['row'],b['row']],'verification':'reciprocal_walllist','dan_a':a['dan'],'dan_b':b['dan']}})
  # Direct A/B records: only explicit result pairs and round metadata are accepted.
  header=None;division='ไม่ระบุรุ่น';context='';tie=''
  for i,r in enumerate(rows):
   ids=[j for j,v in enumerate(r) if str(v).strip() in ('เลขที่ดั้ง','เลขดั้ง')]
   if len(ids)>=2 and ids[0]<12:
    ia,ib=ids[:2];header=(ia,ib,r)
    if i and rows[i-1] and rows[i-1][0] and not str(rows[i-1][0]).startswith('คู่ที่'):division=str(rows[i-1][0]).strip()
    continue
   if header is None:continue
   ia,ib,h=header
   if len(r)<=ib+1 or not r[ia+1] or not r[ib+1] or integer(r[ia]) is None or integer(r[ib]) is None:continue
   if i in consumed and ia==0:continue
   left=[str(v).strip() for v in r[ia+2:ib] if str(v).strip() in ('ชนะ','แพ้','เสมอ')]
   right=[str(v).strip() for v in r[ib+2:min(len(r),ib+6)] if str(v).strip() in ('ชนะ','แพ้','เสมอ')]
   if not left:continue
   key=f'{event}:direct:{i+1}'
   rnd=str(r[0]).strip() if ia>=2 and str(h[0]).strip() in ('รอบ','รอบที่','รอบการแข่งขัน') else ''
   if not rnd or (right and (left[0],right[0]) not in [('ชนะ','แพ้'),('แพ้','ชนะ'),('เสมอ','เสมอ')]):
    reviews.append({'key':key,'reason':'direct_round_or_result_review','details':{'row':i+1,'values':r[:ib+6]}});continue
   a=person(r[ia],r[ia+1],event);b=person(r[ib],r[ib+1],event)
   if a==b:continue
   games.append({'id':key,'event_id':event,'division':division,'round':rnd,'board':str(r[1]) if ia==2 else None,'a':a,'b':b,'winner':a if left[0]=='ชนะ' else b if left[0]=='แพ้' else None,'kind':'played','result':'draw' if left[0]=='เสมอ' else 'decisive','evidence':{'source':event,'rows':[i+1],'verification':'explicit_result','dan_a':integer(r[ia]),'dan_b':integer(r[ib])}})
  if not headers and not any(g['event_id']==event for g in games):
   reviews.append({'key':event,'reason':'event_adapter_pending','details':{'title':title,'rows':len(rows)}})
 # 1go provides explicit team/tie/board context. Cross-source duplicate matches are
 # attached as evidence, not added to stats twice. Unknown identity stays separate.
 onego=read('data/onego-2026-source.json')['values'];sources.append({'key':'onego:2026','hash':sha(onego),'url':'https://docs.google.com/spreadsheets/d/1jDFQJkG-FD2265ZnTjXjXesTe_cu6P6p2hnep_MpmnI/edit','payload':{'rows':onego}})
 for i,r in enumerate(onego[1:],2):
  if len(r)<17 or r[1]!='2569':continue
  event='association:081169' if 'J-Park' in r[3] else 'association:071169' if 'Thailand Go League' in r[3] else None
  if not event:continue
  da=integer(str(r[7]).split('-')[-1]);db=integer(str(r[11]).split('-')[-1]);rnd=re.search(r'\d+',r[5]);rnd=rnd[0] if rnd else ''
  key='onego:'+str(r[0]);valid=(r[9],r[13]) in [('ชนะ','แพ้'),('แพ้','ชนะ'),('เสมอ','เสมอ')]
  if not valid or not rnd:
   reviews.append({'key':key,'reason':'onego_result_review','details':{'row':i,'values':r}});continue
  candidates=[g for g in games if g['event_id']==event and g['round']==rnd and sorted([g['evidence'].get('dan_a') or -1,g['evidence'].get('dan_b') or -1])==sorted([da or -1,db or -1])]
  a=person(da,r[8],event);b=person(db,r[12],event);winner=a if r[9]=='ชนะ' else b if r[9]=='แพ้' else None
  if len(candidates)==1:
   g=candidates[0]
   # Team suffixes in official names may be unresolved; 1go names independently
   # link only when the same identifiers and result agree.
   oldwin=g['evidence']['dan_a'] if g['winner']==g['a'] else g['evidence']['dan_b'] if g['winner']==g['b'] else None
   if oldwin!=(da if winner==a else db if winner==b else None):
    games.remove(g);reviews.append({'key':key,'reason':'cross_source_conflict','details':{'official':g,'onego':r}});continue
   g.update(a=a,b=b,winner=winner);g['evidence']['onego_row']=i;g['evidence']['onego_id']=r[0];g['evidence']['team_round']=r[5]
   continue
  if candidates:
   reviews.append({'key':key,'reason':'cross_source_ambiguous','details':{'row':i,'matches':[g['id'] for g in candidates]}});continue
  games.append({'id':key,'event_id':event,'division':r[4],'round':rnd,'board':r[6],'a':a,'b':b,'winner':winner,'kind':'played','result':'draw' if winner is None else 'decisive','evidence':{'source':'onego:2026','rows':[i],'source_match_id':r[0],'team_round':r[5],'verification':'explicit_complementary_results','dan_a':da,'dan_b':db}})
 # Include the previously verified public event archives, preserving actual
 # result codes. Thammasat's game log supersedes the overlapping rating walllist
 # because it distinguishes walkovers, double forfeits, resignations and byes.
 tu=read('data/thammasat-2026-games-source.json');event='association:240769'
 sources.append({'key':'onego:thammasat2026','hash':sha(tu),'url':tu['sourceUrl'],'payload':tu})
 games=[g for g in games if g['event_id']!=event]
 for g in tu['games']:
  a=person(None,g['blackName'],event);b=person(None,g['whiteName'],event) if g['whiteId'] else None
  code=g['code'];kind='bye' if code=='BYE' else 'not_played' if code=='DOUBLE_FORFEIT' else 'walkover' if code.endswith('_WO') else 'played'
  winner=a if code.startswith('BLACK') or code=='BYE' else b if code.startswith('WHITE') else None
  games.append({'id':'onego:tu:'+g['sourceId'],'event_id':event,'division':g['division'],'round':str(g['round']),'board':None,'a':a,'b':b,'winner':winner,'kind':kind,'result':'decisive','evidence':{'source':'onego:thammasat2026','source_match_id':g['sourceId'],'verification':'verified_game_log','result_code':code,'correction_source':g.get('correctionSourceUrl'),'original_code':g.get('originalCode')}})
 lam=read('data/historical-round-sources.json')[0];event='onego:lamphun2026'
 events.append({'id':event,'title':lam['event'],'year':2026,'date':lam['date'],'date_status':'verified','source_url':lam['sourceUrl']})
 sources.append({'key':event,'hash':sha(lam),'url':lam['sourceUrl'],'payload':lam})
 byref={(p['division'],p['placing']):p for p in lam['players']};done=set()
 for p in lam['players']:
  a=person(None,p['name'],event)
  for rnd,token in enumerate(p['rounds'],1):
   m=re.fullmatch(r'(\d+)([+\-=])',str(token));key=f"{event}:{p['division']}:{rnd}:{p['placing']}"
   if '×' in str(token):
    games.append({'id':key,'event_id':event,'division':p['division'],'round':str(rnd),'board':None,'a':a,'b':None,'winner':None,'kind':'not_played','result':'decisive','evidence':{'source':event,'verification':'explicit_nonplayed_round','token':token}});continue
   if not m:continue
   opp=int(m[1]);q=byref.get((p['division'],opp));pair=(p['division'],rnd,min(p['placing'],opp),max(p['placing'],opp))
   if pair in done:continue
   if not q or str(q['rounds'][rnd-1])!=str(p['placing'])+{'+':'-','-':'+','=':'='}[m[2]]:raise ValueError('Lamphun archive no longer reciprocal')
   done.add(pair);b=person(None,q['name'],event)
   games.append({'id':key,'event_id':event,'division':p['division'],'round':str(rnd),'board':None,'a':a,'b':b,'winner':a if m[2]=='+' else b if m[2]=='-' else None,'kind':'played','result':'draw' if m[2]=='=' else 'decisive','evidence':{'source':event,'verification':'reciprocal_walllist'}})
 # The source row is a stable occurrence key; repeated pairings in later rounds
 # or different team ties are intentionally not collapsed.
 unique={g['id']:g for g in games};rev={r['key']+':'+r['reason']:r for r in reviews}
 payload={'version':1,'batch':'history-2026-20261119-v1','people':list(people.values()),'links':list({(x['namespace'],x['identifier'],x['person_id']):x for x in links}.values()),'events':events,'games':list(unique.values()),'reviews':list(rev.values()),'sources':sources,'observations':observations}
 payload['summary']={'source_tabs':len(src['tabs']),'source_rows':sum(len(t['rows']) for t in src['tabs']),'identities':len(registry),'linked_dan_ids':len(payload['links']),'events':len(events),'event_with_games':len({g['event_id'] for g in unique.values()}),'verified_records':len(unique),'verified_games':sum(g['kind']=='played' for g in unique.values()),'record_kinds':dict(collections.Counter(g['kind'] for g in unique.values())),'linked_players_with_games':len({p for g in unique.values() if g['kind']=='played' for p in (g['a'],g['b']) if p and p.startswith('GO')}),'reviews':dict(collections.Counter(r['reason'] for r in rev.values()))}
 return payload
if __name__=='__main__':
 payload=prepare();(ROOT/'data/history-2026-import.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')))
 print(json.dumps(payload['summary'],ensure_ascii=False,indent=2))
