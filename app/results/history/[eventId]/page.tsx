import Link from 'next/link';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import PublicPage from '@/components/PublicPage';
import HistoryWallTable from '@/components/HistoryWallTable';
import BackLink from '@/components/BackLink';
import {loadHistoryWall,historyWallHref} from '@/lib/history-walllist';
import {thaiDate} from '@/lib/division-display';
const decode=(s:string)=>{try{return decodeURIComponent(s);}catch{return s;}};
export async function generateMetadata({params}:{params:Promise<{eventId:string}>}):Promise<Metadata>{
 const w=await loadHistoryWall(decode((await params).eventId));
 return {title:w?`${w.event.title} · วอลล์ลิสต์`:'วอลล์ลิสต์'};
}
export default async function HistoryWallPage({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{division?:string}>}){
 const eventId=decode((await params).eventId),{division}=await searchParams;
 const w=await loadHistoryWall(eventId,division);if(!w)notFound();
 const date=w.event.event_date?thaiDate(w.event.event_date):'ยังไม่ระบุวันแข่งขัน';
 return <PublicPage icon="results" title={w.event.title} sub={`${date} · วอลล์ลิสต์ผลรายรอบ`} current="/results">
  <div className="flex flex-wrap gap-4"><BackLink className="text-blue-800 underline" href="/results/history" label="← ย้อนกลับ"/><Link className="text-blue-800 underline" href="/results/history">รายการทั้งหมด</Link></div>
  <nav aria-label="เลือกรุ่น" className="mt-4 flex flex-wrap gap-2">{w.divisions.map(d=><Link key={d.name} scroll={false} href={historyWallHref(eventId,d.name)} aria-current={d.name===w.division?'page':undefined} className={d.name===w.division?'gt-cta-btn px-3 py-2 text-sm':'gt-outline-btn px-3 py-2 text-sm'}>{d.name} <small>({d.players})</small></Link>)}</nav>
  <section className="mt-5 space-y-3">
   <div><h2 className="text-2xl font-bold">{w.division}</h2><p className="text-sm text-slate-600">{w.rows.length} คน · {date}</p></div>
   <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">{w.ranking_mode==='calculated'?'อันดับต้นทางไม่ครบ จึงเรียงทั้งรุ่นจากคะแนนมากไปน้อย → SOS → SOSOS โดยใช้อันดับที่คำนวณในเลขคู่แข่งทุกช่อง':'แสดงอันดับตามผลต้นทางครบทั้งรุ่น คะแนนและ SOS คำนวณจากผลรายเกมที่นำเข้า อาจไม่ครอบคลุมการปรับคะแนนหรือเกณฑ์พิเศษของผู้จัด'}</p>
   {!w.has_rounds&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">รุ่นนี้ต้นทางไม่ระบุเลขรอบ จึงเรียงผลเป็นเกมที่ 1, 2, 3… แทนรอบ</p>}
   {w.ranking_mode==='source'&&w.rows.some((r,i)=>w.rows.slice(i+1).some(next=>next.points>r.points))&&<p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">พบว่าอันดับต้นทางไม่เรียงตามคะแนนจากผลรายเกมที่นำเข้า จึงคงอันดับต้นทางไว้เพื่ออ้างอิง กรุณาตรวจผลต้นทางก่อนใช้สรุปอันดับทางการ</p>}
   {w.rows.length?<HistoryWallTable wall={w}/>:<p className="gt-card p-6">ยังไม่มีผลที่ตรวจสอบแล้วในรุ่นนี้</p>}
   <p className="text-xs text-slate-600">ตัวเลขในช่องรอบคืออันดับของคู่แข่ง: + ชนะ, − แพ้, = เสมอ, บาย = ได้คะแนนโดยไม่ได้แข่ง, * = ชนะ/แพ้ผ่าน • อันดับต้นทางใช้เมื่อครบทั้งรุ่น มิฉะนั้นเรียงทั้งรุ่นตามคะแนน, SOS, SOSOS • SOS = ผลรวมคะแนนของคู่แข่ง, SOSOS = ผลรวม SOS ของคู่แข่ง (คำนวณจากผลที่นำเข้า)</p>
  </section>
 </PublicPage>;
}
