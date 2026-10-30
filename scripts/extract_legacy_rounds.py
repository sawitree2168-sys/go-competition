"""Extract reciprocal round tables; quarantine unsupported layouts. Never infer event dates."""
import openpyxl,re,json,glob,hashlib
from pathlib import Path
out={};review=[];stats={}
def clean(x):return str(x or '').strip()
def integer(x):
 try:return int(float(str(x).replace(',','')))
 except:return None
for file in sorted(glob.glob('/workspace/scratch/d3fd9d9199f9/year-*.xlsx')):
 year=int(Path(file).stem.split('-')[1]);w=openpyxl.load_workbook(file,data_only=True);count=0
 for s in w:
  if not re.fullmatch(r'\d{6}',s.title):continue
  rows=list(s.values);headers=[i for i,r in enumerate(rows) if any(re.fullmatch(r'(?:Round|รอบ)\s*1',clean(v),re.I) for v in r)]
  if not headers:review.append({'file_year':year,'tab':s.title,'reason':'non_round_table_requires_adapter'});continue
  for h in headers:
   end=next((x for x in headers if x>h),len(rows));hd=rows[h];rounds=[(j,int(re.search(r'\d+',clean(v)).group())) for j,v in enumerate(hd) if re.fullmatch(r'(?:Round|รอบ)\s*\d+',clean(v),re.I)]
   title=' / '.join(dict.fromkeys(clean(v) for r in rows[max(0,h-2):h] for v in r[:3] if v and not isinstance(v,(float,int))))
   ps={}
   for ri in range(h+1,end):
    r=rows[ri]
    if len(r)>3 and integer(r[0]) and clean(r[1]) and integer(r[2]) and any(re.fullmatch(r'\d+\s*[+-]',clean(r[c])) for c,_ in rounds if c<len(r)):ps[integer(r[0])]=(ri+1,r)
   for n,(ri,r) in ps.items():
    for c,rnd in rounds:
     m=re.fullmatch(r'(\d+)\s*([+-])',clean(r[c]))
     if not m:continue
     o=int(m[1]);opp=ps.get(o)
     if not opp:continue
     oi,q=opp
     if integer(r[2])==999 or integer(q[2])==999 or any(t in clean(r[1])+clean(q[1]) for t in ['BYE','ไม่มี']):continue
     if n>=o:continue
     reciprocal=re.fullmatch(r'(\d+)\s*([+-])',clean(q[c]))
     if not reciprocal or int(reciprocal[1])!=n or reciprocal[2]==m[2]:review.append({'file_year':year,'tab':s.title,'row':ri,'round':rnd,'reason':'non_reciprocal'});continue
     a,b=integer(r[2]),integer(q[2]);winner=a if m[2]=='+' else b
     # Tab + header block + player pair + round is stable across duplicate year files.
     key=f'{s.title}:{h}:{rnd}:{min(a,b)}:{max(a,b)}'
     rec={'key':key,'event_title_raw':title,'source_tab':s.title,'source_header_row':h+1,'source_rows':[ri,oi],'source_file_year':year,'round':rnd,'dan_a':a,'name_a':clean(r[1]),'dan_b':b,'name_b':clean(q[1]),'winner_dan':winner,'event_date':None,'status':'reciprocal_verified_event_metadata_pending'}
     if key in out and out[key]['winner_dan']!=winner:review.append({'key':key,'reason':'conflicting_result'});continue
     if key not in out:out[key]=rec;count+=1
 stats[year]=count
Path('data/staging/multiyear-rounds-v1.json').write_text(json.dumps({'matches':list(out.values()),'review':review,'new_matches_by_source_year':stats,'published':False},ensure_ascii=False,indent=2))
print(json.dumps({'unique_matches':len(out),'review_items':len(review),'by_source_year':stats}))
