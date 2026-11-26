"use client";
import {useMemo,useRef,useState} from "react";
import {capture} from "./ShareSave";
import type {Rec,Student} from "./bits";
import {DisplayModeToggle} from "./DisplayMode";
import styles from "./InstitutionResults.module.css";

export default function InstitutionResults({name,students,records,onBack,sample=false}:{name:string;students:Student[];records:Rec[];onBack:()=>void;sample?:boolean}) {
 const page=useRef<HTMLElement>(null);const content=useRef<HTMLDivElement>(null);
 const [mode,setMode]=useState<"cards"|"table">("table");const [query,setQuery]=useState("");const [event,setEvent]=useState("");const [year,setYear]=useState("");const [busy,setBusy]=useState("");const [note,setNote]=useState("");
 const byId=useMemo(()=>new Map(students.map(s=>[s.id,s])),[students]);
 const events=useMemo(()=>Array.from(new Map(records.map(r=>[r.tournament_id,r.title])).entries()),[records]);
 const years=useMemo(()=>Array.from(new Set(records.filter(r=>r.date).map(r=>r.date!.slice(0,4)))).sort().reverse(),[records]);
 const rows=useMemo(()=>records.filter(r=>(!event||r.tournament_id===event)&&(!year||r.date?.startsWith(year))&&`${byId.get(r.athlete_id)?.name??""} ${r.title} ${r.division}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>String(b.date??"").localeCompare(String(a.date??""))),[records,event,year,query,byId]);
 const download=async(kind:"png"|"pdf")=>{if(busy||!content.current)return;setBusy(kind);setNote("");try{
  const blob=await capture(content.current);let output=blob;
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
 const formatDate=(date:string|null)=>date?new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Bangkok"}).format(new Date(`${date}T00:00:00+07:00`)):"ไม่ระบุวันที่";
 return <section ref={page} className={styles.page} aria-label="ผลการแข่งขันเต็มหน้า">
  <div className={styles.toolbar} data-export-ignore="true"><button type="button" onClick={onBack}>← กลับหน้าสถาบัน</button><div><button type="button" onClick={async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await page.current?.requestFullscreen();}catch{setNote("อุปกรณ์นี้ไม่รองรับเต็มจอ สามารถดูเต็มหน้าได้ตามปกติ");}}}>เต็มจอ</button><button type="button" disabled={!!busy||!rows.length} onClick={()=>void download("png")}>{busy==="png"?"กำลังสร้างรูป…":"ดาวน์โหลด PNG"}</button><button type="button" disabled={!!busy||!rows.length} onClick={()=>void download("pdf")}>{busy==="pdf"?"กำลังสร้าง PDF…":"ดาวน์โหลด PDF"}</button></div></div>
  <div className={styles.filters}><input type="search" aria-label="ค้นหาผลการแข่งขัน" placeholder="ค้นหานักกีฬา / รายการ / รุ่น" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="ปีผลการแข่งขัน" value={year} onChange={e=>setYear(e.target.value)}><option value="">ทุกปี</option>{years.map(y=><option key={y} value={y}>ปี {Number(y)+543}</option>)}</select><select aria-label="รายการผลการแข่งขัน" value={event} onChange={e=>setEvent(e.target.value)}><option value="">ทุกรายการ</option>{events.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select><DisplayModeToggle mode={mode} onChange={setMode}/></div>
  {note&&<p role="status">{note}</p>}
  <div className={styles.scroll}><div ref={content} className={styles.content}>
   <header><p>GO TOURNAMENT{sample?" · ข้อมูลตัวอย่าง":""}</p><h1>ผลการแข่งขัน · {name}</h1><p>{year?`ปี ${Number(year)+543}`:"ทุกปี"} · {events.find(([id])=>id===event)?.[1]??"ทุกรายการ"}{query?` · ค้นหา: ${query}`:""} · {rows.length} ผลการแข่งขัน</p></header>
   {!rows.length?<p className={styles.empty}>ยังไม่มีผลการแข่งขันตามเงื่อนไขที่เลือก</p>:mode==="table"?<table><thead><tr><th>นักกีฬา</th><th>รายการ / รุ่น</th><th>วันที่</th><th>ชนะ</th><th>แพ้</th><th>อันดับ</th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.athlete_id}:${r.division_id}:${i}`}><td>{byId.get(r.athlete_id)?.name??"นักกีฬา"}</td><td>{r.title}<small>{r.division}</small></td><td>{formatDate(r.date)}</td><td><span className={styles.win}>{r.wins}</span></td><td><span className={styles.loss}>{r.losses}</span></td><td>{r.pos?`ที่ ${r.pos}`:"—"}</td></tr>)}</tbody></table>:<div className={styles.cards}>{rows.map((r,i)=><article key={`${r.athlete_id}:${r.division_id}:${i}`}><h2>{byId.get(r.athlete_id)?.name??"นักกีฬา"}</h2><p>{r.title}</p><p>{r.division} · {formatDate(r.date)}</p><div><span className={styles.win}>ชนะ {r.wins}</span><span className={styles.loss}>แพ้ {r.losses}</span><strong>{r.pos?`ที่ ${r.pos}`:"รออันดับ"}</strong></div></article>)}</div>}
  </div></div>
 </section>;
}
