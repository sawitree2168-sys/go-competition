import Link from 'next/link';
import type {Metadata} from 'next';
import PublicPage from '@/components/PublicPage';
import AthleteDirectory, {type DirectoryAthlete} from '@/components/AthleteDirectory';
import {publicDb} from '@/app/tournaments/[id]/_ui/data';
import AthletePaging, {AthletePageSize} from '@/components/AthletePaging';
import {loadHistoryStats} from '@/lib/central-history';
export const metadata:Metadata={title:'นักกีฬา'};
export default async function AthletesPage({searchParams}:{searchParams:Promise<{q?:string;page?:string;view?:string;size?:string}>}) {
 const params=await searchParams,q=(params.q??'').trim().slice(0,80),requested=Math.max(1,Number(params.page)||1);
 const size=[30,50,100].includes(Number(params.size))?Number(params.size):30;
 const db=publicDb();
 const result=await db?.rpc('gt_public_athlete_directory_v1',{p_query:q,p_page:requested,p_size:size});
 const data=result?.data as {total:number;page:number;page_size:number;rows:DirectoryAthlete[]}|null;
 const stats=await loadHistoryStats((data?.rows??[]).map(a=>a.go_id));
 const rows=(data?.rows??[]).map(a=>({...a,...stats?.[a.go_id],events:stats?.[a.go_id]?.events??0,wins:stats?.[a.go_id]?.wins??0,losses:stats?.[a.go_id]?.losses??0}));
 const pages=data?Math.max(1,Math.ceil(data.total/data.page_size)):1;
 const view=params.view==='table'?'table':'cards';
 return <PublicPage icon="athlete" title="นักกีฬา" sub="รายชื่อนักกีฬาทั้งหมดจากทะเบียน พร้อมผลงานการแข่งขันที่เผยแพร่แล้ว" current="/athletes">
  <form action="/athletes" className="flex gap-2"><input type="hidden" name="size" value={size}/><input type="hidden" name="view" value={view}/><label className="gt-card flex min-h-12 flex-1 items-center px-3"><span className="sr-only">ชื่อนักกีฬาหรือรหัส GO</span><input name="q" defaultValue={q} placeholder="ค้นหาชื่อ นามสกุล หรือรหัส GO" className="min-w-0 flex-1 bg-transparent text-base outline-none"/></label><button className="gt-cta-btn min-h-12 px-5">ค้นหา</button></form>
  {data&&!result?.error?<><div className="mt-5 flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">{q?'ผลการค้นหา':'นักกีฬาทั้งหมด'} {data.total.toLocaleString('th-TH')} คน</h2>{q&&<Link href="/athletes" className="text-blue-800 underline">ดูนักกีฬาทั้งหมด</Link>}</div><p className="mt-2 text-sm text-slate-600">สถิติปี 2569 จากแมตช์ที่ตรวจสอบแล้วในประวัติกลาง • อยู่ระหว่างนำเข้าข้อมูลเพิ่มเติม ยังไม่ใช่ประวัติทั้งหมด</p><AthletePageSize size={data.page_size} total={data.total} start={(data.page-1)*data.page_size+1} end={Math.min(data.page*data.page_size,data.total)}/>{rows.length?<AthleteDirectory rows={rows} initialView={view}/>:<p className="gt-card mt-4 p-6">ไม่พบรายชื่อที่ตรงกับคำค้น</p>}<AthletePaging page={data.page} pages={pages}/></>:<p role="alert" className="gt-card mt-4 p-6">โหลดรายชื่อนักกีฬาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
 </PublicPage>;
}
