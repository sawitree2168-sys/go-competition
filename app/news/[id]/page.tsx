/* eslint-disable @next/next/no-img-element -- event artwork */
import {notFound} from 'next/navigation';
import Link from 'next/link';
import PublicPage from '@/components/PublicPage';
import CompetitionPanel from '@/components/CompetitionPanel';
import {loadStories, type Story} from '@/lib/site-news';
import {groupNewsEvents} from '@/lib/news-events.mjs';
import NewsDivisionResults from '@/components/NewsDivisionResults';
import {loadNewsWall} from '@/lib/news-wall';
import {thaiDate} from '@/lib/division-display';
export const revalidate=60;


export default async function Page({params}:{params:Promise<{id:string}>}) {
 const rawId=(await params).id;
 let id=rawId;
 try { id=decodeURIComponent(rawId); } catch { /* Keep malformed legacy IDs unchanged. */ }
 const stories=await loadStories();
 const grouped=groupNewsEvents(stories) as (Story & {divisions?:Story[]})[];
 // Keep previously shared per-division article URLs working.
 const s=grouped.find(x=>x.id===id)??stories.find(x=>x.id===id);
 if(!s)notFound();
 const divisions='divisions' in s ? s.divisions as Story[] : [s];
 const wall=await loadNewsWall(s.event,s.date);
 return <PublicPage icon="news" title={s.title} sub={s.event} current="/news">
  <Link className="mb-4 inline-flex min-h-11 items-center text-blue-800" href="/news">ข่าวสารทั้งหมด</Link>
  <CompetitionPanel title={s.title} context={s.event}>
   <article className="gt-card overflow-hidden">
    <img className="max-h-80 w-full object-contain bg-blue-50" src={s.poster} alt={s.event}/>
    <div className="space-y-5 p-5">
     <h2 className="text-2xl font-bold">{s.event}</h2><p>{thaiDate(s.date)}</p>
     {divisions.length>1&&<p className="text-lg">รวมผลการแข่งขัน {divisions.length} รุ่น</p>}
     {divisions.map(d=><NewsDivisionResults key={d.id} story={d} games={wall.games} unavailable={wall.unavailable}/>)}
     <p className="text-sm text-slate-600">แหล่งข้อมูล: ผลการแข่งขันที่บันทึกและตรวจสอบแล้ว • ข่าวปรับตามข้อมูลล่าสุด • ระดับคิวและดั้งไม่เปลี่ยนอัตโนมัติ</p>
     <Link href={`/results?event=${encodeURIComponent(s.event)}`} className="gt-cta-btn inline-flex min-h-12 items-center px-5">ดูผลการแข่งขันทั้งหมด</Link>
    </div>
   </article>
  </CompetitionPanel>
  <Link href="/results/submit" className="mt-5 inline-flex min-h-12 items-center text-blue-800 underline">มีภาพเพิ่มเติมหรือพบข้อมูลคลาดเคลื่อน? ส่งให้ผู้ดูแลตรวจสอบ</Link>
 </PublicPage>;
}
