"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Tournament={id:string;title:string;start_at:string|null;status:string;published:boolean};
type Division={id:string;name:string;seats_limit:number|null;pairing_enabled:boolean};
type Applicant={id:string;go_id:string|null;athlete_name:string;rank:string|null;division_name:string;registration_status:string;payment_status:string};
type NewsRow={id:string;title:string;body:string;status:string;created_at:string};
type Summary={counts:{divisions:number;registrations:number;confirmedRegistrations:number;paymentVerifiedRegistrations:number;matches:number;verifiedMatches:number;news:number;media:number;certificates:number};finance:null|{payments:number;verifiedPayments:number;verifiedAmount:number;expenses:number}};
const modules=["ผู้สมัครและนักกีฬา","ตรวจเงินและสลิป (รอเชื่อม)","เช็กอิน / จับคู่ / ผลแข่ง","ใบประกาศ","ข่าว / รูปเด่น / Drive","ค่าใช้จ่ายและรายงาน"];
export default function TournamentAdmin(){
 const client=useRef<SupabaseClient|null>(null);
 const [ready,setReady]=useState(false),[signed,setSigned]=useState(false);
 const [email,setEmail]=useState(""),[otpMessage,setOtpMessage]=useState(""),[busy,setBusy]=useState(false);
 const [status,setStatus]=useState<"idle"|"loading"|"ok"|"error"|"forbidden">("idle"),[message,setMessage]=useState("");
 const [role,setRole]=useState(""),[events,setEvents]=useState<Tournament[]>([]);
 const [year,setYear]=useState("2026"),[title,setTitle]=useState(""),[date,setDate]=useState("");
 const [selected,setSelected]=useState<string|null>(null),[divisions,setDivisions]=useState<Division[]>([]),[divName,setDivName]=useState(""),[seats,setSeats]=useState("");
 const [summary,setSummary]=useState<Summary|null>(null),[summaryBusy,setSummaryBusy]=useState(false);
 const [albumUrl,setAlbumUrl]=useState(""),[albumSaving,setAlbumSaving]=useState(false);
 const [applicants,setApplicants]=useState<Applicant[]>([]);
 const [news,setNews]=useState<NewsRow[]>([]),[newsTitle,setNewsTitle]=useState(""),[newsBody,setNewsBody]=useState("");
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
  try{const d=await api("/api/admin/tournaments","POST",{title,date});setEvents(old=>[d.tournament,...old]);setSelected(d.tournament.id);setYear(date.slice(0,4));setTitle("");setDate("");setDivisions([]);setSummary(null);setAlbumUrl("");setMessage("เพิ่มรายการแข่งขันแบบร่างเรียบร้อย")}
  catch(e){setMessage(e instanceof Error?e.message:"บันทึกไม่สำเร็จ")}finally{setBusy(false)}
 }
 async function chooseEvent(id:string){setSelected(id);setDivisions([]);setSummary(null);setAlbumUrl("");setApplicants([]);setNews([]);setMessage("");setSummaryBusy(true);
  try{const [d,s,a,r,n]=await Promise.all([api("/api/admin/tournament-divisions?tournament_id="+encodeURIComponent(id)),api("/api/admin/tournament-summary?tournament_id="+encodeURIComponent(id)),api("/api/admin/tournament-albums?tournament_id="+encodeURIComponent(id)),api("/api/admin/tournament-registrations?tournament_id="+encodeURIComponent(id)),api("/api/admin/tournament-news?tournament_id="+encodeURIComponent(id))]);setDivisions(d.divisions);setSummary(s);setAlbumUrl(a.album?.drive_folder_url||"");setApplicants(r.registrations);setNews(n.news)}
  catch(e){setMessage(e instanceof Error?e.message:"โหลดข้อมูลรายการแข่งขันไม่สำเร็จ")}
  finally{setSummaryBusy(false)}
 }
 async function createNews(e:FormEvent){e.preventDefault();if(!selected)return;setBusy(true);setMessage("");
  try{await api("/api/admin/tournament-news","POST",{tournament_id:selected,title:newsTitle,body:newsBody});
   const n=await api("/api/admin/tournament-news?tournament_id="+encodeURIComponent(selected));setNews(n.news);setNewsTitle("");setNewsBody("");setMessage("บันทึกข่าวแบบร่างแล้ว ยังไม่เผยแพร่") 
  }catch(e){setMessage(e instanceof Error?e.message:"บันทึกข่าวไม่สำเร็จ")}finally{setBusy(false)}
 }
 async function saveAlbum(e:FormEvent){e.preventDefault();if(!selected)return;setAlbumSaving(true);setMessage("");
  try{await api("/api/admin/tournament-albums","PUT",{tournament_id:selected,drive_folder_url:albumUrl});setMessage("บันทึกลิงก์อัลบั้มเป็นแบบร่างแล้ว (ยังไม่เผยแพร่สาธารณะ)")}
  catch(e){setMessage(e instanceof Error?e.message:"บันทึกลิงก์ไม่สำเร็จ")}finally{setAlbumSaving(false)}
 }
 async function createDivision(e:FormEvent){e.preventDefault();if(!selected)return;setBusy(true);setMessage("");
  try{const d=await api("/api/admin/tournament-divisions","POST",{tournament_id:selected,name:divName,seats_limit:seats});setDivisions(old=>[...old,d.division]);setSummary(old=>old?{...old,counts:{...old.counts,divisions:old.counts.divisions+1}}:old);setDivName("");setSeats("");setMessage("เพิ่มรุ่นแข่งขันสำเร็จ")}
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
      <Link href={"/admin/tournaments/"+selectedEvent.id+"/media"} className="mt-3 block rounded-xl bg-blue-800 px-4 py-3 text-center font-bold text-white">จัดการรูปเด่นและโปสเตอร์ของรายการ ›</Link>
      <Link href={"/admin/tournaments/"+selectedEvent.id+"/registrations"} className="mt-3 block rounded-xl border border-blue-800 bg-white px-4 py-3 text-center font-bold text-blue-900">ตรวจรายชื่อผู้สมัคร / ค้นหา / ส่งออก CSV ›</Link>
      <p className="mt-2 text-sm text-slate-600">รุ่นในรายการนี้ {divisions.length} รุ่น</p>
      {summaryBusy&&<p role="status" className="mt-3">กำลังสรุปข้อมูลรายการ...</p>}
      {summary&&<div className="mt-4">
        <h4 className="font-extrabold">ข้อมูลจริงที่เชื่อมกับรายการนี้</h4>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
         {([{label:"รุ่นแข่งขัน",value:summary.counts.divisions},{label:"ผู้สมัคร",value:summary.counts.registrations},{label:"ยืนยันสมัคร",value:summary.counts.confirmedRegistrations},{label:"ชำระผ่านตรวจ",value:summary.counts.paymentVerifiedRegistrations},{label:"คู่แข่งขัน",value:summary.counts.matches},{label:"ผลที่ยืนยัน",value:summary.counts.verifiedMatches},{label:"ข่าว",value:summary.counts.news},{label:"รูปเด่น",value:summary.counts.media},{label:"ใบประกาศ",value:summary.counts.certificates}]).map(x=><div key={x.label} className="rounded-xl border border-blue-100 bg-white p-3">
          <p className="text-xs text-slate-600">{x.label}</p><p className="mt-1 text-2xl font-black">{x.value}</p>
         </div>)}
        </div>
        {summary.finance&&<div className="mt-3 grid grid-cols-2 gap-2">
         <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs">รับชำระที่ตรวจแล้ว (บาท)</p><p className="text-xl font-black">{summary.finance.verifiedAmount.toLocaleString("th-TH")}</p></div>
         <div className="rounded-xl bg-white p-3"><p className="text-xs">ค่าใช้จ่ายที่บันทึก (บาท)</p><p className="text-xl font-black">{summary.finance.expenses.toLocaleString("th-TH")}</p></div>
        </div>}
        <p className="mt-2 text-xs text-slate-500">ยอดแสดงจากข้อมูลใน Supabase ไม่ใช่เงินเข้าบัญชีธนาคารที่ตรวจยืนยันภายนอก</p>
      </div>}
      <div className="mt-3 space-y-2">{divisions.map(d=><div key={d.id} className="rounded-lg border bg-white p-3">{d.name} • {d.seats_limit?d.seats_limit+" ที่":"ไม่จำกัดจำนวน"}</div>)}</div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
       <h4 className="font-extrabold">ข่าวของรายการแข่งขัน</h4>
       <p className="mt-1 text-sm text-slate-600">ข่าวทั้งหมด {news.length} รายการ · เพิ่มได้เป็นแบบร่างเท่านั้น</p>
       {news.map(n=><div key={n.id} className="mt-2 rounded-lg border bg-slate-50 p-3">
        <p className="font-bold">{n.title}</p><p className="mt-1 text-sm text-slate-500">{n.status==="draft"?"แบบร่าง":n.status}</p>
       </div>)}
       {["owner","admin"].includes(role)&&<form onSubmit={createNews} className="mt-4 space-y-3">
        <label className="block text-sm font-bold">หัวข้อข่าว
         <input required minLength={3} maxLength={200} value={newsTitle} onChange={e=>setNewsTitle(e.target.value)} className="mt-2 w-full rounded-lg border p-3"/>
        </label>
        <label className="block text-sm font-bold">เนื้อหา
         <textarea rows={4} maxLength={10000} value={newsBody} onChange={e=>setNewsBody(e.target.value)} className="mt-2 w-full rounded-lg border p-3"/>
        </label>
        <button disabled={busy} className="rounded-xl bg-[#10366d] px-5 py-3 font-bold text-white">บันทึกข่าวแบบร่าง</button>
       </form>}
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
       <h4 className="font-extrabold">รายชื่อผู้สมัครของรายการนี้</h4>
       <p className="mt-1 text-xs text-slate-500">ดูได้เฉพาะเจ้าหน้าที่ที่ยืนยันสิทธิ์แล้ว · รวม {applicants.length} รายการ</p>
       {applicants.length===0?<p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">ยังไม่มีผู้สมัครในฐานข้อมูลรายการนี้</p>:
       <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">{applicants.map(x=><div key={x.id} className="rounded-lg border border-slate-200 p-3">
        <p className="font-bold">{x.athlete_name} {x.go_id?<span className="text-sm font-normal text-blue-800">({x.go_id})</span>:null}</p>
        <p className="mt-1 text-sm text-slate-600">รุ่น: {x.division_name} • สมัคร: {x.registration_status} • ชำระ: {x.payment_status}</p>
       </div>)}</div>}
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
       <h4 className="font-extrabold">อัลบั้มภาพการแข่งขัน (Google Drive)</h4>
       <p className="mt-2 text-sm text-slate-600">อัปโหลดภาพทั้งหมดเข้าโฟลเดอร์ Drive แล้ววางลิงก์โฟลเดอร์ ระบบเก็บลิงก์กับ Tournament ID นี้โดยตรง ยังไม่เผยแพร่จนกว่าจะตรวจสิทธิ์และภาพนักกีฬา</p>
       {["owner","admin"].includes(role)&&<form onSubmit={saveAlbum} className="mt-3 space-y-3">
        <label className="block text-sm font-semibold">ลิงก์โฟลเดอร์ Google Drive
         <input type="url" value={albumUrl} onChange={e=>setAlbumUrl(e.target.value)} required placeholder="https://drive.google.com/drive/folders/..." className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-base"/>
        </label>
        <button disabled={albumSaving} className="rounded-xl bg-[#0d3974] px-5 py-3 font-bold text-white disabled:opacity-50">{albumSaving?"กำลังบันทึก...":"บันทึกลิงก์อัลบั้ม (แบบร่าง)"}</button>
       </form>}
      </div>
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