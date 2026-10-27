"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";

type Athlete={athleteId:string;displayName:string;nickname?:string;level?:string};
type SearchResult={status:string;athletes?:Athlete[];message?:string};

export default function FirstAccessPage(){
 const client=useRef<SupabaseClient|null>(null);
 const [ready,setReady]=useState(false),[signed,setSigned]=useState(false);
 const [name,setName]=useState(""),[email,setEmail]=useState("");
 const [step,setStep]=useState<"name"|"verify"|"set-password"|"complete">("name");
 const [matches,setMatches]=useState<Athlete[]>([]);
 const [password,setPassword]=useState(""),[repeat,setRepeat]=useState("");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 useEffect(()=>{let alive=true,release=()=>{};void(async()=>{
  try{
   const resp=await fetch("/api/auth/public-config",{cache:"no-store"});
   const cfg=await resp.json();
   if(!resp.ok||cfg.status!=="ok")throw Error("ระบบบัญชีไม่พร้อม");
   const c=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   if(!alive)return;client.current=c;
   const current=await c.auth.getSession();if(!alive)return;
   setSigned(Boolean(current.data.session));setReady(true);
   const watcher=c.auth.onAuthStateChange((_event,session)=>{if(alive)setSigned(Boolean(session))});
   release=()=>watcher.data.subscription.unsubscribe();
  }catch{if(alive){setError("ระบบยืนยันบัญชียังไม่พร้อม กรุณาลองใหม่ภายหลัง");setReady(true)}}
 })();return()=>{alive=false;release()}},[]);
 async function otp(e:FormEvent){e.preventDefault();if(!client.current||busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error}=await client.current.auth.signInWithOtp({
    email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:window.location.origin+"/athletes/activate"}
   });
   if(error)throw error;
   setNotice("หากอีเมลนี้ได้รับสิทธิ์แล้ว ระบบจะส่งลิงก์ยืนยันบัญชีให้ กรุณาตรวจอีเมลแล้วกลับมาที่หน้านี้");
  }catch{setError("ไม่สามารถส่งลิงก์ได้ กรุณาตรวจอีเมลที่ลงทะเบียนไว้หรือติดต่อผู้จัดการแข่งขัน")}
  finally{setBusy(false)}
 }
 async function verify(e:FormEvent){e.preventDefault();if(!client.current||!signed)return;
  setBusy(true);setError("");setMatches([]);
  try{
   const token=(await client.current.auth.getSession()).data.session?.access_token;
   if(!token)throw Error("กรุณายืนยันบัญชีอีกครั้ง");
   const r=await fetch("/api/athletes/search",{method:"POST",cache:"no-store",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({name:name.trim()})});
   const d:SearchResult=await r.json();
   if(!r.ok||d.status!=="found"||!Array.isArray(d.athletes)||d.athletes.length===0)
    throw Error("ยังไม่พบโปรไฟล์ที่ผูกกับบัญชีที่ยืนยันแล้ว โปรดส่งคำขอผูก GO ID เดิม");
   const normalized=name.trim().replace(/\s+/g," ").normalize("NFC");
   const own=d.athletes.filter(a=>a.displayName.trim().replace(/\s+/g," ").normalize("NFC")===normalized);
   if(own.length===0)throw Error("ชื่อ–นามสกุลไม่ตรงกับโปรไฟล์ที่บัญชีนี้มีสิทธิ์");
   setMatches(own);setStep("set-password");
  }catch(err){setError(err instanceof Error?err.message:"ยังไม่สามารถตรวจโปรไฟล์ได้")}
  finally{setBusy(false)}
 }
 async function save(e:FormEvent){e.preventDefault();if(!client.current||!signed||busy)return;
  if(password.length<10||password.length>128||password!==repeat||password==="123456"){
   setError("กรุณาตั้งรหัสใหม่ 10–128 ตัวอักษร และกรอกยืนยันให้ตรงกัน (ห้ามใช้ 123456)");return;
  }
  setBusy(true);setError("");setNotice("");
  try{
   const {error}=await client.current.auth.updateUser({password});
   if(error)throw error;
   setPassword("");setRepeat("");setStep("complete");
   setNotice("ตั้งรหัสผ่านเฉพาะบัญชีสำเร็จแล้ว สามารถใช้บัญชีที่ยืนยันตัวตนเข้าสู่ระบบในครั้งถัดไป");
  }catch{setError("ยังตั้งรหัสผ่านไม่ได้ โปรดตรวจเงื่อนไขความปลอดภัยหรือยืนยันบัญชีใหม่")}
  finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[#eef5ff] text-[#102b58]">
  <header className="bg-[#092853] px-5 py-5"><div className="mx-auto max-w-xl"><Link href="/" className="font-bold text-amber-200">‹ GO TOURNAMENT</Link></div></header>
  <div className="mx-auto max-w-xl space-y-5 px-4 py-8">
   <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
    <p className="text-sm font-bold text-blue-700">สำหรับนักกีฬาเดิมและผู้ปกครองที่ได้รับสิทธิ์</p>
    <h1 className="mt-2 text-2xl font-black sm:text-3xl">เข้าใช้งานครั้งแรก</h1>
    <p className="mt-3 leading-relaxed text-slate-700">ค้นหาด้วยชื่อ–นามสกุล ยืนยันว่าเป็นเจ้าของบัญชีหรือผู้ปกครองที่ได้รับสิทธิ์ แล้วตั้งรหัสผ่านเฉพาะตัว</p>
    <ol className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold sm:text-sm">
     {["ระบุชื่อ","ยืนยันตัวตน","ตั้งรหัสส่วนตัว"].map((x,i)=><li key={x} className={"rounded-xl p-3 "+(step==="complete"||(["name","verify","set-password"].indexOf(step)>=i)?"bg-blue-100 text-blue-900":"bg-slate-100 text-slate-500")}>{i+1}. {x}</li>)}
    </ol>
    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">เพื่อป้องกันคนอื่นเข้าสู่ประวัตินักกีฬาโดยทราบเพียงชื่อและรหัสเดียวกัน ระบบจะไม่ใช้ <strong>123456</strong> เป็นรหัสผ่านที่เปิดข้อมูลส่วนตัวได้ ต้องยืนยันตัวตนก่อนตั้งรหัสใหม่</p>
    {!ready&&<p role="status" className="mt-4">กำลังตรวจระบบบัญชี...</p>}
    {step!=="complete"&&<form onSubmit={signed?verify:(e)=>{e.preventDefault();setStep("verify")}} className="mt-5 space-y-3">
     <label className="block font-bold">ชื่อ–นามสกุลตามทะเบียนนักกีฬา
      <input value={name} onChange={e=>setName(e.target.value)} required minLength={3} maxLength={120} autoComplete="name" placeholder="ชื่อ นามสกุล" className="mt-2 min-h-12 w-full rounded-xl border border-blue-200 p-3"/>
     </label>
     {(step==="name"&&!signed)&&<button type="submit" disabled={!ready||name.trim().length<3} className="min-h-12 w-full rounded-xl bg-blue-800 px-5 font-bold text-white disabled:opacity-40">ถัดไป: ยืนยันตัวตน</button>}
     {signed&&step!=="set-password"&&<button disabled={busy} className="min-h-12 w-full rounded-xl bg-blue-800 px-5 font-bold text-white disabled:opacity-40">ตรวจชื่อกับบัญชีที่ยืนยันแล้ว</button>}
    </form>}
    {step==="verify"&&!signed&&<form onSubmit={otp} className="mt-5 space-y-3">
     <label className="block font-bold">อีเมลที่ลงทะเบียนไว้
      <input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-blue-200 p-3" placeholder="email@example.com"/>
     </label>
     <button disabled={busy||!ready} className="min-h-12 w-full rounded-xl bg-blue-800 px-5 font-bold text-white disabled:opacity-40">{busy?"กำลังส่ง...":"ส่งลิงก์ยืนยันตัวตน"}</button>
     <Link href="/athletes/claim" className="block rounded-xl border border-blue-300 p-3 text-center font-semibold">ยังไม่มีบัญชีที่ผูกกับ GO ID? ขอให้ผู้จัดตรวจสอบ</Link>
    </form>}
    {step==="set-password"&&signed&&<form onSubmit={save} className="mt-5 space-y-4">
     <p className="rounded-xl bg-blue-50 p-3 font-bold text-blue-900">ยืนยันสิทธิ์โปรไฟล์: {matches.map(x=>x.displayName).join(", ")}</p>
     <label className="block font-bold">รหัสผ่านใหม่ (อย่างน้อย 10 ตัวอักษร)<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} maxLength={128} className="mt-2 min-h-12 w-full rounded-xl border p-3"/></label>
     <label className="block font-bold">ยืนยันรหัสผ่านใหม่<input type="password" autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)} required minLength={10} maxLength={128} className="mt-2 min-h-12 w-full rounded-xl border p-3"/></label>
     <button disabled={busy||password!==repeat||password.length<10} className="min-h-12 w-full rounded-xl bg-blue-800 p-3 font-black text-white disabled:opacity-40">{busy?"กำลังตั้งรหัส...":"บันทึกรหัสผ่านส่วนตัว"}</button>
    </form>}
    {step==="complete"&&<div className="mt-5 space-y-3 rounded-xl bg-green-50 p-5"><h2 className="text-xl font-black text-green-900">ตั้งรหัสผ่านเรียบร้อย</h2><Link href="/athletes/search" className="inline-flex min-h-12 items-center rounded-xl bg-blue-800 px-5 font-bold text-white">เปิดข้อมูลนักกีฬา ›</Link></div>}
    {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice&&<p role="status" className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">{notice}</p>}
   </section>
  </div>
 </main>;
}
