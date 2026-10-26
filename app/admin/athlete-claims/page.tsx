"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
type Claim={id:string;go_id:string;relationship:string;status:string;created_at:string};
export default function AdminClaimsPage(){
 const client=useRef<SupabaseClient|null>(null);
 const [authReady,setAuthReady]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 const [role,setRole]=useState("");
 const [claims,setClaims]=useState<Claim[]>([]);
 const [state,setState]=useState<"idle"|"loading"|"ok"|"denied"|"error">("idle");
 const [message,setMessage]=useState("");
 const [email,setEmail]=useState("");
 const [sending,setSending]=useState(false);
 const [loginMessage,setLoginMessage]=useState("");
 const [filter,setFilter]=useState("pending");
 const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{let active=true;let off:(()=>void)|undefined;
  (async()=>{try{
   const r=await fetch("/api/auth/public-config",{cache:"no-store"});const cfg=await r.json();
   if(!r.ok||cfg.status!=="ok")throw new Error();
   const c=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   if(!active)return;client.current=c;
   const session=await c.auth.getSession();
   if(active){setSignedIn(Boolean(session.data.session));setAuthReady(true);}
   const sub=c.auth.onAuthStateChange((_e,s)=>{if(active){setSignedIn(Boolean(s));setState("idle");setClaims([]);}});
   off=()=>sub.data.subscription.unsubscribe();
  }catch{if(active){setMessage("ไม่สามารถเชื่อมระบบยืนยันตัวตน");setAuthReady(true);setState("error");}}})();
  return()=>{active=false;off?.()};
 },[]);
 async function sendLogin(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!client.current || sending)return;
  setSending(true);setLoginMessage("");
  try{
   const {error}=await client.current.auth.signInWithOtp({
    email:email.trim(),
    options:{
      shouldCreateUser:false,
      emailRedirectTo:window.location.origin+"/admin/athlete-claims"
    }
   });
   if(error)throw error;
   setLoginMessage("ส่งคำขอเข้าสู่ระบบแล้ว หากมีบัญชีนี้ กรุณาเปิดอีเมลฉบับใหม่และกดลิงก์บนมือถือเครื่องนี้");
  }catch{
   setLoginMessage("ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่และตรวจการตั้งค่า Supabase Auth");
  }finally{setSending(false);}
 }
 async function load(){
  const token=(await client.current?.auth.getSession())?.data.session?.access_token;
  if(!token){setState("denied");return;}
  setState("loading");setMessage("");setClaims([]);
  try{
   const res=await fetch("/api/admin/athlete-claims",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
   const data=await res.json();
   if(res.status===403){setState("denied");setMessage(data.message||"ไม่ได้รับสิทธิ์");return;}
   if(!res.ok||data.status!=="ok"||!Array.isArray(data.requests))throw new Error(data.message||"อ่านข้อมูลไม่สำเร็จ");
   setRole(data.role);setClaims(data.requests);setSelected(null);setState("ok");
  }catch(e){setMessage(e instanceof Error?e.message:"เกิดข้อผิดพลาด");setState("error");}
 }
 useEffect(()=>{if(authReady&&signedIn)void load();},[authReady,signedIn]);
 return <main className="min-h-screen bg-[#f3f6fb] text-[#122b52]">
  <header className="bg-[#0b2854] p-5 font-bold tracking-wider text-[#efc875]"><Link href="/">GO TOURNAMENT</Link></header>
  <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
   <section className="rounded-2xl bg-white p-6 shadow-sm">
    <p className="text-sm font-semibold text-blue-700">ADMIN / PROFILE CLAIMS</p>
    <h1 className="mt-2 text-2xl font-extrabold">ตรวจคำขอผูก GO ID</h1>
    <p className="mt-3 leading-relaxed text-slate-600">ตรวจรายการคำขอได้เฉพาะผู้ที่ได้รับสิทธิ์เจ้าของระบบ ผู้ดูแล หรือผู้ตรวจสอบ ทั้งนี้การตรวจเอกสารและอนุมัติยังไม่ได้เปิดใช้</p>
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">โหมดตรวจสอบเท่านั้น • ไม่สามารถอนุมัติ ปฏิเสธ หรือแก้ GO ID จากหน้านี้</div>
    <Link href="/admin/claim-review" className="mt-4 block rounded-xl border border-blue-700 px-4 py-4 text-center font-semibold text-blue-800">เปิดหน้าบันทึกผลตรวจ GO ID</Link>
    {!authReady&&<p role="status" className="mt-5">กำลังตรวจสอบการเข้าสู่ระบบ...</p>}
    {authReady&&!signedIn&&<div className="mt-5 rounded-xl bg-blue-50 p-4">
      <p className="font-bold">เข้าสู่ระบบผู้ดูแล GO TOURNAMENT</p>
      <p className="mt-2 text-sm">ใช้บัญชีอีเมลที่ผ่านการยืนยันแล้ว ระบบจะส่งลิงก์ใหม่เพื่อกลับเข้าหน้านี้โดยตรง</p>
      <form onSubmit={sendLogin} className="mt-4 space-y-3">
       <label htmlFor="admin-email" className="block font-semibold">อีเมลผู้ดูแล</label>
       <input id="admin-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" className="w-full rounded-xl border border-slate-300 p-4 text-base"/>
       <button disabled={sending||!client.current} className="w-full rounded-xl bg-blue-800 px-5 py-4 font-bold text-white disabled:opacity-50">{sending?"กำลังส่งลิงก์...":"ส่งลิงก์เข้าสู่ระบบ"}</button>
      </form>
      {loginMessage&&<p role="status" className="mt-4 rounded-lg bg-white p-3 text-sm">{loginMessage}</p>}
     </div>}
    {signedIn&&<div className="mt-5">
     <button type="button" onClick={()=>void load()} className="rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white">ตรวจสิทธิ์และโหลดคำขออีกครั้ง</button>
     {state==="loading"&&<p role="status" className="mt-4">กำลังโหลดรายการ...</p>}
     {state==="denied"&&<p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">{message||"ไม่มีสิทธิ์เข้าถึงรายการคำขอ โปรดให้ผู้ดูแลระบบกำหนดบทบาทก่อน"}</p>}
     {state==="error"&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{message}</p>}
     {state==="ok"&&<>
      <p className="mt-4 text-sm text-slate-600">สิทธิ์: {role==="owner"?"เจ้าของระบบ":role==="admin"?"ผู้ดูแล":"ผู้ตรวจสอบ"} • โหมดอ่านอย่างเดียว</p>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
       <div className="rounded-xl bg-slate-100 p-3"><p className="text-2xl font-extrabold">{claims.length}</p><p className="text-xs">คำขอทั้งหมด</p></div>
       <div className="rounded-xl bg-amber-50 p-3"><p className="text-2xl font-extrabold">{claims.filter(x=>x.status==="pending").length}</p><p className="text-xs">รอตรวจสอบ</p></div>
       <div className="rounded-xl bg-green-50 p-3"><p className="text-2xl font-extrabold">{claims.filter(x=>x.status==="approved").length}</p><p className="text-xs">อนุมัติแล้ว</p></div>
      </div>
      <label htmlFor="claim-status-filter" className="mt-5 block font-semibold">กรองสถานะ</label>
      <select id="claim-status-filter" value={filter} onChange={e=>{setFilter(e.target.value);setSelected(null);}} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-base">
       <option value="pending">รอตรวจสอบ</option><option value="all">ทั้งหมด</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ไม่อนุมัติ</option>
      </select>
      {claims.filter(c=>filter==="all"||c.status===filter).length===0?<p className="mt-4 rounded-xl bg-slate-50 p-5 text-slate-600">ไม่พบคำขอในสถานะที่เลือก</p>:
       <ul className="mt-4 space-y-3">{claims.filter(c=>filter==="all"||c.status===filter).map(c=><li key={c.id} className="rounded-xl border p-4">
        <strong>GO ID: {c.go_id}</strong>
        <p className="mt-1 text-sm text-slate-600">ผู้ยื่น: {c.relationship==="self"?"นักกีฬา":c.relationship==="parent_guardian"?"ผู้ปกครอง":"ครูที่ได้รับอนุญาต"}</p>
        <p className="mt-1 text-sm text-slate-600">สถานะ: {c.status==="pending"?"รอตรวจสอบ":c.status}</p>
        <p className="mt-1 text-xs text-slate-500">วันที่ยื่น: {new Date(c.created_at).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})}</p>
        <button type="button" onClick={()=>setSelected(selected===c.id?null:c.id)} className="mt-3 w-full rounded-lg border border-blue-700 px-4 py-3 font-semibold text-blue-800">{selected===c.id?"ปิดรายการตรวจสอบ":"ดูรายการตรวจสอบ"}</button>
        {selected===c.id&&<div className="mt-3 rounded-xl bg-blue-50 p-4 text-sm">
         <strong>เช็กลิสต์ก่อนอนุมัติ</strong>
         <ol className="mt-2 list-inside list-decimal space-y-2">
          <li>ยืนยันตัวตนผู้ยื่นด้วยหลักฐานที่เหมาะสม</li>
          <li>ตรวจสิทธิ์ผู้ปกครองหรือผู้รับมอบหมาย (กรณีผู้เยาว์)</li>
          <li>ตรวจ GO ID กับทะเบียนนักกีฬาเดิม</li>
          <li>ตรวจ GO ID ไม่ถูกผูกกับบัญชีอื่น</li>
          <li>บันทึกชื่อผู้ตรวจและเหตุผลการอนุมัติ</li>
         </ol>
         <p className="mt-3 font-semibold text-amber-900">ปุ่มอนุมัติยังปิดใช้งาน เพื่อความปลอดภัยของข้อมูล</p>
        </div>}
       </li>)}</ul>}
     </>}
    </div>}
   </section>
  </div>
 </main>;
}