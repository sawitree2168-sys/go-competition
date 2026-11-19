import Link from 'next/link';
import type {Metadata} from 'next';
import PublicPage from '@/components/PublicPage';
import {loadHistoryEvents,historyWallHref} from '@/lib/history-walllist';
import {thaiDate} from '@/lib/division-display';
export const revalidate=60;
export const metadata:Metadata={title:'วอลล์ลิสต์ย้อนหลัง'};
export default async function HistoryEventsPage(){
 const events=await loadHistoryEvents();
 return <PublicPage icon="results" title="วอลล์ลิสต์ย้อนหลัง" sub="ผลรายรอบทุกรุ่นจากประวัติกลางที่ตรวจสอบแล้ว" current="/results">
  <Link className="text-blue-800 underline" href="/results">← ผลการแข่งขัน</Link>
  <ul className="mt-4 grid gap-3 sm:grid-cols-2">{events.map(e=><li key={e.id}><Link href={historyWallHref(e.id)} className="gt-card block p-4 hover:border-blue-400"><strong className="block text-lg">{e.title}</strong><span className="text-sm text-slate-600">{e.event_date?thaiDate(e.event_date):`ปี ${e.event_year+543}`} · {e.divisions} รุ่น · {e.games.toLocaleString('th-TH')} เกม</span></Link></li>)}</ul>
 </PublicPage>;
}
