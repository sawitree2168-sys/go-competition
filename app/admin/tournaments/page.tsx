"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Tournament={id:string;title:string;start_at:string|null;status:string;published:boolean};
type Division={id:string;name:string;seats_limit:number|null;pairing_enabled:boolean};
const modules=["ผู้สมัครและนักกีฬา","ตรวจเงินและสลิป (รอเชื่อม)","เช็กอิน / จับคู่ / ผลแข่ง","ใบประกาศ","ข่าว / รูปเด่น / Drive","ค่าใช้จ่ายและรายงาน"];
export default function TournamentAdmin(){
 const client=useRef<SupabaseClient|null>(null);
 const [ready,setReady]=useState(false),[signed,setSigned]=useState(false);
 const [email,setEmail]=useState(""),[otpMessage,setOtpMessage]=useState(""),[busy,setBusy]=useState(false);
 const [status,setStatus]=useState<"idle"|"loading"|"ok"|"error"|"forbidden">("idle"),[message,setMessage]=useState("");
 const [role,setRole]=useState(""),[events,setEvents]=useState<Tournament[]>([]);
 const [year,setYear]=useState("2026"),[title,setTitle]=useState(""),[date,setDate]=useState("");
 const [selected,setSelected]=useState<string|null>(null),[divisions,setDivisions]=useState<Division[]>([]),[divName,setDivName]=useState(""),[seats,setSeats]=useState("");
 useEffect(()=>{let active=true;let cleanup=()=>{};(async()=>{try{
  const r=await fetch("/api/auth/public-config",{cache:"no-store"});const cfg=await r.json();if(!r.ok||cfg.status!=="ok")throw Error();
  const c=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!active)return;client.current=c;
  const session=await c.auth.getSession();if(active){setSigned(Boolean(session.data.session));setReady(true);}
  const sub=c.auth.onAuthStateChange((_event,s)=>{if(active){setSigned(Boolean(s));setStatus("idle");}});
  cleanup=()=>sub.data.subscription.unsubscribe();
 }catch{if(active){setReady(true);setMessage("เชื่อมระบบเข้าสู่ระบบไม่สำเร็จ");setStatus("error")}}})();
 return()=>{active=false;cleanup()};},[]);
 async function api(path:string,method="GET",body?:unknown){
  const token=(await client.current?.auth.getSession())?.data.session?.access_token;
  if(!token)throw Error("กรุณาเข้าสู่ระบบอีกครั้ง");
  const r=await fetch(path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
  const d=await r.json();if(!r.ok||d.status!=="ok")throw Object.assign(Error(d.message||"ไม่สามารถดำเนินการได้"),{code:r.status});
  return d;
 }
 async function load(){
  setStatus("loading");setMessage("");
  try{const d=await api("/api/admin/tournaments");setEvents(d.tournaments);setRole(d.role);setStatus("ok")}
  catch(e){setStatus((e as {code?:number}).code===403?"forbidden":"error");setMessage(e instanceof Error?e.message:"เกิดข้อผิดพลาด")}
 }
 useEffect(()=>{if(ready&&signed)void load()},[ready,signed]);
 async function sendEmail(e:FormEvent){e.preventDefault();if(!client.current)return;setBusy(true);setOtpMessage("");
  const {error}=await client.current.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:window.location.origin+"/admin/tournaments"}});
  setOtpMessage(error?"ส่งอีเมลไม่สำเร็จ กรุณาตรวจบัญชี":"ส่งลิงก์เข้าสู่ระบบแล้ว กรุณาเปิดอีเมลและกลับหน้านี้");setBusy(false);
 }
 async function createEvent(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");
  try{const d=await api("/api/admin/tournaments","POST",{title,date});setEvents(old=>[d.tournament,...old]);setSelected(d.tournament.id);setYear(date.slice(0,4));setTitle("");setDate("");setDivisions([]);setMessage("เพิ่มรายการแข่งขันแบบร่างเรียบร้อย")}
  catch(e){setMessage(e instanceof Error?e.message:"บันทึกไม่สำเร็จ")}finally{setBusy(false)}
 }
 async function chooseEvent(id:string){setSelected(id);setDivisions([]);setMessage("");
  try{const d=await api("/api/admin/tournament-divisions?tournament_id="+encodeURIComponent(id));setDivisions(d.divisions)}
  catch(e){setMessage(e instanceof Error?e.message:"โหลดรุ่นแข่งขันไม่สำเร็จ")}
 }
 async function createDivision(e:FormEvent){e.preventDefault();if(!selected)return;setBusy(true);setMessage("");
  try{const d=await api("/api/admin/tournament-divisions","POST",{tournament_id:selected,name:divName,seats_limit:seats});setDivisions(old=>[...old,d.division]);setDivName("");setSeats("");setMessage("เพิ่มรุ่นแข่งขันสำเร็จ")}
  catch(e){setMessage(e instanceof Error?e.message:"เพิ่มรุ่นไม่สำเร็จ")}finally{setBusy(false)}
 }
 const yearOf=(x:Tournament)=>x.start_at?new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Bangkok",year:"numeric"}).format(new Date(x.start_at)):"";
 const rows=events.filter(x=>yearOf(x)===year);
 const selectedEvent=events.find(x=>x.id===selected);
 return <main className="min-h-screen bg-[#f2f6fc] text-[#112d57]">
  <header className="bg-[#09244e] p-5 text-white"><div className="mx-auto max-w-5xl">
   <Link href="/" className="text-[#f0cd82]">‹ GO TOURNAMENT</Link><h1 className="mt-3 text-3xl font-extrabold">ศูนย์จัดการรายการแข่งขัน</h1>
   <p className="mt-2 text-blue-100">ปีการแข่งขัน • รุ่น • ผู้สมัคร • การเงิน • ผลแข่งขัน • สื่อ</p>
  </div></header>
  <div className="mx-auto max-w-5xl space-y-5 px-4 py-7">
   {!ready&&<p>กำลังตรวจสอบสิทธิ์...</p>}
   {ready&&!signed&&<section className="rounded-2xl bg-white p-6 shadow-sm">
    <h2 className="text-xl font-extrabold">เข้าสู่ระบบ Owner / Admin</h2>
    <p className="mt-2 text-sm text-slate-600">ใช้อีเมลที่ได้รับสิทธิ์แล้ว ระบบจะส่งลิงก์ยืนยันตัวตน</p>
    <form onSubmit={sendEmail} className="mt-4 space-y-3">
     <label htmlFor="email" className="block font-bold">อีเมลผู้ดูแล</label>
     <input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full rounded-xl border p-4"/>
     <button disabled={busy} className="w-full rounded-xl bg-blue-800 p-4 font-bold text-white">ส่งลิงก์เข้าสู่ระบบ</button>
    </form>{otpMessage&&<p role="status" className="mt-4">{otpMessage}</p>}
   </section>}
   {signed&&<section className="rounded-2xl bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">จัดการรายการแข่งขัน</h2><button onClick={()=>void load()} className="rounded-lg bg-blue-800 px-4 py-3 font-semibold text-white">โหลดข้อมูลใหม่</button></div>
    {status==="loading"&&<p role="status" className="mt-4">กำลังโหลดข้อมูล...</p>}
    {(status==="error"||status==="forbidden")&&<p role="alert" className="mt-4 rounded-lg bg-amber-50 p-4 text-red-800">{message||"ไม่มีสิทธิ์เข้าถึง"}</p>}
    {status==="ok"&&<>
     <p className="mt-3 text-sm text-slate-600">สิทธิ์: {role} • ข้อมูลจาก Supabase โดยตรง รวมรายการแบบร่าง ไม่แสดงข้อมูลสมมติ</p>
     <div className="mt-5 flex items-center justify-between gap-2">
      <label htmlFor="year" className="font-bold">ปีการแข่งขัน พ.ศ.</label>
      <select id="year" value={year} onChange={e=>{setYear(e.target.value);setSelected(null)}} className="rounded-xl border p-3">
       {Array.from({length:8},(_,i)=>2025+i).map(y=><option value={String(y)} key={y}>{y+543}</option>)}
      </select>
     </div>
     <div className="mt-4 rounded-xl bg-blue-50 p-4"><p>รายการแข่งขันในปีที่เลือก</p><p className="text-3xl font-black">{rows.length}</p></div>
     <div className="mt-3 space-y-2">{rows.length===0?<p className="rounded-xl border border-dashed p-5 text-slate-600">ยังไม่มีรายการแข่งขันในปีนี้</p>:rows.map(x=><button key={x.id} onClick={()=>void chooseEvent(x.id)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-blue-50">
      <strong>{x.title}</strong><p className="mt-2 text-sm text-slate-600">{x.start_at?new Date(x.start_at).toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok"}):"ไม่ระบุวัน"} • {x.status} • {x.published?"เผยแพร่แล้ว":"ยังไม่เผยแพร่"}</p>
     </button>)}</div>
     {["owner","admin"].includes(role)&&<form onSubmit={createEvent} className="mt-6 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h3 className="text-lg font-extrabold">สร้างรายการแข่งขันใหม่ (แบบร่าง)</h3>
      <label className="block">ชื่อรายการ<input value={title} onChange={e=>setTitle(e.target.value)} required minLength={4} maxLength={180} className="mt-1 w-full rounded-lg border bg-white p-3"/></label>
      <label className="block">วันที่แข่งขัน<input type="date" value={date} onChange={e=>setDate(e.target.value)} required className="mt-1 w-full rounded-lg border bg-white p-3"/></label>
      <button disabled={busy} className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-50">บันทึกแบบร่าง</button>
     </form>}
     {selectedEvent&&<section className="mt-6 rounded-xl border border-[#d7b66d] bg-[#fffbf3] p-4">
      <h3 className="text-lg font-extrabold">รุ่นแข่งขัน: {selectedEvent.title}</h3>
      <p className="mt-2 text-sm text-slate-600">รุ่นในรายการนี้ {divisions.length} รุ่น</p>
      <div className="mt-3 space-y-2">{divisions.map(d=><div key={d.id} className="rounded-lg border bg-white p-3">{d.name} • {d.seats_limit?d.seats_limit+" ที่":"ไม่จำกัดจำนวน"}</div>)}</div>
      {["owner","admin"].includes(role)&&!selectedEvent.published&&<form onSubmit={createDivision} className="mt-4 space-y-3">
       <label className="block">ชื่อรุ่น<input required minLength={2} maxLength={100} value={divName} onChange={e=>setDivName(e.target.value)} placeholder="เช่น 1–2 คิว" className="mt-1 w-full rounded-lg border bg-white p-3"/></label>
       <label className="block">จำนวนรับ (เว้นว่าง = ไม่จำกัด)<input type="number" min={1} max={10000} value={seats} onChange={e=>setSeats(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-3"/></label>
       <button disabled={busy} className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white">เพิ่มรุ่นแข่งขัน</button>
      </form>}
     </section>}
    </>}
   </section>}
   {message&&status!=="error"&&status!=="forbidden"&&<p role="status" className="rounded-xl bg-white p-4">{message}</p>}
   <section className="rounded-2xl bg-white p-5"><h2 className="text-xl font-extrabold">ศูนย์รวมข้อมูลแต่ละการแข่งขัน</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{modules.map(x=><div key={x} className="rounded-xl border bg-slate-50 p-4 font-semibold">{x}<p className="mt-1 text-xs font-normal text-slate-500">ทยอยเชื่อมข้อมูลตาม Tournament ID</p></div>)}</div>
    <Link href="/admin/athlete-claims" className="mt-4 block rounded-xl bg-[#e9f0fb] p-4 text-center font-bold text-blue-900">ตรวจคำขอ GO ID ›</Link>
   </section>
  </div>
 </main>;
}