"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Academy={id:string;name:string;status:string};
type Athlete={id:string;go_id:string;full_name:string;nickname:string|null;current_rank:string|null};
type Member={id:string;academy_id:string;athlete_id:string;membership_status:string;athlete:Athlete|null};
export default function AcademyRegistry(){
 const client=useRef<SupabaseClient|null>(null);
 const [ready,setReady]=useState(false),[signed,setSigned]=useState(false),[email,setEmail]=useState("");
 const [academies,setAcademies]=useState<Academy[]>([]),[selected,setSelected]=useState(""),[members,setMembers]=useState<Member[]>([]);
 const [name,setName]=useState(""),[goId,setGoId]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;let unsubscribe=()=>{};void(async()=>{try{
  const r=await fetch("/api/auth/public-config",{cache:"no-store"});const c=await r.json();if(!r.ok||c.status!=="ok")throw Error();
  const s=createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!active)return;client.current=s;
  const session=await s.auth.getSession();if(active){setSigned(Boolean(session.data.session));setReady(true)}
  const sub=s.auth.onAuthStateChange((_e,ss)=>{if(active)setSigned(Boolean(ss))});
  unsubscribe=()=>sub.data.subscription.unsubscribe();
 }catch{if(active){setReady(true);setMessage("ไม่สามารถเชื่อมระบบเข้าสู่ระบบได้")}}})();
 return()=>{active=false;unsubscribe()};},[]);
 async function api(path:string,method="GET",body?:unknown){
  const token=(await client.current?.auth.getSession())?.data.session?.access_token;if(!token)throw Error("กรุณาเข้าสู่ระบบใหม่");
  const r=await fetch(path,{method,headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
  const d=await r.json();if(!r.ok||d.status!=="ok")throw Error(d.message||"เกิดข้อผิดพลาด");
  return d;
 }
 async function loadAcademies(){setBusy(true);setMessage("");
  try{const data=await api("/api/admin/academies");setAcademies(data.academies)}
  catch(e){setMessage(e instanceof Error?e.message:"ไม่สามารถโหลดสถาบันได้")}finally{setBusy(false)}
 }
 useEffect(()=>{if(signed)void loadAcademies()},[signed]);
 async function loadMembers(id:string){if(!id)return;setBusy(true);setMessage("");
  try{const d=await api("/api/admin/academy-memberships?academy_id="+encodeURIComponent(id));setMembers(d.memberships)}
  catch(e){setMembers([]);setMessage(e instanceof Error?e.message:"ไม่สามารถโหลดรายชื่อสมาชิกได้")}finally{setBusy(false)}
 }
 async function login(e:FormEvent){e.preventDefault();if(!client.current)return;setBusy(true);
  const {error}=await client.current.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:window.location.href}});
  setMessage(error?"ส่งลิงก์เข้าสู่ระบบไม่สำเร็จ":"ส่งลิงก์เข้าสู่ระบบแล้ว กรุณาตรวจอีเมล");setBusy(false);
 }
 async function createAcademy(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");
  try{const d=await api("/api/admin/academies","POST",{name});setAcademies(prev=>[...prev,d.academy].sort((a,b)=>a.name.localeCompare(b.name,"th")));
   setSelected(d.academy.id);setMembers([]);setName("");setMessage("สร้างสถาบันแบบร่างแล้ว ยังไม่เปิดสิทธิ์ให้สถาบันเข้าถึงข้อมูล")}
  catch(e){setMessage(e instanceof Error?e.message:"บันทึกไม่สำเร็จ")}finally{setBusy(false)}
 }
 async function linkAthlete(e:FormEvent){e.preventDefault();if(!selected)return;setBusy(true);setMessage("");
  try{const d=await api("/api/admin/academy-memberships","POST",{academy_id:selected,go_id:goId});setGoId("");
   setMembers(prev=>[...prev,{...d.membership,athlete:d.athlete}]);setMessage("เพิ่มนักกีฬาเข้าแฟ้มสถาบันในสถานะ 'รอตรวจสอบ' แล้ว")}
  catch(e){setMessage(e instanceof Error?e.message:"เพิ่มสมาชิกไม่สำเร็จ")}finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[#eef3fa] text-[#0c2c5f]">
  <header className="bg-gradient-to-r from-[#081d3d] to-[#124c9b] p-5 text-white">
   <div className="mx-auto max-w-5xl"><Link href="/admin/tournaments" className="font-semibold text-[#f8d389]">‹ กลับศูนย์จัดการแข่งขัน</Link>
    <h1 className="mt-4 text-3xl font-black">จัดการสถาบันและนักกีฬา</h1><p className="mt-2 text-blue-100">ทะเบียนแบบร่าง • ยืนยัน GO ID • เตรียมสมัครแข่งขันแบบกลุ่ม</p>
   </div>
  </header>
  <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
   <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
    เฉพาะ Owner/Admin: เพิ่มนักกีฬาโดยอ้างอิง GO ID เดิมเท่านั้น ความสัมพันธ์กับสถาบันยังเป็นสถานะรอตรวจสอบจนกว่าจะยืนยันหลักฐาน ไม่มีการเปิดสิทธิ์ให้ครู/สถาบันโดยอัตโนมัติ
   </div>
   {!ready&&<p>กำลังตรวจสิทธิ์...</p>}
   {ready&&!signed&&<form onSubmit={login} className="space-y-3 rounded-2xl bg-white p-5">
    <h2 className="text-xl font-black">เข้าสู่ระบบผู้ดูแล</h2>
    <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="อีเมล Owner/Admin" className="w-full rounded-xl border p-4"/>
    <button disabled={busy} className="rounded-xl bg-blue-800 px-6 py-3 font-bold text-white">ส่งลิงก์เข้าสู่ระบบ</button>
   </form>}
   {message&&<p role="status" className="rounded-xl bg-white p-4">{message}</p>}
   {signed&&<>
    <section className="rounded-2xl bg-white p-5 shadow-sm">
     <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">สถาบันในทะเบียน ({academies.length})</h2><button disabled={busy} onClick={()=>void loadAcademies()} className="rounded-xl border px-4 py-3 font-bold">รีเฟรช</button></div>
     <label className="mt-4 block font-bold">เลือกสถาบัน
      <select value={selected} onChange={e=>{setSelected(e.target.value);setMembers([]);if(e.target.value)void loadMembers(e.target.value)}} className="mt-2 w-full rounded-xl border p-4">
       <option value="">— เลือกสถาบัน —</option>{academies.map(a=><option key={a.id} value={a.id}>{a.name} ({a.status})</option>)}
      </select>
     </label>
     <form onSubmit={createAcademy} className="mt-5 space-y-3 rounded-xl border bg-blue-50 p-4">
      <h3 className="font-black">เพิ่มสถาบันใหม่ (แบบร่าง)</h3>
      <input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อสถาบัน/โรงเรียน" className="w-full rounded-xl border bg-white p-4"/>
      <button disabled={busy} className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white">บันทึกสถาบันแบบร่าง</button>
     </form>
    </section>
    {selected&&<section className="rounded-2xl bg-white p-5 shadow-sm">
     <h2 className="text-xl font-black">นักกีฬาของสถาบันที่เลือก</h2><p className="mt-1 text-sm text-slate-600">เชื่อมเฉพาะ GO ID ที่มีอยู่แล้ว ไม่สร้างนักกีฬาคนใหม่</p>
     <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-blue-50 p-4"><p className="text-sm">รายการสมาชิกทั้งหมด</p><p className="text-3xl font-black">{members.length}</p></div>
      <div className="rounded-xl bg-amber-50 p-4"><p className="text-sm">รอตรวจสอบ</p><p className="text-3xl font-black">{members.filter(m=>m.membership_status==="pending").length}</p></div>
     </div>
     <form onSubmit={linkAthlete} className="mt-4 flex flex-wrap gap-2">
      <input required maxLength={40} value={goId} onChange={e=>setGoId(e.target.value)} placeholder="กรอก GO ID ของนักกีฬาเดิม" className="min-w-0 flex-1 rounded-xl border p-4"/>
      <button disabled={busy} className="rounded-xl bg-blue-800 px-4 py-3 font-bold text-white">เพิ่มแบบร่าง</button>
     </form>
     {members.length===0?<p className="mt-4 rounded-xl bg-slate-50 p-4 text-slate-600">ยังไม่มีนักกีฬาในทะเบียนสถาบันนี้</p>:
      <div className="mt-4 space-y-2">{members.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4">
       <div><p className="font-black">{m.athlete?.full_name||"ไม่พบโปรไฟล์"}</p><p className="text-sm text-slate-500">{m.athlete?.go_id||"—"} • {m.athlete?.current_rank||"ยังไม่ระบุระดับ"}</p></div>
       <span className={"rounded-full px-3 py-2 text-sm font-bold "+(m.membership_status==="verified"?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800")}>{m.membership_status==="pending"?"รอตรวจสอบ":m.membership_status==="verified"?"ยืนยันแล้ว":"ไม่ได้ใช้งาน"}</span>
      </div>)}</div>}
    </section>}
   </>}
  </div>
 </main>;
}
