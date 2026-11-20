"use client";
import {useCallback,useEffect,useState} from "react";
import {staffDb} from "@/app/organizer/_lib/staff";
import {DisplayModeToggle,useInstitutionDisplayMode} from "./DisplayMode";
type Teacher={name:string;role:string};
type Request={user_id:string;name:string;role:string;created_at:string};
type TeacherLink={user_id:string;name:string;students:{id:string;name:string}[]};
export function AcademyStaff({academyId,students=[]}:{academyId:string;students?:{id:string;name:string}[]}){
 const [mode,setMode]=useInstitutionDisplayMode("teachers");
 const [data,setData]=useState<{can_add:boolean;staff:Teacher[]}|null>(null);
 const [requests,setRequests]=useState<Request[]>([]);
 const [teacherLinks,setTeacherLinks]=useState<TeacherLink[]>([]);
 const [teacherChoice,setTeacherChoice]=useState("");
 const [studentChoice,setStudentChoice]=useState("");
 const [email,setEmail]=useState("");
 const [msg,setMsg]=useState("");
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
   const db=staffDb();if(!db)return;
   const [roster,pending,links]=await Promise.all([db.rpc("gt_academy_roster_v2",{p_academy:academyId}),db.rpc("gt_academy_pending_staff_v3",{p_academy:academyId}),db.rpc("gt_academy_teacher_roster_links_v1",{p_academy:academyId})]);
   if(!links.error&&links.data?.ok)setTeacherLinks(links.data.teachers??[]);
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
   </div>)}</div>}
   <div className="space-y-3 rounded-xl border-[3px] border-[#b8d0e9] bg-[#f8fbff] p-4">
     <h3 className="text-lg font-black text-[#0d3975]">ครูและนักเรียนที่ดูแล</h3>
     <p className="text-sm text-[#53708f]">นักเรียนหนึ่งคนเชื่อมกับครูหลายคนได้ โดยไม่ต้องย้ายชื่อสถาบันหรือโรงเรียนที่ลงแข่งขัน</p>
     <div className="grid gap-2 sm:grid-cols-2">
       {teacherLinks.map(t=><div key={t.user_id} className="rounded-xl border-2 border-[#c6d7ec] bg-white p-3"><b>{t.name}</b><p className="mt-1 text-sm text-[#557293]">{t.students.length?t.students.map(a=>a.name).join(" · "):"ยังไม่ได้เชื่อมนักเรียนรายบุคคล"}</p></div>)}
     </div>
     {data?.can_add&&students.length>0&&teacherLinks.length>0&&<form onSubmit={async e=>{
       e.preventDefault();if(busy||!teacherChoice||!studentChoice)return;
       setBusy(true);setMsg("");
       const db=staffDb();if(!db){setBusy(false);return;}
       const {data:result,error}=await db.rpc("gt_academy_assign_teacher_athletes_v1",{p_academy:academyId,p_teacher:teacherChoice,p_athletes:[studentChoice]});
       setBusy(false);setMsg(error||!result?.ok?"ผูกครูกับนักเรียนไม่สำเร็จ":"เชื่อมครูกับนักเรียนแล้ว นักกีฬาจะปรากฏในระบบติดตามของครู");
       if(!error&&result?.ok){setStudentChoice("");await load();}
     }} className="flex flex-col gap-2 sm:flex-row">
       <select aria-label="เลือกครู" required value={teacherChoice} onChange={e=>setTeacherChoice(e.target.value)} className="min-h-12 flex-1 rounded-xl border-2 border-[#bed3eb] bg-white px-3"><option value="">เลือกครู</option>{teacherLinks.map(t=><option key={t.user_id} value={t.user_id}>{t.name}</option>)}</select>
       <select aria-label="เลือกนักเรียน" required value={studentChoice} onChange={e=>setStudentChoice(e.target.value)} className="min-h-12 flex-1 rounded-xl border-2 border-[#bed3eb] bg-white px-3"><option value="">เลือกนักเรียน</option>{students.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
       <button disabled={busy||!studentChoice||!teacherChoice} className="min-h-12 rounded-xl border-2 border-[#e0b453] bg-[#0b60bd] px-4 font-bold text-white disabled:opacity-50">เชื่อมรายชื่อ</button>
     </form>}
   </div>
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
export function LinkStudents({academyId,reload,workspaceType="academy"}:{academyId:string;reload:()=>Promise<void>;workspaceType?:"academy"|"independent_coach"}){
 const [q,setQ]=useState("");
 const [rows,setRows]=useState<{id:string;full_name:string;go_id:string;current_rank:string}[]>([]);
 const [selected,setSelected]=useState<string[]>([]);
 const [myStudents,setMyStudents]=useState<{id:string;name:string;go_id:string;rank:string}[]>([]);
 const [msg,setMsg]=useState("");
 const [busy,setBusy]=useState(false);
 const [lookupDone,setLookupDone]=useState(false);
 const refreshMine=useCallback(async()=>{
   const db=staffDb();if(!db)return;
   const {data}=await db.rpc("gt_teacher_my_students_v1",{p_academy:academyId});
   if(data?.ok)setMyStudents(data.items??[]);
 },[academyId]);
 useEffect(()=>{void refreshMine();},[refreshMine]);
 const search=async(e:React.FormEvent)=>{
   e.preventDefault();if(busy)return;
   const db=staffDb();if(!db)return;
   setBusy(true);setMsg("");setLookupDone(true);
   const {data,error}=await db.rpc("gt_academy_search_students_v2",{p_academy:academyId,p_query:q.trim()});
   setBusy(false);setRows(!error&&Array.isArray(data)?data:[]);
   if(error)setMsg("ค้นหาไม่สำเร็จ กรุณาลองใหม่");
 };
 const link=async(kind:"academy"|"teacher")=>{
   if(busy||!selected.length)return;
   const db=staffDb();if(!db)return;
   setBusy(true);setMsg("");
   const {data,error}=kind==="academy"
      ?await db.rpc("gt_academy_link_students_v2",{p_academy:academyId,p_athletes:selected})
      :await db.rpc("gt_teacher_link_students_v1",{p_academy:academyId,p_athletes:selected});
   setBusy(false);
   if(error||!data?.ok){setMsg("เพิ่มรายชื่อไม่สำเร็จ กรุณาตรวจสอบสิทธิ์แล้วลองอีกครั้ง");return;}
   setMsg(kind==="teacher"?"เชื่อมนักเรียนกับบัญชีครูของคุณแล้ว · รายการแข่งขันของนักเรียนจะปรากฏในหน้าติดตามผล":"เพิ่มรายชื่อเข้าสถาบันแล้ว · ไม่ได้เปลี่ยนสังกัดในรายการแข่งขัน");
   setSelected([]);await Promise.all([reload(),refreshMine()]);
 };
 return <section className="space-y-4 rounded-[22px] border-[3px] border-[#b7cde9] bg-white p-4 shadow-sm sm:p-5">
   <div>
     <h3 className="text-xl font-black text-[#0d3974]">ค้นหาและเพิ่มนักเรียนที่มีประวัติอยู่แล้ว</h3>
     <p className="mt-1 text-sm text-[#4b6688]">{workspaceType==="independent_coach"
        ?"ครูอิสระเลือกนักเรียนของตนเองได้ ไม่ต้องสร้างสถาบันหรือเปลี่ยนโรงเรียนที่ลงแข่ง"
        :"นักเรียนที่ลงแข่งในชื่อโรงเรียนหรือสังกัดอื่นก็เพิ่มได้ นักเรียนหนึ่งคนอยู่กับหลายสถาบันและมีหลายครูได้"}</p>
   </div>
   <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
      <input className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-[#acc9e8] bg-white px-3" required minLength={2} placeholder="พิมพ์ชื่อ-นามสกุล หรือรหัส GO" value={q} onChange={e=>{setQ(e.target.value);setLookupDone(false);}}/>
      <button disabled={busy||q.trim().length<2} className="min-h-12 rounded-xl border-2 border-[#e5b454] bg-[#095cbb] px-6 font-bold text-white disabled:opacity-60">ค้นหา</button>
   </form>
   <div className="max-h-80 space-y-1 overflow-auto">
     {rows.map(a=><label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-[#d7e4f2] p-3 hover:border-[#e5b454]" key={a.id}>
       <input className="h-5 w-5 accent-[#105fbe]" type="checkbox" checked={selected.includes(a.id)} onChange={e=>setSelected(e.target.checked?[...selected,a.id]:selected.filter(id=>id!==a.id))}/>
       <span><b>{a.full_name}</b><small className="block text-[#5f7999]">{a.go_id} · {a.current_rank}</small></span>
     </label>)}
     {lookupDone&&!busy&&!rows.length&&<p className="rounded-xl bg-[#eff5fd] p-4 text-sm text-[#59738e]">ไม่พบชื่อที่ค้นหา กรุณาตรวจตัวสะกดหรือรหัส GO</p>}
   </div>
   <div className="flex flex-wrap gap-2">
     {workspaceType==="academy"&&<button type="button" disabled={busy||!selected.length} onClick={()=>void link("academy")} className="min-h-12 flex-1 rounded-xl border-2 border-[#e1b14a] bg-[#075cba] px-4 font-bold text-white disabled:opacity-50">เพิ่มเข้าสถาบัน ({selected.length})</button>}
     <button type="button" disabled={busy||!selected.length} onClick={()=>void link("teacher")} className="min-h-12 flex-1 rounded-xl border-2 border-[#c3d6ed] bg-[#f0f6ff] px-4 font-bold text-[#0b4f9d] disabled:opacity-50">เพิ่มเป็นนักเรียนที่ฉันสอน ({selected.length})</button>
   </div>
   <p className="text-xs text-[#536d8e]">เชื่อมกับโปรไฟล์นักกีฬาเดิม ไม่สร้างประวัติซ้ำ และไม่เปลี่ยนชื่อสังกัดที่ใช้สมัครแข่งขัน</p>
   <div className="rounded-xl border-2 border-[#d6e3f2] bg-[#f8fbff] p-3">
     <h4 className="font-bold text-[#16457e]">นักเรียนที่ฉันสอน ({myStudents.length})</h4>
     {myStudents.length?<div className="mt-2 flex flex-wrap gap-2">{myStudents.map(a=><span key={a.id} className="rounded-lg border border-[#b9d2ed] bg-white px-3 py-1.5 text-sm">{a.name} · {a.rank??a.go_id}</span>)}</div>:<p className="mt-1 text-sm text-[#607a97]">ยังไม่มีรายชื่อ เชื่อมนักเรียนจากช่องค้นหาด้านบนได้เลย</p>}
   </div>
   {msg&&<p role="status" className="rounded-xl border border-[#d3bc77] bg-[#fff8e9] p-3 text-sm text-[#75551c]">{msg}</p>}
 </section>;
}