"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
type Claim={id:string;go_id:string;relationship:string;status:string;created_at:string};
export default function ClaimPage(){
 const supabase=useRef<SupabaseClient|null>(null);
 const [loading,setLoading]=useState(true);
 const [signedIn,setSignedIn]=useState(false);
 const [goId,setGoId]=useState("");
 const [relationship,setRelationship]=useState("self");
 const [confirmed,setConfirmed]=useState(false);
 const [submitting,setSubmitting]=useState(false);
 const [notice,setNotice]=useState("");
 const [claims,setClaims]=useState<Claim[]>([]);
 const [readFailed,setReadFailed]=useState(false);
 useEffect(()=>{let active=true;let dispose:(()=>void)|undefined;
  (async()=>{try{
   const response=await fetch("/api/auth/public-config",{cache:"no-store"});
   const config=await response.json();
   if(!response.ok||config.status!=="ok")throw new Error("Auth config");
   const client=createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   if(!active)return;
   supabase.current=client;
   const {data}=await client.auth.getSession();
   if(active){setSignedIn(Boolean(data.session));setLoading(false);}
   const listener=client.auth.onAuthStateChange((_e,session)=>{if(active)setSignedIn(Boolean(session));});
   dispose=()=>listener.data.subscription.unsubscribe();
  }catch{if(active){setNotice("ยังเชื่อมระบบเข้าสู่ระบบไม่ได้");setLoading(false);}}})();
  return()=>{active=false;dispose?.()};
 },[]);
 async function accessToken(){return (await supabase.current?.auth.getSession())?.data.session?.access_token;}
 async function readClaims(){
  const token=await accessToken();if(!token)return;
  try{
   const r=await fetch("/api/athletes/claim-requests",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
   const data=await r.json();
   if(!r.ok||data.status!=="ok"||!Array.isArray(data.requests))throw new Error();
   setClaims(data.requests);setReadFailed(false);
  }catch{setReadFailed(true);}
 }
 useEffect(()=>{if(signedIn)void readClaims();else setClaims([]);},[signedIn]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(submitting||!confirmed)return;
  setSubmitting(true);setNotice("");
  try{
   const token=await accessToken();if(!token)throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
   const response=await fetch("/api/athletes/claim-requests",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({goId:goId.trim(),relationship,consentConfirmed:true}),cache:"no-store"
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.message||"ส่งคำขอไม่สำเร็จ");
   setNotice("ส่งคำขอเรียบร้อยแล้ว โปรดรอผู้จัดการแข่งขันตรวจสอบตัวตนและความสัมพันธ์");
   setGoId("");setConfirmed(false);await readClaims();
  }catch(error){setNotice(error instanceof Error?error.message:"ไม่สามารถส่งคำขอได้");}
  finally{setSubmitting(false);}
 }
 return <main className="min-h-screen bg-[#f3f6fb] text-[#102a50]">
  <header className="bg-[#0b2854] px-5 py-5 font-extrabold tracking-widest text-[#f0c96f]"><Link href="/">GO TOURNAMENT</Link></header>
  <div className="mx-auto max-w-xl space-y-5 px-4 py-8">
   <section className="rounded-2xl bg-white p-6 shadow-sm">
    <p className="text-sm font-semibold text-blue-700">สำหรับนักกีฬาเดิม / ผู้ปกครอง / ครูที่ได้รับอนุญาต</p>
    <h1 className="mt-2 text-2xl font-extrabold">ขอผูกโปรไฟล์นักกีฬาเดิม</h1>
    <p className="mt-3 leading-relaxed text-slate-600">หากเคยแข่งขันอยู่แล้ว ไม่ต้องสร้างประวัติใหม่ ส่งคำขอเพื่อให้ผู้จัดตรวจสอบสิทธิ์และเชื่อมบัญชีกับ GO ID เดิม</p>
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">การส่งคำขอไม่ใช่การอนุมัติ ไม่เปิดเผยว่ามี GO ID นี้จริงหรือไม่ และยังไม่เปลี่ยนเจ้าของโปรไฟล์ใด ๆ</div>
    {loading?<p role="status" className="mt-5">กำลังตรวจสอบบัญชี...</p>:!signedIn?
      <div className="mt-5 rounded-xl bg-blue-50 p-4"><p className="font-semibold">กรุณาเข้าสู่ระบบด้วยอีเมลเดิมก่อน</p>
       <Link href="/athletes/search" className="mt-3 inline-flex rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white">ไปหน้าเข้าสู่ระบบ</Link>
      </div>:
      <form onSubmit={submit} className="mt-6 space-y-4">
       <div><label htmlFor="claim-goid" className="block font-semibold">GO ID หรือชื่อ–นามสกุลนักกีฬา</label>
        <input id="claim-goid" required minLength={3} maxLength={200} value={goId} onChange={e=>setGoId(e.target.value)} placeholder="กรอกชื่อ–นามสกุลหรือ GO ID เดิม" className="mt-2 w-full rounded-xl border border-slate-300 p-4 text-base"/>
       </div>
       <div><label htmlFor="claim-relation" className="block font-semibold">ความสัมพันธ์กับนักกีฬา</label>
        <select id="claim-relation" value={relationship} onChange={e=>setRelationship(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-4 text-base">
         <option value="self">เป็นนักกีฬาเอง</option>
         <option value="parent_guardian">เป็นบิดา มารดา หรือผู้ปกครองที่มีสิทธิ์</option>
         <option value="teacher_authorized">เป็นครูผู้ได้รับอนุญาต</option>
        </select>
       </div>
       <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
        <span>ฉันยืนยันว่ามีสิทธิ์ยื่นคำขอนี้ และเข้าใจว่าผู้จัดการแข่งขันอาจต้องตรวจเอกสารหรือหลักฐานเพิ่มเติม โดยเฉพาะบัญชีเด็กและเยาวชน</span>
       </label>
       <button disabled={!confirmed||goId.trim().length<3||submitting} className="w-full rounded-xl bg-blue-800 p-4 font-bold text-white disabled:opacity-50">{submitting?"กำลังส่งคำขอ...":"ส่งคำขอให้ผู้จัดตรวจสอบ"}</button>
      </form>}
    {notice&&<p role="status" className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-900">{notice}</p>}
   </section>
   {signedIn&&<section className="rounded-2xl bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold">คำขอของฉัน</h2><button type="button" onClick={()=>void readClaims()} className="rounded-lg border px-3 py-2 text-sm">ตรวจสถานะอีกครั้ง</button></div>
    {readFailed?<p className="mt-4 text-amber-800">ยังอ่านสถานะไม่ได้ กรุณาลองอีกครั้ง</p>:claims.length===0?<p className="mt-4 text-slate-500">ยังไม่มีคำขอในบัญชีนี้</p>:
     <ul className="mt-4 space-y-3">{claims.map(x=><li key={x.id} className="rounded-xl border p-4"><strong>GO ID: {x.go_id}</strong><p className="mt-1 text-sm text-slate-600">สถานะ: {x.status==="pending"?"รอผู้จัดตรวจสอบ":x.status==="approved"?"อนุมัติแล้ว":x.status==="rejected"?"ไม่อนุมัติ":x.status==="cancelled"?"ยกเลิก":x.status}</p></li>)}</ul>}
   </section>}
  </div>
 </main>;
}