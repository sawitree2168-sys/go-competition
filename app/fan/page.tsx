"use client";
import Link from "next/link";
import {useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import {SiteHeroMedia,SiteOfficialLogo} from "../components/SiteHeroMedia";

type Athlete={id:string;go_id:string;full_name:string;nickname:string|null;current_rank:string|null};
type Match={id:string;tournament_id:string;round:number;black_id:string;white_id:string;winner_id:string|null;double_forfeit:boolean;verified_at:string};
type ApiResponse={status:string;athletes?:Athlete[];results?:Match[];message?:string};
type Tab="all"|"results"|"waiting";
const STORE="gt-go-fan-following-v1",MAX=20;
const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Glyph({name,size=21}:{name:"home"|"calendar"|"fans"|"chart"|"news"|"search"|"refresh"|"trash"|"plus"|"menu"|"chevron"|"trophy"|"shield";size?:number}){
 const shared={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true as const};
 const d:Record<typeof name,ReactNode>={
 home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
 fans:<><circle cx="9" cy="8" r="3"/><path d="M2 21v-2a6 6 0 0 1 12 0v2M17 10a3 3 0 1 0-2.2-5M17 15a5 5 0 0 1 5 5v1"/></>,
 chart:<><path d="M4 20V12M10 20V6M16 20v-9M22 20V3"/></>,
 news:<><path d="M4 4h15a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM6 9h8M6 13h8M6 17h12M17 9h1v4h-1z"/></>,
 search:<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
 refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.5 9a7 7 0 0 1 12-2L20 12M4 12l1.5 5a7 7 0 0 0 12-2"/></>,
 trash:<><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
 plus:<><path d="M12 5v14M5 12h14"/></>,
 menu:<><path d="M4 6h16M4 12h16M4 18h16"/></>,
 chevron:<><path d="m9 5 7 7-7 7"/></>,
 trophy:<><path d="M7 4h10v7a5 5 0 0 1-10 0V4zM7 6H4v3a4 4 0 0 0 4 4M17 6h3v3a4 4 0 0 1-4 4M12 16v4M8 21h8"/></>,
 shield:<><path d="m12 2 8 4v6c0 6-4.5 9-8 10-3.5-1-8-4-8-10V6zM9 12l2 2 4-4"/></>
 };
 return <svg {...shared}>{d[name]}</svg>;
}

function MedalMark(){
 return <svg viewBox="0 0 48 48" width="26" height="26" role="img" aria-label="ตราผู้ติดตาม">
  <path fill="#2868C7" d="M12 2h9l9 18-9 5z"/><path fill="#7BB4FF" d="M27 2h9L25 25l-8-5z"/>
  <circle cx="24" cy="30" r="14" fill="#C68B21"/><circle cx="24" cy="29" r="11.5" fill="#F9D978" stroke="#FFF2BA" strokeWidth="2"/>
  <path d="m24 20 2.8 5.9 6.5.9-4.6 4.4 1.1 6.4-5.8-3-5.8 3 1.1-6.4-4.6-4.4 6.5-.9z" fill="#AD6B12"/>
 </svg>;
}

function BottomNav(){
 const links=[{href:"/",icon:"home" as const,label:"หน้าหลัก"},{href:"/schedule",icon:"trophy" as const,label:"รายการแข่งขัน"},{href:"/fan",icon:"fans" as const,label:"GO FAN",active:true},{href:"/overview/rankings",icon:"chart" as const,label:"อันดับ"},{href:"/overview/news",icon:"news" as const,label:"ข่าวสาร"}];
 return <nav aria-label="เมนูหลักมือถือ" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/20 bg-[#051f53] pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-9px_30px_rgba(3,26,71,.2)] lg:hidden">
  <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1 px-1 py-1.5">{links.map(x=><Link key={x.href} href={x.href} aria-current={x.active?"page":undefined} className={"flex min-h-[55px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-[10px] font-bold leading-tight "+(x.active?"bg-[#1363ea] text-white":"text-blue-100 hover:bg-white/10")}>
   <Glyph name={x.icon} size={22}/><span>{x.label}</span>
  </Link>)}</div>
 </nav>;
}

function athleteLabel(a:Athlete){return a.nickname?.trim()||a.full_name;}
function resultLabel(m:Match,id:string){if(m.double_forfeit)return {text:"แพ้ทั้งคู่",color:"bg-slate-100 text-slate-700",icon:"–"};return m.winner_id===id?{text:"ชนะ",color:"bg-emerald-100 text-emerald-800",icon:"✓"}:{text:"แพ้",color:"bg-rose-100 text-rose-800",icon:"×"};}

export default function GoFan(){
 const [saved,setSaved]=useState<string[]>([]);
 const [hydrated,setHydrated]=useState(false),[query,setQuery]=useState("");
 const [searching,setSearching]=useState(false),[loading,setLoading]=useState(false);
 const [found,setFound]=useState<Athlete[]>([]),[athletes,setAthletes]=useState<Athlete[]>([]);
 const [matches,setMatches]=useState<Match[]>([]),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const [refreshTick,setRefreshTick]=useState(0),[tab,setTab]=useState<Tab>("all");
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;try{const ids:unknown=JSON.parse(localStorage.getItem(STORE)||"[]");if(Array.isArray(ids))setSaved([...new Set(ids.filter((x):x is string=>typeof x==="string"&&validId.test(x)))].slice(0,MAX));}catch{/* Storage may be blocked; following still works for this session. */}setHydrated(true)});return()=>{active=false}},[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(STORE,JSON.stringify(saved))}catch{/* Session-only following when storage is unavailable. */}},[saved,hydrated]);
 useEffect(()=>{if(!hydrated)return;let live=true;const ctrl=new AbortController();async function load(){
  setError("");if(!saved.length){setAthletes([]);setMatches([]);setLoading(false);return}
  setLoading(true);try{
   const r=await fetch("/api/fan?mode=watch&ids="+encodeURIComponent(saved.join(",")),{cache:"no-store",signal:ctrl.signal});const d:ApiResponse=await r.json();
   if(!r.ok||d.status!=="ok"||!Array.isArray(d.athletes)||!Array.isArray(d.results))throw Error(d.message||"โหลดข้อมูลกองเชียร์ไม่สำเร็จ");
   if(live){setAthletes(d.athletes);setMatches(d.results)}
  }catch(e){if(live&&!ctrl.signal.aborted)setError(e instanceof Error?e.message:"โหลดข้อมูลไม่สำเร็จ")}finally{if(live)setLoading(false)}
 }void load();return()=>{live=false;ctrl.abort()};},[saved,hydrated,refreshTick]);

 async function search(e:FormEvent){e.preventDefault();if(query.trim().length<2)return;setSearching(true);setNotice("");setError("");setFound([]);
  try{const r=await fetch("/api/fan?mode=search&q="+encodeURIComponent(query.trim()),{cache:"no-store"});const d:ApiResponse=await r.json();if(!r.ok||d.status!=="ok"||!Array.isArray(d.athletes))throw Error(d.message||"ค้นหานักกีฬาไม่ได้");setFound(d.athletes);if(!d.athletes.length)setNotice("ไม่พบนักกีฬาที่เปิดโปรไฟล์สาธารณะตามคำค้นนี้");}
  catch(e){setError(e instanceof Error?e.message:"ค้นหาไม่สำเร็จ")}finally{setSearching(false)}
 }
 function add(a:Athlete){if(saved.includes(a.id))return;if(saved.length>=MAX){setError("ติดตามได้สูงสุด 20 คน");return}setSaved(s=>[...s,a.id]);setNotice("เพิ่ม "+athleteLabel(a)+" เข้ากองเชียร์แล้ว")}
 function remove(id:string){setSaved(s=>s.filter(x=>x!==id));setNotice("นำออกจากรายชื่อติดตามแล้ว")}
 function clear(){if(saved.length&&window.confirm("ล้างรายชื่อนักกีฬาที่ติดตามทั้งหมดบนอุปกรณ์นี้?")){setSaved([]);setNotice("ล้างรายชื่อแล้ว")}}
 const list=useMemo(()=>saved.map(id=>athletes.find(a=>a.id===id)).filter((a):a is Athlete=>Boolean(a)),[saved,athletes]);
 const grouped=useMemo(()=>new Map(list.map(a=>[a.id,matches.filter(m=>m.black_id===a.id||m.white_id===a.id)])),[list,matches]);
 const finished=list.filter(a=>(grouped.get(a.id)?.length||0)>0).length;
 const awaiting=list.length-finished;
 const visible=list.filter(a=>tab==="all"||(tab==="results"?(grouped.get(a.id)?.length||0)>0:(grouped.get(a.id)?.length||0)===0));
 return <main className="min-h-screen bg-[#eff5fc] pb-28 text-[#102e5b] lg:pb-12">
  <header className="sticky top-0 z-40 border-b border-[#244c83] bg-[#061e51] text-white shadow-lg">
   <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
    <Link href="/site-map" aria-label="เปิดเมนูเว็บไซต์" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20"><Glyph name="menu"/></Link>
    <Link href="/" className="flex min-w-0 justify-center" aria-label="GO TOURNAMENT หน้าหลัก"><SiteOfficialLogo/></Link>
    <Link href="/faq" aria-label="ช่วยเหลือ" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20"><Glyph name="shield"/></Link>
   </div>
  </header>
  <div className="mx-auto max-w-2xl space-y-3 px-3 pb-8 pt-0 sm:px-6 sm:pt-4">
   <section className="relative isolate -mx-3 overflow-hidden rounded-none sm:mx-0 sm:rounded-[24px] border border-[#467ac2] bg-[radial-gradient(ellipse_at_85%_15%,#4084e4_0%,#154b9c_40%,#071e4d_92%)] text-white shadow-[0_14px_34px_rgba(7,34,87,.24)]">
    <SiteHeroMedia slot="fan"/>
    <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#051a43]/90 via-[#0a2a64]/75 to-[#123e83]/30"/>
    <div className="pointer-events-none absolute -right-12 -top-20 z-10 h-56 w-56 rounded-full border-[28px] border-[#f6d17a]/20 sm:h-80 sm:w-80"/>
    <div className="pointer-events-none absolute right-5 top-8 z-10 hidden h-40 w-40 rotate-12 rounded-full bg-[#efc35c]/10 blur-2xl sm:block"/>
    <div className="relative z-20 flex min-h-[165px] items-center justify-between gap-3 px-5 py-6 sm:min-h-[210px] sm:px-9">
     <div className="max-w-xl"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffdc91]">ติดตามทุกกำลังใจ</p>
      <h1 className="mt-2 text-[42px] font-black leading-none tracking-tight text-[#ffdc78] drop-shadow-lg sm:text-6xl">GO <span className="text-white">FAN</span></h1>
      <h2 className="mt-2 text-xl font-black sm:text-2xl">กองเชียร์ของฉัน</h2>
      <p className="mt-1 max-w-lg text-sm text-blue-50 sm:text-base">ติดตามนักกีฬาที่คุณเชียร์ได้หลายคนในหน้าจอเดียว</p>
     </div>
     <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-[#fbd781]/70 bg-gradient-to-b from-[#f9e49b] to-[#a56b1a] text-[#563a0b] shadow-xl sm:flex" aria-hidden="true"><Glyph name="trophy" size={54}/></div>
    </div>
   </section>
   <div className="sr-only"><strong className="text-blue-900">ไม่ต้องล็อกอิน</strong> · รายชื่อที่ติดตามเก็บไว้ในอุปกรณ์นี้ และแสดงเฉพาะโปรไฟล์สาธารณะกับผลแข่งขันที่ผู้จัดยืนยันแล้ว</div>
   <section className="rounded-2xl bg-white p-3 shadow-sm sm:p-5" aria-label="ค้นหานักกีฬา">
    <form onSubmit={search} className="flex items-center gap-2">
     <label className="relative min-w-0 flex-1"><span className="sr-only">ค้นหาชื่อนักกีฬาหรือ GO ID</span><span className="pointer-events-none absolute left-3 top-[13px] text-blue-600"><Glyph name="search"/></span>
      <input value={query} onChange={e=>setQuery(e.target.value)} minLength={2} maxLength={70} required placeholder="ค้นหาชื่อนักกีฬาหรือ GO ID" className="min-h-11 w-full rounded-xl border border-[#d6e3f4] bg-[#f8fbff] py-3 pl-10 pr-2 text-sm font-medium outline-none focus:border-blue-600"/>
     </label>
     <button disabled={searching||query.trim().length<2} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#ffe59e] to-[#f3c45c] shrink-0 px-3 py-3 text-sm font-extrabold text-[#092959] shadow-sm disabled:opacity-50"><Glyph name="plus" size={19}/>{searching?"กำลังค้นหา...":"เพิ่มนักกีฬา"}</button>
    </form>
    {found.length>0&&<div className="mt-3 grid gap-2 sm:grid-cols-2">{found.map(a=><div key={a.id} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-[#f7faff] p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg font-black text-blue-800" aria-hidden="true">{athleteLabel(a).charAt(0)}</div>
      <div className="min-w-0 flex-1"><p className="truncate font-extrabold">{athleteLabel(a)}</p><p className="truncate text-xs text-slate-600">GO ID {a.go_id}{a.current_rank?" · "+a.current_rank:""}</p></div>
      <button onClick={()=>add(a)} type="button" disabled={saved.includes(a.id)||saved.length>=MAX} className="min-h-11 rounded-xl bg-[#1159c5] px-3 font-extrabold text-white disabled:bg-slate-200 disabled:text-slate-500">{saved.includes(a.id)?"ติดตามแล้ว":"+ ติดตาม"}</button>
     </div>)}</div>}
   </section>
   <div role="tablist" aria-label="กรองนักกีฬาที่ติดตาม" className="grid grid-cols-3 gap-2 rounded-xl bg-[#dfebfa] p-1.5">
    {([{key:"all",label:"ทั้งหมด",count:list.length},{key:"results",label:"มีผลแล้ว",count:finished},{key:"waiting",label:"ยังไม่มีผล",count:awaiting}] as const).map(t=><button key={t.key} type="button" role="tab" aria-selected={tab===t.key} onClick={()=>setTab(t.key)} className={"min-h-11 rounded-lg px-2 py-2 text-sm font-bold transition sm:text-base "+(tab===t.key?"bg-[#115cec] text-white shadow-md":"bg-white/70 text-[#1b478c] hover:bg-white")}>{t.label} ({t.count})</button>)}
   </div>
   {notice&&<p role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold">{notice}</p>}
   {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p>}
   <section aria-labelledby="followed-title" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <h2 id="followed-title" className="text-lg font-black sm:text-2xl">นักกีฬาที่ติดตาม <span className="sr-only">({saved.length}/{MAX})</span></h2>
     <div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>setRefreshTick(x=>x+1)} disabled={loading||!saved.length} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3 text-sm font-bold text-blue-700 disabled:opacity-40"><Glyph name="refresh" size={16}/> อัปเดต</button>
      <button type="button" onClick={clear} disabled={!saved.length} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 text-sm font-bold text-red-700 disabled:opacity-40"><Glyph name="trash" size={16}/> ล้างทั้งหมด</button>
     </div>
    </div>
    {loading&&<p role="status" className="rounded-xl bg-white p-5 text-slate-600">กำลังตรวจผลแข่งขันล่าสุด...</p>}
    {!loading&&saved.length===0&&<div className="rounded-2xl border-2 border-dashed border-blue-200 bg-white px-5 py-10 text-center">
     <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Glyph name="fans" size={31}/></span>
     <p className="mt-3 text-lg font-extrabold">ยังไม่มีนักกีฬาที่ติดตาม</p><p className="mt-1 text-sm text-slate-600">ค้นหาด้านบนแล้วกด “+ ติดตาม” เพื่อเพิ่มนักกีฬาของคุณ</p>
    </div>}
    {!loading&&!error&&saved.length>list.length&&saved.filter(id=>!athletes.some(a=>a.id===id)).map(id=><div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><span>นักกีฬารายนี้ไม่เปิดเผยข้อมูลสาธารณะแล้ว</span><button type="button" onClick={()=>remove(id)} className="min-h-11 rounded-lg border border-red-300 px-4 font-bold text-red-700">ลบออก</button></div>)}
    <div className="grid gap-2">{!loading&&visible.map(a=>{
      const rounds=grouped.get(a.id)||[];
      const latest=rounds[0];
      const result=latest?resultLabel(latest,a.id):null;
      return <article key={a.id} className="overflow-hidden rounded-xl border border-[#dae5f4] bg-white shadow-sm">
       <div className="flex items-center gap-2.5 p-3">
        <div className="relative flex h-[72px] w-[64px] shrink-0 items-center justify-center rounded-xl border border-[#9abbe9] bg-gradient-to-br from-[#c6dfff] to-[#eaf3ff] text-2xl font-black text-[#164b9e]" aria-label="ยังไม่มีรูปสาธารณะ">
         {athleteLabel(a).charAt(0)}
         <div className="absolute -bottom-1 -right-1"><MedalMark/></div>
        </div>
        <div className="min-w-0 flex-1">
         <h3 className="truncate text-base font-black text-[#092d69] sm:text-lg">{athleteLabel(a)}</h3>
         <p className="truncate text-xs text-slate-500">{a.full_name}</p>
         <p className="text-xs text-blue-800">GO ID: {a.go_id}</p>
         <p className="mt-1 text-xs text-blue-700">{a.current_rank?"ระดับ "+a.current_rank:"ยังไม่ระบุระดับ"}{latest?" · รอบ "+latest.round:""}</p>
        </div>
        <div className="shrink-0 text-right">
         <span className={"inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold "+(result?result.color:"bg-blue-50 text-blue-700")}>
          {result?<>{result.icon} {result.text}</>:"ยังไม่มีผล"}
         </span>
         {latest&&<p className="mt-1 text-[10px] text-slate-500">ยืนยัน {new Date(latest.verified_at).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Bangkok"})} น.</p>}
        </div>
       </div>
       <details className="border-t border-blue-50 px-3">
        <summary className="cursor-pointer py-2 text-xs font-bold text-blue-700">ดูผลแข่งขัน ({rounds.length}) / จัดการติดตาม</summary>
        {rounds.length===0?<p className="pb-3 text-xs text-slate-500">ยังไม่มีผลที่ยืนยันและเปิดเผยต่อสาธารณะ</p>:
         <ul className="space-y-1 pb-2">{rounds.slice(0,5).map(m=>{const r=resultLabel(m,a.id);return <li key={m.id} className="flex justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs"><span>รอบ {m.round}</span><span className="font-bold">{r.text}</span></li>})}</ul>}
        <button type="button" onClick={()=>remove(a.id)} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700"><Glyph name="trash" size={16}/>เลิกติดตาม {athleteLabel(a)}</button>
       </details>
      </article>;
     })}</div>
    {!loading&&saved.length>0&&visible.length===0&&list.length>0&&<p className="rounded-xl bg-white p-5 text-sm text-slate-600">ไม่มีนักกีฬาตรงกับตัวกรองนี้</p>}
   </section>
   <p className="rounded-xl border border-blue-100 bg-[#e6f0fc] p-4 text-xs leading-relaxed text-slate-600">ข้อมูลผลบน GO FAN ไม่ใช่สถานะสดของกระดาน ระบบจะแสดงผลที่ผ่านการยืนยันเท่านั้น และไม่แสดงผลจำลองหรือภาพบุคคลที่ยังไม่ได้รับอนุญาต</p>
  </div>
  <BottomNav/>
 </main>;
}
