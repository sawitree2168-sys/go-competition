"use client";
import {useEffect,useState} from "react";
import {staffDb} from "@/app/organizer/_lib/staff";

export type ThemeKey="classic"|"sakura"|"wood"|"green"|"blue";
export type ThemeColor="light_pink"|"light_green"|"light_gray"|"light_brown"|"light_blue"|"wood"|"go_board";
export type InstituteTheme={color:ThemeColor;section:ThemeKey;hero:ThemeKey;background:ThemeKey;section_path:string|null;hero_path:string|null;background_path:string|null};
export const DEFAULT_THEME:InstituteTheme={color:"light_blue",section:"classic",hero:"classic",background:"classic",section_path:null,hero_path:null,background_path:null};
const STYLES:{id:ThemeKey;name:string;description:string}[]=[
 {id:"classic",name:"น้ำเงิน–ทอง",description:"ธีม GO TOURNAMENT"},
 {id:"sakura",name:"ซากุระชมพู",description:"อ่อนหวานสบายตา"},
 {id:"wood",name:"ลายไม้หมากล้อม",description:"กระดานโกะสีอ่อน"},
 {id:"green",name:"เขียวธรรมชาติ",description:"ธรรมชาติและภูเขา"},
 {id:"blue",name:"ฟ้าอ่อน",description:"กระดานและท้องฟ้า"},
];
const COLORS:{id:ThemeColor;name:string;swatch:string}[]=[
 {id:"light_pink",name:"ชมพูอ่อน",swatch:"#fff0f6"},
 {id:"light_green",name:"เขียวอ่อน",swatch:"#eff8e8"},
 {id:"light_gray",name:"เทาอ่อน",swatch:"#f1f3f6"},
 {id:"light_brown",name:"น้ำตาลอ่อน",swatch:"#f6eee7"},
 {id:"light_blue",name:"ฟ้าอ่อน",swatch:"#eef6ff"},
 {id:"wood",name:"สีไม้",swatch:"#f8e9cf"},
 {id:"go_board",name:"กระดานโกะอ่อน",swatch:"#f4e5c7"},
];
export function institutionAssetUrl(path:string|null):string|null{
 if(!path)return null;
 const db=staffDb();
 return db?.storage.from("gt-institution-logos").getPublicUrl(path).data.publicUrl??null;
}
type Area="section"|"hero"|"background";
export default function ThemeEditor({academyId,theme,onSaved}:{academyId:string;theme:InstituteTheme;onSaved:(next:InstituteTheme)=>void}){
 const [draft,setDraft]=useState<InstituteTheme>(theme);
 const [files,setFiles]=useState<Partial<Record<Area,File>>>({});
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>setDraft(theme),[theme]);
 function change<K extends keyof InstituteTheme>(key:K,value:InstituteTheme[K]){
   setDraft(prev=>({...prev,[key]:value}));setMessage("");
 }
 async function save(){
   if(busy)return;
   const db=staffDb();if(!db){setMessage("ยังไม่ได้เชื่อมต่อฐานข้อมูล");return;}
   setBusy(true);setMessage("");
   const next={...draft};
   try{
     for(const kind of ["section","hero","background"] as const){
       const file=files[kind];if(!file)continue;
       if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5*1024*1024)
         throw Error("รูปภาพต้องเป็น PNG, JPG หรือ WEBP ขนาดไม่เกิน 5 MB");
       const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
       const path=`${academyId}/themes/${crypto.randomUUID()}.${ext}`;
       const {error}=await db.storage.from("gt-institution-logos").upload(path,file,{contentType:file.type,upsert:false});
       if(error)throw Error("อัปโหลดรูปภาพไม่สำเร็จ กรุณาตรวจสิทธิ์เจ้าของสถาบัน");
       next[`${kind}_path`]=path;
     }
     const {data,error}=await db.rpc("gt_academy_save_theme_v1",{
       p_academy:academyId,p_color:next.color,p_section:next.section,p_hero:next.hero,p_background:next.background,
       p_section_path:next.section_path,p_hero_path:next.hero_path,p_background_path:next.background_path
     });
     if(error||!data?.ok)throw Error("บันทึกธีมไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และลองอีกครั้ง");
     onSaved(next);setFiles({});setMessage("บันทึกธีมใหม่แล้ว ทั้งคอมพิวเตอร์และมือถือจะใช้รูปแบบนี้");
   }catch(err){setMessage(err instanceof Error?err.message:"เกิดข้อผิดพลาดระหว่างบันทึก");}
   finally{setBusy(false);}
 }
 const areaDefs:[Area,string,string][]=[
   ["section","แบนเนอร์ “สถาบันของฉัน”","ภาพพื้นหลังของหัวข้อด้านบน"],
   ["hero","แบนเนอร์สถาบัน","บริเวณชื่อและโลโก้ GO MASTER"],
   ["background","ภาพพื้นหลังหน้าเว็บ","ลายหมากล้อมด้านหลังกรอบข้อมูล"]
 ];
 return <section className="inst-theme-editor space-y-5 rounded-[20px] border-2 border-[#bbd1e9] bg-white p-3 sm:p-5" aria-label="ปรับแต่งสีและภาพหน้าสถาบัน">
   <div className="border-b-2 border-[#d4a646] pb-3">
     <h3 className="text-xl font-semibold text-[#123e7a]">ปรับแต่งธีมสถาบัน</h3>
     <p className="mt-1 text-base text-[#536b85]">เลือกแบบใหม่ได้เมื่อเบื่อ · ดูตัวอย่างแล้วบันทึกครั้งเดียว · ไม่กระทบข้อมูลนักกีฬา</p>
   </div>
   <fieldset className="space-y-3">
     <legend className="text-lg font-semibold">สีพื้นหลังหน้าเว็บไซต์</legend>
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
       {COLORS.map(c=><button key={c.id} type="button" aria-pressed={draft.color===c.id} onClick={()=>change("color",c.id)}
         className={`flex min-h-14 items-center gap-2 rounded-xl border-2 px-2 text-left text-sm font-semibold transition active:scale-[.98] ${draft.color===c.id?"border-[#b98b1c] ring-2 ring-[#e8bc5e]":"border-[#c0d2e9] hover:border-[#c39c42]"}`}>
         <span style={{background:c.swatch}} className="h-8 w-8 shrink-0 rounded-lg border border-[#b6b1a5]"/><span>{c.name}</span>{draft.color===c.id&&<span aria-hidden="true">✓</span>}
       </button>)}
     </div>
   </fieldset>
   {areaDefs.map(([kind,title,desc])=>{
     const path=draft[`${kind}_path`];const asset=institutionAssetUrl(path);
     return <fieldset key={kind} className="space-y-3 rounded-xl border-2 border-[#c4d7ee] p-3 sm:p-4">
       <legend className="px-2 text-lg font-semibold text-[#103d7b]">{title}</legend>
       <p className="text-sm text-[#56708c]">{desc}</p>
       <div className="grid gap-2 sm:grid-cols-5">
         {STYLES.map(style=><button key={style.id} type="button" onClick={()=>{change(kind,style.id);setFiles(f=>({...f,[kind]:undefined}));change(`${kind}_path`,null);}}
           aria-pressed={draft[kind]===style.id&&!path}
           className={`rounded-xl border-2 p-1.5 text-center transition active:scale-[.98] ${draft[kind]===style.id&&!path?"border-[#b68b24] bg-[#fff9e9] ring-2 ring-[#e8c367]":"border-[#c5d4e8] hover:border-[#bb9b44]"}`}>
           <span className={`inst-theme-thumbnail inst-theme-thumbnail--${kind} inst-theme-thumbnail--${style.id}`} aria-hidden="true"/>
           <span className="mt-1 block text-sm font-semibold">{style.name}</span>
         </button>)}
       </div>
       <div className="space-y-2 rounded-xl border border-[#c8d7e8] bg-[#f7faff] p-3">
         <label className="block font-semibold" htmlFor={`theme-upload-${kind}`}>อัปโหลด PNG ของตัวเอง</label>
         <input id={`theme-upload-${kind}`} type="file" accept="image/png,image/jpeg,image/webp" className="w-full text-sm" onChange={e=>{
           const file=e.target.files?.[0];if(!file)return;setFiles(v=>({...v,[kind]:file}));change(`${kind}_path`,null);
         }}/>
         {files[kind]&&<p className="text-sm text-[#125b31]">เลือกรูป {files[kind]?.name} แล้ว · กดบันทึกเพื่ออัปโหลด</p>}
         {path&&<div className="flex flex-wrap items-center gap-2"><span className="text-sm text-[#355c88]">กำลังใช้รูปที่อัปโหลดไว้</span>
           <button type="button" className="rounded-lg border border-[#bca04d] bg-[#fff4d4] px-3 py-2 text-sm" onClick={()=>change(`${kind}_path`,null)}>กลับไปใช้ลายสำเร็จรูป</button>
         </div>}
         {asset&&<img src={asset} alt={`ภาพ ${title} ปัจจุบัน`} className="max-h-28 w-full rounded-lg object-cover"/>}
       </div>
     </fieldset>;
   })}
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[#d4ae4e] bg-[#fff9e8] p-3">
     <p className="text-sm text-[#654b20]">การเปลี่ยนแปลงจะแสดงกับผู้ใช้ทุกคนที่มีสิทธิ์เห็นสถาบันนี้หลังบันทึก</p>
     <button type="button" disabled={busy} onClick={()=>void save()} className="min-h-12 rounded-xl border-2 border-[#0b428c] bg-[#1258aa] px-6 text-base font-semibold text-white shadow-sm hover:bg-[#0b458c] disabled:opacity-50">{busy?"กำลังบันทึก…":"บันทึกธีมสถาบัน"}</button>
   </div>
   {message&&<p role="status" className="rounded-xl border border-[#abc7e5] bg-[#f0f7ff] p-3 text-base">{message}</p>}
 </section>;
}
