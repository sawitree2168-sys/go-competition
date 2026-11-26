"use client";

import {useState} from "react";
import {Avatar, type Student} from "./bits";
import {DisplayModeToggle} from "./DisplayMode";
import MenuIcon from "@/components/MenuIcon";
import styles from "./OverviewRoster.module.css";

export default function OverviewRoster({students,onSelect,onViewAll}:{students:Student[];onSelect:(student:Student)=>void;onViewAll:()=>void}) {
 const [mode,setMode]=useState<"cards"|"table">("cards");
 const shown=students.slice(0,4);
 return <section className={styles.panel} aria-label="นักกีฬาในสังกัด">
  <header className={styles.heading}><h3><MenuIcon name="entrants"/>นักกีฬาในสังกัด</h3><DisplayModeToggle mode={mode} onChange={setMode}/></header>
  {shown.length?mode==="cards"?<div className={styles.cards}>{shown.map(s=><article key={s.id} className={styles.card}>
   <Avatar src={s.photo} name={s.name} zoom className="h-24 w-24 sm:h-28 sm:w-28"/>
   <button type="button" onClick={()=>onSelect(s)} className={styles.name}>{s.name}</button>
   <span className={styles.rank}>{s.rank||"ยังไม่ระบุระดับ"}</span>
  </article>)}</div>:<div className={styles.tableWrap}><table><thead><tr><th>นักกีฬา</th><th>ระดับฝีมือ</th></tr></thead><tbody>{shown.map(s=><tr key={s.id}><td><button type="button" onClick={()=>onSelect(s)}>{s.name}</button></td><td>{s.rank||"ยังไม่ระบุระดับ"}</td></tr>)}</tbody></table></div>:<p className={styles.empty}>ยังไม่มีนักกีฬาในสังกัด เพิ่มรายชื่อได้จากเมนูจัดการนักกีฬา</p>}
  <footer><span>แสดง {shown.length} จาก {students.length} คน</span><button type="button" onClick={onViewAll}>ดูนักกีฬาทั้งหมด →</button></footer>
 </section>;
}
