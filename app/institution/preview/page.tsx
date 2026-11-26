"use client";

import Link from "next/link";
import InstitutionFan from "../_ui/InstitutionFan";
import InstitutionResults from "../_ui/InstitutionResults";
import InstitutionNameSettings from "../_ui/InstitutionNameSettings";
import OverviewRoster from "../_ui/OverviewRoster";
import InstitutionHeader from "../_ui/InstitutionHeader";
import MenuIcon, {type MenuIconName} from "@/components/MenuIcon";
import "./preview.css";
import {useState} from "react";

type PageKey="home"|"results"|"students"|"teachers"|"tracking"|"stats"|"settings";
type Mode="cards"|"table";
const menu:{id:PageKey;label:string;icon:MenuIconName}[]=[
 {id:"home",label:"ภาพรวม",icon:"home"},
 {id:"students",label:"นักกีฬา",icon:"athlete"},
 {id:"teachers",label:"ครูในสถาบัน",icon:"entrants"},
 {id:"tracking",label:"ติดตามการแข่งขัน",icon:"fan"},
 {id:"results",label:"ผลการแข่งขัน",icon:"trophy"},
 {id:"stats",label:"สถิติพัฒนาการ",icon:"stats"},
 {id:"settings",label:"ข้อมูลสถาบัน / โลโก้",icon:"school"},
];
const athletes=[
 {name:"นักกีฬาตัวอย่าง A",rank:"3 คิว",event:"ZEER GO KYU WAR 2026",wins:3,games:4,status:"กำลังแข่งขัน"},
 {name:"นักกีฬาตัวอย่าง B",rank:"1 ดั้ง",event:"รายการแข่งขันตัวอย่าง",wins:4,games:5,status:"จบการแข่งขัน"},
 {name:"นักกีฬาตัวอย่าง C",rank:"8 คิว",event:"รายการแข่งขันตัวอย่าง",wins:2,games:4,status:"กำลังแข่งขัน"},
 {name:"นักกีฬาตัวอย่าง D",rank:"2 ดั้ง",event:"รายการแข่งขันตัวอย่าง",wins:3,games:5,status:"จบการแข่งขัน"},
];
const teachers=[{name:"ครูตัวอย่าง A",role:"เจ้าของสถาบัน"},{name:"ครูตัวอย่าง B",role:"ครูผู้สอน"},{name:"ครูตัวอย่าง C",role:"ครูผู้สอน"}];
export default function InstitutionPreview() {
 const [page,setPage]=useState<PageKey>("home");
 const [mode,setMode]=useState<Mode>("cards");
 const [role,setRole]=useState<"owner"|"teacher"|"independent">("owner");
 const [shape,setShape]=useState<"circle"|"square">("circle");
 const [logoScale,setLogoScale]=useState(100);
 const [logoFile,setLogoFile]=useState<string|null>(null);
 const [institute,setInstitute]=useState("GO MASTER");
 const [mobileMenu,setMobileMenu]=useState(false);
 const open=(id:PageKey)=>{setPage(id);setMobileMenu(false);};
 const isPeople=page==="students"||page==="teachers"||page==="stats";
 const title=menu.find(m=>m.id===page)?.label??"ภาพรวม";
 return <div className={`institution-preview min-h-screen bg-[#f0f6ff] text-[#092d60] ${page==="results"||page==="tracking"?"preview-results-full":""}`}>
  <header className="border-b-[3px] border-[#e9b94d] bg-[#09295c] text-white">
   <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
    <Link href="/" className="text-lg font-black sm:text-xl">⚫⚪ GO TOURNAMENT</Link>
    <div className="flex items-center gap-2"><span className="rounded-full border border-[#f6d27d] px-3 py-1 text-xs text-[#f8d98f]">โหมดตรวจงาน</span><Link href="/institution" className="rounded-lg border border-white/30 px-3 py-2 text-xs font-bold sm:text-sm">เข้าสู่ระบบจริง</Link></div>
   </div>
  </header>
  <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
   <div role="status" className="rounded-xl border-2 border-[#e0bf72] bg-[#fff9e8] px-4 py-3 text-sm font-semibold text-[#745018]">หน้าให้ตรวจดีไซน์โดยไม่ต้องเข้าสู่ระบบ • ข้อมูลนักกีฬาและตัวเลขด้านล่างเป็นตัวอย่าง ไม่ใช่ข้อมูลจริง • ปุ่มบันทึกข้อมูลจริงถูกปิดไว้</div>
   <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#bdd0ec] bg-white p-3">
    <label className="flex flex-1 items-center gap-2 text-sm font-bold">สถาบัน <input aria-label="ชื่อสถาบันที่แสดงในตัวอย่าง" className="min-w-0 flex-1 rounded-lg border border-[#c0d5ee] px-3 py-2" value={institute} onChange={e=>setInstitute(e.target.value)}/></label>
    <div role="group" aria-label="ตรวจมุมมองตามสิทธิ์" className="inline-flex rounded-lg bg-[#edf4fc] p-1 text-xs font-bold">
      <button type="button" aria-pressed={role==="owner"} onClick={()=>setRole("owner")} className={`rounded-md px-3 py-2 ${role==="owner"?"bg-[#0d61c4] text-white":"text-[#184577]"}`}>เจ้าของ</button>
      <button type="button" aria-pressed={role==="teacher"} onClick={()=>setRole("teacher")} className={`rounded-md px-3 py-2 ${role==="teacher"?"bg-[#0d61c4] text-white":"text-[#184577]"}`}>ครูสถาบัน</button>
      <button type="button" aria-pressed={role==="independent"} onClick={()=>{setRole("independent");if(page==="settings")setPage("home");}} className={`rounded-md px-3 py-2 ${role==="independent"?"bg-[#0d61c4] text-white":"text-[#184577]"}`}>ครูอิสระ</button>
    </div>
   </div>
   <InstitutionHeader onEditName={role==="owner"?()=>open("settings"):undefined} name={institute||"ชื่อสถาบัน"} status="ตัวอย่าง · เจ้าของสถาบัน" description="สถาบันหมากล้อม · ระบบติดตามนักกีฬาและการแข่งขัน"
    logo={<button type="button" aria-label="แก้ไขโลโก้สถาบัน" onClick={()=>open("settings")} className={`preview-logo ${shape==="circle"?"rounded-full":"rounded-xl"}`}>
      {logoFile?<img src={logoFile} alt="ตัวอย่างโลโก้สถาบัน" style={{transform:`scale(${logoScale/100})`}} className="h-full w-full object-cover"/>:<span>GO<br/>MASTER</span>}
    </button>}
    actions={[
      {label:"จัดการนักกีฬา (สมาชิก)",icon:<MenuIcon name="entrants"/>,onClick:()=>open("students")},
      {label:"ติดตามการแข่งขันนักเรียน",icon:<MenuIcon name="fan"/>,onClick:()=>open("tracking")},
      {label:"ผลการแข่งขัน",icon:<MenuIcon name="trophy"/>,onClick:()=>open("results")},
      ...(role==="owner"?[
       {label:"ข้อมูลสถาบัน / โลโก้",icon:<MenuIcon name="school"/>,onClick:()=>open("settings")},
      ]:[]),
    ]}/>
   <div className="preview-workspace">
   <aside>
   <div className="flex items-center justify-between gap-2">
    <h2 className="text-lg font-black">เมนูจัดการสถาบัน</h2>
    <button type="button" className="rounded-lg border border-[#a9c5e7] bg-white px-3 py-2 text-sm font-bold lg:hidden" onClick={()=>setMobileMenu(v=>!v)} aria-expanded={mobileMenu}>{mobileMenu?"ซ่อนเมนู":"☰ เมนูทั้งหมด"}</button>
   </div>
   <nav aria-label="เมนูสถาบัน" className={`${mobileMenu?"grid":"hidden"} grid-cols-2 gap-2 sm:grid-cols-3 lg:grid lg:grid-cols-6`}>
    {menu.filter(m=>role==="owner"||m.id!=="settings").map(m=><button type="button" key={m.id} onClick={()=>open(m.id)} aria-current={page===m.id?"page":undefined} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-[18px] border-[3px] px-2 py-3 text-sm font-black shadow-md ${page===m.id?"border-[#e9b94d] bg-[#0d5fbf] text-white":"border-[#b7cbe5] bg-white hover:border-[#dfb44c]"}`}><MenuIcon name={m.icon} className="h-6 w-6"/>{m.label}</button>)}
   </nav>
   </aside>
   <section className="preview-content space-y-4 rounded-[24px] border-[3px] border-[#b9d0ee] bg-white p-4 shadow-md sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
     {isPeople&&<div role="group" aria-label="เปลี่ยนมุมมอง" className="inline-flex rounded-xl border-2 border-[#a9c4e6] p-1 text-sm font-bold">
       <button type="button" aria-pressed={mode==="table"} onClick={()=>setMode("table")} className={`rounded-lg px-3 py-2 ${mode==="table"?"bg-[#0c62ca] text-white":""}`}>☰ ตาราง</button>
       <button type="button" aria-pressed={mode==="cards"} onClick={()=>setMode("cards")} className={`rounded-lg px-3 py-2 ${mode==="cards"?"bg-[#0c62ca] text-white":""}`}>▦ การ์ด</button>
     </div>}
    </div>
    {page==="tracking"&&<InstitutionFan sample ov={{academy:{id:"preview",name:institute},access:"active",role:"manager",students:athletes.map((a,i)=>({id:String(i),name:a.name,nickname:null,rank:a.rank,photo:null,go_id:null,added:true})),records:[],tracking:[]}} onBack={()=>open("home")}/>}
    {page==="results"&&<InstitutionResults sample name={institute} students={athletes.map((a,i)=>({id:String(i),name:a.name,nickname:null,rank:a.rank,photo:null,go_id:null,added:true}))} records={athletes.map((a,i)=>({athlete_id:String(i),tournament_id:a.event,title:a.event,date:"2026-11-26",division_id:String(i),division:a.rank,games:a.games,wins:a.wins,losses:a.games-a.wins,draws:0,pos:null,field:null}))} onBack={()=>open("home")}/>}
    {page==="home"&&<>
     <div className="preview-summary">
      {[["นักกีฬา","4 คน","athlete"],["คุณครู","3 คน","entrants"],["กำลังแข่งขัน","2 คน","register"],["การแข่งขัน","2 รายการ","trophy"],["รางวัล","ข้อมูลตัวอย่าง","results"]].map(([label,value,icon])=><div key={label}><MenuIcon name={icon as MenuIconName}/><span>{label}<strong>{value}</strong></span></div>)}
     </div>
     <OverviewRoster students={athletes.map((a,i)=>({id:String(i),name:a.name,nickname:null,rank:a.rank,photo:null,go_id:null,added:true}))} onSelect={()=>open("students")} onViewAll={()=>open("students")}/>
     <section className="preview-activity"><h3>กิจกรรมล่าสุด</h3><p>ตัวอย่างหน้าตาเมื่อมีการเพิ่มนักกีฬา สมัครแข่งขัน หรือปรับข้อมูลสถาบัน</p><ul><li>เพิ่มนักกีฬาตัวอย่าง A เข้าสังกัด</li><li>เพิ่มครูตัวอย่าง B เข้าสถาบัน</li><li>ปรับปรุงข้อมูลสถาบัน</li></ul></section>
    </>}
    {page==="settings"&&<div className="space-y-4">
      <InstitutionNameSettings name={institute} onSave={async name=>{setInstitute(name);}}/>
      <p className="text-sm text-[#587296]">ลองอัปโหลดโลโก้และเลือกรูปแบบได้บนหน้าตรวจงานนี้ รูปจะยังไม่ถูกบันทึกลงฐานข้อมูล</p>
      <label className="block rounded-xl border-2 border-dashed border-[#93b5de] bg-[#f6faff] p-5 text-center font-bold text-[#1556a1]">เลือกรูปโลโก้ (PNG, JPEG, WEBP)<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block w-full text-sm" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024){alert("ไฟล์ต้องไม่เกิน 5 MB");return;}if(logoFile)URL.revokeObjectURL(logoFile);setLogoFile(URL.createObjectURL(f));}}/></label>
      <div className="flex flex-wrap gap-2">{(["circle","square"] as const).map(sh=><button type="button" key={sh} aria-pressed={shape===sh} onClick={()=>setShape(sh)} className={`rounded-lg border-2 px-4 py-2 font-bold ${shape===sh?"border-[#e9b54b] bg-[#0b61c0] text-white":"border-[#bdd0e8]"}`}>{sh==="circle"?"◯ วงกลม":"▢ สี่เหลี่ยม"}</button>)}</div>
      <label className="block text-sm font-bold">ขยาย / ย่อรูปโลโก้: {logoScale}%<input type="range" min="60" max="200" value={logoScale} onChange={e=>setLogoScale(Number(e.target.value))} className="mt-2 w-full accent-[#0c62c5]"/></label>
      <p className="rounded-xl bg-[#fff6df] p-3 text-sm">สำหรับบันทึกโลโก้จริง ต้องเข้าสู่ระบบด้วยสิทธิ์เจ้าของสถาบันก่อน ขณะนี้เป็นโหมดตรวจดีไซน์เท่านั้น</p>
     </div>}
    {isPeople&&<>{mode==="cards"?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
       {(page==="teachers"?teachers:athletes).map((x,i)=><div key={i} className="rounded-xl border-2 border-[#c8d8ed] bg-[#f8fbff] p-4"><p className="font-bold">{x.name}</p><p className="mt-2 text-sm text-[#46658b]">{"role" in x?x.role:x.rank}</p>{"games" in x&&<p className="mt-2 text-sm">ชนะ {x.wins}/{x.games} เกม · {x.status}</p>}</div>)}
     </div>:<div className="overflow-x-auto rounded-xl border-2 border-[#c8d8ed]"><table className="w-full min-w-[34rem] text-left text-sm"><thead className="bg-[#e9f3ff]"><tr><th className="p-3">ชื่อ</th><th className="p-3">{page==="teachers"?"บทบาท":"ระดับฝีมือ"}</th><th className="p-3">รายละเอียด</th></tr></thead><tbody className="divide-y divide-[#d7e4f4]">{(page==="teachers"?teachers:athletes).map((x,i)=><tr key={i}><td className="p-3 font-bold">{x.name}</td><td className="p-3">{"role" in x?x.role:x.rank}</td><td className="p-3">{"games" in x?`ชนะ ${x.wins}/${x.games} เกม`:"ตัวอย่างบัญชีครู"}</td></tr>)}</tbody></table></div>}</>}
   </section>
   </div>
   <p className="pb-8 text-center text-xs text-[#6480a0]">GO TOURNAMENT · โหมดตรวจงาน ไม่ใช้ข้อมูลบัญชีหรือผลการแข่งขันจริง</p>
  </main>
 </div>;
}