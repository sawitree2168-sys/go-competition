import type {LevelHistory} from '@/lib/central-history';
const when=(date:string|null,year:number)=>date?new Date(date+'T00:00:00+07:00').toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium'}):`ปี ${year+543} · ยังไม่ยืนยันวันแข่งขัน`;
export default function LevelTimeline({history:h}:{history?:LevelHistory}){
 if(!h||!h.items.some(i=>i.level_at_time))return null;
 const steps=h.items.filter(i=>i.level_changed||(i.level_at_time&&!h.items.slice(0,h.items.indexOf(i)).some(p=>p.level_at_time)));
 return <section className="gt-card p-4" aria-labelledby="level-history-title">
  <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="level-history-title" className="text-lg font-bold">พัฒนาการระดับฝีมือ</h2>{h.current?.label&&<span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">ปัจจุบัน {h.current.label} · เลขดั้ง {h.current.dan_number}</span>}</div>
  <ol className="mt-3 flex flex-wrap items-center gap-2" aria-label="ลำดับระดับฝีมือ">{steps.map((s,i)=><li key={`${s.kind}-${s.event_id??s.dan_number}-${i}`} className="flex items-center gap-2">{i>0&&<span aria-hidden="true" className="text-slate-400">→</span>}<span className={`rounded-full px-3 py-1 font-bold ${s.kind==='dan'?'bg-amber-100 text-amber-900':'bg-blue-100 text-blue-900'}`}>{s.level_at_time}</span></li>)}</ol>
  <ol className="mt-4 space-y-2 border-l-2 border-blue-200 pl-4">{h.items.map((s,i)=><li key={`${s.kind}-${s.event_id??s.dan_number}-${i}`} className="relative"><span aria-hidden="true" className={`absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full ${s.level_changed?'bg-amber-500':'bg-blue-300'}`}/>
   <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong className={s.kind==='dan'?'text-amber-800':''}>{s.title}</strong><small className="text-slate-600">{when(s.event_date,s.event_year)}</small></div>
   <p className="text-sm">{s.divisions?.length?`รุ่น ${s.divisions.join(' / ')} · `:''}ระดับ <strong>{s.level_at_time??'ยังไม่ทราบ'}</strong>{s.level_changed&&<span className="ml-2 rounded bg-amber-100 px-2 text-xs font-bold text-amber-900">ขึ้นระดับ</span>}{s.kind==='event'&&!s.level&&s.level_at_time&&<small className="ml-2 text-slate-500">(รุ่นนี้ไม่ได้แบ่งตามระดับ ใช้ระดับล่าสุดก่อนหน้า)</small>}</p></li>)}</ol>
  <p className="mt-3 text-xs text-slate-600">{h.note}</p>
 </section>;
}
