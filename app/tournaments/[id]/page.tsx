"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {SiteSectionBanner} from "../../components/SiteSectionBanner";
type Event={id:string;title:string;start_at:string|null;status:string};
type Division={id:string;name:string;seats_limit:number|null;pairing_enabled:boolean;entry_fee_thb:number|null};
export default function TournamentDetailsPage(){
 const params=useParams<{id:string}>();
 const id=typeof params.id==="string"?params.id:"";
 const [event,setEvent]=useState<Event|null>(null),[divisions,setDivisions]=useState<Division[]>([]);
 const [state,setState]=useState<"loading"|"ready"|"not_found"|"error">("loading");
 useEffect(()=>{let alive=true;const ctrl=new AbortController();void(async()=>{try{
   const r=await fetch("/api/tournaments/"+encodeURIComponent(id),{cache:"no-store",signal:ctrl.signal});
   if(r.status===404){if(alive)setState("not_found");return}
   const v=await r.json();
   if(!r.ok||v.status!=="ok"||!v.tournament||!Array.isArray(v.divisions))throw Error();
   if(alive){setEvent(v.tournament);setDivisions(v.divisions);setState("ready")}
  }catch{if(alive&&!ctrl.signal.aborted)setState("error")}})();return()=>{alive=false;ctrl.abort()};},[id]);
 const date=event?.start_at?new Date(event.start_at).toLocaleString("th-TH",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Bangkok"}):"ยังไม่ระบุวันและเวลา";
 return <main className="min-h-screen bg-[#f0f5fc] text-[#12315c]">
  <header className="bg-[#082b61] px-5 py-5 text-white"><div className="mx-auto max-w-5xl"><Link href="/schedule" className="font-bold text-amber-200">‹ กลับรายการแข่งขัน</Link></div></header>
  <div className="mx-auto max-w-5xl space-y-5 px-4 py-7">
   <SiteSectionBanner slot="tournament_detail" title="รายละเอียดการแข่งขัน" eyebrow="GO TOURNAMENT" description="กำหนดการและรุ่นแข่งขันจากรายการที่ผู้จัดเผยแพร่แล้ว"/>
   {state==="loading"&&<p role="status" className="rounded-xl bg-white p-6">กำลังโหลดรายละเอียดการแข่งขัน...</p>}
   {state==="not_found"&&<section role="status" className="rounded-xl bg-white p-6"><h2 className="text-xl font-black">ไม่พบรายการที่เผยแพร่</h2><p className="mt-2 text-slate-600">รายการอาจยังอยู่ระหว่างจัดเตรียมหรือถูกยกเลิกการเผยแพร่</p><Link href="/schedule" className="mt-5 inline-block rounded-xl bg-blue-800 px-5 py-3 font-bold text-white">กลับไปดูรายการอื่น</Link></section>}
   {state==="error"&&<section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-6">ไม่สามารถโหลดข้อมูลการแข่งขันได้ กรุณาลองใหม่อีกครั้ง<Link href="/schedule" className="mt-4 block font-bold text-blue-700">กลับไปหน้ารายการแข่งขัน</Link></section>}
   {state==="ready"&&event&&<>
    <section className="rounded-2xl bg-white p-6 shadow-sm">
     <h1 className="text-2xl font-black sm:text-3xl">{event.title}</h1>
     <dl className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl bg-blue-50 p-4"><dt className="text-xs font-bold text-blue-700">กำหนดวันและเวลา (ประเทศไทย)</dt><dd className="mt-1 text-lg font-bold">{date}</dd></div>
      <div className="rounded-xl bg-blue-50 p-4"><dt className="text-xs font-bold text-blue-700">สถานะรายการ</dt><dd className="mt-1 text-lg font-bold">{event.status||"ไม่ระบุ"}</dd></div>
     </dl>
     <h2 className="mt-7 text-xl font-black">รุ่นการแข่งขัน</h2>
     {divisions.length===0?<p className="mt-3 rounded-xl border border-dashed p-5 text-slate-600">ผู้จัดยังไม่ได้เผยแพร่รายละเอียดรุ่นการแข่งขัน</p>:
       <ul className="mt-3 grid gap-3 sm:grid-cols-2">{divisions.map(d=><li key={d.id} className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-lg font-extrabold">{d.name}</h3>
        <p className="mt-2 text-sm text-slate-600">{d.seats_limit===null?"ยังไม่ระบุจำนวนรับสมัคร":"จำนวนที่กำหนด: "+d.seats_limit+" คน"}</p>
        <p className="mt-1 text-sm font-semibold text-blue-800">{d.entry_fee_thb===null?"ค่าสมัคร: รอผู้จัดกำหนด":"ค่าสมัคร: "+Number(d.entry_fee_thb).toLocaleString("th-TH",{minimumFractionDigits:0,maximumFractionDigits:2})+" บาท/คน (ยังไม่เปิดชำระผ่านเว็บ)"}</p>
        <p className="mt-1 text-sm text-slate-600">{d.pairing_enabled?"ผู้จัดเปิดใช้ระบบจับคู่การแข่งขัน":"รายการนี้ไม่ได้เปิดระบบจับคู่อัตโนมัติ"}</p>
       </li>)}</ul>}
    </section>
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
     <h2 className="font-black text-amber-950">สถานะการสมัครผ่านเว็บไซต์</h2>
     <p className="mt-2 text-sm leading-relaxed text-amber-950">ขณะนี้ยังไม่เปิดการส่งใบสมัครและการชำระเงินจริงผ่าน GO TOURNAMENT กรุณาตรวจประกาศจากผู้จัดการแข่งขันโดยตรงก่อนดำเนินการ</p>
     <div className="mt-4 flex flex-wrap gap-3"><Link href="/athletes/search" className="inline-flex min-h-12 items-center rounded-xl border border-blue-800 px-5 py-3 font-bold text-blue-800">ตรวจข้อมูลนักกีฬาเดิม</Link><Link href="/faq" className="inline-flex min-h-12 items-center rounded-xl bg-blue-800 px-5 py-3 font-bold text-white">คำถามเกี่ยวกับการสมัคร</Link></div>
    </section>
   </>}
  </div>
 </main>;
}
