"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {staffDb} from "@/app/organizer/_lib/staff";

/* Institution theme — every choice previews on the page immediately; one save button stores it. */
export type ThemeKey="classic"|"sakura"|"wood"|"green"|"blue";
export type SectionKey=ThemeKey|"img_gold"|"img_sakura"|"img_navy";
export type HeroKey=ThemeKey|"gm_sky"|"gm_green"|"gm_navy";
export type BackgroundKey=ThemeKey|"img_sky"|"img_bamboo"|"img_sakura";
export type ThemeColor="light_pink"|"light_green"|"light_gray"|"light_brown"|"light_blue"|"wood"|"go_board";
export type InstituteTheme={color:ThemeColor;section:SectionKey;hero:HeroKey;background:BackgroundKey;
  section_path:string|null;hero_path:string|null;background_path:string|null;section_full:boolean;hero_full:boolean};
type Area="section"|"hero"|"background";
/** Theme as shown on screen: may carry not-yet-uploaded local pictures while previewing. */
export type ThemePreview=InstituteTheme&{local?:Partial<Record<Area,string>>};
export const DEFAULT_THEME:InstituteTheme={color:"light_blue",section:"classic",hero:"classic",background:"classic",
  section_path:null,hero_path:null,background_path:null,section_full:false,hero_full:false};

const COLOR_STYLES:{id:ThemeKey;name:string}[]=[
 {id:"classic",name:"น้ำเงิน–ทอง"},{id:"sakura",name:"ซากุระชมพู"},{id:"wood",name:"ลายไม้หมากล้อม"},
 {id:"green",name:"เขียวธรรมชาติ"},{id:"blue",name:"ฟ้าอ่อน"},
];
/* Designed pictures (Nova). Section/hero pictures already contain their own text → shown as the whole banner. */
export const IMAGE_PRESETS:Record<string,{src:string;name:string}>={
 img_gold:{src:"/institution-themes/title-gold.webp",name:"ทอง–ครีม"},
 img_sakura:{src:"/institution-themes/title-sakura.webp",name:"ซากุระชมพู"},
 img_navy:{src:"/institution-themes/title-navy.webp",name:"น้ำเงินเข้ม"},
 gm_sky:{src:"/institution-themes/gm-sky.webp",name:"GO MASTER ฟ้า"},
 gm_green:{src:"/institution-themes/gm-green.webp",name:"GO MASTER เขียว"},
 gm_navy:{src:"/institution-themes/gm-navy.webp",name:"GO MASTER น้ำเงิน"},
 img_sky:{src:"/institution-themes/bg-sky.webp",name:"ฟ้า–ซากุระ"},
 img_bamboo:{src:"/institution-themes/bg-bamboo.webp",name:"เขียวไผ่"},
};
const BG_SAKURA_SRC="/institution-themes/bg-sakura.webp";
const COLORS:{id:ThemeColor;name:string;swatch:string}[]=[
 {id:"light_pink",name:"ชมพูอ่อน",swatch:"#fff0f6"},{id:"light_green",name:"เขียวอ่อน",swatch:"#eff8e8"},
 {id:"light_gray",name:"เทาอ่อน",swatch:"#f1f3f6"},{id:"light_brown",name:"น้ำตาลอ่อน",swatch:"#f6eee7"},
 {id:"light_blue",name:"ฟ้าอ่อน",swatch:"#eef6ff"},{id:"wood",name:"สีไม้",swatch:"#f8e9cf"},
 {id:"go_board",name:"กระดานโกะอ่อน",swatch:"#f4e5c7"},
];

export function institutionAssetUrl(path:string|null):string|null{
 if(!path)return null;
 const db=staffDb();
 return db?.storage.from("gt-institution-logos").getPublicUrl(path).data.publicUrl??null;
}
function presetSrc(area:Area,key:string):string|null{
 if(area==="background"&&key==="img_sakura")return BG_SAKURA_SRC;
 if(area==="section"&&key.startsWith("img_"))return IMAGE_PRESETS[key]?.src??null;
 if(area==="hero"&&key.startsWith("gm_"))return IMAGE_PRESETS[key]?.src??null;
 if(area==="background"&&key.startsWith("img_"))return IMAGE_PRESETS[key]?.src??null;
 return null;
}
/** What the page should draw for one theme (saved or previewed). */
export function resolveTheme(t:ThemePreview){
 const pick=(area:Area,key:string,path:string|null,full:boolean)=>{
   const own=t.local?.[area]??institutionAssetUrl(path);
   if(own)return {src:own,full};
   const preset=presetSrc(area,key);
   return preset?{src:preset,full:true}:{src:null as string|null,full:false};
 };
 return {section:pick("section",t.section,t.section_path,t.section_full),
   hero:pick("hero",t.hero,t.hero_path,t.hero_full),
   background:pick("background",t.background,t.background_path,true)};
}
export function themeFromRpc(d:Record<string,unknown>|null|undefined):InstituteTheme{
 if(!d||d.ok!==true)return DEFAULT_THEME;
 const s=(v:unknown,f:string)=>typeof v==="string"&&v?v:f;
 return {color:s(d.color,DEFAULT_THEME.color) as ThemeColor,section:s(d.section,"classic") as SectionKey,
  hero:s(d.hero,"classic") as HeroKey,background:s(d.background,"classic") as BackgroundKey,
  section_path:(d.section_path as string)??null,hero_path:(d.hero_path as string)??null,background_path:(d.background_path as string)??null,
  section_full:d.section_full===true,hero_full:d.hero_full===true};
}
const same=(a:InstituteTheme,b:InstituteTheme)=>(Object.keys(DEFAULT_THEME) as (keyof InstituteTheme)[]).every(k=>a[k]===b[k]);

