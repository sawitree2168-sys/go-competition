"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Item={slot:string;device:string;asset_id:string;image_url:string;alt_text:string;status:string;drive_file_id:string|null;sheet_row_reference:string|null;updated_at?:string};
const defaults:Item={slot:"home",device:"desktop",asset_id:"HOME-DSK-001",image_url:"/banners/home/home_desktop.svg",alt_text:"",status:"draft",drive_file_id:null,sheet_row_reference:null};
const statuses=["draft","approved","published","archived"];
export default function MediaManagement(){
 const client=useRef<SupabaseClient|null>(null);
 const [signed,setSigned]=useState(false),[ready,setReady]=useState(false),[email,setEmail]=useState("");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[items,setItems]=useState<Item[]>([]);
 const [form,setForm]=useState<Item>(defaults),[existing,setExisting]=useState(false),[approval,setApproval]=useState(false);
 useEffect(()=>{let alive=true;let un=()=>{};void(async()=>{try{
  const r=await fetch("/api/auth/public-config",{cache:"no-store"});const cfg=await r.json();if(!r.ok||cfg.status!=="ok")throw Error();
  const c=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});if(!alive)return;client.current=c;
  const sess=await c.auth.getSession();if(alive){setSigned(Boolean(sess.data.session));setReady(true)}
  const l=c.auth.onAuthStateChange((_e,s)=>{if(alive)setSigned(Boolean(s))});un=()=>l.data.subscription.unsubscribe();
 }catch{if(alive){setReady(true);setMessage("ไม่สามารถเชื่อมระบบสิทธิ์ผู้ดูแลได้")}}})();return()=>{alive=false;un()};},[]);
 async function api(method="GET",body?:unknown){
  const token=(await client.current?.auth.getSession())?.data.session?.access_token;
  if(!token)throw Error("กรุณาเข้าสู่ระบบใหม่");
  const r=await fetch("/api/admin/site-media",{method,headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
  const d=await r.json();if(!r.ok||d.status!=="ok")throw Error(d.message||"ไม่สามารถบันทึกข้อมูลได้");return d;
 }
 async function load(){setBusy(true);setMessage("");try{const d=await api();setItems(d.items)}catch(e){setMessage(e instanceof Error?e.message:"โหลดข้อมูลไม่ได้")}finally{setBusy(false)}}
 useEffect(()=>{if(signed)void load()},[signed]);
 async function login(e:FormEvent){e.preventDefault();if(!client.current)return;setBusy(true);
  const {error}=await client.current.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:window.location.href}});
  setMessage(error?"ส่งลิงก์เข้าใช้ไม่ได้":"ส่งลิงก์เข้าสู่ระบบแล้ว กรุณาตรวจอีเมล");setBusy(false);
 }
 function edit(item:Item){setForm({...item});setExisting(true);setApproval(false)}
 function patch<K extends keyof Item>(key:K,value:Item[K]){setForm(old=>({...old,[key]:value}))}
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");
  try{
   const confirm_publish=approval&&(form.status==="approved"||form.status==="published");
   if(["approved","published"].includes(form.status)&&!confirm_publish)throw Error("กรุณาติ๊กยืนยันก่อนอนุมัติหรือเผยแพร่");
   await api(existing?"PUT":"POST",{...form,confirm_publish});
   setMessage(form.status==="published"?"บันทึกสถานะเผยแพร่แล้ว — โปรดตรวจภาพบนเว็บไซต์หลัง Deploy":"บันทึกรายการในทะเบียนสื่อเรียบร้อย");
   await load();
  }catch(e){setMessage(e instanceof Error?e.message:"บันทึกไม่สำเร็จ")}finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[#f0f5fc] text-[#0a2d60]">
  <header className="bg-[#082a60] p-5 text-white"><div className="mx-auto max-w-6xl">
   <Link href="/admin/tournaments" className="font-bold text-amber-200">‹ กลับศูนย์จัดการแข่งขัน</Link>
   <h1 className="mt-3 text-3xl font-black">คลังสื่อเว็บไซต์ GO TOURNAMENT</h1>
   <p className="mt-2 text-blue-100">จัดการภาพตามหน้าและอุปกรณ์ • อนุมัติก่อนเผยแพร่</p>
  </div></header>
  <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
   <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Google Drive เก็บต้นฉบับ · Google Sheets เป็นทะเบียน · เว็บไซต์โหลด URL ของภาพที่อนุมัติจาก Supabase เท่านั้น การแก้ใน Sheet ยังไม่ซิงก์เข้าเว็บอัตโนมัติ</div>
   <div className="flex flex-wrap gap-3"><a className="rounded-xl bg-white px-4 py-3 font-bold text-blue-900" href="https://docs.google.com/spreadsheets/d/1wSoV5JoQJgNeUmV85_1T9RU8SATa8uRZSApYpTyFdUM/edit" target="_blank" rel="noopener noreferrer">เปิดทะเบียน Google Sheet ↗</a><a className="rounded-xl bg-white px-4 py-3 font-bold text-blue-900" href="https://drive.google.com/drive/folders/1y4-J6kx7uQpGhLfgu5cqGm5Dg0vsM03k" target="_blank" rel="noopener noreferrer">เปิดโฟลเดอร์ Drive ↗</a></div>
   {!ready&&<p>กำลังตรวจสิทธิ์...</p>}
   {ready&&!signed&&<form onSubmit={login} className="space-y-3 rounded-2xl bg-white p-5"><h2 className="text-xl font-black">เจ้าหน้าที่ Owner / Admin เท่านั้น</h2>
    <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="อีเมลผู้ดูแล" className="w-full rounded-xl border p-4"/>
    <button disabled={busy} className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white">ส่งลิงก์เข้าสู่ระบบ</button></form>}
   {message&&<p role="status" className="rounded-xl bg-white p-4">{message}</p>}
   {signed&&<>
    <section className="rounded-2xl bg-white p-5 shadow-sm">
     <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-black">ทะเบียนภาพ ({items.length})</h2><button disabled={busy} onClick={()=>void load()} className="rounded-xl border px-4 py-3 font-bold">รีเฟรช</button></div>
     <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(x=><button key={x.slot+x.device} onClick={()=>edit(x)} className="rounded-xl border bg-slate-50 p-4 text-left">
      <p className="font-black">{x.asset_id}</p><p className="text-sm">{x.slot} · {x.device}</p><p className="mt-1 break-words text-xs text-slate-500">{x.image_url}</p>
      <p className="mt-2 font-bold">{x.status==="published"?"เผยแพร่":x.status==="approved"?"อนุมัติแล้ว":x.status==="archived"?"เก็บถาวร":"แบบร่าง"} · แตะเพื่อแก้ไข</p>
     </button>)}</div>
     {items.length===0&&<p className="mt-3 text-slate-600">ยังไม่มีรายการภาพที่บันทึกในฐานข้อมูล</p>}
    </section>
    <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
     <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-black">{existing?"แก้ไขภาพที่เลือก":"เพิ่มภาพแบบร่าง"}</h2><button type="button" onClick={()=>{setExisting(false);setApproval(false);setForm(defaults)}} className="rounded-xl border px-4 py-2">สร้างใหม่</button></div>
     <div className="grid gap-3 sm:grid-cols-2">
      <label className="font-bold">หน้า / Slot<input required disabled={existing} value={form.slot} onChange={e=>patch("slot",e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
      <label className="font-bold">อุปกรณ์<select disabled={existing} value={form.device} onChange={e=>patch("device",e.target.value)} className="mt-2 w-full rounded-xl border p-3"><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label>
      <label className="font-bold">Asset ID<input required value={form.asset_id} onChange={e=>patch("asset_id",e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
      <label className="font-bold">สถานะ<select value={form.status} onChange={e=>{patch("status",e.target.value);setApproval(false)}} className="mt-2 w-full rounded-xl border p-3">{statuses.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     </div>
     <label className="block font-bold">URL ภาพสำหรับเว็บไซต์<input required value={form.image_url} onChange={e=>patch("image_url",e.target.value)} placeholder="/banners/home/home_desktop.svg" className="mt-2 w-full rounded-xl border p-3"/></label>
     <label className="block font-bold">คำอธิบายภาพ<input value={form.alt_text} onChange={e=>patch("alt_text",e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
     <label className="block font-bold">Drive File ID (เก็บอ้างอิง ไม่ใช่ URL ภาพหน้าเว็บ)<input value={form.drive_file_id||""} onChange={e=>patch("drive_file_id",e.target.value||null)} className="mt-2 w-full rounded-xl border p-3"/></label>
     <label className="block font-bold">ตำแหน่งใน Sheet<input value={form.sheet_row_reference||""} onChange={e=>patch("sheet_row_reference",e.target.value||null)} placeholder="ASSET_REGISTER!A2" className="mt-2 w-full rounded-xl border p-3"/></label>
     {["approved","published"].includes(form.status)&&<label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 font-bold"><input type="checkbox" checked={approval} onChange={e=>setApproval(e.target.checked)} className="mt-1 h-5 w-5"/>ฉันตรวจสอบภาพนี้แล้ว และยืนยันสถานะ {form.status==="published"?"เผยแพร่บนเว็บไซต์":"อนุมัติ"}</label>}
     <button disabled={busy} className="w-full rounded-xl bg-[#0a4fb5] p-4 font-black text-white disabled:opacity-40">{busy?"กำลังบันทึก...":"บันทึกภาพ"}</button>
    </form>
   </>}
  </div>
 </main>;
}
