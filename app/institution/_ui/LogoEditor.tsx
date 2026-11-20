"use client";

import {useEffect,useState} from "react";
import {staffDb} from "@/app/organizer/_lib/staff";

export type Branding={logo_path:string|null;shape:"circle"|"square";zoom:number;x:number;y:number};
const DEFAULT:Branding={logo_path:null,shape:"circle",zoom:100,x:50,y:50};

export function LogoDisplay({branding,name,className=""}:{branding:Branding|null;name:string;className?:string}) {
 const db=staffDb();
 const logoUrl=branding?.logo_path?db?.storage.from("gt-institution-logos").getPublicUrl(branding.logo_path).data.publicUrl:null;
 return <div className={`relative grid shrink-0 place-items-center overflow-hidden border-[4px] border-[#eac166] bg-[#061f49] text-center text-[#f9d88b] shadow-lg ${branding?.shape==="square"?"rounded-[20px]":"rounded-full"} ${className}`}>
   {logoUrl?<img src={logoUrl} alt={`โลโก้ ${name}`} className="h-full w-full object-cover" style={{objectPosition:`${branding?.x??50}% ${branding?.y??50}%`,transform:`scale(${(branding?.zoom??100)/100})`}}/>:
   <span className="flex flex-col items-center text-sm font-black leading-tight"><span className="text-2xl">⚫⚪</span>GO<br/>MASTER</span>}
 </div>;
}

export default function LogoEditor({academyId,branding,onSaved}:{academyId:string;branding:Branding|null;onSaved:(value:Branding)=>void}){
 const [shape,setShape]=useState<"circle"|"square">("circle");
 const [zoom,setZoom]=useState(100);
 const [x,setX]=useState(50);
 const [y,setY]=useState(50);
 const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{setShape(branding?.shape??"circle");setZoom(branding?.zoom??100);setX(branding?.x??50);setY(branding?.y??50);},[branding]);
 useEffect(()=>{if(!file){setPreview(null);return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 const db=staffDb();
 const previousUrl=branding?.logo_path?db?.storage.from("gt-institution-logos").getPublicUrl(branding.logo_path).data.publicUrl:null;
 const save=async()=>{
  if(busy)return;
  setBusy(true);setMessage("");
  const client=staffDb();
  if(!client){setMessage("ระบบไม่พร้อมใช้งาน");setBusy(false);return;}
  let logoPath=branding?.logo_path??null;
  if(file){
   if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5*1024*1024){setMessage("ใช้ไฟล์ PNG, JPG หรือ WEBP ขนาดไม่เกิน 5 MB");setBusy(false);return;}
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=`${academyId}/${crypto.randomUUID()}.${ext}`;
   const {error:uploadErr}=await client.storage.from("gt-institution-logos").upload(path,file,{contentType:file.type,upsert:false});
   if(uploadErr){setMessage("อัปโหลดโลโก้ไม่สำเร็จ กรุณาตรวจสิทธิ์เจ้าของสถาบัน");setBusy(false);return;}
   logoPath=path;
  }
  const {data,error}=await client.rpc("gt_academy_save_branding_v1",{p_academy:academyId,p_logo_path:logoPath,p_shape:shape,p_zoom:zoom,p_x:x,p_y:y});
  setBusy(false);
  if(error||!data?.ok){setMessage("บันทึกรูปแบบโลโก้ไม่สำเร็จ กรุณาลองใหม่");return;}
  onSaved({logo_path:logoPath,shape,zoom,x,y});setFile(null);setMessage("บันทึกโลโก้และตำแหน่งเรียบร้อยแล้ว");
 };
 return <section className="space-y-4 rounded-2xl border-[3px] border-[#bcd2ee] bg-white p-4 sm:p-5">
  <h3 className="text-xl font-black text-[#0e3975]">โลโก้สถาบัน</h3>
  <p className="text-sm text-[#537090]">เลือกรูปของสถาบัน ปรับเป็นวงกลมหรือสี่เหลี่ยม และเลื่อนภาพให้พอดีกับกรอบได้</p>
  <div className="flex flex-wrap items-center gap-5">
   <div className={`grid h-32 w-32 shrink-0 overflow-hidden border-[4px] border-[#e7b74e] bg-[#061e49] ${shape==="circle"?"rounded-full":"rounded-[20px]"}`}>
    {(preview||previousUrl)?<img alt="ตัวอย่างครอปโลโก้" src={preview||previousUrl||""} className="h-full w-full object-cover" style={{objectPosition:`${x}% ${y}%`,transform:`scale(${zoom/100})`}}/>:<div className="grid place-items-center font-bold text-[#f4d078]">GO</div>}
   </div>
   <label className="flex-1 text-sm font-semibold">อัปโหลด PNG / JPG / WEBP (ไม่เกิน 5 MB)
    <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" onChange={e=>setFile(e.target.files?.[0]??null)}/>
   </label>
  </div>
  <div role="group" aria-label="รูปร่างโลโก้" className="flex flex-wrap gap-2">
   <button type="button" aria-pressed={shape==="circle"} onClick={()=>setShape("circle")} className={`rounded-xl border-2 px-4 py-2 font-bold ${shape==="circle"?"border-[#e4b64e] bg-[#0a59b9] text-white":"border-[#bacfeb]"}`}>◯ วงกลม</button>
   <button type="button" aria-pressed={shape==="square"} onClick={()=>setShape("square")} className={`rounded-xl border-2 px-4 py-2 font-bold ${shape==="square"?"border-[#e4b64e] bg-[#0a59b9] text-white":"border-[#bacfeb]"}`}>▢ สี่เหลี่ยม</button>
  </div>
  <div className="grid gap-3 sm:grid-cols-3">
   {[["ซูม",zoom,setZoom,60,220],["เลื่อนซ้าย–ขวา",x,setX,0,100],["เลื่อนขึ้น–ลง",y,setY,0,100]].map(([label,value,set,min,max])=>
    <label key={String(label)} className="text-xs font-semibold">{String(label)} ({value})<input type="range" min={Number(min)} max={Number(max)} value={Number(value)} onChange={e=>(set as (v:number)=>void)(Number(e.target.value))} className="mt-2 block w-full accent-[#0a60c8]"/></label>
   )}
  </div>
  <button type="button" onClick={()=>void save()} disabled={busy} className="min-h-12 w-full rounded-xl border-b-4 border-[#d69d33] bg-[#0b60bf] px-5 font-black text-white disabled:opacity-60">{busy?"กำลังบันทึก…":"บันทึกโลโก้และการครอป"}</button>
  {message&&<p role="status" className="rounded-xl bg-[#eff6ff] p-3 text-sm text-[#164c8c]">{message}</p>}
 </section>;
}
