'use client';
import {useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import type {HistoryProfile} from '@/lib/central-history';
import CompetitionPanel from './CompetitionPanel';
import LevelTimeline from './LevelTimeline';
import {markInAppNav} from './BackLink';
import {historyWallHref} from '@/lib/history-wall-href';
const percent=(wins:number,games:number)=>games?`${(wins/games*100).toLocaleString('th-TH',{maximumFractionDigits:2})}%`:'—';
const outcome=(v:string,kind:string)=>kind==='bye'?'บาย':kind==='walkover'?(v==='win'?'ชนะผ่าน':'แพ้ผ่าน'):kind==='not_played'?'ไม่ได้แข่งขัน':v==='win'?'ชนะ':v==='loss'?'แพ้':v==='draw'?'เสมอ':'ยังไม่มีผล';
export default function CentralHistory({profile:p,initialView='summary',initialOpponent=''}:{profile:HistoryProfile;initialView?:string;initialOpponent?:string}){
 const sp=useSearchParams();
 const viewParam=sp?sp.get('view'):initialView,oppParam=(sp?sp.get('vs'):initialOpponent)??'';
 const view=viewParam==='wall'?'wall':'summary';
 const opponent=p.opponents.some(o=>o.opponent_key===oppParam)?oppParam:'';
 const remember=(v:string,o:string)=>{const q=new URLSearchParams(sp?.toString()??'');if(v==='wall')q.set('view','wall');else q.delete('view');if(o)q.set('vs',o);else q.delete('vs');const qs=q.toString();window.history.replaceState(null,'',qs?`${window.location.pathname}?${qs}`:window.location.pathname);};
 const setView=(v:string)=>remember(v,opponent);
 const setOpponent=(o:string)=>remember(view,o);
 const visible=p.games.filter(g=>!opponent||g.opponent_key===opponent);
 const selected=p.opponents.find(o=>o.opponent_key===opponent);
 const events=useMemo(()=>Array.from(new Set(visible.map(g=>g.event_id))).map(id=>({id,games:visible.filter(g=>g.event_id===id)})),[visible]);
 const stats=selected??p.stats;
 return <div className="mt-5 space-y-5">
  <div className="gt-card border-l-4 border-amber-400 p-4"><strong>ข้อมูลนำเข้าที่ตรวจสอบแล้ว · ปี 2569</strong><p className="mt-1 text-sm">{p.coverage.note} • ยังไม่ใช่ประวัติการแข่งขันทั้งหมด</p><p className="mt-1 text-sm">นับเปอร์เซ็นต์จากเกมที่เล่นจริง: ชนะ ÷ (ชนะ + แพ้ + เสมอ) ไม่รวมบายและการปรับคะแนน GAT</p></div>
  {!opponent&&<LevelTimeline history={p.level_history}/>}
  <label className="gt-card flex flex-col gap-2 p-4 font-bold">ดูสถิติการพบกัน<select className="min-h-12 w-full rounded-lg border border-blue-300 bg-white px-3 font-normal" value={opponent} onChange={e=>setOpponent(e.target.value)}><option value="">คู่แข่งทั้งหมด</option>{p.opponents.filter(o=>o.opponent_key).map(o=><option key={o.opponent_key} value={o.opponent_key}>{o.opponent_name} · {o.games} เกม{o.opponent_go_id?'':' · ยังไม่เชื่อม GO ID'}</option>)}</select></label>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[['แข่งจริง',stats.games],['ชนะ',stats.wins],['แพ้',stats.losses],['เสมอ',stats.draws],['อัตราชนะ',percent(stats.wins,stats.games)]].map(([label,value])=><div className="gt-card p-4 text-center" key={label}><p className="text-sm">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></div>)}</div>
  {selected?.opponent_go_id&&<Link className="inline-block text-blue-800 underline" href={`/athletes/history/${selected.opponent_go_id}`} onClick={markInAppNav}>ดูประวัติ {selected.opponent_name} →</Link>}
  <p className="text-sm text-slate-600">รายการแยกจากเกมที่เล่นจริง: บาย {visible.filter(g=>g.kind==='bye').length} · ชนะ/แพ้ผ่าน {visible.filter(g=>g.kind==='walkover').length} · ไม่ได้แข่งขัน {visible.filter(g=>g.kind==='not_played').length}</p>
  <CompetitionPanel title="ประวัติการแข่งขัน" context={`${p.full_name} · ปี 2569${selected?` · พบ ${selected.opponent_name}`:''}`}>
   <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="มุมมองผลการแข่งขัน">{[['summary','สรุปรายการ'],['wall','วอร์ลิส · ผลรายรอบ']].map(([id,label])=><button key={id} className={view===id?'gt-cta-btn px-4 py-3':'gt-outline-btn px-4 py-3'} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div>
   {!visible.length?<p className="gt-card p-6">ยังไม่มีแมตช์ที่ผ่านการตรวจสอบในชุดนำเข้าปี 2569</p>:events.map(event=>{
    const first=event.games[0],played=event.games.filter(g=>g.kind==='played'),wins=played.filter(g=>g.outcome==='win').length,losses=played.filter(g=>g.outcome==='loss').length,draws=played.filter(g=>g.outcome==='draw').length;
    return <article className="gt-card mb-4 overflow-hidden" key={event.id}><header className="bg-blue-900 p-4 text-white"><h2 className="text-lg font-bold">{first.title}</h2><Link className="mt-1 inline-block text-sm text-amber-200 underline" href={historyWallHref(event.id,first.division)} onClick={markInAppNav}>ดูวอลล์ลิสต์ทั้งรุ่น →</Link>{(p.placings??[]).filter(x=>x.event_id===event.id).map(x=><p key={x.division} className="mt-1 text-base font-bold text-amber-200">{x.place<=3?['🥇','🥈','🥉'][x.place-1]+' ':''}ได้ที่ {x.place} จาก {x.players} คน · {x.division}</p>)}<p className="mt-1 text-sm">{first.event_date?new Date(first.event_date+'T00:00:00+07:00').toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'long'}):`ปี ${first.event_year+543} · ยังไม่ยืนยันวันแข่งขัน`}</p></header>
     {view==='summary'?<div className="space-y-2 p-4"><p>แข่งขันจริง {played.length} เกม · <strong className="text-emerald-700">ชนะ {wins}</strong> · <strong className="text-pink-700">แพ้ {losses}</strong> · เสมอ {draws}</p><p>อัตราชนะ {percent(wins,played.length)}</p><p className="text-sm">รุ่น: {Array.from(new Set(event.games.map(g=>g.division))).join(' / ')}</p><button className="text-blue-800 underline" onClick={()=>setView('wall')}>ดูคู่แข่งและผลแต่ละรอบ →</button></div>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">รุ่น / รอบ</th><th className="text-left">คู่แข่ง</th><th>ผล</th><th>อ้างอิง</th></tr></thead><tbody>{event.games.map(g=><tr key={g.id}><td className="text-left">{g.division}<small className="block">รอบ {g.round_label||'ยังไม่ระบุ'}{g.board_label?` · กระดาน ${g.board_label}`:''}</small></td><td className="text-left">{g.opponent_go_id?<Link className="font-bold text-blue-800 underline" href={`/athletes/history/${g.opponent_go_id}`} onClick={markInAppNav}>{g.opponent_name}</Link>:<><strong>{g.opponent_name}</strong><small className="block text-slate-500">ยังไม่เชื่อม GO ID</small></>}</td><td><span className={`inline-block rounded-full px-3 py-1 font-bold ${g.outcome==='win'?'bg-emerald-100 text-emerald-800':g.outcome==='loss'?'bg-pink-100 text-pink-800':'bg-slate-100 text-slate-700'}`}>{outcome(g.outcome,g.kind)}</span></td><td><a className="text-blue-800 underline" href={g.source_url} target="_blank" rel="noreferrer">ต้นทาง</a></td></tr>)}</tbody></table></div>}
    </article>;
   })}
  </CompetitionPanel>
 </div>;
}
