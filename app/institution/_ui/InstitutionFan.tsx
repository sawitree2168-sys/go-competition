"use client";
import {useEffect,useMemo,useState} from "react";
import LiveBoard from "./LiveBoard";
import MenuIcon from "@/components/MenuIcon";
import GoFan from "@/app/go-fan/GoFan";
import type {FanData} from "@/lib/go-fan-data";
import type {Overview} from "./bits";
import "@/app/go-fan/go-fan.css";
import "./institution-theme.css";

export default function InstitutionFan({ov,onBack,sample=false}:{ov:Overview;onBack:()=>void;sample?:boolean}) {
 const [tab,setTab]=useState<"individual"|"academy">("individual");
 const [data,setData]=useState<FanData|null>(null);const [error,setError]=useState("");const [retry,setRetry]=useState(0);
 const eventId=useMemo(()=>[...ov.tracking,...ov.records.filter(r=>r.source!=="history")].sort((a,b)=>String(b.date??"").localeCompare(String(a.date??"")))[0]?.tournament_id??"",[ov.tracking,ov.records]);
 useEffect(()=>{const abort=new AbortController();let active=true;void(async()=>{setError("");try{const response=await fetch(`/api/go-fan${eventId?`?event=${encodeURIComponent(eventId)}`:""}`,{cache:"no-store",signal:abort.signal});const result=await response.json() as FanData;if(!response.ok||result.error)throw new Error(result.error||"โหลดข้อมูลไม่สำเร็จ");if(active)setData(result);}catch(e){if(active)setError(e instanceof Error?e.message:"โหลดข้อมูลไม่สำเร็จ");}})();return()=>{active=false;abort.abort();};},[eventId,retry]);
 const scope=useMemo(()=>({id:ov.academy.id,name:ov.academy.name,students:ov.students.map(s=>({id:s.id,name:s.name}))}),[ov.academy.id,ov.academy.name,ov.students]);
 return <div className="inst-fan-page"><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d5ad42] bg-white p-3"><button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-[#adc8e8] px-4 font-semibold text-[#124c99]">← กลับหน้าสถาบัน</button><strong>ติดตามการแข่งขัน · {ov.academy.name}</strong></div>
 <h1 className="mt-5 text-2xl font-bold text-[#1550ad] sm:text-3xl">ติดตามการแข่งขัน</h1>
 <nav className="gf-primary-tabs mt-4" aria-label="รูปแบบการติดตามการแข่งขัน">
 <button type="button" aria-current={tab==="individual"?"page":undefined} aria-controls="institution-individual-tracking" onClick={()=>setTab("individual")}><MenuIcon name="entrants"/><span>ติดตามรายบุคคล (GO FAN)<small>ค้นหาชื่อ ดูคู่แข่งขัน และผลรายรอบ</small></span></button>
 <button type="button" aria-current={tab==="academy"?"page":undefined} aria-controls="institution-academy-tracking" onClick={()=>setTab("academy")}><MenuIcon name="school"/><span>ติดตามนักกีฬาในสังกัด<small>ดูรอบ โต๊ะ คู่แข่งขัน และผลของทุกคน</small></span></button>
 </nav>
 <section id="institution-academy-tracking" aria-label="ติดตามนักกีฬาในสังกัด" hidden={tab!=="academy"} style={{display:tab==="academy"?"block":"none"}}><LiveBoard ov={ov}/></section>
 <section id="institution-individual-tracking" aria-label="ติดตามรายบุคคล" hidden={tab!=="individual"} style={{display:tab==="individual"?"block":"none",paddingTop:24}}>
 {sample&&<p className="rounded-xl bg-[#fff4cf] p-3 text-sm">โหมดตัวอย่างใช้รายชื่อสมมติ จึงไม่แสดงผลของนักกีฬาจริงแทนรายชื่อเหล่านี้ หน้าบัญชีสถาบันจะใช้รายชื่อในสังกัดจริง</p>}
 {error?<div role="alert" className="rounded-xl border border-[#d5ad42] bg-white p-5">{error}<button type="button" onClick={()=>setRetry(n=>n+1)} className="ml-3 rounded-lg border px-3 py-2">ลองใหม่</button></div>:data?<GoFan key={`${scope.id}:${scope.students.map(s=>`${s.id}:${s.name}`).sort().join('|')}`} initial={data} scope={scope} embedded/>:<p role="status" className="p-8 text-center">กำลังโหลดข้อมูลติดตามรายบุคคล…</p>}
 </section>
 </div>;
}
