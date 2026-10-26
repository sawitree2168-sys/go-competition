"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
type Claim={id:string;go_id:string;relationship:string;status:string;created_at:string};
type Review={id:string;claim_id:string;identity_checked:boolean;relationship_checked:boolean;go_id_checked:boolean;duplicate_checked:boolean;note:string;created_at:string};
const defaultChecks={identityChecked:false,relationshipChecked:false,goIdChecked:false,duplicateChecked:false};
const options=[
 {key:"identityChecked",label:"ตรวจสอบตัวตนผู้ยื่นแล้ว"},
 {key:"relationshipChecked",label:"ตรวจสิทธิ์หรือความสัมพันธ์กับนักกีฬาแล้ว"},
 {key:"goIdChecked",label:"ตรวจหมายเลข GO ID กับทะเบียนเดิมแล้ว"},
 {key:"duplicateChecked",label:"ตรวจประวัติการผูกบัญชีซ้ำแล้ว"}
] as const;
export default function ReviewPage(){
 const client=useRef<SupabaseClient|null>(null);
 const [loading,setLoading]=useState(true);
 const [signedIn,setSignedIn]=useState(false);
 const [claims,setClaims]=useState<Claim[]>([]);
 const [reviews,setReviews]=useState<Review[]>([]);
 const [claimId,setClaimId]=useState("");
 const [checks,setChecks]=useState(defaultChecks);
 const [note,setNote]=useState("");
 const [working,setWorking]=useState(false);
 const [message,setMessage]=useState("");
 const [role,setRole]=useState("");
 async function token(){return (await client.current?.auth.getSession())?.data.session?.access_token;}
 async function load(){
  const jwt=await token();if(!jwt)return;
  try{
   const headers={Authorization:"Bearer "+jwt};
   const [c,r]=await Promise.all([
    fetch("/api/admin/athlete-claims",{headers,cache:"no-store"}),
    fetch("/api/admin/claim-reviews",{headers,cache:"no-store"})
   ]);
   const claimsData=await c.json();const reviewsData=await r.json();
   if(!c.ok||!r.ok||claimsData.status!=="ok"||reviewsData.status!=="ok")throw new Error("ยังอ่านข้อมูลตรวจสอบไม่ได้");
   setRole(claimsData.role);setClaims(claimsData.requests);setReviews(reviewsData.reviews);setMessage("");
  }catch{setMessage("บัญชีนี้อาจยังไม่มีสิทธิ์เจ้าหน้าที่ หรือระบบอ่านข้อมูลขัดข้อง");}
 }
 useEffect(()=>{let alive=true;let unsubscribe:(()=>void)|undefined;
  (async()=>{try{
   const r=await fetch("/api/auth/public-config",{cache:"no-store"});const cfg=await r.json();
   if(!r.ok||cfg.status!=="ok")throw Error("config");
   const s=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   if(!alive)return;
   client.current=s;
   const session=await s.auth.getSession();
   if(alive){setSignedIn(Boolean(session.data.session));setLoading(false);}
   const sub=s.auth.onAuthStateChange((_e,state)=>{if(alive)setSignedIn(Boolean(state));});
   unsubscribe=()=>sub.data.subscription.unsubscribe();
  }catch{if(alive){setLoading(false);setMessage("ไม่สามารถตรวจสอบการเข้าสู่ระบบได้");}}})();
  return()=>{alive=false;unsubscribe?.()};
 },[]);
 useEffect(()=>{if(signedIn)void load();},[signedIn]);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(working||!claimId)return;
  setWorking(true);setMessage("");
  try{
   const jwt=await token();if(!jwt)throw Error("กรุณาเข้าสู่ระบบอีกครั้ง");
   const r=await fetch("/api/admin/claim-reviews",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+jwt},
    body:JSON.stringify({claimId,...checks,note:note.trim()}),cache:"no-store"
   });
   const result=await r.json();
   if(!r.ok)throw Error(result.message||"บันทึกไม่สำเร็จ");
   setNote("");setChecks(defaultChecks);setClaimId("");
   await load();setMessage("บันทึกผลตรวจสำเร็จ โดยยังไม่ได้อนุมัติหรือผูก GO ID");
  }catch(error){setMessage(error instanceof Error?error.message:"บันทึกไม่สำเร็จ");}
  finally{setWorking(false);}
 }
 const claim=claims.find(x=>x.id===claimId);
 const saved=reviews.filter(x=>x.claim_id===claimId);
 return <main className="min-h-screen bg-[#f3f6fb] text-[#122b52]">
  <header className="bg-[#0b2854] p-5 font-bold tracking-wider text-[#efc875]"><Link href="/">GO TOURNAMENT</Link></header>
  <section className="mx-auto max-w-xl space-y-5 px-4 py-8">
   <div className="rounded-2xl bg-white p-6 shadow-sm">
    <p className="text-sm font-semibold text-blue-700">ADMIN / REVIEW</p>
    <h1 className="mt-2 text-2xl font-extrabold">บันทึกการตรวจคำขอ GO ID</h1>
    <p className="mt-3 text-slate-600">แยกผลตรวจภายในจากการอนุมัติจริง เพื่อป้องกันการผูกบัญชีผิดคน</p>
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">ยังไม่มีการอนุมัติหรือเปลี่ยนเจ้าของ GO ID จากหน้านี้ และไม่รับไฟล์หลักฐานส่วนตัว</div>
    <Link href="/admin/athlete-claims" className="mt-4 inline-block font-semibold text-blue-800 underline">กลับหน้ารายการคำขอ</Link>
    {loading&&<p role="status" className="mt-5">กำลังตรวจสิทธิ์...</p>}
    {!loading&&!signedIn&&<p className="mt-5">กรุณาเข้าสู่ระบบจากหน้ารายการคำขอก่อน</p>}
    {signedIn&&<div className="mt-5 space-y-4">
     {role&&<p className="font-semibold">สิทธิ์: {role} · คำขอที่อ่านได้: {claims.length}</p>}
     <button type="button" onClick={()=>void load()} className="rounded-lg border border-blue-700 px-4 py-3 font-semibold">โหลดข้อมูลล่าสุด</button>
     {claims.length===0?<p className="rounded-lg bg-slate-50 p-4">ยังไม่มีคำขอให้ตรวจสอบ</p>:
      <form onSubmit={save} className="space-y-4">
       <label htmlFor="claim-select" className="block font-semibold">เลือกคำขอที่รอตรวจสอบ</label>
       <select id="claim-select" required value={claimId} onChange={e=>{setClaimId(e.target.value);setNote("");setChecks(defaultChecks);}} className="w-full rounded-lg border border-slate-300 p-4 text-base">
        <option value="">เลือก GO ID</option>
        {claims.filter(x=>x.status==="pending").map(x=><option key={x.id} value={x.id}>{x.go_id} · {x.relationship}</option>)}
       </select>
       {claim&&<div className="space-y-4">
        <p className="rounded-lg bg-blue-50 p-3 text-sm">หมายเลขที่ยื่น: <strong>{claim.go_id}</strong> · สถานะ: รอตรวจสอบ</p>
        {saved.map(x=><div key={x.id} className="rounded-lg border border-green-200 p-4 text-sm">
         <strong>มีบันทึกตรวจสอบแล้ว</strong>
         <p className="mt-1">{new Date(x.created_at).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})}</p>
         <p className="mt-2 whitespace-pre-wrap">{x.note}</p>
         <p>ตัวตน {x.identity_checked?"✓":"–"} · ความสัมพันธ์ {x.relationship_checked?"✓":"–"} · GO ID {x.go_id_checked?"✓":"–"} · ข้อมูลซ้ำ {x.duplicate_checked?"✓":"–"}</p>
        </div>)}
        <p className="font-semibold">ทำเครื่องหมายเฉพาะข้อที่ตรวจสอบแล้ว</p>
        {options.map(({key,label})=><label key={key} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
         <input type="checkbox" className="mt-1 h-5 w-5" checked={checks[key]} onChange={e=>setChecks(v=>({...v,[key]:e.target.checked}))}/>
         <span>{label}</span>
        </label>)}
        <label htmlFor="review-note" className="block font-semibold">หมายเหตุผลตรวจ</label>
        <textarea id="review-note" rows={4} required minLength={12} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} className="w-full rounded-lg border border-slate-300 p-3 text-base" placeholder="สรุปสิ่งที่ตรวจและสิ่งที่ต้องดำเนินการต่อ"/>
        <p className="text-xs text-slate-600">ห้ามใส่เลขบัตรประชาชน วันเกิด ที่อยู่หรือรายละเอียดเอกสารในหมายเหตุ เจ้าหน้าที่แต่ละคนบันทึกต่อคำขอได้เพียงครั้งเดียว</p>
        <button disabled={working||note.trim().length<12} className="w-full rounded-xl bg-blue-800 p-4 font-bold text-white disabled:opacity-50">{working?"กำลังบันทึก...":"บันทึกผลตรวจ (ไม่อนุมัติ)"}</button>
       </div>}
      </form>}
    </div>}
    {message&&<p role="status" className="mt-4 rounded-lg bg-blue-50 p-4 text-sm">{message}</p>}
   </div>
  </section>
 </main>;
}