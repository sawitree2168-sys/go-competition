"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
 async function load(){
  const token=(await client.current?.auth.getSession())?.data.session?.access_token;
  if(!token){setState("denied");return;}
  setState("loading");setMessage("");setClaims([]);
  try{
   const res=await fetch("/api/admin/athlete-claims",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
   const data=await res.json();
   if(res.status===403){setState("denied");setMessage(data.message||"ไม่ได้รับสิทธิ์");return;}
   if(!res.ok||data.status!=="ok"||!Array.isArray(data.requests))throw new Error(data.message||"อ่านข้อมูลไม่สำเร็จ");
   setRole(data.role);setClaims(data.requests);setState("ok");
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
    {!authReady&&<p role="status" className="mt-5">กำลังตรวจสอบการเข้าสู่ระบบ...</p>}
    {authReady&&!signedIn&&<div className="mt-5 rounded-xl bg-blue-50 p-4"><p>กรุณาเข้าสู่ระบบก่อน</p><Link href="/athletes/search" className="mt-2 inline-block font-semibold text-blue-700 underline">ไปหน้าเข้าสู่ระบบ</Link></div>}
    {signedIn&&<div className="mt-5">
     <button type="button" onClick={()=>void load()} className="rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white">ตรวจสิทธิ์และโหลดคำขออีกครั้ง</button>
     {state==="loading"&&<p role="status" className="mt-4">กำลังโหลดรายการ...</p>}
     {state==="denied"&&<p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">{message||"ไม่มีสิทธิ์เข้าถึงรายการคำขอ โปรดให้ผู้ดูแลระบบกำหนดบทบาทก่อน"}</p>}
     {state==="error"&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{message}</p>}
     {state==="ok"&&<>
      <p className="mt-4 text-sm text-slate-600">บทบาท: {role} • รายการที่อ่านได้: {claims.length}</p>
      {claims.length===0?<p className="mt-4 rounded-xl bg-slate-50 p-5 text-slate-600">ยังไม่มีคำขอสำหรับตรวจสอบ</p>:
       <ul className="mt-4 space-y-3">{claims.map(c=><li key={c.id} className="rounded-xl border p-4">
        <strong>GO ID: {c.go_id}</strong>
        <p className="mt-1 text-sm text-slate-600">ผู้ยื่น: {c.relationship==="self"?"นักกีฬา":c.relationship==="parent_guardian"?"ผู้ปกครอง":"ครูที่ได้รับอนุญาต"}</p>
        <p className="mt-1 text-sm text-slate-600">สถานะ: {c.status==="pending"?"รอตรวจสอบ":c.status}</p>
        <p className="mt-1 text-xs text-slate-500">วันที่ยื่น: {new Date(c.created_at).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})}</p>
       </li>)}</ul>}
     </>}
    </div>}
   </section>
  </div>
 </main>;
}