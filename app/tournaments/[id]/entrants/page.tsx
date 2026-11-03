import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Event = { id:string;title:string;event_date:string|null };
type Division = { id:string;name:string;seats_limit:number|null };
type Entrant = {source_row:number;title:string;full_name:string;institution:string;division_name:string;payment_status:string};
async function getData(id:string):Promise<{event:Event|null;divisions:Division[];entrants:Entrant[]}>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return {event:null,divisions:[],entrants:[]};
 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:event,error}=await db.from("gt_tournaments").select("id,title,event_date").eq("id",id).eq("published",true).maybeSingle();
  if(error||!event)return {event:null,divisions:[],entrants:[]};
  const r=await db.from("gt_divisions").select("id,name,seats_limit").eq("tournament_id",id).order("name");
  const names=await db.from("gt_public_entrants").select("source_row,title,full_name,institution,division_name,payment_status").eq("tournament_id",id).order("source_row",{ascending:true}).limit(1000);return {event,divisions:r.data??[],entrants:names.data??[]};
 }catch{return {event:null,divisions:[],entrants:[]};}
}
const normalizeDivision = (name:string) => {
 const compact=name.toLowerCase().replace(/[–—−]/g,"-").replace(/\s+/g,"");
 if(compact.includes("friendship")||compact.includes("เฟรนชิพ")){
  if(/13[x×]13/.test(compact))return "friendship:13x13";
  if(/9[x×]9/.test(compact))return "friendship:9x9";
 }
 const match=compact.match(/(1-2|3-4|5-6|7-8|9-12)/);
 if(match&&(compact.includes("kyu")||compact.includes("คิว")))return "kyu:"+match[1];
 return "unknown:"+compact;
};
export default async function Entrants({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {event,divisions,entrants}=await getData(id);
 return <main className="min-h-screen bg-[#edf3fa] pb-20 text-[#09244e]">
  <header className="bg-[#041b3c] text-white shadow"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"><Link href={`/tournaments/${id}`} className="text-sm font-bold">‹ รายละเอียดการแข่งขัน</Link><Link href="/" className="text-sm font-extrabold text-[#f2d087]">GO TOURNAMENT</Link></div></header>
  <div className="mx-auto max-w-5xl px-4 py-6">
   <div className="rounded-xl bg-gradient-to-r from-[#071b3e] to-[#16447f] px-5 py-7 text-white shadow"><p className="text-xs font-bold tracking-widest text-[#eccc7c]">TOURNAMENT ENTRANTS</p><h1 className="mt-2 text-2xl font-extrabold">รายชื่อผู้สมัครแข่งขัน</h1><p className="mt-2 text-sm text-blue-100">{event?.title??"รายการแข่งขันยังไม่เผยแพร่"}</p></div>
   {!event?<div className="mt-5 rounded-xl bg-white p-7 text-center shadow"><h2 className="font-bold">ยังไม่มีข้อมูลการแข่งขันที่เผยแพร่</h2><p className="mt-2 text-sm text-slate-600">โปรดกลับไปเลือกรายการแข่งขันที่เปิดให้เข้าชม</p><Link href="/tournaments" className="mt-4 inline-block rounded-lg bg-[#0754bf] px-5 py-3 text-sm font-bold text-white">ดูรายการแข่งขัน</Link></div>:<>
    <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><h2 className="text-sm font-extrabold text-amber-900">รายชื่อผู้สมัครที่ผู้จัดอนุญาตให้เผยแพร่</h2><p className="mt-1 text-sm text-amber-800">แสดงเฉพาะชื่อ สถาบัน รุ่นแข่งขัน และสถานะชำระเงินตามข้อมูลที่ผู้จัดอนุญาต ไม่แสดงข้อมูลติดต่อหรือหลักฐานการโอนเงิน</p></section>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-extrabold">แยกตามรุ่นการแข่งขัน</h2><span className="rounded-full bg-white px-3 py-2 text-xs text-slate-600">{divisions.length} รุ่น</span></div>
    {divisions.length?<div className="mt-4 grid gap-4 md:grid-cols-2">{divisions.map((d,i)=><section key={d.id} className="overflow-hidden rounded-xl border border-[#dbe4f0] bg-white shadow-sm"><div className="flex items-center justify-between bg-[#0c326a] px-4 py-3 text-white"><h3 className="font-extrabold">{d.name}</h3><span className="rounded bg-[#e9c67c] px-2 py-1 text-xs font-bold text-[#102c55]">รุ่น {i+1}</span></div><div className="p-4"><p className="text-sm text-slate-600">จำนวนรับ: {d.seats_limit??"รออัปเดต"} คน · ผู้สมัคร: {entrants.filter(e=>normalizeDivision(e.division_name)===normalizeDivision(d.name)).length} คน</p><div className="mt-4 overflow-hidden rounded-lg border border-slate-200"><div className="grid grid-cols-[35px_1fr_94px] bg-[#edf3fb] px-3 py-3 text-xs font-bold"><span>ที่</span><span>ชื่อ–สกุล / สถาบัน</span><span>ชำระเงิน</span></div>{entrants.filter(e=>normalizeDivision(e.division_name)===normalizeDivision(d.name)).map((e,i)=><div key={e.source_row} className="grid grid-cols-[35px_1fr_94px] items-center gap-1 border-t border-slate-100 px-3 py-3 text-xs"><span className="text-slate-500">{i+1}</span><span className="min-w-0"><span className="block font-bold">{e.title} {e.full_name}</span><span className="mt-1 block text-slate-500">{e.institution||"ไม่ระบุสถาบัน"}</span></span><span className={e.payment_status==="ชำระเงินแล้ว"?"rounded bg-green-100 px-1 py-2 text-center text-[10px] font-bold text-green-800":e.payment_status.includes("รอตรวจ")?"rounded bg-orange-100 px-1 py-2 text-center text-[10px] font-bold text-orange-800":e.payment_status==="ยังไม่ได้ชำระ"?"rounded bg-pink-100 px-1 py-2 text-center text-[10px] font-bold text-pink-800":"rounded bg-slate-100 px-1 py-2 text-center text-[10px] font-bold text-slate-700"}>{e.payment_status}</span></div>)}{!entrants.some(e=>normalizeDivision(e.division_name)===normalizeDivision(d.name))&&<div className="p-5 text-xs text-slate-500">ยังไม่มีรายชื่อที่เผยแพร่ในรุ่นนี้</div>}</div><p className="mt-3 text-xs text-slate-500">ข้อมูลจาก Google Sheet ล่าสุดที่นำเข้าระบบ · สถานะอาจเปลี่ยนแปลงภายหลัง</p></div></section>)}</div>:<div className="mt-4 rounded-xl border border-[#dbe4f0] bg-white p-7 text-center"><p className="font-bold">รออัปเดตรุ่นการแข่งขัน</p><p className="mt-2 text-sm text-slate-600">ระบบจะแสดงรายชื่อแยกตามรุ่นเมื่อผู้จัดเผยแพร่ข้อมูล</p></div>}
    <div className="mt-6 flex flex-wrap gap-3"><Link href={`/tournaments/${id}`} className="rounded-lg bg-[#0754bf] px-5 py-3 text-sm font-bold text-white">กลับรายละเอียดการแข่งขัน</Link><Link href="/tournaments" className="rounded-lg border border-[#0c326a] px-5 py-3 text-sm font-bold">รายการแข่งขันทั้งหมด</Link></div>
   </>}
  </div>
 </main>;
}