export default function ThemeEditor({academyId,academyName,theme,onSaved,onPreview}:{academyId:string;academyName:string;theme:InstituteTheme;onSaved:(next:InstituteTheme)=>void;onPreview:(t:ThemePreview|null)=>void}){
 const [draft,setDraft]=useState<InstituteTheme>(theme);
 const [files,setFiles]=useState<Partial<Record<Area,File>>>({});
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null);
 const isMaster=academyName.trim().toLowerCase()==="go master";
 useEffect(()=>{setDraft(theme);setFiles({});},[theme]);
 const local=useMemo(()=>{const out:Partial<Record<Area,string>>={};for(const k of Object.keys(files) as Area[]){const f=files[k];if(f)out[k]=URL.createObjectURL(f);}return out;},[files]);
 useEffect(()=>()=>{Object.values(local).forEach(u=>u&&URL.revokeObjectURL(u));},[local]);
 const dirty=!same(draft,theme)||Object.values(files).some(Boolean);
 // Live preview on the real page header/background while editing.
 const previewRef=useRef(onPreview);
 useEffect(()=>{previewRef.current=onPreview;});
 useEffect(()=>{previewRef.current(dirty?{...draft,local}:null);},[draft,local,dirty]);
 useEffect(()=>()=>previewRef.current(null),[]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};addEventListener("beforeunload",warn);return()=>removeEventListener("beforeunload",warn);},[dirty]);

 function patch(p:Partial<InstituteTheme>){setDraft(prev=>({...prev,...p}));setMessage(null);}
 function choose(area:Area,key:string){
   setFiles(f=>({...f,[area]:undefined}));
   patch({[area]:key,[`${area}_path`]:null,...(area==="background"?{}:{[`${area}_full`]:false})} as Partial<InstituteTheme>);
 }
 function upload(area:Area,file:File|undefined){
   if(!file)return;
   if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5*1024*1024){
     setMessage({ok:false,text:"รูปภาพต้องเป็น PNG, JPG หรือ WEBP ขนาดไม่เกิน 5 MB"});return;}
   setFiles(f=>({...f,[area]:file}));
   patch({[`${area}_path`]:null,...(area==="background"?{}:{[`${area}_full`]:true})} as Partial<InstituteTheme>);
 }
 function cancel(){setDraft(theme);setFiles({});setMessage(null);}
 async function save(){
   if(busy)return;
   const db=staffDb();if(!db){setMessage({ok:false,text:"ยังไม่ได้เชื่อมต่อฐานข้อมูล"});return;}
   setBusy(true);setMessage(null);
   const next={...draft};
   try{
     for(const kind of ["section","hero","background"] as const){
       const file=files[kind];if(!file)continue;
       const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
       const path=`${academyId}/themes/${crypto.randomUUID()}.${ext}`;
       const {error}=await db.storage.from("gt-institution-logos").upload(path,file,{contentType:file.type,upsert:false});
       if(error)throw Error("อัปโหลดรูปภาพไม่สำเร็จ · บัญชีนี้อาจยังไม่มีสิทธิ์ปรับแต่งสถาบัน");
       next[`${kind}_path`]=path;
     }
     const {data,error}=await db.rpc("gt_academy_save_theme_v2",{
       p_academy:academyId,p_color:next.color,p_section:next.section,p_hero:next.hero,p_background:next.background,
       p_section_path:next.section_path,p_hero_path:next.hero_path,p_background_path:next.background_path,
       p_section_full:next.section_full,p_hero_full:next.hero_full});
     if(error||!data?.ok)throw Error(data?.error==="NOT_ALLOWED"?"บัญชีนี้ยังไม่มีสิทธิ์ปรับแต่งสถาบัน (ต้องเป็นเจ้าของ หรือได้รับสิทธิ์ปรับแต่ง)":"บันทึกธีมไม่สำเร็จ กรุณาลองอีกครั้ง");
     // Read back from the server so what is shown is exactly what was stored.
     const {data:fresh}=await db.rpc("gt_academy_theme_v1",{p_academy:academyId});
     onSaved(fresh?.ok?themeFromRpc(fresh):next);setFiles({});
     setMessage({ok:true,text:"✓ บันทึกธีมแล้ว · ทุกคนในสถาบันเห็นแบบนี้ทั้งคอมพิวเตอร์และมือถือ"});
     window.scrollTo({top:0,behavior:"smooth"});
   }catch(err){setMessage({ok:false,text:err instanceof Error?err.message:"เกิดข้อผิดพลาดระหว่างบันทึก"});}
   finally{setBusy(false);}
 }

 const sectionOptions:{id:string;name:string;src?:string}[]=[
   ...(["img_gold","img_sakura","img_navy"] as const).map(id=>({id,name:IMAGE_PRESETS[id].name,src:IMAGE_PRESETS[id].src})),
   ...COLOR_STYLES.map(s=>({id:s.id as string,name:s.name}))];
 const heroOptions:{id:string;name:string;src?:string}[]=[
   ...(isMaster?(["gm_sky","gm_green","gm_navy"] as const).map(id=>({id,name:IMAGE_PRESETS[id].name,src:IMAGE_PRESETS[id].src})):[]),
   ...COLOR_STYLES.map(s=>({id:s.id as string,name:s.name}))];
 const bgOptions:{id:string;name:string;src?:string}[]=[
   {id:"img_sky",name:IMAGE_PRESETS.img_sky.name,src:IMAGE_PRESETS.img_sky.src},
   {id:"img_bamboo",name:IMAGE_PRESETS.img_bamboo.name,src:IMAGE_PRESETS.img_bamboo.src},
   {id:"img_sakura",name:"ชมพูซากุระ",src:BG_SAKURA_SRC},
   ...COLOR_STYLES.map(s=>({id:s.id as string,name:s.name}))];
 const areas:[Area,string,string,typeof sectionOptions][]=[
   ["section","แบนเนอร์ “สถาบันของฉัน”","แถบหัวข้อด้านบนสุดของหน้าสถาบัน",sectionOptions],
   ["hero","แบนเนอร์สถาบัน","บริเวณชื่อและโลโก้สถาบัน",heroOptions],
   ["background","ภาพพื้นหลังหน้าเว็บ","ภาพเต็มหน้าจอด้านหลังกรอบข้อมูล",bgOptions],
 ];
 return <section className="inst-theme-editor space-y-5 rounded-[20px] border-2 border-[#bbd1e9] bg-white p-3 pb-24 sm:p-5 sm:pb-24" aria-label="ปรับแต่งสีและภาพหน้าสถาบัน">
   <div className="border-b-2 border-[#d4a646] pb-3">
     <h3 className="text-xl font-semibold text-[#123e7a]">ปรับแต่งธีมสถาบัน</h3>
     <p className="mt-1 text-base text-[#536b85]">กดเลือกแล้วหน้าเว็บด้านบนเปลี่ยนให้ดูทันที · พอใจแล้วกด <b>บันทึกธีมสถาบัน</b> (แถบล่างจอ) · ไม่กระทบข้อมูลนักกีฬา</p>
   </div>
   {message&&<p role={message.ok?"status":"alert"} className={`rounded-xl border-2 p-3 text-base font-semibold ${message.ok?"border-[#7fc49a] bg-[#eefaf1] text-[#145c31]":"border-[#e2a0a0] bg-[#fff1f1] text-[#8a1f1f]"}`}>{message.text}</p>}
   <fieldset className="space-y-3">
     <legend className="text-lg font-semibold">สีพื้นหลังกรอบข้อมูล</legend>
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
       {COLORS.map(c=><button key={c.id} type="button" aria-pressed={draft.color===c.id} onClick={()=>patch({color:c.id})}
         className={`flex min-h-14 items-center gap-2 rounded-xl border-2 px-2 text-left text-sm font-semibold transition active:scale-[.98] ${draft.color===c.id?"border-[#b98b1c] bg-[#fff9e9] ring-2 ring-[#e8bc5e]":"border-[#c0d2e9] hover:border-[#c39c42]"}`}>
         <span style={{background:c.swatch}} className="h-8 w-8 shrink-0 rounded-lg border border-[#b6b1a5]"/><span>{c.name}</span>{draft.color===c.id&&<span aria-hidden="true">✓</span>}
       </button>)}
     </div>
   </fieldset>
   {areas.map(([area,title,desc,options])=>{
     const usingOwn=Boolean(files[area]||draft[`${area}_path`]);
     const ownSrc=local[area]??institutionAssetUrl(draft[`${area}_path`]);
     return <fieldset key={area} className="space-y-3 rounded-xl border-2 border-[#c4d7ee] p-3 sm:p-4">
       <legend className="px-2 text-lg font-semibold text-[#103d7b]">{title}</legend>
       <p className="text-sm text-[#56708c]">{desc}</p>
       <div className={`grid gap-2 ${area==="background"?"grid-cols-2 sm:grid-cols-4":"grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
         {options.map(o=>{const on=draft[area]===o.id&&!usingOwn;return <button key={o.id} type="button" onClick={()=>choose(area,o.id)} aria-pressed={on}
           className={`rounded-xl border-2 p-1.5 text-center transition active:scale-[.98] ${on?"border-[#b68b24] bg-[#fff9e9] ring-2 ring-[#e8c367]":"border-[#c5d4e8] hover:border-[#bb9b44]"}`}>
           {o.src?<img src={o.src} alt="" loading="lazy" className={`block w-full rounded-lg ${area==="background"?"aspect-video object-cover":"h-[75px] object-contain sm:h-[64px]"}`}/>:
             <span className={`inst-theme-thumbnail inst-theme-thumbnail--${area} inst-theme-thumbnail--${o.id}`} aria-hidden="true"/>}
           <span className="mt-1 block text-sm font-semibold">{o.name}{on&&" ✓"}</span>
         </button>;})}
       </div>
       <div className="space-y-2 rounded-xl border border-[#c8d7e8] bg-[#f7faff] p-3">
         <label className="block font-semibold" htmlFor={`theme-upload-${area}`}>หรืออัปโหลดรูปของตัวเอง (PNG / JPG / WEBP ไม่เกิน 5 MB)</label>
         <input id={`theme-upload-${area}`} type="file" accept="image/png,image/jpeg,image/webp" className="w-full text-sm" onChange={e=>{upload(area,e.target.files?.[0]);e.target.value="";}}/>
         {usingOwn&&ownSrc&&<div className="space-y-2">
           <img src={ownSrc} alt={`รูป ${title} ที่เลือก`} className="max-h-32 w-full rounded-lg object-contain"/>
           <p className="text-sm font-semibold text-[#125b31]">{files[area]?`เลือกรูป ${files[area]?.name} แล้ว · กดบันทึกเพื่ออัปโหลด`:"กำลังใช้รูปที่อัปโหลดไว้"}</p>
           {area!=="background"&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-5 w-5" checked={draft[`${area}_full`]} onChange={e=>patch({[`${area}_full`]:e.target.checked} as Partial<InstituteTheme>)}/>
             <span>รูปนี้ออกแบบมามีชื่อ/ข้อความอยู่แล้ว — แสดงรูปอย่างเดียว ไม่เอาตัวหนังสือทับ<br/><span className="text-[#5b6f88]">ไม่ติ๊ก = ใช้รูปเป็นพื้นหลัง แล้วแสดงชื่อสถาบันทับด้านบน</span></span></label>}
           <button type="button" className="rounded-lg border border-[#bca04d] bg-[#fff4d4] px-3 py-2 text-sm" onClick={()=>choose(area,options[0].id)}>ไม่ใช้รูปนี้ กลับไปใช้แบบสำเร็จรูป</button>
         </div>}
       </div>
     </fieldset>;
   })}
   <div className={`inst-theme-savebar ${dirty?"is-dirty":""}`} role="region" aria-label="บันทึกธีม">
     <p className="text-sm font-semibold">{dirty?"● ยังไม่ได้บันทึก · หน้าเว็บด้านบนคือตัวอย่าง":"ธีมปัจจุบันบันทึกแล้ว"}</p>
     <div className="flex gap-2">
       {dirty&&<button type="button" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} className="min-h-12 rounded-xl border-2 border-[#bcd1eb] bg-white px-3 text-sm font-semibold text-[#0b4f9e]">⬆ ดูตัวอย่าง</button>}
       {dirty&&<button type="button" onClick={cancel} disabled={busy} className="min-h-12 rounded-xl border-2 border-[#d2b25a] bg-[#fff7df] px-3 text-sm font-semibold text-[#6c4d0e]">ยกเลิก</button>}
       <button type="button" disabled={busy||!dirty} onClick={()=>void save()} className="min-h-12 rounded-xl border-2 border-[#0b428c] bg-[#1258aa] px-5 text-base font-semibold text-white shadow-sm hover:bg-[#0b458c] disabled:opacity-50">{busy?"กำลังบันทึก…":"บันทึกธีมสถาบัน"}</button>
     </div>
   </div>
 </section>;
}
