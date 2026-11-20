"use client";
import {useCallback,useEffect,useState} from "react";
import {staffDb} from "@/app/organizer/_lib/staff";
import {DisplayModeToggle,useInstitutionDisplayMode} from "./DisplayMode";
type Teacher={name:string;role:string};
type Request={user_id:string;name:string;role:string;created_at:string};
export function AcademyStaff({academyId}:{academyId:string}){
 const [mode,setMode]=useInstitutionDisplayMode("teachers");
 const [data,setData]=useState<{can_add:boolean;staff:Teacher[]}|null>(null);
 const [requests,setRequests]=useState<Request[]>([]);
 const [email,setEmail]=useState("");
 const [msg,setMsg]=useState("");
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
   const db=staffDb();if(!db)return;
   const [roster,pending]=await Promise.all([db.rpc("gt_academy_roster_v2",{p_academy:academyId}),db.rpc("gt_academy_pending_staff_v3",{p_academy:academyId})]);
   if(!roster.error&&roster.data)setData(roster.data);
   if(!pending.error&&pending.data?.ok)setRequests(pending.data.items??[]);
 },[academyId]);
 useEffect(()=>{void load();},[load]);
 async function decide(user_id:string,approve:boolean){
   const db=staffDb();if(!db)return;
   setBusy(true);setMsg("");
   const {data,error}=await db.rpc("gt_academy_review_staff_v3",{p_academy:academyId,p_user:user_id,p_approve:approve});
   setBusy(false);
   setMsg(error||!data?.ok?"ทำรายการไม่สำเร็จ":approve?"อนุมัติครูเรียบร้อยแล้ว":"ปฏิเสธคำขอแล้ว");
   await load();
 }
 return <section className="gt-card space-y-4 border-2 border-[#b7cde9] p-4 sm:p-5">
   <h2 className="text-lg font-bold">จัดการครูของสถาบัน</h2>
   <p className="text-sm text-[#4d6382]">เจ้าของสถาบันจัดการเองได้ ไม่ต้องรอแอดมินเว็บไซต์</p>
   {requests.length>0&&<div className="space-y-2 rounded-xl border-2 border-[#f0cd79] bg-[#fffaf0] p-3">
    <h3 className="font-bold">คำขอเข้าร่วมสถาบัน ({requests.length})</h3>
    {requests.map(item=><div key={item.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e8d8b1] bg-white p-3">
     <div><strong>{item.name}</strong><p className="text-xs">ขอเป็น {item.role==="manager"?"ผู้ดูแล (อนุมัติเป็นครูก่อน)":"ครู"}</p></div>
     <div className="flex gap-2"><button disabled={busy} type="button" className="min-h-11 rounded-lg bg-[#0d65c6] px-4 font-semibold text-white disabled:opacity-60" onClick={()=>void decide(item.user_id,true)}>อนุมัติ</button><button disabled={busy} type="button" className="min-h-11 rounded-lg border border-[#a3b9d5] px-3 disabled:opacity-60" onClick={()=>void decide(item.user_id,false)}>ปฏิเสธ</button></div>
    </div>)}
   </div>}
   <div className="flex justify-end"><DisplayModeToggle mode={mode} onChange={setMode}/></div>
   {mode==="table" ? <div className="overflow-x-auto rounded-xl border border-[#b5d0f0]"><table className="w-full text-left text-sm"><thead className="bg-[#e8f2ff]"><tr><th className="px-4 py-3">ชื่อครู / ผู้ดูแล</th><th className="px-4 py-3">สิทธิ์</th></tr></thead><tbody className="divide-y divide-[#d9e6f6]">{data?.staff?.map((person,i)=><tr key={i}><td className="px-4 py-3 font-semibold">{person.name}</td><td className="px-4 py-3">{person.role==="manager"?"เจ้าของ / ผู้ดูแล":"ครูผู้สอน"}</td></tr>)}</tbody></table></div> : <div className="grid gap-2 sm:grid-cols-2">{data?.staff?.map((teacher,i)=><div className="rounded-xl border border-[#b5d0f0] bg-[#f1f7ff] p-3" key={i}>
    <p className="font-semibold">{teacher.name}</p><p className="text-xs text-[#4e6382]">{teacher.role==="manager"?"เจ้าของ / ผู้ดูแล":"ครูผู้สอน"}</p>
   </div>)}</div>
   {data?.can_add&&<form className="flex flex-wrap gap-2" onSubmit={async e=>{
     e.preventDefault();if(busy)return;const db=staffDb();if(!db)return;
     setBusy(true);setMsg("");
     const {data:result,error}=await db.rpc("gt_academy_add_teacher_v2",{p_academy:academyId,p_email:email.trim()});
     setBusy(false);
     setMsg(error||!result?.ok?"เพิ่มไม่ได้ กรุณาให้ครูสมัครบัญชีของตัวเองก่อน":"เพิ่มครูเรียบร้อยแล้ว");
     if(!error&&result?.ok){setEmail("");await load();}
   }}>
    <input required type="email" aria-label="อีเมลครู" className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#a7c2e6] px-3" placeholder="อีเมลครูที่มีบัญชีแล้ว" value={email} onChange={e=>setEmail(e.target.value)}/>
    <button disabled={busy} className="gt-cta-btn min-h-12 px-5 disabled:opacity-60">เพิ่มครู</button>
   </form>}
   {msg&&<p role="status" className="rounded-xl bg-[#edf6ff] p-3 text-sm">{msg}</p>}
 </section>;
}
export function LinkStudents({academyId,reload}:{academyId:string;reload:()=>Promise<void>}){const [q,setQ]=useState(''),[rows,setRows]=useState<{id:string;full_name:string;go_id:string;current_rank:string}[]>([]),[selected,setSelected]=useState<string[]>([]),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);return <section className="gt-card space-y-4 p-5"><h3 className="text-xl font-bold">ค้นหาและติ๊กเพิ่มนักเรียนเดิม</h3><form className="flex gap-2" onSubmit={async e=>{e.preventDefault();setBusy(true);const r=await staffDb()!.rpc('gt_academy_search_students_v2',{p_academy:academyId,p_query:q});setBusy(false);setRows(r.data||[]);setMsg(r.error?'ค้นหาไม่สำเร็จ':!r.data?.length?'ไม่พบรายชื่อ':'');}}><input className="min-h-12 min-w-0 flex-1 border px-3" required minLength={2} placeholder="ชื่อ / รหัสนักกีฬา" value={q} onChange={e=>setQ(e.target.value)}/><button disabled={busy} className="gt-outline-btn min-h-12 px-4">ค้นหา</button></form><div className="max-h-80 overflow-auto">{rows.map(a=><label className="flex min-h-14 items-center gap-3 border-b p-2" key={a.id}><input type="checkbox" checked={selected.includes(a.id)} onChange={e=>setSelected(e.target.checked?[...selected,a.id]:selected.filter(id=>id!==a.id))}/><span><b>{a.full_name}</b><small className="block">{a.go_id} · {a.current_rank}</small></span></label>)}</div><button disabled={busy||!selected.length} className="gt-cta-btn min-h-12 px-5 disabled:opacity-50" onClick={async()=>{setBusy(true);const r=await staffDb()!.rpc('gt_academy_link_students_v2',{p_academy:academyId,p_athletes:selected});setBusy(false);setMsg(r.error?'เพิ่มรายชื่อไม่สำเร็จ':`เพิ่มนักเรียน ${selected.length} คนแล้ว`);if(!r.error){setSelected([]);await reload();}}}>เพิ่มนักเรียน {selected.length} คน</button><p className="text-xs text-slate-600">เชื่อมกับโปรไฟล์เดิม ไม่สร้างประวัติซ้ำและไม่เปลี่ยนสถาบันในผลการแข่งขันเก่า</p>{msg&&<p role="status">{msg}</p>}</section>}
