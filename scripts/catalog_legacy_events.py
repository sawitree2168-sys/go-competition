"""Build auditable event/division candidates. Does not approve or publish history."""
import json,re,openpyxl,hashlib
from pathlib import Path
base=Path('data/staging'); data=json.loads((base/'multiyear-rounds-v1.json').read_text())
books={};groups={}
for m in data['matches']:groups.setdefault((m['source_file_year'],m['source_tab'],m['source_header_row']),[]).append(m)
records=[]
for (year,tab,header),matches in groups.items():
 if year not in books:books[year]=openpyxl.load_workbook(f'/workspace/scratch/d3fd9d9199f9/year-{year}.xlsx',data_only=True)
 s=books[year][tab];labels=[]
 for row in s.iter_rows(min_row=1,max_row=header-1,max_col=20):
  vals=[str(c.value).strip() for c in row if isinstance(c.value,str) and c.value.strip()]
  if not vals:continue
  text=' / '.join(vals)
  if any(re.fullmatch(r'(?:Round\s*\d+|รอบ\s*\d+|Pl\.|Name|Score)',v,re.I) for v in vals):continue
  if any(isinstance(s.cell(row[0].row,c).value,(int,float)) for c in (1,3)):continue
  if re.search(r'แข่งขัน|Tournament|Championship|League|คัดตัว|คัดเลือก|โอเพ่น|Open|กีฬามหาวิทยาลัย|กีฬาแห่งชาติ|ย่าโม',text,re.I):labels.append({'row':row[0].row,'text':text})
 event=labels[-1] if labels else None
 nearby=[]
 for row in s.iter_rows(min_row=max(1,header-2),max_row=header-1,max_col=3):
  for c in row:
   if isinstance(c.value,str) and re.search(r'รุ่น|Dan|Kyu|บุคคล|High|Low|OPEN',c.value,re.I):nearby.append({'row':c.row,'text':c.value.strip()})
 reasons=[]
 if not event:reasons.append('event_title_missing')
 if not nearby:reasons.append('division_not_explicit')
 # Fingerprint is only a potential-duplicate signal; repeated actual encounters must remain separate.
 fingerprint=hashlib.sha256(json.dumps(sorted((m['round'],min(m['dan_a'],m['dan_b']),max(m['dan_a'],m['dan_b']),m['winner_dan']) for m in matches)).encode()).hexdigest()
 records.append({'group_key':f'{year}:{tab}:{header}','source_file_year':year,'source_tab':tab,'header_row':header,'event_candidate':event,'division_candidates':nearby,'match_count':len(matches),'rounds':sorted(set(m['round'] for m in matches)),'fingerprint':fingerprint,'status':'metadata_review_required','issues':reasons,'event_date':None})
fp={}
for r in records:fp.setdefault(r['fingerprint'],[]).append(r['group_key'])
for r in records:r['possible_duplicate_groups']=[k for k in fp[r['fingerprint']] if k!=r['group_key']]
out={'groups':records,'published':False,'notes':'Source tab date is not assumed to be competition date. Candidate labels can span multiple event blocks and require review.'}
(base/'event-catalog-v1.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps({'groups':len(records),'matches':sum(r['match_count'] for r in records),'missing_event':sum('event_title_missing' in r['issues'] for r in records),'missing_division':sum('division_not_explicit' in r['issues'] for r in records),'possible_duplicate_groups':sum(bool(r['possible_duplicate_groups']) for r in records)}))
