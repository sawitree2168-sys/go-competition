"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
type EventItem={id:string;title:string;start_at:string|null;status:string};
const areas=[
 {name:"รายการแข่งขันและรุ่น",desc:"ตารางหลัก gt_tournaments + gt_divisions",stage:"มีฐานข้อมูล",url:"/schedule"},
 {name:"ผู้สมัครและนักกีฬา",desc:"gt_registrations + gt_athletes; ยังรอหน้า Admin จัดการรายการ",stage:"มีฐานข้อมูล",url:"/athletes/search"},
 {name:"ยอดเงิน / สลิป",desc:"เพิ่มระบบ Payment + Allocations + Proofs แล้ว; รอ API ตรวจสิทธิ์",stage:"เตรียมโครงสร้าง",url:null},
 {name:"กรรมการ / จับคู่ / ผลแข่งขัน",desc:"gt_matches มีโครงสร้าง แต่ระบบทำงานภาคสนามยังรอเชื่อม",stage:"กำลังเชื่อม",url:null},
 {name:"ใบประกาศ",desc:"เชื่อมนักกีฬาและรายการด้วย Tournament ID แล้ว; ยังไม่เปิดออกใบจริง",stage:"เตรียมโครงสร้าง",url:null},
 {name:"ข่าวและรูปภาพ",desc:"แยกรูปเด่นบนเว็บและอัลบั้ม Google Drive ของรายการ",stage:"เตรียมโครงสร้าง",url:null},
 {name:"ค่าใช้จ่าย / สรุปรายปี",desc:"บัญชีค่าใช้จ่ายมีตารางแล้ว; รายงานตรวจยอดเงินจริงยังไม่เปิด",stage:"เตรียมโครงสร้าง",url:null}
];
export default function TournamentAdminHub(){
 const [events,setEvents]=useState<EventItem[]>([]);
 const [state,setState]=useState<"loading"|"ok"|"error">("loading");
 const [year,setYear]=useState("2026");
 useEffect(()=>{let mounted=true;
  fetch("/api/tournaments",{cache:"no-store"}).then(async response=>{
   const x=await response.json();
   if(!response.ok||x.status!=="ok"||!Array.isArray(x.tournaments))throw Error();
   if(mounted){setEvents(x.tournaments);setState("ok");}
  }).catch(()=>{if(mounted)setState("error");});
  return()=>{mounted=false};
 },[]);
 const visible=events.filter(e=>e.start_at && new Date(e.start_at).toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"}).startsWith(year));
 return <main className="min-h-screen bg-[#f2f6fc] text-[#112d57]">
  <header className="bg-[#09244e] p-5 text-white"><div className="mx-auto max-w-6xl">
   <Link href="/" className="text-[#f0cd82]">‹ GO TOURNAMENT</Link>
   <h1 className="mt-3 text-3xl font-extrabold">ศูนย์จัดการรายการแข่งขัน</h1>
   <p className="mt-2 text-blue-100">ภาพรวมโครงสร้างข้อมูลเดียวสำหรับทุกสนามและทุกปี</p>
  </div></header>
  <div className="mx-auto max-w-6xl space-y-6 px-4 py-7">
   <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
    <strong>สถานะจริงของระบบ:</strong> หน้านี้แสดงเฉพาะรายการที่เผยแพร่จาก API สาธารณะ
    ส่วนข้อมูลผู้สมัครทั้งหมด การเงินและเอกสารยังต้องพัฒนา Admin API ที่ตรวจสิทธิ์ก่อน จึงไม่แสดงยอดสมมติและไม่เปิดเผยข้อมูลส่วนบุคคล
   </div>
   <section className="rounded-2xl bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div><h2 className="text-xl font-bold">รายการแข่งขันตามปี</h2><p className="mt-1 text-sm text-slate-600">ระบบรองรับหลายรายการภายใต้ปีเดียว ไม่แยก 40 ชีต</p></div>
     <label className="font-semibold">ปี พ.ศ. <select value={year} onChange={e=>setYear(e.target.value)} className="ml-2 rounded-xl border border-slate-300 bg-white p-3">
      {Array.from({length:7},(_,i)=>2025+i).map(y=><option key={y} value={String(y)}>{y+543}</option>)}
     </select></label>
    </div>
    {state==="loading"?<p className="mt-5">กำลังโหลดรายการ...</p>:state==="error"?<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4">ยังโหลดรายการจากฐานข้อมูลไม่ได้ กรุณาลองอีกครั้ง</p>:
     <div className="mt-5">
      <div className="rounded-xl bg-[#e9f0fb] p-4"><p className="text-sm">รายการแข่งขันเผยแพร่ที่พบในปีนี้</p><p className="mt-1 text-4xl font-black">{visible.length}</p></div>
      {visible.length===0?<p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600">ยังไม่มีรายการแข่งขันที่เผยแพร่ในปีนี้</p>:
       <div className="mt-3 space-y-3">{visible.map(e=><div key={e.id} className="rounded-xl border p-4">
        <p className="font-bold">{e.title}</p><p className="mt-1 text-sm text-slate-600">{e.start_at?new Date(e.start_at).toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok"}):"ยังไม่ระบุวัน"} • {e.status}</p>
       </div>)}</div>}
     </div>}
   </section>
   <section><h2 className="mb-4 text-xl font-extrabold">หมวดงานภายในแต่ละรายการ</h2>
    <div className="grid gap-3 sm:grid-cols-2">{areas.map(a=><div key={a.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
     <div className="flex justify-between gap-3"><h3 className="text-lg font-bold">{a.name}</h3><span className="shrink-0 rounded-lg bg-[#edf2fa] px-2 py-1 text-xs text-blue-900">{a.stage}</span></div>
     <p className="mt-2 text-sm leading-relaxed text-slate-600">{a.desc}</p>
     {a.url?<Link className="mt-4 inline-block font-semibold text-blue-800" href={a.url}>เปิดหน้าที่มีอยู่ ›</Link>:<p className="mt-4 text-sm text-slate-500">ยังไม่เปิดใช้งานผ่าน Admin</p>}
    </div>)}</div>
   </section>
   <section className="rounded-2xl border border-blue-200 bg-[#eaf0fa] p-5"><h2 className="text-xl font-bold">เมนูผู้ดูแลที่ใช้งานได้แล้ว</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     <Link href="/admin/athlete-claims" className="rounded-xl bg-white p-4 font-bold text-blue-800">ตรวจคำขอ GO ID ›</Link>
     <Link href="/admin/claim-review" className="rounded-xl bg-white p-4 font-bold text-blue-800">บันทึกผลตรวจ GO ID ›</Link>
    </div>
   </section>
  </div>
 </main>;
}