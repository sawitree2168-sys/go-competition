"use client";

import {useEffect,useState} from "react";
import {staffDb} from "@/app/organizer/_lib/staff";

export type Branding={logo_path:string|null;shape:"circle"|"square";zoom:number;x:number;y:number};
const DEFAULT:Branding={logo_path:null,shape:"circle",zoom:100,x:50,y:50};

export function LogoDisplay({branding,name,className=""}:{branding:Branding|null;name:string;className?:string}) {
 const db=staffDb();
 const logoUrl=branding?.logo_path?db?.storage.from("gt-institution-logos").getPublicUrl(branding.logo_path).data.publicUrl:null;
 const isMaster = name.trim().toUpperCase() === "GO MASTER";
 const fallbackSquare = !logoUrl && isMaster;
 return <div className={`relative grid shrink-0 place-items-center overflow-hidden border-[4px] border-[#eac166] bg-[#061f49] text-center text-[#f9d88b] shadow-lg ${branding?.shape==="square" || fallbackSquare?"rounded-[20px]":"rounded-full"} ${className}`}>
   {logoUrl?<img src={logoUrl} alt={`โลโก้ ${name}`} className="h-full w-full object-cover" style={{objectPosition:`${branding?.x??50}% ${branding?.y??50}%`,transform:`scale(${(branding?.zoom??100)/100})`}}/>:
   <span className="flex w-full flex-col items-center justify-center gap-1 px-1 text-center font-semibold leading-tight" aria-label={`ป้ายชื่อ ${name} (ยังไม่ได้อัปโหลดโลโก้)`}>
     {isMaster ?
       <svg viewBox="0 0 64 42" aria-hidden="true" className="h-8 w-10 sm:h-10 sm:w-12" fill="none">
         <path d="M6 11 20 21 31 4 44 21 58 11 52 32H12Z" fill="#f7c44e" stroke="#ffe8a2" strokeWidth="2"/>
         <path d="M13 36H51" stroke="#ffe8a2" strokeWidth="4" strokeLinecap="round"/>
         <circle cx="6" cy="9" r="4" fill="#ffdc76"/><circle cx="31" cy="4" r="4" fill="#ffdc76"/><circle cx="58" cy="9" r="4" fill="#ffdc76"/>
       </svg> :
       <span aria-hidden="true" className="text-xl">⚫⚪</span>}
     <span className="block max-w-full break-words text-[11px] sm:text-sm">{name.length>22?name.slice(0,22)+"…":name}</span>
   </span>}
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
 const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null);
 useEffect(()=>{setShape(branding?.shape??"circle");setZoom(branding?.zoom??100);setX(branding?.x??50);setY(branding?.y??50);},[branding]);
 useEffect(()=>{if(!file){setPreview(null);return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 const db=staffDb();
 const previousUrl=branding?.logo_path?db?.storage.from("gt-institution-logos").getPublicUrl(branding.logo_path).data.publicUrl:null;
 const save=async()=>{
  if(busy)return;
  setBusy(true);setMessage(null);
  const client=staffDb();
  if(!client){setMessage({ok:false,text:"ระบบไม่พร้อมใช้งาน กรุณาเข้าสู่ระบบใหม่"});setBusy(false);return;}
  let logoPath=branding?.logo_path??null;
  if(file){
   if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5*1024*1024){setMessage({ok:false,text:"ใช้ไฟล์ PNG, JPG หรือ WEBP ขนาดไม่เกิน 5 MB"});setBusy(false);return;}
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=`${academyId}/${crypto.randomUUID()}.${ext}`;
   const {error:uploadErr}=await client.storage.from("gt-institution-logos").upload(path,file,{contentType:file.type,upsert:false});
   if(uploadErr){setMessage({ok:false,text:"อัปโหลดโลโก้ไม่สำเร็จ · บัญชีนี้อาจยังไม่มีสิทธิ์ปรับแต่งสถาบัน"});setBusy(false);return;}
   logoPath=path;
  }
  const {data,error}=await client.rpc("gt_academy_save_branding_v1",{p_academy:academyId,p_logo_path:logoPath,p_shape:shape,p_zoom:zoom,p_x:x,p_y:y});
  setBusy(false);
  if(error||!data?.ok){setMessage({ok:false,text:data?.error==="NOT_ALLOWED"?"บัญชีนี้ยังไม่มีสิทธิ์ปรับแต่งสถาบัน":"บันทึกโลโก้ไม่สำเร็จ กรุณาลองใหม่"});return;}
  onSaved({logo_path:logoPath,shape,zoom,x,y});setFile(null);setMessage({ok:true,text:"✓ บันทึกโลโก้แล้ว · โลโก้ใหม่แสดงที่หัวหน้าสถาบันทันที"});
 };
 return <section className="space-y-4 rounded-2xl border-[3px] border-[#bcd2ee] bg-white p-4 sm:p-5">
  <h3 className="text-xl font-black text-[#0e3975]">① โลโก้สถาบัน</h3>
  <p className="text-sm text-[#537090]">เลือกรูปของสถาบัน ปรับเป็นวงกลมหรือสี่เหลี่ยม และเลื่อนภาพให้พอดีกับกรอบได้</p>
  <div className="flex flex-wrap items-center gap-5">
   <div className={`grid h-32 w-32 shrink-0 overflow-hidden border-[4px] border-[#e7b74e] bg-[#061e49] ${shape==="circle"?"rounded-full":"rounded-[20px]"}`}>
    {(preview||previousUrl)?<img alt="ตัวอย่างครอปโลโก้" src={preview||previousUrl||""} className="h-full w-full object-cover" style={{objectPosition:`${x}% ${y}%`,transform:`scale(${zoom/100})`}}/>:<div className="grid place-items-center font-bold text-[#f4d078]">GO</div>}
   </div>
   <label className="flex-1 text-sm font-semibold">อัปโหลด PNG / JPG / WEBP (ไม่เกิน 5 MB)
    <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" onChange={e=>{setFile(e.target.files?.[0]??null);setMessage(null);}}/>
   </label>
  </div>
  <div role="group" aria-label="รูปร่างโลโก้" className="flex flex-wrap gap-2">
   <button type="button" aria-pressed={shape==="circle"} onClick={()=>setShape("circle")} className={`rounded-xl border-2 px-4 py-2 font-bold ${shape==="circle"?"border-[#e4b64e] bg-[#0a59b9] text-white":"border-[#bacfeb]"}`}>◯ วงกลม</button>
   <button type="button" aria-pressed={shape==="square"} onClick={()=>setShape("square")} className={`rounded-xl border-2 px-4 py-2 font-bold ${shape==="square"?"border-[#e4b64e] bg-[#0a59b9] text-white":"border-[#bacfeb]"}`}>▢ สี่เหลี่ยม</button>
  </div>
  <div className="grid gap-3 sm:grid-cols-3">
   {([["ซูม",zoom,setZoom,60,220],["เลื่อนซ้าย–ขวา",x,setX,0,100],["เลื่อนขึ้น–ลง",y,setY,0,100]] as [string,number,(v:number)=>void,number,number][]).map(([label,value,set,min,max])=>
    <label key={String(label)} className="text-xs font-semibold">{String(label)} ({value})<input type="range" min={Number(min)} max={Number(max)} value={Number(value)} onChange={e=>(set as (v:number)=>void)(Number(e.target.value))} className="mt-2 block w-full accent-[#0a60c8]"/></label>
   )}
  </div>
  <button type="button" onClick={()=>void save()} disabled={busy} className="min-h-12 w-full rounded-xl border-b-4 border-[#d69d33] bg-[#0b60bf] px-5 font-black text-white disabled:opacity-60">{busy?"กำลังบันทึก…":"บันทึกโลโก้"}</button>
  {file&&!busy&&<p className="rounded-xl border-2 border-[#d4a646] bg-[#fff7df] p-3 text-sm font-semibold text-[#6c4d0e]">เลือกรูป {file.name} แล้ว · ปรับวงกลม/สี่เหลี่ยมและตำแหน่ง แล้วกด “บันทึกโลโก้” ด้านล่าง</p>}
  {message&&<p role={message.ok?"status":"alert"} className={`rounded-xl border-2 p-3 text-base font-semibold ${message.ok?"border-[#7fc49a] bg-[#eefaf1] text-[#145c31]":"border-[#e2a0a0] bg-[#fff1f1] text-[#8a1f1f]"}`}>{message.text}</p>}
 </section>;
}
