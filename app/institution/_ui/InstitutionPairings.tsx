"use client";

import {useEffect,useMemo,useState} from "react";
import PairingsBoard from "@/app/tournaments/[id]/_ui/PairingsBoard";
import type {FanData} from "@/lib/go-fan-data";
import {scopeFanData,type InstitutionFanScope} from "@/lib/institution-fan";
import {divisionLabel} from "@/lib/division-display";
import {roundsOf} from "@/lib/competition-day.mjs";
import {fanName} from "@/lib/go-fan.mjs";
import PairingsPlaceholder from "./PairingsPlaceholder";
import {Empty,selectCls} from "./bits";
import "@/app/competition/competition.css";

/** Same published board as the public division page; only visible tables are scoped. */
export default function InstitutionPairings({initial,scope,sample=false}:{initial:FanData;scope:InstitutionFanScope;sample?:boolean}) {
 const [data,setData]=useState(initial);
 const [eventId,setEventId]=useState(initial.event?.id??"");
 const [divisionId,setDivisionId]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
   if(!eventId)return;
   const abort=new AbortController();let busy=false;
   async function refresh(){
     if(busy||document.visibilityState!=="visible")return;busy=true;
     setLoading(true);
     try{
       const response=await fetch(`/api/go-fan?event=${encodeURIComponent(eventId)}`,{cache:"no-store",signal:abort.signal});
       const fresh=await response.json() as FanData;
       if(!response.ok||fresh.error)throw new Error();
       if(!abort.signal.aborted){setData(fresh);setError("");}
     }catch{if(!abort.signal.aborted)setError("โหลดข้อมูลจับคู่สาธารณะไม่สำเร็จ กรุณาลองใหม่");}
     finally{busy=false;if(!abort.signal.aborted)setLoading(false);}
   }
   void refresh();
   const timer=window.setInterval(()=>void refresh(),15000);
   const wake=()=>{if(document.visibilityState==="visible")void refresh();};
   window.addEventListener("focus",wake);window.addEventListener("online",wake);document.addEventListener("visibilitychange",wake);
   return()=>{abort.abort();window.clearInterval(timer);window.removeEventListener("focus",wake);window.removeEventListener("online",wake);document.removeEventListener("visibilitychange",wake);};
 },[eventId,retry]);
 const scoped=useMemo(()=>scopeFanData(data,scope),[data,scope]);
 const memberIds=useMemo(()=>[...new Set([...scope.students.map(s=>s.id),...scoped.participants.flatMap(p=>p.athleteId?[p.athleteId]:[])])],[scope.students,scoped.participants]);
 const members=new Set(memberIds);
 const divisions=data.divisions.filter(d=>scoped.participants.some(p=>p.divisionId===d.division.id)||d.matches.some(m=>members.has(m.black_athlete_id)||members.has(m.white_athlete_id))||d.byes.some(b=>members.has(b.athlete_id)));
 const visible=divisionId?divisions.filter(d=>d.division.id===divisionId):divisions;
 const current=data.event?.id===eventId;
 return <div className="competition-page cd-dashboard space-y-4">
   <p className="rounded-xl border-2 border-[#d5ad42] bg-white p-4 text-sm text-[#164779]">คู่แข่งขันจากหน้าจับคู่สาธารณะ · แสดงเฉพาะโต๊ะที่มีนักกีฬา {scope.name} · อัปเดตทุก 15 วินาที</p>
   {sample&&<p className="rounded-xl bg-[#fff4cf] p-3 text-sm">หน้านี้เป็นตัวอย่างสถาบัน รายชื่อสมมติจะไม่ถูกนำไปแทนที่นักกีฬาจริงหรือสร้างผลจับคู่</p>}
   <div className="flex flex-wrap gap-3 rounded-xl border-2 border-[#b5cdec] bg-white p-3">
     <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold">รายการแข่งขัน<select className={`${selectCls} w-full min-w-0 max-w-full`} value={eventId} onChange={e=>{setEventId(e.target.value);setDivisionId("");}}>{data.events.map(e=><option value={e.id} key={e.id}>{e.title}</option>)}</select></label>
     <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold">รุ่นแข่งขัน<select className={`${selectCls} w-full min-w-0 max-w-full`} value={divisionId} onChange={e=>setDivisionId(e.target.value)} disabled={!current}><option value="">ทุกรุ่นที่มีนักกีฬาในสังกัด</option>{divisions.map(d=><option value={d.division.id} key={d.division.id}>{divisionLabel(d.division.name)}</option>)}</select></label>
   </div>
   {error&&<p role="alert" className="rounded-xl border border-[#d5ad42] bg-white p-3">{error}<button type="button" className="ml-3 min-h-11 rounded-lg border px-3" onClick={()=>setRetry(n=>n+1)}>ลองใหม่</button></p>}
   {!current?<p role="status">{loading?"กำลังโหลดรายการแข่งขัน…":"รอโหลดข้อมูลรายการแข่งขันที่เลือก"}</p>:<>
     <p className="text-sm text-[#496989]">{data.event?.title} · {sample?"รายชื่อสำหรับโครงสร้างตัวอย่าง":"นักกีฬาในสังกัดที่มีรายชื่อ"} {sample?scope.students.length:new Set(scoped.participants.map(p=>p.athleteId??fanName(p.name))).size} คน · {divisions.length} รุ่น · ตรวจข้อมูล {new Date(data.checkedAt).toLocaleTimeString("th-TH",{timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit"})} น.</p>
     {visible.map(d=><section key={`${eventId}:${d.division.id}`} className="rounded-2xl border-2 border-[#2264bf] bg-white p-3 sm:p-5">
       <h2 className="text-xl font-bold text-[#1550ad]">{divisionLabel(d.division.name)}</h2>
       {!d.available&&<Empty>ยังโหลดข้อมูลจับคู่ของรุ่นนี้ไม่ได้ · แสดงโครงสร้างรอไว้และระบบจะลองใหม่อัตโนมัติ</Empty>}
       {d.available&&(d.matches.some(m=>m.state!=="void"&&(members.has(m.black_athlete_id)||members.has(m.white_athlete_id)))||d.byes.some(b=>members.has(b.athlete_id)))?<PairingsBoard matches={d.matches.filter(m=>m.state!=="void")} byes={d.byes} people={Object.fromEntries(d.people)} tournamentId={eventId} divisionId={d.division.id} eventTitle={`${data.event?.title??""} · ${scope.name}`} divisionName={divisionLabel(d.division.name)} visibleAthleteIds={memberIds} readOnly/>:<PairingsPlaceholder eventTitle={data.event?.title??"รอข้อมูลรายการแข่งขัน"} institution={scope.name} divisionName={divisionLabel(d.division.name)} rounds={roundsOf(d.division)} roster={scoped.participants.filter(p=>p.divisionId===d.division.id).map(p=>({name:p.name,photo:p.photo}))}/>}
     </section>)}
     {!visible.length&&<PairingsPlaceholder key={eventId} eventTitle={data.event?.title??"รอข้อมูลรายการแข่งขัน"} institution={scope.name} roster={scope.students.map(s=>({name:s.name}))}/>}
   </>}
 </div>;
}
