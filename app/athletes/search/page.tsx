"use client";
import Link from "next/link";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Athlete = { athleteId: string; displayName: string; nickname?: string; level?: string };
type SearchResult = { status: "found"|"not_linked"|"verification_required"|"error"; athletes?: Athlete[]; message?: string };

export default function AthleteSearchPage() {
  const client=useRef<SupabaseClient | null>(null);
  const [ready,setReady]=useState(false);
  const [authenticated,setAuthenticated]=useState(false);
  const [email,setEmail]=useState("");
  const [authMessage,setAuthMessage]=useState("");
  const [authBusy,setAuthBusy]=useState(false);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState<"idle"|"loading"|"found"|"not_linked"|"verification_required"|"error">("idle");
  const [message,setMessage]=useState("");
  const [matches,setMatches]=useState<Athlete[]>([]);

  useEffect(()=>{
    let active=true;
    let cleanup:(()=>void)|undefined;
    (async()=>{
      try{
        const response=await fetch("/api/auth/public-config",{cache:"no-store"});
        const config=await response.json();
        if(!response.ok || config.status!=="ok" || typeof config.url!=="string" || typeof config.key!=="string") throw new Error("Auth unavailable");
        const supabase=createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
        if(!active)return;
        client.current=supabase;
        const current=await supabase.auth.getSession();
        if(active){setAuthenticated(Boolean(current.data.session));setReady(true);}
        const listener=supabase.auth.onAuthStateChange((_event,session)=>{
          if(active){setAuthenticated(Boolean(session));setMatches([]);setStatus("idle");}
        });
        cleanup=()=>listener.data.subscription.unsubscribe();
      }catch{if(active){setReady(true);setAuthMessage("ระบบยืนยันตัวตนยังไม่พร้อม กรุณาลองใหม่ภายหลัง");}}
    })();
    return()=>{active=false;cleanup?.()};
  },[]);

  async function sendLoginLink(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!client.current||authBusy)return;
    setAuthBusy(true);setAuthMessage("");
    try{
      const {error}=await client.current.auth.signInWithOtp({
        email:email.trim(),
        options:{shouldCreateUser:false,emailRedirectTo:window.location.origin+"/athletes/search"}
      });
      if(error)throw error;
      setAuthMessage("หากอีเมลนี้มีบัญชีอยู่แล้ว ระบบจะส่งลิงก์เข้าสู่ระบบ กรุณาตรวจอีเมล (ต้องกำหนด Redirect URL ใน Supabase Auth ให้ตรงกับ Preview)");
    }catch{
      setAuthMessage("ยังส่งลิงก์เข้าสู่ระบบไม่ได้ กรุณาลองใหม่หรือติดต่อผู้จัดการแข่งขัน");
    }finally{setAuthBusy(false);}
  }

  async function search(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!client.current||!authenticated){setStatus("verification_required");return;}
    const name=query.trim().replace(/\s+/g," ");
    if(name.length<2)return;
    setStatus("loading");setMessage("");setMatches([]);
    try{
      const session=await client.current.auth.getSession();
      if(!session.data.session?.access_token){setStatus("verification_required");return;}
      const response=await fetch("/api/athletes/search",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.data.session.access_token}`},
        body:JSON.stringify({name}),cache:"no-store"
      });
      const result:SearchResult=await response.json();
      if(result.status==="verification_required"){setStatus("verification_required");return;}
      if(!response.ok||result.status==="error")throw new Error(result.message || "ค้นหาขัดข้อง");
      if(result.status!=="found"&&result.status!=="not_linked")throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
      setMatches(result.athletes||[]);
      setStatus(result.status);
    }catch(error){
      setMessage(error instanceof Error?error.message:"ค้นหาไม่สำเร็จ กรุณาลองใหม่");
      setStatus("error");
    }
  }
  return <main className="min-h-screen bg-[#f3f6fb] text-[#122b52]">
    <header className="bg-[#0b2854] p-5 text-center text-xl font-extrabold tracking-widest text-[#f1ca73]">GO TOURNAMENT</header>
    <div className="mx-auto max-w-xl space-y-5 px-4 py-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-700">ขั้นตอนที่ 1 — ตรวจสอบโปรไฟล์ก่อนสมัคร</p>
        <h1 className="mt-2 text-2xl font-extrabold">ค้นหานักกีฬาเดิม</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">เพื่อคุ้มครองข้อมูลนักกีฬา โดยเฉพาะเด็กและเยาวชน ระบบจะให้เห็นเฉพาะโปรไฟล์ที่ผูกกับบัญชีที่ยืนยันตัวตนแล้ว</p>
        {!ready&&<p role="status" className="mt-4">กำลังเตรียมระบบเข้าสู่ระบบ...</p>}
        {ready&&!authenticated&&<>
          <form onSubmit={sendLoginLink} className="mt-6 space-y-3">
            <label htmlFor="account-email" className="block font-semibold">อีเมลบัญชีที่มีอยู่</label>
            <input id="account-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="email@example.com" className="w-full rounded-xl border border-slate-300 p-4 text-base"/>
            <button disabled={authBusy||!client.current} className="w-full rounded-xl bg-blue-800 p-4 font-bold text-white disabled:opacity-50">{authBusy?"กำลังดำเนินการ...":"ส่งลิงก์เข้าสู่ระบบ"}</button>
          </form>
          {authMessage&&<p role="status" className="mt-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">{authMessage}</p>}
          <p className="mt-4 text-sm text-slate-600">ยังไม่มีบัญชี? ระบบสมัครใหม่อยู่ระหว่างพัฒนา ไม่ควรสร้างข้อมูลนักกีฬาซ้ำ</p>
        </>}
        {authenticated&&<div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-green-50 p-3 text-sm text-green-900">
          <strong>ยืนยันตัวตนแล้ว</strong>
          <button type="button" className="rounded-lg border border-green-600 px-3 py-2 font-medium" onClick={async()=>{await client.current?.auth.signOut();setAuthenticated(false);setMatches([]);setStatus("idle")}}>ออกจากระบบ</button>
        </div>}
        <form onSubmit={search} className="mt-6 space-y-3">
          <label htmlFor="athlete-full-name" className="block font-semibold">ชื่อ-นามสกุลนักกีฬา</label>
          <input id="athlete-full-name" minLength={2} required value={query} onChange={e=>{setQuery(e.target.value);setStatus("idle");setMatches([])}} className="w-full rounded-xl border border-slate-300 p-4 text-base" placeholder="พิมพ์ชื่อ-นามสกุล"/>
          <button disabled={!authenticated||query.trim().length<2||status==="loading"} className="w-full rounded-xl bg-blue-800 p-4 font-bold text-white disabled:opacity-50">{status==="loading"?"กำลังค้นหา...":"ค้นหานักกีฬา"}</button>
        </form>
        {status==="error"&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{message}</p>}
        {status==="verification_required"&&<p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">กรุณาเข้าสู่ระบบและยืนยันอีเมลก่อนค้นหา</p>}
        {status==="not_linked"&&<p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">ไม่พบโปรไฟล์ชื่อนี้ที่ผูกกับบัญชีของคุณ ไม่ได้หมายความว่าไม่มีข้อมูลในระบบ หากเคยแข่งขัน สามารถส่งคำขอผูกโปรไฟล์ให้ผู้จัดตรวจสอบได้</p>}
        {status==="found"&&<div className="mt-5 space-y-2" aria-live="polite"><h2 className="font-bold">โปรไฟล์ที่คุณเข้าถึงได้</h2>{matches.map(a=><div key={a.athleteId} className="rounded-xl border p-4"><strong>{a.displayName}</strong><p className="text-sm text-slate-600">{[a.nickname,a.level].filter(Boolean).join(" • ")}</p></div>)}</div>}
        <Link href="/athletes/activate" className="mt-5 block rounded-xl bg-blue-800 px-5 py-4 text-center font-bold text-white">เริ่มใช้บัญชีครั้งแรก / ตั้งรหัสผ่านใหม่ ›</Link>
        <Link href="/athletes/claim" className="mt-5 block rounded-xl border border-blue-700 px-5 py-4 text-center font-semibold text-blue-800">ขอผูก GO ID เดิมกับบัญชีของฉัน</Link>
      </section>
      <p className="text-center text-xs text-slate-500">เว็บไซต์ Preview สำหรับทดสอบ ยังไม่เปิดรับสมัครแข่งขันจริง</p>
    </div>
  </main>;
}
