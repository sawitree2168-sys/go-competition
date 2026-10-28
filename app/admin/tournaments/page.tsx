"use client";
import Link from "next/link";
import {SiteSectionBanner} from "../../components/SiteSectionBanner";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Tournament={id:string;title:string;start_at:string|null;event_date:string|null;status:string;published:boolean;default_kyu_fee_thb:number;default_dan_fee_thb:number};
type Division={id:string;name:string;seats_limit:number|null;pairing_enabled:boolean;entry_fee_thb:number|null;friendship_board_size:number|null};
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
 const [selected,setSelected]=useState<string|null>(null),[divisions,setDivisions]=useState<Division[]>([]),[divName,setDivName]=useState(""),[seats,setSeats]=useState(""),[entryFee,setEntryFee]=useState(""),[friendshipBoard,setFriendshipBoard]=useState("");
 const [kyuPrice,setKyuPrice]=useState("500"),[danPrice,setDanPrice]=useState("600"),[feeOverrides,setFeeOverrides]=useState<Record<string,string>>({});
 const [templateBusy,setTemplateBusy]=useState(false);
 const [summary,setSummary]=useState<Summary|null>(null),[summaryBusy,setSummaryBusy]=useState(false);
 const [posterBusy,setPosterBusy]=useState(false),[posterPreview,setPosterPreview]=useState("");
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
  try{const d=await api("/api/admin/tournaments","POST",{title,date});setEvents(old=>[d.tournament,...old]);setSelected(d.tournament.id);setKyuPrice(String(d.tournament.default_kyu_fee_thb??500));setDanPrice(String(d.tournament.default_dan_fee_thb??600));setFeeOverrides({});setYear(date.slice(0,4));setTitle("");setDate("");setDivisions([]);setSummary(null);setAlbumUrl("");setMessage("เพิ่มรายการแข่งขันแบบร่างเรียบร้อย")}
  catch(e){setMessage(e instanceof Error?e.message:"บันทึกไม่สำเร็จ")}finally{setBusy(false)}
 }
 async function chooseEvent(id:string){setPosterPreview("");const ev=events.find(x=>x.id===id);setKyuPrice(String(ev?.default_kyu_fee_thb??500));setDanPrice(String(ev?.default_dan_fee_thb??600));setFeeOverrides({});setSelected(id);setDivisions([]);setSummary(null);setAlbumUrl("");setApplicants([]);setNews([]);setMessage("");setSummaryBusy(true);
  try{const [d,s,a,r,n]=await Promise.all([api("/api/admin/tournament-divisions?tournament_id="+encodeURIComponent(id)),api("/api/admin/tournament-summary?tournament_id="+encodeURIComponent(id)),api("/api/admin/tournament-albums?tournament_id="+encodeURIComponent(id)),api("/api/admin/tournament-registrations?tournament_id="+encodeURIComponent(id)),api("/api/admin/tournament-news?tournament_id="+encodeURIComponent(id))]);setDivisions(d.divisions);setFeeOverrides(Object.fromEntries((d.divisions as Division[]).map(x=>[x.id,x.entry_fee_thb===null?"":String(x.entry_fee_thb)])));setSummary(s);setAlbumUrl(a.album?.drive_folder_url||"");setApplicants(r.registrations);setNews(n.news)}
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
 async function addStandardDivisionTemplate(){
  if(!selected||!selectedEvent||templateBusy||divisions.length>0)return;
  if(selectedEvent.published||selectedEvent.status!=="draft"){setMessage("เพิ่มชุดมาตรฐานได้เฉพาะรายการแบบร่างที่ยังไม่เผยแพร่");return}
  if(!window.confirm("เพิ่ม 8 รุ่นมาตรฐาน จำนวนรับรวม 304 คนในรายการนี้ใช่หรือไม่? รุ่น Friendship จะยังไม่กำหนดค่าสมัคร"))return;
  setTemplateBusy(true);setMessage("");
  try{
   const result=await api("/api/admin/tournament-division-template","POST",{tournament_id:selected});
   const added:Division[]=result.divisions;
   setDivisions(added);
   setFeeOverrides(Object.fromEntries(added.map(d=>[d.id,d.entry_fee_thb===null?"":String(d.entry_fee_thb)])));
   setSummary(old=>old?{...old,counts:{...old.counts,divisions:added.length}}:old);
   setMessage("เพิ่ม 8 รุ่นมาตรฐาน รวม 304 ที่เรียบร้อยแล้ว โปรดกำหนดราคา Friendship ก่อนเปิดรับสมัคร");
  }catch(e){
   setMessage(e instanceof Error?e.message:"เพิ่มชุดรุ่นไม่ได้ กรุณาโหลดรายการตรวจสอบก่อนลองซ้ำ");
   try{
    const refresh=await api("/api/admin/tournament-divisions?tournament_id="+encodeURIComponent(selected));
    setDivisions(refresh.divisions);
    setFeeOverrides(Object.fromEntries((refresh.divisions as Division[]).map(d=>[d.id,d.entry_fee_thb===null?"":String(d.entry_fee_thb)])));
   }catch{/* existing error message preserved */}
  }finally{setTemplateBusy(false)}
 }
 async function createDivision(e:FormEvent){e.preventDefault();if(!selected)return;setBusy(true);setMessage("");
  try{const d=await api("/api/admin/tournament-divisions","POST",{tournament_id:selected,name:divName,seats_limit:seats,entry_fee_thb:entryFee,friendship_board_size:friendshipBoard});setDivisions(old=>[...old,d.division]);setFeeOverrides(old=>({...old,[d.division.id]:d.division.entry_fee_thb===null?"":String(d.division.entry_fee_thb)}));setSummary(old=>old?{...old,counts:{...old.counts,divisions:old.counts.divisions+1}}:old);setDivName("");setSeats("");setEntryFee("");setFriendshipBoard("");setMessage("เพิ่มรุ่นแข่งขันสำเร็จ")}
  catch(e){setMessage(e instanceof Error?e.message:"เพิ่มรุ่นไม่สำเร็จ")}finally{setBusy(false)}
 }
 async function uploadPoster(file:File|null){
  if(!file||!selected||!client.current)return;
  setMessage("");
  if(file.type!=="image/webp"||file.size>6*1024*1024||file.size===0){setMessage("เลือกโปสเตอร์ WebP ที่มีขนาดไม่เกิน 6 MB");return}
  if(!window.confirm("อัปโหลดโปสเตอร์สำหรับแสดงสาธารณะของรายการนี้ ใช่หรือไม่?"))return;
  setPosterBusy(true);
  try{
   const token=(await client.current.auth.getSession()).data.session?.access_token;
   if(!token)throw Error("กรุณาเข้าสู่ระบบ Owner/Admin ใหม่");
   const storage=client.current.storage.from("gt-site-assets");
   const filePath="banners/tournaments/"+selected+"/"+crypto.randomUUID()+".webp";
   const uploaded=await storage.upload(filePath,file,{contentType:"image/webp",cacheControl:"3600",upsert:false});
   if(uploaded.error)throw Error("อัปโหลดภาพไม่สำเร็จ: "+uploaded.error.message);
   const url=storage.getPublicUrl(filePath).data.publicUrl;
   const response=await fetch("/api/admin/tournament-poster",{method:"PATCH",cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({tournament_id:selected,poster_url:url})});
   const data=await response.json();
   if(!response.ok||data.status!=="ok")throw Error(data.message||"ไฟล์อัปโหลดแล้ว แต่ยังไม่ได้ผูกกับรายการ โปรดให้เจ้าหน้าที่ตรวจสอบก่อนอัปโหลดซ้ำ");
   setPosterPreview(url);setMessage("อัปโหลดและเชื่อมโปสเตอร์ของรายการสำเร็จ");
  }catch(e){setMessage(e instanceof Error?e.message:"บันทึกโปสเตอร์ไม่ได้")}finally{setPosterBusy(false)}
 }
 async function saveDefaultFees(e:FormEvent){e.preventDefault();if(!selected)return;setBusy(true);setMessage("");
  try{const result=await api("/api/admin/tournaments","PATCH",{tournament_id:selected,default_kyu_fee_thb:kyuPrice,default_dan_fee_thb:danPrice});setEvents(old=>old.map(x=>x.id===selected?{...x,...result.tournament}:x));setMessage("บันทึกราคาคิวและดั้งแล้ว รุ่นเดิมยังคงราคาของรุ่นไว้ตามที่ตั้งไว้");}
  catch(e){setMessage(e instanceof Error?e.message:"แก้ค่าสมัครไม่สำเร็จ")}finally{setBusy(false)}
 }
 async function saveDivisionFee(id:string){if(!selected)return;setBusy(true);setMessage("");
  try{const result=await api("/api/admin/tournament-divisions","PATCH",{tournament_id:selected,division_id:id,entry_fee_thb:feeOverrides[id]});setDivisions(old=>old.map(x=>x.id===id?{...x,entry_fee_thb:result.division.entry_fee_thb}:x));setMessage("บันทึกค่าสมัครรุ่นแล้ว ใบสมัครเดิมไม่เปลี่ยนราคา");}
  catch(e){setMessage(e instanceof Error?e.message:"เปลี่ยนค่าสมัครรุ่นไม่สำเร็จ")}finally{setBusy(false)}
 }
 const yearOf=(x:Tournament)=>x.event_date?x.event_date.slice(0,4):x.start_at?new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Bangkok",year:"numeric"}).format(new Date(x.start_at)):"";
 const rows=events.filter(x=>yearOf(x)===year);
 const selectedEvent=events.find(x=>x.id===selected);
 return <main className="min-h-screen bg-[#f2f6fc] text-[#112d57]">
  <header className="bg-[#09244e] p-5 text-white"><div className="mx-auto max-w-5xl">
   <Link href="/" className="text-[#f0cd82]">‹ GO TOURNAMENT</Link><p className="mt-2 text-sm text-blue-100">เครื่องมือสำหรับเจ้าหน้าที่ที่ได้รับสิทธิ์</p>
  </div></header>
  <div className="mx-auto max-w-5xl space-y-5 px-4 py-7">
   <SiteSectionBanner slot="admin" compact eyebrow="STAFF DASHBOARD" title="ศูนย์จัดการรายการแข่งขัน" description="ปีการแข่งขัน • รุ่น • ผู้สมัคร • การเงิน • ผลแข่งขัน • สื่อ"/>
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
      <strong>{x.title}</strong><p className="mt-2 text-sm text-slate-600">{x.event_date?new Date(x.event_date+"T12:00:00+07:00").toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok"}):x.start_at?new Date(x.start_at).toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok"}):"ไม่ระบุวัน"} • {x.status} • {x.published?"เผยแพร่แล้ว":"ยังไม่เผยแพร่"}</p>
     </button>)}</div>
     {["owner","admin"].includes(role)&&<form onSubmit={createEvent} className="mt-6 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h3 className="text-lg font-extrabold">สร้างรายการแข่งขันใหม่ (แบบร่าง)</h3>
      <label className="block">ชื่อรายการ<input value={title} onChange={e=>setTitle(e.target.value)} required minLength={4} maxLength={180} className="mt-1 w-full rounded-lg border bg-white p-3"/></label>
      <label className="block">วันที่แข่งขัน<input type="date" value={date} onChange={e=>setDate(e.target.value)} required className="mt-1 w-full rounded-lg border bg-white p-3"/></label>
      <button disabled={busy} className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-50">บันทึกแบบร่าง</button>
     </form>}
     {selectedEvent&&<section className="mt-6 rounded-xl border border-[#d7b66d] bg-[#fffbf3] p-4">
      <h3 className="text-lg font-extrabold">รุ่นแข่งขัน: {selectedEvent.title}</h3>
      <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
       <h4 className="text-base font-extrabold">โปสเตอร์งานแข่งขัน</h4>
       <p className="mt-1 text-sm text-slate-600">อัปโหลดไฟล์ WebP แนวตั้งที่ปรับขนาดไว้แล้ว ระบบจะแสดงทั้งภาพโดยไม่ครอปตัวหนังสือบนหน้าเว็บจริง</p>
       {posterPreview&&<img src={posterPreview} alt="โปสเตอร์ที่เพิ่งอัปโหลด" className="mx-auto mt-3 max-h-80 w-auto max-w-full object-contain"/>}
       {["owner","admin"].includes(role)&&<label className="mt-3 block font-bold">เลือกภาพ WebP ไม่เกิน 6 MB
         <input type="file" accept="image/webp,.webp" disabled={posterBusy} onChange={e=>void uploadPoster(e.target.files?.[0]||null)} className="mt-2 block w-full rounded-xl border p-3"/>
       </label>}
       {posterBusy&&<p role="status" className="mt-2 text-sm">กำลังอัปโหลดโปสเตอร์...</p>}
      </div>
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
      <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
       <h4 className="text-lg font-extrabold">ตั้งค่าราคาค่าสมัครของรายการ</h4>
       <p className="mt-1 text-sm text-slate-600">ราคาเริ่มต้นที่ตั้งไว้สำหรับรายการนี้: คิว {selectedEvent.default_kyu_fee_thb.toLocaleString("th-TH")} บาท และดั้ง {selectedEvent.default_dan_fee_thb.toLocaleString("th-TH")} บาท ปรับราคาได้ โดยรุ่นเดิมไม่เปลี่ยนราคาจนกว่าจะกดบันทึกแก้ไขที่รุ่น</p>
       <form onSubmit={saveDefaultFees} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="font-bold">ราคามาตรฐานรุ่นคิว (บาท)<input type="number" min="0" max="1000000" step="0.01" value={kyuPrice} onChange={e=>setKyuPrice(e.target.value)} required disabled={!["owner","admin"].includes(role)} className="mt-2 w-full rounded-xl border p-3"/></label>
        <label className="font-bold">ราคามาตรฐานรุ่นดั้ง (บาท)<input type="number" min="0" max="1000000" step="0.01" value={danPrice} onChange={e=>setDanPrice(e.target.value)} required disabled={!["owner","admin"].includes(role)} className="mt-2 w-full rounded-xl border p-3"/></label>
        {["owner","admin"].includes(role)&&<button disabled={busy} className="min-h-12 rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-40">บันทึกค่าเริ่มต้น</button>}
       </form>
       <p className="mt-2 text-xs text-slate-600">ราคาของนักกีฬาที่ลงทะเบียนไว้แล้วจะใช้ยอด ณ วันสมัคร ไม่ถูกเปลี่ยนย้อนหลัง และไม่ได้หมายถึงรับชำระแล้ว</p>
      </div>
      {["owner","admin"].includes(role)&&!selectedEvent.published&&selectedEvent.status==="draft"&&
       <section className="mt-4 rounded-xl border border-[#c9a661] bg-[#fff8e5] p-4">
        <h4 className="text-lg font-black text-[#0b3165]">ชุดรุ่นแข่งขันมาตรฐาน · 8 รุ่น / 304 คน</h4>
        <p className="mt-1 text-sm text-slate-700">1 ดั้ง 32 · 1–2 คิว 32 · 3–4 คิว 32 · 5–6 คิว 32 · 7–8 คิว 32 · 9–12 คิว 64 · Friendship 13×13 16 · Friendship 9×9 64</p>
        <p className="mt-2 text-sm text-slate-700">ใช้ราคามาตรฐานของรายการนี้สำหรับดั้ง/คิว ส่วน Friendship ยังไม่กำหนดราคา ต้องตรวจสอบก่อนเปิดสมัคร ระบบนี้จะไม่สร้างรุ่นซ้ำ</p>
        <button type="button" disabled={templateBusy||busy||divisions.length>0} onClick={()=>void addStandardDivisionTemplate()}
         className="mt-3 min-h-12 w-full rounded-xl bg-[#0c4b9b] px-5 py-3 font-black text-white disabled:bg-slate-300 disabled:text-slate-600">
          {templateBusy?"กำลังเพิ่มรุ่น...":divisions.length>0?"รายการนี้มีรุ่นแข่งขันแล้ว — ไม่เพิ่มซ้ำ":"เพิ่มรุ่นมาตรฐานทั้ง 8 รุ่น"}
        </button>
       </section>}
      <div className="mt-3 space-y-2">{divisions.map(d=><div key={d.id} className="rounded-xl border bg-white p-4">
       <p className="font-bold">{d.name} • {d.seats_limit?d.seats_limit+" ที่":"ไม่จำกัดจำนวน"}</p>
       <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm font-semibold">ค่าสมัครรุ่นนี้ (บาท)
         <input type="number" min="0" max="1000000" step="0.01" value={feeOverrides[d.id]??String(d.entry_fee_thb??"")} onChange={e=>setFeeOverrides(x=>({...x,[d.id]:e.target.value}))} disabled={!["owner","admin"].includes(role)} className="mt-1 w-full rounded-lg border p-3" placeholder="ยังไม่กำหนด"/>
        </label>
        {["owner","admin"].includes(role)&&<button type="button" disabled={busy||!String(feeOverrides[d.id]??"").trim()} onClick={()=>void saveDivisionFee(d.id)} className="min-h-12 rounded-xl bg-[#0b4a97] px-4 py-3 font-bold text-white disabled:opacity-40">แก้ไขราคาของรุ่น</button>}
       </div>
      </div>)}</div>
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
       <label className="block">ประเภท Friendship (กรณีไม่ทราบระดับฝีมือ)
        <select value={friendshipBoard} onChange={e=>setFriendshipBoard(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-3">
         <option value="">ไม่ใช่ Friendship / ไม่กำหนด</option>
         <option value="9">Friendship 9×9 → อ้างอิง 15 คิว</option>
         <option value="13">Friendship 13×13 → อ้างอิงช่วง 13–14 คิว</option>
        </select><span className="mt-1 block text-xs text-slate-600">ใช้เฉพาะผู้สมัครที่ยังไม่ทราบระดับจริง ไม่เปลี่ยนระดับนักกีฬาในฐานข้อมูล</span>
       </label>
       <label className="block">จำนวนรับ (เว้นว่าง = ไม่จำกัด)<input type="number" min={1} max={10000} value={seats} onChange={e=>setSeats(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-3"/></label>
       <label className="block">ค่าสมัครต่อคน (บาท) — เว้นว่าง = ใช้ราคาเริ่มต้นคิว/ดั้งตามชื่อรุ่น<input type="number" inputMode="decimal" min={0} max={1000000} step="0.01" value={entryFee} onChange={e=>setEntryFee(e.target.value)} placeholder="เช่น 500.00" className="mt-1 w-full rounded-lg border bg-white p-3"/><span className="mt-1 block text-xs text-slate-600">ใช้เป็นค่าสมัครอ้างอิงตอนสร้างใบสมัคร ไม่ใช่ยอดเงินที่ได้รับแล้ว</span></label>
       <button disabled={busy} className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white">เพิ่มรุ่นแข่งขัน</button>
      </form>}
     </section>}
    </>}
   </section>}
   {message&&status!=="error"&&status!=="forbidden"&&<p role="status" className="rounded-xl bg-white p-4">{message}</p>}
   <Link href="/admin/academies" className="block rounded-xl bg-[#f4e3be] p-4 text-center font-extrabold text-[#0b2b5c]">จัดการสถาบัน / เชื่อม GO ID นักกีฬา ›</Link>
   <Link href="/admin/site-media" className="block rounded-xl bg-[#e5efff] p-4 text-center font-extrabold text-[#0b2b5c]">จัดการภาพเว็บไซต์ / โลโก้ / แบนเนอร์ ›</Link>
   <section className="rounded-2xl bg-white p-5"><h2 className="text-xl font-extrabold">ศูนย์รวมข้อมูลแต่ละการแข่งขัน</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{modules.map(x=><div key={x} className="rounded-xl border bg-slate-50 p-4 font-semibold">{x}<p className="mt-1 text-xs font-normal text-slate-500">ทยอยเชื่อมข้อมูลตาม Tournament ID</p></div>)}</div>
    <Link href="/admin/athlete-claims" className="mt-4 block rounded-xl bg-[#e9f0fb] p-4 text-center font-bold text-blue-900">ตรวจคำขอ GO ID ›</Link>
   </section>
  </div>
 </main>;
}