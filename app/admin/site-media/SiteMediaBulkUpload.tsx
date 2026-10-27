"use client";
import {useState} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";

type Device="desktop"|"tablet"|"mobile";
type BatchItem={file:File;slot:string;device:Device;assetId:string};
type BatchStatus={name:string;result:string;ok:boolean};
const names=new Set(["gallery","calendar","contact","payment","registration_status","checkin","pairing","referee","admin"]);
const accepted=/^([a-z][a-z0-9_]*)_(desktop|tablet|mobile)\.webp$/;
const maxBytes=6*1024*1024;
const limit=30;
function parse(file:File):BatchItem|null{
 const m=accepted.exec(file.name.toLowerCase());
 if(!m||!names.has(m[1])||file.size===0||file.size>maxBytes)return null;
 return {file,slot:m[1],device:m[2] as Device,assetId:(m[1]+"-"+m[2]+"-v2").toUpperCase().replace(/_/g,"-")};
}
export function SiteMediaBulkUpload({client,onSaved}:{client:SupabaseClient|null;onSaved:()=>Promise<void>}){
 const [selected,setSelected]=useState<BatchItem[]>([]);
 const [errors,setErrors]=useState<string[]>([]);
 const [results,setResults]=useState<BatchStatus[]>([]);
 const [busy,setBusy]=useState(false);
 const [confirmation,setConfirmation]=useState(false);
 function choose(files:FileList|null){
  setResults([]);setConfirmation(false);
  const incoming=Array.from(files||[]);
  const bad:string[]=[];const parsed:BatchItem[]=[];const seen=new Set<string>();
  if(incoming.length>limit)bad.push("เลือกได้สูงสุด "+limit+" ไฟล์ต่อชุด");
  for(const f of incoming.slice(0,limit)){
   const item=parse(f);
   if(!item||!["image/webp","application/octet-stream",""].includes(f.type)){
    bad.push(f.name+": ชื่อหรือชนิดไฟล์ไม่ถูกต้อง (ต้องเป็น <หน้า>_<อุปกรณ์>.webp ไม่เกิน 6 MB)");continue;
   }
   const id=item.slot+"/"+item.device;
   if(seen.has(id)){bad.push(f.name+": ช่องภาพซ้ำกัน");continue}
   seen.add(id);parsed.push(item);
  }
  setSelected(parsed);setErrors(bad);
 }
 async function run(){
  if(!client||busy||!confirmation||selected.length===0)return;
  setBusy(true);setResults([]);
  const report:BatchStatus[]=[];
  for(const item of selected){
   try{
    const token=(await client.auth.getSession()).data.session?.access_token;
    if(!token)throw Error("กรุณาล็อกอิน Owner/Admin อีกครั้ง");
    const path="banners/"+item.slot+"/"+item.device+"/"+crypto.randomUUID()+".webp";
    const upload=await client.storage.from("gt-site-assets").upload(path,item.file,{contentType:"image/webp",cacheControl:"3600",upsert:false});
    if(upload.error)throw Error("อัปโหลดล้มเหลว: "+upload.error.message);
    const url=client.storage.from("gt-site-assets").getPublicUrl(path).data.publicUrl;
    const response=await fetch("/api/admin/site-media",{
     method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
     body:JSON.stringify({slot:item.slot,device:item.device,asset_id:item.assetId,image_url:url,alt_text:"",status:"draft",sheet_row_reference:null})
    });
    const data=await response.json();
    if(!response.ok||data.status!=="ok"){
     throw Error(response.status===409?"ช่องภาพนี้มีรายการอยู่แล้ว (ไฟล์อัปโหลดใหม่ยังไม่ผูกกับทะเบียน กรุณาตรวจใน Storage ก่อนลบ)":data.message||"บันทึกแบบร่างไม่สำเร็จ");
    }
    report.push({name:item.file.name,result:"อัปโหลดและสร้างแบบร่างแล้ว",ok:true});
   }catch(error){report.push({name:item.file.name,result:error instanceof Error?error.message:"ดำเนินการไม่สำเร็จ",ok:false})}
   setResults([...report]);
  }
  await onSaved();setBusy(false);
 }
 return <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
   <h2 className="text-xl font-black">อัปโหลดแบนเนอร์หลายภาพ (แบบร่างเท่านั้น)</h2>
   <p className="text-sm leading-relaxed text-slate-700">แตกไฟล์ ZIP จาก Google Drive ก่อน แล้วเลือกไฟล์ WebP พร้อมกันได้สูงสุด 30 ไฟล์ ระบบอ่านชื่อ เช่น <code>calendar_mobile.webp</code> และจับคู่หน้า/อุปกรณ์ให้เอง ต้องมีสิทธิ์ Owner/Admin</p>
   <input type="file" multiple accept=".webp,image/webp" disabled={busy} onChange={e=>choose(e.target.files)} className="w-full rounded-xl border border-blue-200 p-3"/>
   {selected.length>0&&<div className="rounded-xl bg-blue-50 p-3"><p className="font-bold">ตรวจพบไฟล์ที่ตรงรูปแบบ {selected.length} ไฟล์</p>
    <ul className="mt-2 max-h-44 list-inside list-disc overflow-y-auto text-sm">{selected.map(x=><li key={x.file.name}>{x.file.name} → {x.slot} / {x.device}</li>)}</ul>
   </div>}
   {errors.length>0&&<div role="alert" className="rounded-xl bg-amber-50 p-3 text-amber-900">{errors.map(x=><p key={x}>{x}</p>)}</div>}
   <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm font-bold"><input type="checkbox" checked={confirmation} onChange={e=>setConfirmation(e.target.checked)} className="mt-1 h-5 w-5"/>ฉันตรวจแล้วว่าเป็นไฟล์แบนเนอร์สำหรับแสดงสาธารณะ ไม่มีภาพส่วนตัวและไม่ใช่โลโก้ AI การอัปโหลดไม่ได้เผยแพร่รายการโดยอัตโนมัติ</label>
   <button type="button" disabled={busy||!confirmation||selected.length===0||errors.length>0} onClick={()=>void run()} className="min-h-12 w-full rounded-xl bg-blue-800 p-3 font-black text-white disabled:opacity-40">{busy?"กำลังอัปโหลดและลงทะเบียน...":"อัปโหลดชุดนี้เป็นแบบร่าง"}</button>
   {results.length>0&&<div aria-live="polite" className="space-y-1 rounded-xl border p-3"><h3 className="font-black">ผลการอัปโหลด {results.filter(x=>x.ok).length}/{results.length} รายการ</h3>{results.map((x,i)=><p key={i} className={"text-sm "+(x.ok?"text-green-700":"text-red-700")}>{x.ok?"✓":"✕"} {x.name} — {x.result}</p>)}</div>}
   <p className="text-xs text-slate-600">ไฟล์ที่อัปโหลดจะอยู่ใน Storage สาธารณะ แต่หน้าเว็บไซต์จะแสดงเฉพาะรายการในทะเบียนที่ Owner/Admin อนุมัติและตั้งสถานะเผยแพร่แล้วเท่านั้น อย่าใช้ส่วนนี้สำหรับรูปนักกีฬาเด็กหรือเอกสารการเงิน</p>
 </section>
}
