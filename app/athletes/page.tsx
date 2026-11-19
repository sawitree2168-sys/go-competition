import Link from 'next/link';
import type {Metadata} from 'next';
import PublicPage from '@/components/PublicPage';
import AthleteDirectory, {type DirectoryAthlete} from '@/components/AthleteDirectory';
import {publicDb} from '@/app/tournaments/[id]/_ui/data';
import {loadResults} from '@/lib/public-site';
import {recordedStats} from '@/lib/athlete-results.mjs';
export const metadata:Metadata={title:'นักกีฬา'};
export default async function AthletesPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
 const params=await searchParams,q=(params.q??'').trim().slice(0,80),requested=Math.max(1,Number(params.page)||1);
 const db=publicDb();
 const [result,events]=await Promise.all([db?.rpc('gt_public_athlete_directory_v1',{p_query:q,p_page:requested,p_size:24}),loadResults(db)]);
 const data=result?.data as {total:number;page:number;page_size:number;rows:DirectoryAthlete[]}|null;
 const rows=(data?.rows??[]).map(a=>({...a,...recordedStats(events,a)}));
 const pages=data?Math.max(1,Math.ceil(data.total/data.page_size)):1;
 const href=(page:number)=>`/athletes?${new URLSearchParams({...q?{q}:{},page:String(page)})}`;
 return <PublicPage icon="athlete" title="นักกีฬา" sub="รายชื่อนักกีฬาทั้งหมดจากทะเบียน พร้อมผลงานการแข่งขันที่เผยแพร่แล้ว" current="/athletes">
  <form action="/athletes" className="flex gap-2"><label className="gt-card flex min-h-12 flex-1 items-center px-3"><span className="sr-only">ชื่อนักกีฬาหรือรหัส GO</span><input name="q" defaultValue={q} placeholder="ค้นหาชื่อ นามสกุล หรือรหัส GO" className="min-w-0 flex-1 bg-transparent text-base outline-none"/></label><button className="gt-cta-btn min-h-12 px-5">ค้นหา</button></form>
  {data&&!result?.error?<><div className="mt-5 flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">{q?'ผลการค้นหา':'นักกีฬาทั้งหมด'} {data.total.toLocaleString('th-TH')} คน</h2>{q&&<Link href="/athletes" className="text-blue-800 underline">ดูนักกีฬาทั้งหมด</Link>}</div><p className="mt-2 text-sm text-slate-600">สถิติจากผลการแข่งขันที่เผยแพร่ในเว็บไซต์ • ผู้ที่ยังไม่มีผลเผยแพร่จะแสดงสถานะตามจริง</p>{rows.length?<AthleteDirectory rows={rows}/>:<p className="gt-card mt-4 p-6">ไม่พบรายชื่อที่ตรงกับคำค้น</p>}<nav aria-label="หน้ารายชื่อนักกีฬา" className="mt-6 flex flex-wrap items-center justify-center gap-4">{data.page>1&&<Link className="gt-outline-btn px-4 py-3" href={href(data.page-1)}>หน้าก่อน</Link>}<span>หน้า {data.page} / {pages} · แสดงครั้งละ {data.page_size} คน</span>{data.page<pages&&<Link className="gt-outline-btn px-4 py-3" href={href(data.page+1)}>หน้าถัดไป</Link>}</nav></>:<p role="alert" className="gt-card mt-4 p-6">โหลดรายชื่อนักกีฬาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
 </PublicPage>;
}
