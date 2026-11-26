"use client";

import {useId,useState,type ReactNode} from "react";
import MenuIcon from "@/components/MenuIcon";
import styles from "./InstitutionHeader.module.css";

type Action = { label: string; icon: ReactNode; onClick: () => void };
export default function InstitutionHeader({name,logo,status,description,actions,bannerImage,coverImage,onRename}:{name:string;logo:ReactNode;status:string;description:string;actions:Action[];bannerImage?:string|null;coverImage?:string|null;onRename?:(name:string)=>Promise<void>}) {
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState(name);
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState("");
 const [error,setError]=useState("");
 const inputId=useId();
 const begin=()=>{setDraft(name);setError("");setFeedback("");setEditing(true);};
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy||!onRename)return;
  const next=draft.trim().replace(/\s+/g," ");
  if(next.length<2||next.length>160){setError("กรุณาระบุชื่อสถาบัน 2–160 ตัวอักษร");return;}
  if(next===name){setEditing(false);return;}
  setBusy(true);setError("");
  try{await onRename(next);setEditing(false);setFeedback("บันทึกชื่อสถาบันแล้ว");}
  catch(e){setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ กรุณาลองใหม่");}
  finally{setBusy(false);}
 };
 return <div className={styles.header}>
  <section className={styles.banner} style={bannerImage?{backgroundImage:`linear-gradient(90deg,#0752b5,transparent),url("${bannerImage}")`}:undefined}>
   <span className={styles.emblem}><MenuIcon name="school"/></span>
   <div><h2>สถาบันของฉัน</h2><p>จัดการข้อมูลสถาบัน นักกีฬา และการแข่งขัน</p></div>
  </section>
  <section className={styles.identity} style={coverImage?{backgroundImage:`linear-gradient(90deg,rgba(255,255,255,.97),rgba(255,255,255,.86)),url("${coverImage}")`}:undefined}>
   <div className={styles.profile}>
    <div className={styles.logo}>{logo}</div>
    <div className={styles.details}><div className={styles.nameRow}><h1>{name}</h1>{onRename&&!editing&&<button type="button" className={styles.editName} onClick={begin} aria-label="แก้ไขชื่อสถาบัน" title="แก้ไขชื่อสถาบัน"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-4-4L5 15z"/></svg></button>}</div>
     {editing&&<form onSubmit={save} className={styles.nameForm} aria-busy={busy}>
      <label htmlFor={inputId}>ชื่อสถาบัน</label><input id={inputId} value={draft} onChange={e=>setDraft(e.target.value)} minLength={2} maxLength={160} required autoFocus disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error?`${inputId}-error`:undefined}/>
      <div><button type="submit" disabled={busy}>{busy?"กำลังบันทึก…":"บันทึกชื่อ"}</button><button type="button" disabled={busy} onClick={()=>{setEditing(false);setError("");}}>ยกเลิก</button></div>
      {error&&<p id={`${inputId}-error`} role="alert">{error}</p>}
     </form>}
     {feedback&&<p role="status" className={styles.saved}>{feedback}</p>}<span className={styles.status}>{status}</span><p>{description}</p></div>
   </div>
   <div className={styles.actions}>{actions.map((a,i)=><button key={a.label} type="button" onClick={a.onClick} className={i===0?styles.primary:undefined}>{a.icon}<span>{a.label}</span></button>)}</div>
  </section>
 </div>;
}
