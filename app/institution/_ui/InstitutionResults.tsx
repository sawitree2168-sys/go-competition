"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {capture} from "./ShareSave";
import type {Rec,Student} from "./bits";
import {DisplayModeToggle} from "./DisplayMode";
import InstitutionWallList,{buildWallRow} from "./InstitutionWallList";
import type {FanData} from "@/lib/go-fan-data";
import styles from "./InstitutionResults.module.css";

export default function InstitutionResults({name,students,records,onBack,sample=false}:{name:string;students:Student[];records:Rec[];onBack:()=>void;sample?:boolean}) {
 const page=useRef<HTMLElement>(null);const content=useRef<HTMLDivElement>(null);
 const [mode,setMode]=useState<"cards"|"table">("table");const [query,setQuery]=useState("");const [event,setEvent]=useState("");const [year,setYear]=useState("");const [busy,setBusy]=useState("");const [note,setNote]=useState("");
 const [division,setDivision]=useState("");
 const [publicData,setPublicData]=useState<Record<string,FanData>>({});
 const [loadNote,setLoadNote]=useState("");
 const byId=useMemo(()=>new Map(students.map(s=>[s.id,s])),[students]);
 const events=useMemo(()=>Array.from(new Map(records.map(r=>[r.tournament_id,r.title])).entries()),[records]);
 const years=useMemo(()=>Array.from(new Set(records.filter(r=>r.date).map(r=>r.date!.slice(0,4)))).sort().reverse(),[records]);
 const divisions=useMemo(()=>Array.from(new Set(records.filter(r=>(!event||r.tournament_id===event)&&(!year||r.date?.startsWith(year))).map(r=>r.division))).sort(),[records,event,year]);
 const rows=useMemo(()=>records.filter(r=>(!event||r.tournament_id===event)&&(!year||r.date?.startsWith(year))&&(!division||r.division===division)&&`${byId.get(r.athlete_id)?.name??""} ${r.title} ${r.division}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>String(b.date??"").localeCompare(String(a.date??""))),[records,event,year,query,byId,division]);
 const liveIds=JSON.stringify(sample?[]:Array.from(new Set(rows.filter(r=>r.source!=="history"&&/^[0-9a-f-]{36}$/i.test(r.tournament_id)).map(r=>r.tournament_id))));
 useEffect(()=>{
  const abort=new AbortController();const ids=JSON.parse(liveIds) as string[];
  void Promise.all(ids.map(async id=>{try{const response=await fetch(`/api/go-fan?event=${encodeURIComponent(id)}`,{cache:"no-store",signal:abort.signal});const data=await response.json() as FanData;if(!response.ok||data.error)throw new Error();if(!abort.signal.aborted){setPublicData(prev=>({...prev,[id]:data}));}}catch{if(!abort.signal.aborted)setLoadNote("ยังโหลดข้อมูลรายรอบไม่ได้ · แสดงโครงสร้างตารางและข้อมูลที่มีอยู่");}}));
  return()=>abort.abort();
 },[liveIds]);
 const wallRows=useMemo(()=>{
  const list=rows.map(r=>buildWallRow(r,byId.get(r.athlete_id),publicData[r.tournament_id]));
  if(list.length||records.length||event||year||division)return list;
  return students.filter(s=>s.name.toLowerCase().includes(query.trim().toLowerCase())).map(s=>buildWallRow({athlete_id:s.id,tournament_id:"",title:"รอข้อมูลรายการแข่งขัน",date:null,division_id:"",division:"—",games:0,wins:0,losses:0,draws:0,pos:null,field:null},s));
 },[rows,records,students,byId,publicData,event,year,division,query]);
 const download=async(kind:"png"|"pdf")=>{if(busy||!content.current)return;setBusy(kind);setNote("");try{
  const source=content.current;const clone=source.cloneNode(true) as HTMLDivElement;
  clone.style.width=`${Math.max(source.clientWidth,...Array.from(source.querySelectorAll("table")).map(t=>t.scrollWidth+80))}px`;
  const host=document.createElement("div");host.style.position="fixed";host.style.left="-100000px";host.style.top="0";host.appendChild(clone);
  clone.querySelectorAll<HTMLElement>("[data-wall-scroll]").forEach(el=>{el.style.overflow="visible";});
  document.body.appendChild(host);let blob:Blob;try{blob=await capture(clone);}finally{host.remove();}let output=blob;
  if(kind==="pdf"){
   const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();const url=URL.createObjectURL(blob);img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("image"));};img.src=url;});
   const {jsPDF}=await import("jspdf");const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});const margin=10;const width=pdf.internal.pageSize.getWidth()-margin*2;const height=pdf.internal.pageSize.getHeight()-margin*2;const pixelsPerPage=Math.max(1,Math.floor(height*image.naturalWidth/width));
   const canvas=document.createElement("canvas");canvas.width=image.naturalWidth;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("canvas");
   for(let top=0,index=0;top<image.naturalHeight;top+=pixelsPerPage,index++){
    const slice=Math.min(pixelsPerPage,image.naturalHeight-top);canvas.height=slice;ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,slice);ctx.drawImage(image,0,top,image.naturalWidth,slice,0,0,canvas.width,slice);if(index)pdf.addPage();pdf.addImage(canvas.toDataURL("image/png"),"PNG",margin,margin,width,slice*width/image.naturalWidth);
   }output=pdf.output("blob");
  }
  const url=URL.createObjectURL(output);const a=document.createElement("a");a.href=url;a.download=`ผลการแข่งขัน-${name.replace(/[<>:"/\\|?*]/g,"-")}.${kind}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);setNote(`ดาวน์โหลด ${kind.toUpperCase()} แล้ว`);
 }catch{setNote("ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่");}finally{setBusy("");}};

 return <section ref={page} className={styles.page} aria-label="ผลการแข่งขันเต็มหน้า">
  <div className={styles.toolbar} data-export-ignore="true"><button type="button" onClick={onBack}>← กลับหน้าสถาบัน</button><div><button type="button" onClick={async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await page.current?.requestFullscreen();}catch{setNote("อุปกรณ์นี้ไม่รองรับเต็มจอ สามารถดูเต็มหน้าได้ตามปกติ");}}}>เต็มจอ</button><button type="button" disabled={!!busy} onClick={()=>void download("png")}>{busy==="png"?"กำลังสร้างรูป…":"ดาวน์โหลด PNG"}</button><button type="button" disabled={!!busy} onClick={()=>void download("pdf")}>{busy==="pdf"?"กำลังสร้าง PDF…":"ดาวน์โหลด PDF"}</button></div></div>
  <div className={styles.filters}><input type="search" aria-label="ค้นหาผลการแข่งขัน" placeholder="ค้นหานักกีฬา / รายการ / รุ่น" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="ปีผลการแข่งขัน" value={year} onChange={e=>{setYear(e.target.value);setEvent("");setDivision("");}}><option value="">ทุกปี</option>{years.map(y=><option key={y} value={y}>ปี {Number(y)+543}</option>)}</select><select aria-label="รายการผลการแข่งขัน" value={event} onChange={e=>{setEvent(e.target.value);setDivision("");}}><option value="">ทุกรายการ</option>{events.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select><select aria-label="รุ่นผลการแข่งขัน" value={division} onChange={e=>setDivision(e.target.value)}><option value="">ทุกรุ่น</option>{divisions.map(d=><option key={d} value={d}>{d}</option>)}</select><DisplayModeToggle mode={mode} onChange={setMode}/></div>
  {note&&<p role="status">{note}</p>}
  {loadNote&&<p role="status">{loadNote}</p>}
  <div className={styles.scroll}><div ref={content} className={styles.content}>
   <header><p>GO TOURNAMENT{sample?" · ข้อมูลตัวอย่าง":""}</p><h1>ผลการแข่งขัน · วอลิส · {name}</h1><p>{year?`ปี ${Number(year)+543}`:"ทุกปี"} · {events.find(([id])=>id===event)?.[1]??"ทุกรายการ"}{query?` · ค้นหา: ${query}`:""} · {rows.length} ผลการแข่งขัน</p></header>
   <InstitutionWallList rows={wallRows} mode={mode}/>
  </div></div>
 </section>;
}
