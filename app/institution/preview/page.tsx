"use client";

import Link from "next/link";
import {useState} from "react";

type PageKey="home"|"students"|"teachers"|"tracking"|"stats"|"settings";
type Mode="cards"|"table";
const menu:{id:PageKey;label:string;icon:string}[]=[
 {id:"home",label:"ภาพรวม",icon:"⌂"},
 {id:"students",label:"นักกีฬา",icon:"♟"},
 {id:"teachers",label:"ครูในสถาบัน",icon:"♙"},
 {id:"tracking",label:"ผลการแข่งขัน",icon:"🏆"},
 {id:"stats",label:"สถิติพัฒนาการ",icon:"▥"},
 {id:"settings",label:"ตั้งค่าสถาบัน",icon:"⚙"},
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
 const [role,setRole]=useState<"owner"|"teacher">("owner");
 const [shape,setShape]=useState<"circle"|"square">("circle");
 const [logoScale,setLogoScale]=useState(100);
 const [logoFile,setLogoFile]=useState<string|null>(null);
 const [institute,setInstitute]=useState("GO MASTER");
 const [mobileMenu,setMobileMenu]=useState(false);
 const open=(id:PageKey)=>{setPage(id);setMobileMenu(false);};
 const isPeople=page==="students"||page==="teachers"||page==="tracking"||page==="stats";
 const title=menu.find(m=>m.id===page)?.label??"ภาพรวม";
 return <div className="min-h-screen bg-[#eff5fd] text-[#092d60]">
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
      <button type="button" aria-pressed={role==="teacher"} onClick={()=>setRole("teacher")} className={`rounded-md px-3 py-2 ${role==="teacher"?"bg-[#0d61c4] text-white":"text-[#184577]"}`}>ครู</button>
    </div>
   </div>
   <section className="relative overflow-hidden rounded-2xl border-b-4 border-[#e8b345] bg-[linear-gradient(115deg,#053479,#086ad1)] p-5 text-white shadow-md sm:p-8">
    <div className="flex items-center gap-4">
      <div className={`grid h-20 w-20 shrink-0 place-items-center overflow-hidden border-[3px] border-[#edc66a] bg-[#041d43] text-2xl font-black text-[#f4d37e] sm:h-28 sm:w-28 ${shape==="circle"?"rounded-full":"rounded-xl"}`}>
        {logoFile?<img src={logoFile} alt="ตัวอย่างโลโก้สถาบัน" style={{transform:`scale(${logoScale/100})`}} className="h-full w-full object-cover"/>:<span className="text-center text-lg">GO<br/>MASTER</span>}
      </div>
      <div className="min-w-0">
       <p className="text-xs font-bold tracking-widest text-[#f9d88e]">GO TOURNAMENT · สถาบัน</p>
       <h1 className="mt-2 break-words text-2xl font-black sm:text-4xl">{institute||"ชื่อสถาบัน"}</h1>
       <p className="mt-2 text-sm text-white/85">ระบบติดตามนักกีฬาและการแข่งขัน</p>
       <span className="mt-3 inline-block rounded-full bg-[#f4cb72] px-3 py-1 text-xs font-bold text-[#163a68]">มุมมอง{role==="owner"?"เจ้าของสถาบัน":"ครูผู้สอน"}</span>
      </div>
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full border-[28px] border-white/10"/>
   </section>
   <div className="flex items-center justify-between gap-2">
    <h2 className="text-lg font-black">เมนูจัดการสถาบัน</h2>
    <button type="button" className="rounded-lg border border-[#a9c5e7] bg-white px-3 py-2 text-sm font-bold lg:hidden" onClick={()=>setMobileMenu(v=>!v)} aria-expanded={mobileMenu}>{mobileMenu?"ซ่อนเมนู":"☰ เมนูทั้งหมด"}</button>
   </div>
   <nav aria-label="เมนูสถาบัน" className={`${mobileMenu?"grid":"hidden"} grid-cols-2 gap-2 sm:grid-cols-3 lg:grid lg:grid-cols-6`}>
    {menu.filter(m=>role==="owner"||m.id!=="settings").map(m=><button type="button" key={m.id} onClick={()=>open(m.id)} aria-current={page===m.id?"page":undefined} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-sm font-bold shadow-sm ${page===m.id?"border-[#e9b94d] bg-[#0d5fbf] text-white":"border-[#b7cbe5] bg-white hover:border-[#dfb44c]"}`}><span aria-hidden="true" className="text-2xl">{m.icon}</span>{m.label}</button>)}
   </nav>
   <section className="space-y-4 rounded-2xl border border-[#c1d2e9] bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
     {isPeople&&<div role="group" aria-label="เปลี่ยนมุมมอง" className="inline-flex rounded-xl border-2 border-[#a9c4e6] p-1 text-sm font-bold">
       <button type="button" aria-pressed={mode==="table"} onClick={()=>setMode("table")} className={`rounded-lg px-3 py-2 ${mode==="table"?"bg-[#0c62ca] text-white":""}`}>☰ ตาราง</button>
       <button type="button" aria-pressed={mode==="cards"} onClick={()=>setMode("cards")} className={`rounded-lg px-3 py-2 ${mode==="cards"?"bg-[#0c62ca] text-white":""}`}>▦ การ์ด</button>
     </div>}
    </div>
    {page==="home"&&<>
     <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       {[["นักกีฬาทั้งหมด","48 คน","♙"],["กำลังแข่งขัน","3 รายการ","🏆"],["ผลล่าสุด","8 ชนะ / 3 แพ้","★"],["สถิติเติบโต","+18%","▥"]].map(x=><div key={x[0]} className="rounded-xl border-2 border-[#d1dff0] bg-[#f3f8ff] p-3 sm:p-4"><p className="text-xs font-semibold text-[#587296]">{x[2]} {x[0]}</p><p className="mt-2 text-xl font-black text-[#0b55a9] sm:text-2xl">{x[1]}</p></div>)}
     </div>
     <div className="grid gap-3 sm:grid-cols-2">{[["นักกีฬา","students"],["ผลการแข่งขัน","tracking"],["สถิติพัฒนาการ","stats"],["ครูในสถาบัน","teachers"]].map(x=><button type="button" key={x[1]} onClick={()=>open(x[1] as PageKey)} className="rounded-xl border-2 border-[#c9d7ee] bg-white p-4 text-left font-bold hover:border-[#d9a83c]">→ {x[0]}</button>)}</div>
    </>}
    {page==="settings"&&<div className="space-y-4">
      <p className="text-sm text-[#587296]">ลองอัปโหลดโลโก้และเลือกรูปแบบได้บนหน้าตรวจงานนี้ รูปจะยังไม่ถูกบันทึกลงฐานข้อมูล</p>
      <label className="block rounded-xl border-2 border-dashed border-[#93b5de] bg-[#f6faff] p-5 text-center font-bold text-[#1556a1]">เลือกรูปโลโก้ (PNG, JPEG, WEBP)<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block w-full text-sm" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024){alert("ไฟล์ต้องไม่เกิน 5 MB");return;}if(logoFile)URL.revokeObjectURL(logoFile);setLogoFile(URL.createObjectURL(f));}}/></label>
      <div className="flex flex-wrap gap-2">{(["circle","square"] as const).map(sh=><button type="button" key={sh} aria-pressed={shape===sh} onClick={()=>setShape(sh)} className={`rounded-lg border-2 px-4 py-2 font-bold ${shape===sh?"border-[#e9b54b] bg-[#0b61c0] text-white":"border-[#bdd0e8]"}`}>{sh==="circle"?"◯ วงกลม":"▢ สี่เหลี่ยม"}</button>)}</div>
      <label className="block text-sm font-bold">ขยาย / ย่อรูปโลโก้: {logoScale}%<input type="range" min="60" max="200" value={logoScale} onChange={e=>setLogoScale(Number(e.target.value))} className="mt-2 w-full accent-[#0c62c5]"/></label>
      <p className="rounded-xl bg-[#fff6df] p-3 text-sm">สำหรับบันทึกโลโก้จริง ต้องเข้าสู่ระบบด้วยสิทธิ์เจ้าของสถาบันก่อน ขณะนี้เป็นโหมดตรวจดีไซน์เท่านั้น</p>
     </div>}
    {isPeople&&<>{mode==="cards"?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
       {(page==="teachers"?teachers:athletes).map((x,i)=><div key={i} className="rounded-xl border-2 border-[#c8d8ed] bg-[#f8fbff] p-4"><p className="font-bold">{x.name}</p><p className="mt-2 text-sm text-[#46658b]">{"role" in x?x.role:x.rank}</p>{"games" in x&&<p className="mt-2 text-sm">ชนะ {x.wins}/{x.games} เกม · {x.status}</p>}</div>)}
     </div>:<div className="overflow-x-auto rounded-xl border-2 border-[#c8d8ed]"><table className="w-full min-w-[34rem] text-left text-sm"><thead className="bg-[#e9f3ff]"><tr><th className="p-3">ชื่อ</th><th className="p-3">{page==="teachers"?"บทบาท":"ระดับฝีมือ"}</th><th className="p-3">รายละเอียด</th></tr></thead><tbody className="divide-y divide-[#d7e4f4]">{(page==="teachers"?teachers:athletes).map((x,i)=><tr key={i}><td className="p-3 font-bold">{x.name}</td><td className="p-3">{"role" in x?x.role:x.rank}</td><td className="p-3">{"games" in x?`ชนะ ${x.wins}/${x.games} เกม`:"ตัวอย่างบัญชีครู"}</td></tr>)}</tbody></table></div>}</>}
   </section>
   <p className="pb-8 text-center text-xs text-[#6480a0]">GO TOURNAMENT · โหมดตรวจงาน ไม่ใช้ข้อมูลบัญชีหรือผลการแข่งขันจริง</p>
  </main>
 </div>;
}