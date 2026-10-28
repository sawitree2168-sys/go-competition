"use client";
import Link from "next/link";
import {useState} from "react";
type Step={title:string;detail:string;href:string|null;label?:string};
type Group={id:string;label:string;eyebrow:string;title:string;intro:string;steps:Step[]};
const groups:Group[]=[
 {id:"spectator",label:"ผู้ชมและกองเชียร์",eyebrow:"FOR EVERY FAN",title:"ติดตามทุกรายการแข่งขัน",intro:"เริ่มจากรายการแข่งขันที่ประกาศแล้ว และติดตามนักกีฬาได้โดยไม่ต้องล็อกอิน",steps:[
  {title:"ค้นหารายการแข่งขัน",detail:"ดูปฏิทินและรายการที่ผู้จัดเผยแพร่จากฐานข้อมูลจริง",href:"/schedule",label:"เปิดรายการแข่งขัน"},
  {title:"GO FAN กองเชียร์",detail:"ค้นหานักกีฬาที่เปิดเผยโปรไฟล์ ติดตามหลายคน และดูผลที่ยืนยันแล้ว",href:"/fan",label:"เปิด GO FAN"},
  {title:"อันดับและผลการแข่งขันสด",detail:"กำลังเชื่อมระบบตรวจผลและจัดอันดับเพื่อไม่ให้แสดงผลที่ยังไม่รับรอง",href:null}
 ]},
 {id:"athlete",label:"นักกีฬา / ผู้ปกครอง",eyebrow:"FOR PLAYERS",title:"เริ่มจากตัวตนนักกีฬา",intro:"ระบบจะรักษา GO ID และประวัติของนักกีฬาเดิม ไม่สร้างข้อมูลซ้ำ",steps:[
  {title:"ค้นหาข้อมูลนักกีฬา",detail:"เปิดหน้าตรวจสอบ GO ID และข้อมูลที่บัญชีได้รับอนุญาต",href:"/athletes/search",label:"ค้นหานักกีฬา"},
  {title:"ผูก GO ID เดิม",detail:"ส่งคำขอเพื่อยืนยันตัวตนกับประวัติเดิม",href:"/athletes/claim",label:"เปิดหน้าผูก GO ID"},
  {title:"สมัครแข่งขันและชำระเงิน",detail:"เตรียมระบบค่าธรรมเนียมรุ่นคิว/ดั้งและตรวจใบสมัคร ยังไม่เปิดรับเงินจริง",href:null}
 ]},
 {id:"organizer",label:"ผู้จัด / Admin",eyebrow:"EVENT OPERATIONS",title:"จัดการแข่งขันจากศูนย์เดียว",intro:"เครื่องมือหลังบ้านสำหรับบัญชี Owner/Admin/Reviewer ที่ได้รับสิทธิ์",steps:[
  {title:"สร้างรายการและกำหนดรุ่น",detail:"จัดการรายการแข่งขันและตั้งค่าสมัครคิว/ดั้งแบบแก้ไขได้",href:"/admin/tournaments",label:"เปิดศูนย์จัดการแข่งขัน"},
  {title:"ดูและตรวจผู้สมัคร",detail:"จากศูนย์จัดการแข่งขัน เลือกรายการเพื่อเปิดหน้าผู้สมัครของงานนั้น",href:"/admin/tournaments",label:"ไปยังรายการแข่งขัน"},
  {title:"จัดการโลโก้และแบนเนอร์",detail:"อัปโหลดภาพที่ได้รับอนุมัติ แยก Desktop / Tablet / Mobile",href:"/admin/site-media",label:"เปิด Media Manager"},
  {title:"เช็กอิน จับคู่ และผลแข่งขัน",detail:"ยังไม่ผ่านการทดสอบทั้งระบบ โดยเฉพาะการจับคู่ซ้ำและแพ้ทั้งคู่",href:null}
 ]},
 {id:"referee",label:"กรรมการ",eyebrow:"REFEREE WORKFLOW",title:"งานสนามต้องชัดและรวดเร็ว",intro:"ปุ่มผลแข่งต้องใหญ่ ยืนยันก่อนบันทึก และต้องรองรับกรณีนักกีฬาทั้งสองไม่มา",steps:[
  {title:"ตรวจรายละเอียดการแข่งขัน",detail:"เปิดปฏิทินและดูข้อมูลรายการที่เผยแพร่แล้ว",href:"/schedule",label:"ดูรายการแข่งขัน"},
  {title:"รับหน้าที่และโต๊ะประจำรอบ",detail:"กำลังพัฒนาระบบมอบหมายกรรมการตามสิทธิ์",href:null},
  {title:"ลงผล / แพ้ทั้งคู่ / ตรวจผล",detail:"ฐานข้อมูลรองรับแพ้ทั้งคู่แล้ว แต่หน้าลงผลและการอนุมัติยังไม่ผ่าน E2E",href:null}
 ]}
];
export function HomeInteractiveHub(){
 const [active,setActive]=useState("spectator");
 const group=groups.find(g=>g.id===active)||groups[0];
 const [expanded,setExpanded]=useState<number|null>(null);
 function choose(id:string){setActive(id);setExpanded(null)}
 return <section aria-labelledby="hub-title" className="mx-auto max-w-6xl px-4 pt-8 sm:pt-10">
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
   <div><p className="text-xs font-extrabold tracking-[0.15em] text-[#1a5bb0]">EXPLORE GO TOURNAMENT</p><h2 id="hub-title" className="mt-2 text-2xl font-black text-[#102f5f] sm:text-3xl">คุณต้องการทำอะไรวันนี้?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">เลือกบทบาทเพื่อเข้าสู่ระบบที่ต้องการ ไม่ใช่ภาพตัวอย่าง</p></div>
   <Link href="/site-map" className="inline-flex min-h-11 items-center rounded-xl border border-[#cad7ec] bg-white px-4 font-bold text-blue-800 hover:border-blue-500">ดูเมนูทั้งหมด ›</Link>
  </div>
  <div role="tablist" aria-label="เลือกประเภทผู้ใช้งาน" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
   {groups.map(g=><button key={g.id} id={"home-tab-"+g.id} type="button" role="tab" aria-selected={active===g.id} aria-controls="home-role-panel" onClick={()=>choose(g.id)} className={"min-h-14 rounded-xl border px-3 py-3 text-center text-sm font-extrabold transition sm:text-base "+(active===g.id?"border-[#114c9a] bg-[#0c3b80] text-white shadow-md":"border-[#cbd9ec] bg-white text-[#173e74] hover:border-blue-500 hover:bg-blue-50")}>{g.label}</button>)}
  </div>
  <div id="home-role-panel" role="tabpanel" aria-labelledby={"home-tab-"+group.id} className="mt-3 overflow-hidden rounded-3xl border border-[#bfd1ec] bg-white shadow-lg">
   <div className="relative overflow-hidden bg-gradient-to-r from-[#062855] via-[#0d4c9e] to-[#117bd1] px-5 py-6 text-white sm:px-8 sm:py-8">
    <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-60 w-60 rounded-full border-[28px] border-white/10"/>
    <div className="relative"><p className="text-xs font-bold tracking-[0.15em] text-[#f5d486]">{group.eyebrow}</p><h3 className="mt-2 text-xl font-black sm:text-3xl">{group.title}</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-50 sm:text-base">{group.intro}</p></div>
   </div>
   <ol className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">{group.steps.map((step,i)=><li key={step.title} className="flex flex-col rounded-2xl border border-[#dbe5f3] bg-[#f8fbff] p-4">
    <div className="flex items-start gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d9e9ff] text-sm font-black text-[#174987]">{String(i+1).padStart(2,"0")}</span><div><h4 className="text-base font-extrabold text-[#173e75]">{step.title}</h4><p className="mt-1 text-sm leading-relaxed text-slate-600">{step.detail}</p></div></div>
    {step.href?<Link href={step.href} className="mt-4 inline-flex min-h-11 items-center justify-center self-start rounded-xl bg-[#104d9c] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#08336f]">{step.label||"เปิดหน้าระบบ"} ›</Link>:<span className="mt-4 inline-flex min-h-10 items-center self-start rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-900">กำลังพัฒนา · ยังไม่เปิดใช้งาน</span>}
   </li>)}</ol>
   <div className="border-t border-[#e4ebf7] bg-[#f2f7ff] px-5 py-4 sm:px-7">
    <button type="button" onClick={()=>setExpanded(expanded===0?null:0)} aria-expanded={expanded===0} className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm font-bold text-[#194373]"><span>สถานะข้อมูลและความปลอดภัย</span><span aria-hidden="true">{expanded===0?"−":"+"}</span></button>
    {expanded===0&&<p className="mt-2 text-sm leading-relaxed text-slate-700">หน้าเว็บนี้เชื่อมเฉพาะปลายทางที่มีอยู่ในโครงการแล้ว การกดเข้าได้ยังไม่หมายถึงทุกขั้นตอนผ่านการทดสอบ เจ้าหน้าที่ต้องมีสิทธิ์ก่อนดูข้อมูลภายใน และระบบไม่แสดงข้อมูลนักกีฬา/ผลแข่งขันที่ยังไม่ได้อนุญาตเผยแพร่</p>}
   </div>
  </div>
 </section>;
}
