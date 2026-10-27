"use client";
import Link from "next/link";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {SiteSectionBanner} from "../components/SiteSectionBanner";
type Athlete={id:string;go_id:string;full_name:string;nickname:string|null;current_rank:string|null};
type Match={id:string;tournament_id:string;round:number;black_id:string;white_id:string;winner_id:string|null;double_forfeit:boolean;verified_at:string};
type WatchResult={status:string;athletes?:Athlete[];results?:Match[];message?:string};
const KEY="gt-go-fan-following-v1",MAX=20;
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function GoFan(){
 const [saved,setSaved]=useState<string[]>([]);
 const [hydrated,setHydrated]=useState(false),[query,setQuery]=useState("");
 const [searching,setSearching]=useState(false),[loading,setLoading]=useState(false);
 const [found,setFound]=useState<Athlete[]>([]),[athletes,setAthletes]=useState<Athlete[]>([]);
 const [matches,setMatches]=useState<Match[]>([]),[notice,setNotice]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{try{const ids:unknown=JSON.parse(localStorage.getItem(KEY)||"[]");
   if(Array.isArray(ids))setSaved([...new Set(ids.filter((x):x is string=>typeof x==="string"&&idPattern.test(x)))].slice(0,MAX));
  }catch{localStorage.removeItem(KEY)}setHydrated(true)},[]);
 useEffect(()=>{if(hydrated)localStorage.setItem(KEY,JSON.stringify(saved))},[saved,hydrated]);
 useEffect(()=>{if(!hydrated)return;let live=true;const ctrl=new AbortController();
  async function load(){setLoading(true);setError("");
   if(saved.length===0){setAthletes([]);setMatches([]);setLoading(false);return}
   try{
    const r=await fetch("/api/fan?mode=watch&ids="+encodeURIComponent(saved.join(",")),{cache:"no-store",signal:ctrl.signal});
    const d:WatchResult=await r.json();
    if(!r.ok||d.status!=="ok"||!Array.isArray(d.athletes)||!Array.isArray(d.results))throw Error(d.message||"โหลดผลการแข่งขันไม่ได้");
    if(live){setAthletes(d.athletes);setMatches(d.results)}
   }catch(e){if(live&&!ctrl.signal.aborted){setError(e instanceof Error?e.message:"ไม่สามารถโหลดผลได้");setAthletes([]);setMatches([])}}finally{if(live)setLoading(false)}
  }void load();return()=>{live=false;ctrl.abort()};},[saved,hydrated]);
 async function search(e:FormEvent){e.preventDefault();const q=query.trim();if(q.length<2)return;setSearching(true);setNotice("");setError("");setFound([]);
  try{const r=await fetch("/api/fan?mode=search&q="+encodeURIComponent(q),{cache:"no-store"});const d:WatchResult=await r.json();
   if(!r.ok||d.status!=="ok"||!Array.isArray(d.athletes))throw Error(d.message||"ค้นหาไม่ได้");
   setFound(d.athletes);if(!d.athletes.length)setNotice("ไม่พบนักกีฬาที่อนุญาตให้แสดงโปรไฟล์สาธารณะ");
  }catch(e){setError(e instanceof Error?e.message:"ค้นหาไม่ได้")}finally{setSearching(false)}
 }
 function add(a:Athlete){if(saved.includes(a.id))return;if(saved.length>=MAX){setError("ติดตามได้สูงสุด 20 คน");return}setSaved(s=>[...s,a.id]);setNotice("เพิ่ม "+a.full_name+" เข้ากองเชียร์แล้ว")}
 function remove(id:string){setSaved(s=>s.filter(x=>x!==id));setNotice("ลบออกจากรายการติดตามแล้ว")}
 function clear(){if(!window.confirm("ล้างรายชื่อนักกีฬาที่ติดตามทั้งหมดในอุปกรณ์นี้?"))return;setSaved([]);setNotice("ล้างรายการติดตามทั้งหมดแล้ว")}
 const list=useMemo(()=>saved.map(id=>athletes.find(a=>a.id===id)).filter((x):x is Athlete=>Boolean(x)),[saved,athletes]);
 const grouped=useMemo(()=>new Map(list.map(a=>[a.id,matches.filter(m=>m.black_id===a.id||m.white_id===a.id)])),[list,matches]);
 function outcome(m:Match,id:string){if(m.double_forfeit)return "แพ้ทั้งคู่ (ไม่มีผู้ชนะ)";if(!m.winner_id)return "ยังไม่ระบุ";return m.winner_id===id?"ชนะ":"แพ้"}
 return <main className="min-h-screen bg-[#eff5fc] text-[#10315e]">
  <header className="bg-[#092b61] px-5 py-4 text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><Link href="/" className="font-bold text-amber-200">‹ GO TOURNAMENT</Link><Link href="/site-map" className="rounded-lg border border-white/50 px-4 py-2 text-sm font-bold">เมนูทั้งหมด</Link></div></header>
  <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
   <SiteSectionBanner slot="fan" title="GO FAN — กองเชียร์ของฉัน" eyebrow="CHEER & FOLLOW" description="เลือกติดตามนักกีฬาหลายคนในหน้าเดียว ไม่ต้องล็อกอิน และแสดงเฉพาะผลแข่งขันที่ยืนยันแล้ว"/>
   <div className="rounded-xl border border-blue-200 bg-white p-4 text-sm leading-relaxed text-slate-700">รายการที่ติดตามเก็บเฉพาะในเบราว์เซอร์ของอุปกรณ์นี้ ไม่เชื่อมข้ามเครื่อง ผลที่แสดงมีเฉพาะนักกีฬาที่ยินยอมเปิดโปรไฟล์สาธารณะและผลที่ผ่านการยืนยันแล้ว</div>
   <section className="rounded-2xl bg-white p-5 shadow-sm">
    <h2 className="text-xl font-black">เพิ่มนักกีฬาที่ติดตาม</h2>
    <form onSubmit={search} className="mt-4 flex flex-col gap-3 sm:flex-row">
     <label className="flex-1 font-semibold">ค้นหาจากชื่อ หรือ GO ID <input value={query} onChange={e=>setQuery(e.target.value)} minLength={2} maxLength={70} required placeholder="พิมพ์ชื่อเต็ม หรือ GO ID" className="mt-2 min-h-12 w-full rounded-xl border border-blue-200 p-3"/></label>
     <button disabled={searching||query.trim().length<2} className="min-h-12 self-end rounded-xl bg-blue-800 px-6 py-3 font-black text-white disabled:opacity-50">{searching?"กำลังค้นหา...":"ค้นหานักกีฬา"}</button>
    </form>
    {found.length>0&&<div className="mt-4 grid gap-2 sm:grid-cols-2">{found.map(a=><div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border p-3"><div><p className="font-bold">{a.full_name}</p><p className="text-xs text-slate-600">GO ID: {a.go_id} {a.current_rank?"· "+a.current_rank:""}</p></div><button type="button" onClick={()=>add(a)} disabled={saved.includes(a.id)||saved.length>=MAX} className="min-h-11 rounded-xl bg-[#0a55bd] px-4 font-bold text-white disabled:bg-slate-300 disabled:text-slate-600">{saved.includes(a.id)?"ติดตามแล้ว":"+ ติดตาม"}</button></div>)}</div>}
   </section>
   {notice&&<p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 font-semibold">{notice}</p>}
   {error&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>}
   <section className="rounded-2xl bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">นักกีฬาที่ติดตาม ({saved.length}/{MAX})</h2><button type="button" onClick={clear} disabled={!saved.length} className="min-h-11 rounded-xl border border-red-300 px-4 py-2 font-bold text-red-700 disabled:opacity-40">ล้างทั้งหมด</button></div>
    {loading&&<p role="status" className="mt-4">กำลังโหลดผลการแข่งขัน...</p>}
    {!loading&&!saved.length&&<p className="mt-4 rounded-xl border border-dashed p-6 text-center text-slate-600">ยังไม่มีนักกีฬาที่ติดตาม ค้นหาแล้วกด + ติดตาม ได้เลยค่ะ</p>}
    {!loading&&saved.length>list.length&&<p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">นักกีฬาบางคนไม่สามารถแสดงข้อมูลสาธารณะได้แล้ว คุณสามารถลบรายชื่อนั้นออกได้โดยกดล้างทั้งหมด</p>}
    <div className="mt-4 grid gap-4 lg:grid-cols-2">{list.map(a=>{
     const rounds=grouped.get(a.id)||[];const wins=rounds.filter(m=>m.winner_id===a.id).length;const defeats=rounds.filter(m=>m.winner_id!==a.id).length;
     return <article key={a.id} className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">{a.full_name}</h3><p className="text-sm text-slate-600">GO ID: {a.go_id}{a.current_rank?" · "+a.current_rank:""}</p></div><button type="button" onClick={()=>remove(a.id)} className="min-h-11 rounded-xl border border-red-200 bg-white px-3 font-bold text-red-700">ลบ</button></div>
      <p className="mt-3 text-sm font-bold">ผลที่ยืนยันแล้ว {rounds.length} กระดาน · ชนะ {wins} · แพ้ {defeats}</p>
      {rounds.length===0?<p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-500">ยังไม่มีผลแข่งขันที่ยืนยันและเผยแพร่</p>:
       <ul className="mt-3 space-y-2">{rounds.slice(0,15).map(m=><li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm"><span>รอบ {m.round}</span><strong>{outcome(m,a.id)}</strong></li>)}</ul>}
     </article>})}</div>
   </section>
  </div>
 </main>;
}
