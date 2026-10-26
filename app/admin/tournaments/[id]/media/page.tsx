"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Media={id:string;storage_path:string;media_kind:string;caption:string|null;created_at:string;public_approved:boolean};
export default function TournamentMedia({params}:{params:Promise<{id:string}>}){
 const [id,setId]=useState(""),[authReady,setAuthReady]=useState(false),[signed,setSigned]=useState(false);
 const [email,setEmail]=useState(""),[file,setFile]=useState<File|null>(null),[kind,setKind]=useState("featured");
 const [caption,setCaption]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [list,setList]=useState<Media[]>([]),[urls,setUrls]=useState<Record<string,string>>({});
 const client=useRef<SupabaseClient|null>(null);
 useEffect(()=>{let active=true;void params.then(x=>{if(active)setId(x.id)});return()=>{active=false}},[params]);
 useEffect(()=>{let active=true;let unsubscribe=()=>{};void(async()=>{try{
  const r=await fetch("/api/auth/public-config",{cache:"no-store"});const cfg=await r.json();if(!r.ok||cfg.status!=="ok")throw Error();
  const c=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!active)return;client.current=c;
  const session=await c.auth.getSession();if(active){setSigned(Boolean(session.data.session));setAuthReady(true)}
  const sub=c.auth.onAuthStateChange((_event,s)=>{if(active)setSigned(Boolean(s))});
  unsubscribe=()=>sub.data.subscription.unsubscribe();
 }catch{if(active){setAuthReady(true);setMessage("ยังเชื่อมระบบเข้าสู่ระบบไม่ได้")}}})();
 return()=>{active=false;unsubscribe()};},[]);
 async function api(path:string,method="GET",body?:unknown){
  const token=(await client.current?.auth.getSession())?.data.session?.access_token;
  if(!token)throw Error("กรุณาเข้าสู่ระบบอีกครั้ง");
  const r=await fetch(path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
  const d=await r.json();if(!r.ok||d.status!=="ok")throw Error(d.message||"ระบบไม่ตอบสนอง");
  return d;
 }
 async function load(){if(!id||!signed||!client.current)return;
  setMessage("");try{const d=await api("/api/admin/tournament-media?tournament_id="+encodeURIComponent(id));setList(d.media);
   const found:Record<string,string>={};
   await Promise.all((d.media as Media[]).map(async m=>{
    const r=await client.current!.storage.from("gt-event-featured").createSignedUrl(m.storage_path,1200);
    if(!r.error&&r.data?.signedUrl)found[m.id]=r.data.signedUrl;
   }));
   setUrls(found);
  }catch(e){setMessage(e instanceof Error?e.message:"โหลดภาพไม่สำเร็จ")}
 }
 useEffect(()=>{if(id&&signed)void load()},[id,signed]);
 async function login(e:FormEvent){e.preventDefault();if(!client.current)return;setBusy(true);
  const {error}=await client.current.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:window.location.href}});
  setMessage(error?"ส่งอีเมลไม่สำเร็จ":"ส่งลิงก์เข้าสู่ระบบแล้ว");setBusy(false);
 }
 async function upload(e:FormEvent){e.preventDefault();if(!file||!client.current||!id)return;
  setBusy(true);setMessage("");
  try{
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024)throw Error("รองรับ JPG, PNG, WebP ขนาดไม่เกิน 8 MB");
   const suffix=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";
   const path=id+"/"+crypto.randomUUID()+"."+suffix;
   const r=await client.current.storage.from("gt-event-featured").upload(path,file,{contentType:file.type,upsert:false});
   if(r.error)throw Error("อัปโหลดภาพไม่สำเร็จ: "+r.error.message);
   await api("/api/admin/tournament-media","POST",{tournament_id:id,storage_path:path,media_kind:kind,caption});
   setFile(null);setCaption("");setMessage("บันทึกภาพแบบร่างแล้ว ยังไม่เผยแพร่สาธารณะ");await load();
  }catch(e){setMessage(e instanceof Error?e.message:"เกิดข้อผิดพลาดในการอัปโหลด")}
  finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[#eef3fb] text-[#102c59]">
 <header className="bg-[#092651] p-5 text-white"><div className="mx-auto max-w-4xl">
  <Link href="/admin/tournaments" className="font-semibold text-[#f0cd7e]">‹ ศูนย์จัดการแข่งขัน</Link>
  <h1 className="mt-3 text-3xl font-extrabold">คลังภาพการแข่งขัน</h1>
  <p className="mt-2 text-blue-100">อัปโหลดเฉพาะภาพเด่น ส่วนภาพทั้งหมดเก็บใน Google Drive</p>
 </div></header>
 <div className="mx-auto max-w-4xl space-y-5 px-4 py-7">
  <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">ภาพที่อัปโหลดเป็นแบบร่างที่เข้าถึงได้เฉพาะเจ้าหน้าที่ จนกว่าจะผ่านการตรวจสิทธิ์เผยแพร่ โดยเฉพาะภาพของนักกีฬาเด็ก</p>
  {!authReady&&<p>กำลังตรวจบัญชี...</p>}
  {authReady&&!signed&&<form onSubmit={login} className="space-y-3 rounded-2xl bg-white p-5">
   <h2 className="font-bold">เข้าสู่ระบบเจ้าหน้าที่</h2>
   <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="อีเมล Owner/Admin" className="w-full rounded-lg border p-4"/>
   <button disabled={busy} className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white">ส่งลิงก์เข้าระบบ</button>
  </form>}
  {signed&&<form onSubmit={upload} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
   <h2 className="text-xl font-extrabold">เพิ่มภาพเด่นลงรายการแข่งขัน</h2>
   <label className="block font-semibold">ประเภทภาพ
    <select value={kind} onChange={e=>setKind(e.target.value)} className="mt-2 w-full rounded-lg border p-3">
     <option value="featured">ภาพเด่น</option><option value="cover">ภาพหน้าปก</option><option value="poster">โปสเตอร์</option><option value="news">ภาพข่าว</option>
    </select>
   </label>
   <label className="block font-semibold">เลือกไฟล์ภาพ (ไม่เกิน 8 MB)
    <input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 w-full rounded-lg border p-3"/>
   </label>
   <label className="block font-semibold">คำอธิบาย (ไม่จำเป็น)
    <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={280} className="mt-2 w-full rounded-lg border p-3"/>
   </label>
   <button disabled={busy||!file} className="rounded-xl bg-blue-800 px-5 py-4 font-bold text-white disabled:opacity-50">{busy?"กำลังอัปโหลด...":"บันทึกภาพแบบร่าง"}</button>
  </form>}
  {message&&<p role="status" className="rounded-xl bg-white p-4 text-sm">{message}</p>}
  {signed&&<section className="rounded-2xl bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-extrabold">ภาพที่เชื่อมกับรายการ</h2><button onClick={()=>void load()} className="rounded-lg border px-3 py-2 font-semibold">รีเฟรช</button></div>
    <p className="mt-2 text-sm text-slate-600">จำนวนที่บันทึก {list.length} ภาพ</p>
    {list.length===0?<p className="mt-4 rounded-xl bg-slate-50 p-5 text-slate-600">ยังไม่ได้เพิ่มภาพเด่น</p>:
     <div className="mt-4 grid gap-4 sm:grid-cols-2">{list.map(m=><div key={m.id} className="overflow-hidden rounded-xl border">
      {urls[m.id]?<img src={urls[m.id]} alt={m.caption||"ภาพแข่งขันแบบร่าง"} className="aspect-video w-full object-cover"/>:<div className="flex aspect-video items-center justify-center bg-slate-100">ภาพอยู่ใน Private Storage</div>}
      <div className="p-3"><p className="font-bold">{m.media_kind} • {m.public_approved?"อนุมัติ":"แบบร่าง"}</p><p className="mt-1 text-sm text-slate-600">{m.caption||"ไม่มีคำอธิบาย"}</p></div>
     </div>)}</div>}
   </section>}
 </div></main>;
}
