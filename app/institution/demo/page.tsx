"use client";

import Link from "next/link";
import {useMemo,useState} from "react";

type AcademyKey="think"|"ban"|"master";
type Athlete={name:string;divisions:string[];note?:string};
const EVENT="ZEER GO KYU WAR 2026";
const EVENT_ID="ce1382d9-1e1f-4697-8fe4-6a1a347d91eb";
const academies:{key:AcademyKey;name:string;dbName:string;hint:string;athletes:Athlete[]}[]=[
 {key:"think",name:"Think Kub",dbName:"Thinkkub",hint:"ข้อมูลจากชื่อสังกัด Think Kub ในใบสมัคร",athletes:[
 {name:"Xiaoyan Su",divisions:["OPEN Friendship 13×13","OPEN Friendship 9×9"]},
 {name:"กฤตภาส โชคพิพัฒน์พร",divisions:["1-2 Kyu"]},
 {name:"ณธกฤต พุ่มพวง",divisions:["3-4 Kyu"]},
 {name:"ณัฐกร เรืองรัตนอัมพร",divisions:["3-4 Kyu"]},
 {name:"ณัฐกฤษณ์ เรืองรัตนอัมพร",divisions:["1-2 Kyu"]},
 {name:"บุญญารัศมิ์ โอพรสวัสดิ์",divisions:["9-12 Kyu"]},
 {name:"ปุญยวัจน์ งามสิริศักดิ์",divisions:["1-2 Kyu"]},
 {name:"ปุณณพัฒน์ โอพรสวัสดิ์",divisions:["1-2 Kyu"]},
 {name:"ภัทรดนัย จิระโชติตระกูล",divisions:["1-2 Kyu"]},
 {name:"โรจนวุฑฒิ อิทธิพูนสิริ",divisions:["OPEN Friendship 9×9","OPEN Friendship 13×13"]},
 {name:"เศรษฐิณาธร สว่างเพชร",divisions:["OPEN Friendship 9×9","OPEN Friendship 13×13"]},
 {name:"สิรภัทร อิทธิพูนสิริ",divisions:["OPEN Friendship 9×9","OPEN Friendship 13×13"]},
 {name:"หฤษฎ์ จตุรงค์เสรีกุล",divisions:["9-12 Kyu"]},
 {name:"อาชวิน สุขะ",divisions:["OPEN Friendship 9×9"]},
 {name:"ไอยย์ณิดา อดุลรัตนานุวัตร",divisions:["3-4 Kyu"]},
 {name:"ไอยย์วรา อดุลรัตนานุวัตร",divisions:["3-4 Kyu"]},
 ]},
 {key:"ban",name:"บ้านโกะ by ครูได๋",dbName:"บ้านโกะ by ครูได๋",hint:"ชื่อสังกัดตรงกับข้อมูลใบสมัคร แต่บางรายการอาจมีการถอนตัวภายหลัง",athletes:[
 {name:"ชินณพัฒน์ พูนศักดิ์ชัยเดช",divisions:["7-8 Kyu"]},
 {name:"โชติพัชร์ พูนศักดิ์ชัยเดช",divisions:["7-8 Kyu"]},
 {name:"ณธษา ทองศรี",divisions:["3-4 Kyu"]},
 {name:"ณัฐณิริน วิไลเจริญตระกูล",divisions:["9-12 Kyu"],note:"เคยแจ้งถอนสมัครและคืนเงินแล้ว — ไม่ควรนับเป็นผู้แข่งขันปัจจุบัน"},
 {name:"ตุลภัค โชติเมธากิจ",divisions:["9-12 Kyu"]},
 {name:"พนิต วิเวกแว่ว",divisions:["5-6 Kyu"]},
 {name:"พัทธนันท์ พานทอง",divisions:["7-8 Kyu"]},
 {name:"ภูมิทรรศชล ทองศรี",divisions:["3-4 Kyu"]},
 {name:"สรวิชญ์ วสันต์ทอง",divisions:["5-6 Kyu"]},
 ]},
 {key:"master",name:"GO MASTER",dbName:"GO MASTER",hint:"รวมตัวสะกด Go master และ GO MASTER จากใบสมัคร",athletes:[
 {name:"วรพงศ์ เกียรติอุบลไพบูลย์",divisions:["7-8 Kyu"]},
 {name:"กวินลดา ดวนด่วน",divisions:["7-8 Kyu"]},
 {name:"ปิติภัทร ด้วงเจริญ",divisions:["9-12 Kyu"]},
 ]},
];
const iconPaths={
 home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/></>,
 students:<><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6"/><circle cx="18" cy="9" r="2.5"/><path d="M16 15c3 0 5 2 5 5"/></>,
 event:<><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8"/></>,
 teacher:<><circle cx="12" cy="7" r="3.5"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/><path d="M17 5h5m-2.5-2.5v5"/></>,
 chart:<><path d="M4 21V12h4v9m3 0V8h4v13m3 0V3h4v18M2 21h22"/></>,
 settings:<><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2.5 2.5m9 9L19 19M5 19l2.5-2.5m9-9L19 5"/></>
};
function Icon({name,className=""}:{name:keyof typeof iconPaths;className?:string}){return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" className={className}>{iconPaths[name]}</svg>}
const tabs:[string,keyof typeof iconPaths][]=[["ภาพรวม","home"],["นักกีฬา","students"],["ผลการแข่งขัน","event"],["ครูในสถาบัน","teacher"],["สถิติ","chart"],["ตั้งค่า","settings"]];
export default function InstitutionSample(){
 const [selected,setSelected]=useState<AcademyKey>("think");
 const [section,setSection]=useState("home");
 const [mode,setMode]=useState<"cards"|"table">("cards");
 const [search,setSearch]=useState("");
 const [showOnlyActive,setShowOnlyActive]=useState(true);
 const [mobileMenu,setMobileMenu]=useState(false);
 const a=academies.find(item=>item.key===selected)!;
 const relevant=a.athletes.filter(x=>!showOnlyActive||!x.note);
 const rows=useMemo(()=>relevant.filter(x=>[x.name,...x.divisions].join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase())),[relevant,search]);
 const eventCount=relevant.reduce((s,r)=>s+r.divisions.length,0);
 const switchAcademy=(id:AcademyKey)=>{setSelected(id);setSection("home");setSearch("");setShowOnlyActive(true);};
 const go=(view:string)=>{setSection(view);setMobileMenu(false)};
 const marker=<span className="inline-block h-6 w-1.5 rounded-full bg-[#eabb56]"/>;
 const nav=(id:string,label:string,icon:keyof typeof iconPaths)=><button key={id} type="button" onClick={()=>go(id)} aria-pressed={section===id} className={`flex min-h-[83px] items-center justify-center gap-2 rounded-[18px] border-[3px] px-2 py-3 text-center text-sm font-black transition sm:flex-col ${section===id?"border-[#edc05d] bg-[linear-gradient(140deg,#0c65c5,#072f72)] text-white shadow-[0_5px_13px_rgba(9,48,101,.25)]":"border-[#bcd0eb] bg-white text-[#0b336d] shadow-sm hover:border-[#e1b551]"}`}><Icon name={icon} className={`h-7 w-7 ${section===id?"text-[#f4d279]":"text-[#0d3a76]"}`}/><span>{label}</span></button>;
 return <div className="min-h-screen bg-[#edf4ff] text-[#0b3267]">
 <header className="border-b-[3px] border-[#eabd5b] bg-[#072858] text-white">
  <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6"><Link href="/" className="font-black sm:text-xl"><span className="text-[#f2ca6b]">GO</span> TOURNAMENT</Link><span className="rounded-full border-2 border-[#f3cb70] px-3 py-1.5 text-xs font-bold text-[#f4d482]">ตัวอย่างโครงสร้าง 3 สถาบัน</span><Link href="/institution" className="hidden rounded-lg border border-white/40 px-3 py-2 text-xs font-bold sm:inline-block">เข้าระบบจริง</Link></div>
 </header>
 <main className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:px-6">
  <div className="rounded-xl border-2 border-[#e5be66] bg-[#fff9ea] p-3 text-sm font-semibold text-[#714f16]">โหมดตรวจแบบ: ใช้รายชื่อจากใบสมัคร ZEER GO KYU WAR 2026 ที่เผยแพร่ไว้ · ไม่ใช่การยืนยันสมาชิกสถาบัน · ไม่แก้ไขข้อมูลการแข่งขันจริง · ไม่มีผลชนะ-แพ้ที่ยังไม่ประกาศ</div>
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[17px] border-[3px] border-[#e6c277] bg-[#fff9ed] p-3"><div><b>ครูอิสระ ไม่มีสถาบันก็ใช้งานได้</b><p className="text-sm text-[#705827]">ลองหน้าครูที่มีนักเรียนหลายคนและติดตามผลแข่งขันแยกจากสังกัด</p></div><Link href="/independent-coach/demo" className="inline-flex min-h-11 items-center rounded-xl border-2 border-[#efc86b] bg-[#0c58b6] px-4 font-bold text-white">เปิดหน้าครูอิสระ ↗</Link></div>
  <div className="flex flex-wrap gap-2 rounded-[17px] border-[3px] border-[#bdd3ec] bg-white p-3"><span className="self-center pr-2 text-sm font-black">เลือกสถาบัน</span>{academies.map(x=><button key={x.key} aria-pressed={x.key===selected} type="button" onClick={()=>switchAcademy(x.key)} className={`min-h-11 rounded-xl border-2 px-4 text-sm font-bold ${x.key===selected?"border-[#e6b850] bg-[#0e60bf] text-white":"border-[#c2d3eb] bg-[#f5f9ff]"}`}>{x.name}</button>)}</div>
  <section className="relative overflow-hidden rounded-[26px] border-[3px] border-[#edc568] bg-[#072c66] bg-[url(/institution-banner.svg)] bg-cover bg-center p-5 text-white shadow-[0_9px_22px_rgba(4,45,92,.18)] sm:p-8">
   <div className="relative z-10 flex items-center gap-4 sm:gap-8"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[4px] border-[#edbf59] bg-[#052148] text-center text-xs font-black text-[#f6cf74] sm:h-32 sm:w-32 sm:text-lg"><span>GO<br/>SCHOOL</span></div><div><p className="text-xs font-bold tracking-widest text-[#f4d47d]">GO TOURNAMENT · สถาบัน</p><h1 className="mt-2 text-2xl font-black sm:text-5xl">{a.name}</h1><p className="mt-2 text-sm text-white/90 sm:text-lg">ดูรายชื่อนักกีฬาและการสมัครแข่งขันในหน้าจอเดียว</p><span className="mt-3 inline-flex rounded-full bg-[#ffd36e] px-3 py-1 text-xs font-black text-[#173761]">ตัวอย่างจากใบสมัครจริง</span></div></div>
  </section>
  <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-xl font-black sm:text-2xl">{marker} เมนูจัดการสถาบัน</h2><button type="button" className="rounded-xl border-2 border-[#afc8e7] bg-white px-4 py-2 font-bold lg:hidden" aria-expanded={mobileMenu} onClick={()=>setMobileMenu(x=>!x)}>☰ {mobileMenu?"ปิดเมนู":"เมนู"}</button></div>
  <nav aria-label="เมนูสถาบัน" className={`${mobileMenu?"grid":"hidden"} grid-cols-2 gap-2 sm:grid-cols-3 lg:grid lg:grid-cols-6`}>{tabs.map(([label,id])=>nav(id,label,id))}</nav>
  <section className="space-y-5 rounded-[24px] border-[3px] border-[#b8d1ed] bg-white p-4 shadow-md sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-[#e4b954] pb-3"><h2 className="flex items-center gap-3 text-2xl font-black">{marker}{tabs.find(([l,id])=>id===section)?.[0]}</h2>{(section==="students"||section==="event")&&<div className="flex rounded-xl border-2 border-[#bdd2ed] bg-[#f4f8ff] p-1 text-sm font-bold"><button type="button" onClick={()=>setMode("table")} className={`rounded-lg px-3 py-2 ${mode==="table"?"bg-[#0c61bf] text-white":""}`}>☰ ตาราง</button><button type="button" onClick={()=>setMode("cards")} className={`rounded-lg px-3 py-2 ${mode==="cards"?"bg-[#0c61bf] text-white":""}`}>▦ การ์ด</button></div>}</div>
   {section==="home"&&<><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[["นักกีฬาที่พบ",relevant.length+" คน","รายชื่อไม่ซ้ำ"],["รายการสมัคร",eventCount+" รายการ","หนึ่งคนลงได้หลายรุ่น"],["รายการแข่งขัน","1 รายการ",EVENT],["ยืนยันสมาชิก","0 คน","ยังไม่ได้ผูกโปรไฟล์กับสถาบัน"]].map(([label,value,note])=><div key={label} className="rounded-[19px] border-[3px] border-[#bfd2ea] bg-[#f4f8ff] p-3 sm:p-5"><p className="text-sm font-bold text-[#58789c]">{label}</p><p className="mt-2 text-2xl font-black text-[#0b55a8] sm:text-3xl">{value}</p><p className="mt-2 text-xs text-[#66809d]">{note}</p></div>)}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["นักกีฬา","students"],["ผลการแข่งขัน","event"],["ครูและนักเรียน","teacher"],["ตั้งค่าสถาบัน","settings"]].map(([label,id])=><button type="button" key={id} onClick={()=>go(id)} className="rounded-[19px] border-[3px] border-[#ecc467] bg-[linear-gradient(145deg,#0d55ae,#052a60)] p-5 text-left font-black text-white shadow-md"><span className="text-2xl text-[#f4d47b]">↗</span><span className="mt-2 block">{label}</span><span className="mt-2 block text-xs font-normal text-white/80">เปิดดูตัวอย่าง</span></button>)}</div><p className="rounded-xl bg-[#f0f6ff] p-3 text-sm">{a.hint}</p></>}
   {(section==="students"||section==="event")&&<><div className="flex flex-wrap gap-3"><input className="min-h-12 min-w-[14rem] flex-1 rounded-xl border-2 border-[#bbd2eb] px-3" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อนักกีฬา หรือรุ่นแข่งขัน"/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showOnlyActive} onChange={e=>setShowOnlyActive(e.target.checked)}/> ไม่แสดงรายชื่อที่เคยแจ้งถอน</label></div><div className="rounded-xl border border-[#c9daef] bg-[#eef6ff] p-3 text-sm">รายการแข่งขัน: <b>{EVENT}</b> · 5 ธันวาคม 2569 · <Link className="font-bold text-[#0d5cb4] underline" href={`/tournaments/${EVENT_ID}`}>ดูหน้ารายการแข่งขันจริง</Link></div>{mode==="cards"?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(x=><div key={x.name} className="rounded-[18px] border-[3px] border-[#bfd2eb] bg-[#f7fbff] p-4"><p className="text-lg font-black">{x.name}</p><div className="mt-3 flex flex-wrap gap-1">{x.divisions.map(d=><span key={d} className="rounded-full border border-[#d4be7d] bg-[#fff9e8] px-2 py-1 text-xs font-semibold text-[#775316]">{d}</span>)}</div><p className="mt-2 text-xs text-[#6b829f]">สังกัดตามใบสมัคร: {a.name}</p>{x.note&&<p className="mt-2 text-xs text-[#b55239]">{x.note}</p>}</div>)}</div>:<div className="overflow-x-auto rounded-xl border-[3px] border-[#c3d6ed]"><table className="w-full min-w-[660px] text-left text-sm"><thead className="bg-[#eaf4ff]"><tr><th className="p-3">นักกีฬา</th><th className="p-3">รุ่นแข่งขัน</th><th className="p-3">สังกัดในใบสมัคร</th><th className="p-3">การเชื่อมโปรไฟล์</th></tr></thead><tbody>{rows.map(x=><tr key={x.name} className="border-t border-[#d7e5f4]"><td className="p-3 font-semibold">{x.name}</td><td className="p-3">{x.divisions.join(", ")}</td><td className="p-3">{a.name}</td><td className="p-3">{x.note?"เคยแจ้งถอน":"รอเชื่อม GO ID"}</td></tr>)}</tbody></table></div>}{!rows.length&&<p className="rounded-lg bg-[#f4f8ff] p-5 text-center">ไม่พบรายชื่อ</p>}</>}
   {section==="teacher"&&<div className="space-y-4"><p>ตัวอย่างโครงสร้างการเชื่อมครูและนักเรียน โดยไม่กำหนดว่านักกีฬา 1 คนต้องมีครูเพียงคนเดียว</p><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[18px] border-[3px] border-[#c5d8ef] p-4"><h3 className="font-black">ครูในสถาบัน</h3><p className="mt-2 text-sm text-[#607998]">รอเจ้าของสถาบันเพิ่มหรืออนุมัติบัญชีครูจริง</p></div><div className="rounded-[18px] border-[3px] border-[#e5c26e] bg-[#fffbf2] p-4"><h3 className="font-black">ครูอิสระ</h3><p className="mt-2 text-sm text-[#75603a]">ครูเปิดพื้นที่ของตัวเองได้ และเลือกนักเรียนร่วมกับสถาบันได้</p></div></div><p className="text-sm">เมื่อเข้าสู่ระบบจริง เจ้าของเลือกครู + เลือกนักกีฬาเพื่อเชื่อมได้ โดยไม่เปลี่ยนสังกัดที่ลงแข่งขัน</p></div>}
   {section==="chart"&&<div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border-[3px] border-[#c3d6ed] p-5"><b>รายการสมัครจากสถาบัน</b><p className="mt-2 text-3xl font-black text-[#0b5ab2]">{eventCount} รายการ</p></div><div className="rounded-xl border-[3px] border-[#c3d6ed] p-5"><b>ผลการแข่งขัน</b><p className="mt-2 text-sm text-[#587797]">รายการยังไม่แข่งขัน จึงยังไม่มีคะแนนและอัตราชนะจริง</p></div></div>}
   {section==="settings"&&<div className="space-y-3"><p className="text-sm">หน้าจัดการจริงรองรับโลโก้สถาบันแบบวงกลมและสี่เหลี่ยม ซูม ครอป และปรับตำแหน่งได้</p><div className="rounded-xl border-[3px] border-dashed border-[#c3d6ed] bg-[#f7fbff] p-5 text-center text-sm">โลโก้จริงยังไม่ได้ตั้งค่าในตัวอย่างนี้ · การบันทึกโลโก้ต้องใช้บัญชีเจ้าของสถาบัน</div><Link className="inline-flex min-h-11 items-center rounded-xl border-[3px] border-[#e5b64c] bg-[#0c5fbc] px-5 font-bold text-white" href="/institution">เข้าสู่ระบบสถาบันจริง</Link></div>}
  </section>
  <p className="pb-6 text-center text-xs text-[#667e9d]">GO TOURNAMENT · ตัวอย่างโครงสร้างสำหรับตรวจแบบ · รายชื่อดึงมาจากข้อมูลสมัครแข่งขันที่มีอยู่ ณ วันที่ตรวจสอบ</p>
 </main></div>;
}
