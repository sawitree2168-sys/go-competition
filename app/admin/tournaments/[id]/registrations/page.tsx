"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Registration={id:string;athlete_id:string;go_id:string|null;athlete_name:string;rank:string|null;division_name:string;registration_status:string;payment_status:string;fee_snapshot_thb:number|null;competition_rank_reference:string|null;rank_reference_source:string|null;created_at:string};
type Result={status:"ok";registrations:Registration[];role:"owner"|"admin"|"reviewer"};
type DivisionOption={id:string;name:string;seats_limit:number|null};
export default function TournamentRegistrationList({params}:{params:Promise<{id:string}>}){
 const [id,setId]=useState(""),[isLoading,setIsLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[email,setEmail]=useState("");
 const [rows,setRows]=useState<Registration[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [search,setSearch]=useState(""),[division,setDivision]=useState("all"),[registration,setRegistration]=useState("all"),[payment,setPayment]=useState("all");
 const [options,setOptions]=useState<DivisionOption[]>([]),[addGoId,setAddGoId]=useState(""),[addDivision,setAddDivision]=useState(""),[adding,setAdding]=useState(false),[addMessage,setAddMessage]=useState(""),[staffRole,setStaffRole]=useState("");
 const [checkins,setCheckins]=useState<Record<string,string>>({}),[checkingId,setCheckingId]=useState(""),[checkinMessage,setCheckinMessage]=useState("");
 const client=useRef<SupabaseClient|null>(null);
 useEffect(()=>{let active=true;void params.then(p=>{if(active)setId(p.id)});return()=>{active=false}},[params]);
 useEffect(()=>{let active=true;let unsubscribe=()=>{};void(async()=>{try{
  const r=await fetch("/api/auth/public-config",{cache:"no-store"});const cfg=await r.json();
  if(!r.ok||cfg.status!=="ok")throw Error("ยังเชื่อมระบบเข้าสู่ระบบไม่ได้");
  const c=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!active)return;client.current=c;
  const session=await c.auth.getSession();if(active){setSignedIn(Boolean(session.data.session));setIsLoading(false)}
  const listener=c.auth.onAuthStateChange((_event,s)=>{if(active)setSignedIn(Boolean(s))});
  unsubscribe=()=>listener.data.subscription.unsubscribe();
 }catch(e){if(active){setMessage(e instanceof Error?e.message:"เข้าสู่ระบบไม่สำเร็จ");setIsLoading(false)}}})();
 return()=>{active=false;unsubscribe()};},[]);
 async function load(){if(!id||!client.current)return;setBusy(true);setMessage("");
  try{const token=(await client.current.auth.getSession()).data.session?.access_token;
   if(!token)throw Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบ");
   const result=await fetch("/api/admin/tournament-registrations?tournament_id="+encodeURIComponent(id),{cache:"no-store",headers:{Authorization:"Bearer "+token}});
   const data:Result|{status:string;message?:string}=await result.json();
   if(!result.ok||data.status!=="ok"||!("registrations" in data)||!Array.isArray(data.registrations))throw Error("message" in data?data.message||"ไม่สามารถอ่านรายชื่อผู้สมัครได้":"ไม่สามารถอ่านรายชื่อผู้สมัครได้");
   setRows(data.registrations);setStaffRole(data.role);
   const checkinResponse=await fetch("/api/admin/tournament-checkins?tournament_id="+encodeURIComponent(id),{cache:"no-store",headers:{Authorization:"Bearer "+token}});
   if(checkinResponse.ok){
    const checkinData=await checkinResponse.json();
    if(checkinData.status==="ok"&&Array.isArray(checkinData.checkins))
     setCheckins(Object.fromEntries(checkinData.checkins.map((x:{registration_id:string;checked_in_at:string})=>[x.registration_id,x.checked_in_at])));
    else setCheckinMessage("อ่านสถานะเช็กอินไม่สำเร็จ กรุณาตรวจสอบก่อนบันทึก");
   }else setCheckinMessage("โหลดข้อมูลเช็กอินไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และฐานข้อมูล");

   const divResponse=await fetch("/api/admin/tournament-divisions?tournament_id="+encodeURIComponent(id),{cache:"no-store",headers:{Authorization:"Bearer "+token}});
   const divData=await divResponse.json();
   if(divResponse.ok&&divData.status==="ok"&&Array.isArray(divData.divisions))
    setOptions(divData.divisions);
  }catch(e){setRows([]);setMessage(e instanceof Error?e.message:"ไม่สามารถโหลดข้อมูล")}
  finally{setBusy(false)}
 }
 useEffect(()=>{if(id&&signedIn)void load()},[id,signedIn]);
 async function login(e:FormEvent){e.preventDefault();if(!client.current)return;setBusy(true);
  const {error}=await client.current.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:window.location.href}});
  setMessage(error?error.message:"ส่งลิงก์เข้าระบบแล้ว โปรดตรวจอีเมล");setBusy(false);
 }
 async function addPendingRegistration(e:FormEvent){
  e.preventDefault();if(!id||!client.current||adding)return;
  if(!window.confirm("เพิ่มนักกีฬา GO ID "+addGoId+" เป็นใบสมัครรอตรวจสอบเท่านั้น และยังไม่ถือว่าชำระเงิน ใช่หรือไม่?"))return;
  setAdding(true);setAddMessage("");
  try{
   const token=(await client.current.auth.getSession()).data.session?.access_token;
   if(!token)throw Error("กรุณาเข้าสู่ระบบใหม่");
   const r=await fetch("/api/admin/tournament-registrations",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({tournament_id:id,division_id:addDivision,go_id:addGoId.trim()})});
   const d=await r.json();
   if(!r.ok||d.status!=="ok")throw Error(d.message||"บันทึกใบสมัครไม่ได้");
   setAddMessage("บันทึกแบบร่างแล้ว: "+d.athlete_name+" ("+d.go_id+") — ยังไม่ยืนยันการชำระเงิน");
   setAddGoId("");setAddDivision("");await load();
  }catch(err){setAddMessage(err instanceof Error?err.message:"บันทึกไม่สำเร็จ")}finally{setAdding(false)}
 }
 async function checkIn(reg:Registration){
  if(!client.current||checkingId||checkins[reg.id])return;
  if(!window.confirm("ยืนยันเช็กอิน "+reg.athlete_name+"? นักกีฬาต้องอยู่หน้างานและผ่านการยืนยันสมัคร/ชำระเงินแล้ว"))return;
  setCheckingId(reg.id);setCheckinMessage("");
  try{
   const token=(await client.current.auth.getSession()).data.session?.access_token;
   if(!token)throw Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
   const response=await fetch("/api/admin/tournament-checkins",{
    method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({registration_id:reg.id,tournament_id:id})
   });
   const data=await response.json();
   if(!response.ok||data.status!=="ok")throw Error(data.message||"เช็กอินไม่สำเร็จ");
   setCheckins(old=>({...old,[reg.id]:data.checkin.checked_in_at}));
   setCheckinMessage("เช็กอิน "+reg.athlete_name+" สำเร็จ");
  }catch(error){setCheckinMessage(error instanceof Error?error.message:"เกิดข้อผิดพลาดในการเช็กอิน")}
  finally{setCheckingId("")}
 }
 const divisions=useMemo(()=>[...new Set(rows.map(x=>x.division_name))].sort((a,b)=>a.localeCompare(b,"th")),[rows]);
 const registrationStatuses=useMemo(()=>[...new Set(rows.map(x=>x.registration_status))].sort(),[rows]);
 const paymentStatuses=useMemo(()=>[...new Set(rows.map(x=>x.payment_status))].sort(),[rows]);
 const filtered=useMemo(()=>rows.filter(x=>{
  const q=search.trim().toLocaleLowerCase("th");
  return (!q||[x.athlete_name,x.go_id||"",x.rank||""].some(v=>v.toLocaleLowerCase("th").includes(q)))&&
   (division==="all"||x.division_name===division)&&(registration==="all"||x.registration_status===registration)&&(payment==="all"||x.payment_status===payment);
 }),[rows,search,division,registration,payment]);
 const breakdown=useMemo(()=>divisions.map(name=>({name,count:rows.filter(r=>r.division_name===name).length})),[rows,divisions]);
 function exportCsv(){
  const header=["GO ID","ชื่อ-นามสกุล","ระดับจริง","ระดับอ้างอิงจาก Friendship","รุ่น","ค่าสมัคร ณ วันลงทะเบียน (บาท)","สถานะสมัคร","สถานะชำระ","วันที่สมัคร"];
  const escape=(v:unknown)=>{const s=String(v??"");const neutral=/^[\s]*[=+@\-\t\r]/.test(s)?"'"+s:s;return '"'+neutral.replaceAll('"','""')+'"';};
  const lines=[header,...filtered.map(r=>[r.go_id||"",r.athlete_name,r.rank||"",r.competition_rank_reference||"",r.division_name,r.fee_snapshot_thb??"",r.registration_status,r.payment_status,r.created_at])];
  const csv="\ufeff"+lines.map(line=>line.map(escape).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const a=document.createElement("a");a.href=url;a.download="go-tournament-applicants-"+id+".csv";a.click();URL.revokeObjectURL(url);
 }
 return <main className="min-h-screen bg-[#eef3fa] text-[#0d2c5d]">
  <header className="bg-gradient-to-r from-[#061d3f] to-[#10489b] px-4 py-6 text-white">
   <div className="mx-auto max-w-6xl"><Link href="/admin/tournaments" className="font-semibold text-[#ffdf94]">‹ กลับศูนย์จัดการแข่งขัน</Link>
    <h1 className="mt-3 text-2xl font-black sm:text-3xl">ตรวจสอบรายชื่อผู้สมัคร</h1>
    <p className="mt-1 text-blue-100">ค้นหา กรองรายชื่อและตรวจสถานะจากฐานข้อมูลจริง • ไม่แก้ยอดเงินหรือยืนยันสิทธิ์อัตโนมัติ</p>
   </div>
  </header>
  <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
   {isLoading&&<p>กำลังตรวจสอบสิทธิ์...</p>}
   {!isLoading&&!signedIn&&<form onSubmit={login} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
    <h2 className="text-xl font-extrabold">เข้าสู่ระบบเจ้าหน้าที่</h2>
    <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="อีเมลเจ้าหน้าที่" className="w-full rounded-xl border p-4"/>
    <button disabled={busy} className="rounded-xl bg-blue-800 px-6 py-3 font-bold text-white">ส่งลิงก์เข้าระบบ</button>
   </form>}
   {message&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">{message}</p>}
   {signedIn&&<>
    {(staffRole==="owner"||staffRole==="admin")&&<section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
     <h2 className="text-xl font-black">เพิ่มใบสมัครรอตรวจสอบ (Owner / Admin)</h2>
     <p className="mt-2 text-sm text-slate-600">ใช้ GO ID ที่มีอยู่ในระบบเท่านั้น ไม่สร้างนักกีฬาซ้ำ ไม่สำรองที่นั่ง ไม่ยืนยันสิทธิ์ และไม่บันทึกว่าชำระเงินแล้ว ผู้มีสิทธิ์ Reviewer สามารถดูรายชื่อ แต่เพิ่มใบสมัครไม่ได้</p>
     <form onSubmit={addPendingRegistration} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <label className="font-bold">GO ID เดิม<input value={addGoId} onChange={e=>setAddGoId(e.target.value)} required minLength={3} maxLength={40} placeholder="ระบุ GO ID ที่ยืนยันแล้ว" className="mt-2 w-full rounded-xl border p-3"/></label>
      <label className="font-bold">รุ่นการแข่งขัน<select value={addDivision} onChange={e=>setAddDivision(e.target.value)} required className="mt-2 w-full rounded-xl border p-3"><option value="">เลือกระดับการแข่งขัน</option>{options.map(x=><option key={x.id} value={x.id}>{x.name}{x.seats_limit?" (กำหนด "+x.seats_limit+" คน)":""}</option>)}</select></label>
      <button disabled={adding||busy||!addGoId.trim()||!addDivision} className="min-h-12 rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-40">{adding?"กำลังบันทึก...":"เพิ่มใบสมัครรอตรวจ"}</button>
     </form>
     {addMessage&&<p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold">{addMessage}</p>}
    </section>}
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
     <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-slate-600">ผู้สมัครทั้งหมด (รายการ)</p><p className="text-3xl font-black">{rows.length}</p></div>
     <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-slate-600">รุ่นแข่งขัน</p><p className="text-3xl font-black">{divisions.length}</p></div>
     <div className="col-span-2 rounded-xl bg-white p-4 shadow-sm md:col-span-1"><p className="text-sm text-slate-600">ผลการค้นหา</p><p className="text-3xl font-black">{filtered.length}</p></div>
    </section>
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
     <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">ค้นหาและกรองผู้สมัคร</h2>
      <div className="flex gap-2"><button onClick={()=>void load()} disabled={busy} className="rounded-xl border border-blue-800 px-4 py-3 font-bold text-blue-800">รีเฟรช</button>
      <button onClick={exportCsv} disabled={busy||filtered.length===0} className="rounded-xl bg-[#0a53c8] px-4 py-3 font-bold text-white disabled:opacity-40">ส่งออก CSV</button></div>
     </div>
     <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="font-semibold">ชื่อนักกีฬา หรือ GO ID
       <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อหรือรหัสนักกีฬา" className="mt-2 w-full rounded-xl border p-3"/>
      </label>
      <label className="font-semibold">ระดับการแข่งขัน
       <select value={division} onChange={e=>setDivision(e.target.value)} className="mt-2 w-full rounded-xl border p-3">
        <option value="all">ทุกรุ่น</option>{divisions.map(x=><option key={x} value={x}>{x}</option>)}
       </select>
      </label>
      <label className="font-semibold">สถานะการสมัคร
       <select value={registration} onChange={e=>setRegistration(e.target.value)} className="mt-2 w-full rounded-xl border p-3">
        <option value="all">ทุกสถานะ</option>{registrationStatuses.map(x=><option key={x} value={x}>{x}</option>)}
       </select>
      </label>
      <label className="font-semibold">สถานะชำระเงิน
       <select value={payment} onChange={e=>setPayment(e.target.value)} className="mt-2 w-full rounded-xl border p-3">
        <option value="all">ทุกสถานะ</option>{paymentStatuses.map(x=><option key={x} value={x}>{x}</option>)}
       </select>
      </label>
     </div>
     <div className="mt-3 flex flex-wrap gap-2 text-sm">{breakdown.map(x=><span key={x.name} className="rounded-full bg-blue-50 px-3 py-2 font-semibold">{x.name}: {x.count}</span>)}</div>
    </section>
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
     <h2 className="px-4 pt-5 text-xl font-black">รายชื่อผู้สมัคร {filtered.length} รายการ</h2>
     <p className="px-4 pt-2 text-sm font-semibold text-slate-600">เช็กอินแล้ว {Object.keys(checkins).length} คน • เฉพาะใบสมัครที่ยืนยันและตรวจชำระ/ยกเว้นแล้ว</p>
     {checkinMessage&&<p role="status" className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold">{checkinMessage}</p>}
     {filtered.length===0?<p className="p-5 text-slate-600">ไม่พบรายการตามตัวกรองที่เลือก หรือยังไม่มีผู้สมัครในระบบ</p>:
      <div className="overflow-x-auto"><table className="min-w-[730px] w-full text-left text-sm">
       <thead className="bg-[#0b3270] text-white"><tr><th className="p-3">#</th><th className="p-3">ชื่อ-นามสกุล</th><th className="p-3">GO ID / ระดับ</th><th className="p-3">รุ่น</th><th className="p-3">ค่าสมัคร</th><th className="p-3">สมัคร</th><th className="p-3">ชำระเงิน</th><th className="p-3">เช็กอินหน้างาน</th></tr></thead>
       <tbody>{filtered.map((r,i)=><tr key={r.id} className="border-b border-blue-50 even:bg-[#f4f8ff]">
        <td className="p-3">{i+1}</td><td className="p-3 font-bold">{r.athlete_name}</td><td className="p-3">{r.go_id||"—"}<p className="text-slate-500">{r.rank||"ยังไม่ทราบระดับจริง"}{r.competition_rank_reference&&<span className="mt-1 block rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-950">อ้างอิง Friendship: {r.competition_rank_reference} (ไม่ใช่ระดับทางการ)</span>}</p></td>
        <td className="p-3">{r.division_name}</td><td className="p-3">{r.fee_snapshot_thb===null?"ยังไม่กำหนด":Number(r.fee_snapshot_thb).toLocaleString("th-TH")+" บาท"}</td><td className="p-3">{r.registration_status}</td><td className="p-3">{r.payment_status}</td>
        <td className="p-3">{checkins[r.id]?<span className="rounded-lg bg-emerald-100 px-3 py-2 font-bold text-emerald-900">เช็กอินแล้ว</span>:r.registration_status!=="confirmed"||!["verified","waived"].includes(r.payment_status)?<span className="font-semibold text-amber-800">ยังไม่ผ่านเงื่อนไข</span>:(staffRole==="owner"||staffRole==="admin")?<button type="button" disabled={Boolean(checkingId)||busy} onClick={()=>void checkIn(r)} className="min-h-12 rounded-xl bg-blue-800 px-5 py-3 font-black text-white disabled:opacity-40">{checkingId===r.id?"กำลังบันทึก...":"เช็กอิน"}</button>:<span className="text-slate-500">ยังไม่เช็กอิน</span>}</td>
       </tr>)}</tbody>
      </table></div>}
    </section>
    <p className="text-sm text-slate-600">หมายเหตุ: สถานะการชำระเงินเป็นข้อมูลที่บันทึกในระบบ ไม่ใช่การรับรองยอดบัญชีธนาคาร • เฉพาะเจ้าหน้าที่ที่ได้รับอนุญาตเท่านั้นที่เข้าถึงหน้านี้</p>
   </>}
  </div>
 </main>;
}
