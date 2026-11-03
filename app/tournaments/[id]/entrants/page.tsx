import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Event = { id:string;title:string;event_date:string|null };
type Division = { id:string;name:string;seats_limit:number|null };
async function getData(id:string):Promise<{event:Event|null;divisions:Division[]}>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return {event:null,divisions:[]};
 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:event,error}=await db.from("gt_tournaments").select("id,title,event_date").eq("id",id).eq("published",true).maybeSingle();
  if(error||!event)return {event:null,divisions:[]};
  const r=await db.from("gt_divisions").select("id,name,seats_limit").eq("tournament_id",id).order("name");
  return {event,divisions:r.data??[]};
 }catch{return {event:null,divisions:[]};}
}
export default async function Entrants({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {event,divisions}=await getData(id);
 return <main className="min-h-screen bg-[#edf3fa] pb-20 text-[#09244e]">
  <header className="bg-[#041b3c] text-white shadow"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"><Link href={`/tournaments/${id}`} className="text-sm font-bold">‹ รายละเอียดการแข่งขัน</Link><Link href="/" className="text-sm font-extrabold text-[#f2d087]">GO TOURNAMENT</Link></div></header>
  <div className="mx-auto max-w-5xl px-4 py-6">
   <div className="rounded-xl bg-gradient-to-r from-[#071b3e] to-[#16447f] px-5 py-7 text-white shadow"><p className="text-xs font-bold tracking-widest text-[#eccc7c]">TOURNAMENT ENTRANTS</p><h1 className="mt-2 text-2xl font-extrabold">รายชื่อผู้สมัครแข่งขัน</h1><p className="mt-2 text-sm text-blue-100">{event?.title??"รายการแข่งขันยังไม่เผยแพร่"}</p></div>
   {!event?<div className="mt-5 rounded-xl bg-white p-7 text-center shadow"><h2 className="font-bold">ยังไม่มีข้อมูลการแข่งขันที่เผยแพร่</h2><p className="mt-2 text-sm text-slate-600">โปรดกลับไปเลือกรายการแข่งขันที่เปิดให้เข้าชม</p><Link href="/tournaments" className="mt-4 inline-block rounded-lg bg-[#0754bf] px-5 py-3 text-sm font-bold text-white">ดูรายการแข่งขัน</Link></div>:<>
    <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><h2 className="text-sm font-extrabold text-amber-900">รอผู้จัดประกาศรายชื่อผู้สมัคร</h2><p className="mt-1 text-sm text-amber-800">หน้านี้แสดงโครงสร้างและรุ่นแข่งขันจริงที่เผยแพร่แล้ว แต่ยังไม่เปิดเผยรายชื่อหรือสถานะการชำระเงินของนักกีฬา</p></section>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-extrabold">แยกตามรุ่นการแข่งขัน</h2><span className="rounded-full bg-white px-3 py-2 text-xs text-slate-600">{divisions.length} รุ่น</span></div>
    {divisions.length?<div className="mt-4 grid gap-4 md:grid-cols-2">{divisions.map((d,i)=><section key={d.id} className="overflow-hidden rounded-xl border border-[#dbe4f0] bg-white shadow-sm"><div className="flex items-center justify-between bg-[#0c326a] px-4 py-3 text-white"><h3 className="font-extrabold">{d.name}</h3><span className="rounded bg-[#e9c67c] px-2 py-1 text-xs font-bold text-[#102c55]">รุ่น {i+1}</span></div><div className="p-4"><p className="text-sm text-slate-600">จำนวนรับ: {d.seats_limit??"รออัปเดต"} คน</p><div className="mt-4 overflow-hidden rounded-lg border border-slate-200"><div className="grid grid-cols-[48px_1fr_100px] bg-[#edf3fb] px-3 py-3 text-xs font-bold"><span>ลำดับ</span><span>ชื่อ–สกุลนักกีฬา</span><span>สถานะ</span></div><div className="grid grid-cols-[48px_1fr_100px] items-center px-3 py-5 text-xs text-slate-500"><span>—</span><span>รอประกาศรายชื่อ</span><span>รออัปเดต</span></div></div><p className="mt-3 text-xs text-slate-500">รายชื่อจะแสดงเมื่อผู้จัดอนุญาตให้เผยแพร่ข้อมูล</p></div></section>)}</div>:<div className="mt-4 rounded-xl border border-[#dbe4f0] bg-white p-7 text-center"><p className="font-bold">รออัปเดตรุ่นการแข่งขัน</p><p className="mt-2 text-sm text-slate-600">ระบบจะแสดงรายชื่อแยกตามรุ่นเมื่อผู้จัดเผยแพร่ข้อมูล</p></div>}
    <div className="mt-6 flex flex-wrap gap-3"><Link href={`/tournaments/${id}`} className="rounded-lg bg-[#0754bf] px-5 py-3 text-sm font-bold text-white">กลับรายละเอียดการแข่งขัน</Link><Link href="/tournaments" className="rounded-lg border border-[#0c326a] px-5 py-3 text-sm font-bold">รายการแข่งขันทั้งหมด</Link></div>
   </>}
  </div>
 </main>;
}
