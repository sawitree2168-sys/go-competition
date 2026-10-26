"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export default function OwnerSetupPage(){
 const client=useRef<SupabaseClient|null>(null);
 const [email,setEmail]=useState("");
 const [ready,setReady]=useState(false);
 const [working,setWorking]=useState(false);
 const [message,setMessage]=useState("");
 const [signedIn,setSignedIn]=useState(false);
 useEffect(()=>{
  let active=true;let cleanup:(()=>void)|undefined;
  (async()=>{try{
   const res=await fetch("/api/auth/public-config",{cache:"no-store"});
   const config=await res.json();
   if(!res.ok||config.status!=="ok")throw new Error("Configuration unavailable");
   const s=createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   if(!active)return;
   client.current=s;
   const session=await s.auth.getSession();
   if(active){setSignedIn(Boolean(session.data.session));setReady(true);}
   const listener=s.auth.onAuthStateChange((_event,state)=>{if(active)setSignedIn(Boolean(state));});
   cleanup=()=>listener.data.subscription.unsubscribe();
  }catch{if(active){setReady(true);setMessage("ไม่สามารถเชื่อมระบบยืนยันตัวตนได้");}}})();
  return()=>{active=false;cleanup?.()};
 },[]);
 async function register(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(working||!client.current)return;
  setWorking(true);setMessage("");
  try{
   const destination=window.location.origin+"/admin/owner-setup";
   const result=await client.current.auth.signInWithOtp({
    email:email.trim(),
    options:{shouldCreateUser:true,emailRedirectTo:destination}
   });
   if(result.error)throw result.error;
   setMessage("หากระบบส่งอีเมลได้สำเร็จ กรุณาตรวจกล่องจดหมายและยืนยันบัญชี หลังจากนั้นผู้ดูแลฐานข้อมูลต้องตรวจตัวตนและกำหนดบทบาท Owner ให้แยกต่างหาก");
  }catch{setMessage("ส่งลิงก์ยืนยันไม่ได้ กรุณาตรวจการตั้งค่า Email Provider และ Redirect URL ใน Supabase Auth");}
  finally{setWorking(false);}
 }
 return <main className="min-h-screen bg-[#f3f6fb] text-[#122b52]">
  <header className="bg-[#0b2854] px-5 py-5 font-bold tracking-wider text-[#f0ca74]"><Link href="/">GO TOURNAMENT</Link></header>
  <section className="mx-auto max-w-xl px-4 py-8"><div className="rounded-2xl bg-white p-6 shadow-sm">
   <p className="text-sm font-semibold text-blue-700">OWNER SETUP / PREVIEW</p>
   <h1 className="mt-2 text-2xl font-extrabold">เตรียมบัญชีเจ้าของระบบ</h1>
   <p className="mt-4 leading-relaxed text-slate-600">ขั้นตอนนี้ใช้สร้างบัญชี Supabase Auth เพื่อยืนยันอีเมลเท่านั้น การสมัครไม่ทำให้ได้รับสิทธิ์ Owner หรือ Admin จนกว่าผู้ดูแลฐานข้อมูลจะตรวจสอบและกำหนดสิทธิ์โดยตรง</p>
   <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">ห้ามใช้อีเมลของผู้อื่นเพื่อขอสิทธิ์ และยังไม่เปิดการอนุมัติคำขอผูก GO ID จริง</div>
   {!ready?<p role="status" className="mt-5">กำลังตรวจสอบระบบ...</p>:signedIn?
    <div className="mt-5 rounded-xl bg-green-50 p-4 text-green-900"><strong>เข้าสู่ระบบแล้ว</strong><p className="mt-2 text-sm">การยืนยันบัญชีสำเร็จในเบราว์เซอร์นี้ แต่ยังไม่มีสิทธิ์ Admin โดยอัตโนมัติ</p><Link href="/admin/athlete-claims" className="mt-3 inline-block font-semibold underline">ตรวจสิทธิ์ Admin</Link></div>:
    <form onSubmit={register} className="mt-6 space-y-3">
     <label htmlFor="owner-email" className="block font-semibold">อีเมลเจ้าของบัญชี</label>
     <input id="owner-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="owner@example.com" className="w-full rounded-xl border border-slate-300 p-4 text-base"/>
     <button disabled={working||!client.current} className="w-full rounded-xl bg-blue-800 p-4 font-bold text-white disabled:opacity-50">{working?"กำลังดำเนินการ...":"ส่งลิงก์ยืนยันอีเมล"}</button>
    </form>}
   {message&&<p role="status" className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">{message}</p>}
   <p className="mt-5 text-xs leading-relaxed text-slate-500">หมายเหตุ: ลิงก์เข้าสู่ระบบต้องได้รับอนุญาตใน Supabase Auth Redirect URLs ก่อนใช้งานได้จริง</p>
  </div></section>
 </main>;
}