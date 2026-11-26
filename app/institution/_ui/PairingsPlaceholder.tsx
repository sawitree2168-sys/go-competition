"use client";

import {useState} from "react";
import CompetitionPanel from "@/components/CompetitionPanel";
import AthleteAvatar from "@/components/AthleteAvatar";
import AthletePhotoViewer from "@/components/AthletePhotoViewer";
import styles from "./PairingsPlaceholder.module.css";

type Person={name:string;photo?:string|null};
/** A blank pairing layout, never synthetic match data. Real published boards replace it. */
export default function PairingsPlaceholder({eventTitle,institution,divisionName="รอข้อมูลรุ่นแข่งขัน",rounds=5,roster=[]}:{eventTitle:string;institution:string;divisionName?:string;rounds?:number;roster?:Person[]}) {
 const [round,setRound]=useState(1);
 const [mode,setMode]=useState<"cards"|"table">("cards");
 const count=Math.max(1,rounds);
 const selected=Math.min(round,count);
 const side=(colour:"black"|"white")=><div className={styles.side}><span className={styles.photoSlot} data-athlete-photo="true"><AthleteAvatar name="รอประกาศนักกีฬา" src={null} variant="portrait" className={styles.avatar}/></span><span><b>{colour==="black"?"● ฝ่ายดำ":"○ ฝ่ายขาว"}</b><strong>—</strong><small>รอประกาศคู่แข่งขัน</small></span></div>;
 return <section className={styles.placeholder} aria-label="โครงสร้างติดตามคู่แข่งขันในสังกัด">
   <h2>จับคู่และผลการแข่งขัน · {divisionName}</h2>
   <p className={styles.notice}>รอข้อมูลจับคู่สาธารณะ · โครงสร้างด้านล่างยังไม่มีหมายเลขโต๊ะ คู่แข่ง หรือผลการแข่งขัน</p>
   <div className={styles.rounds} role="group" aria-label="เลือกรอบการแข่งขันที่รอประกาศ">{Array.from({length:count},(_,i)=><button type="button" key={i} aria-pressed={selected===i+1} onClick={()=>setRound(i+1)}>รอบ {i+1}<small>รอประกาศ</small></button>)}</div>
   <div className={styles.modes} role="group" aria-label="มุมมองคู่แข่งขัน"><button type="button" aria-pressed={mode==="cards"} onClick={()=>setMode("cards")}>▦ การ์ด</button><button type="button" aria-pressed={mode==="table"} onClick={()=>setMode("table")}>☷ ตาราง</button></div>
   <CompetitionPanel title={`คู่แข่งขันรอบ ${selected} · รอประกาศ`} context={`${eventTitle} · ${institution} · ${divisionName}`} exportWidth={1200} actionsAtTop>
     <div className={styles.report}>
       <header><h3>{institution} · รอบ {selected}</h3><p>{eventTitle} · {divisionName} · รอประกาศคู่แข่งขัน</p></header>
       {mode==="cards"?<article className={styles.match}><div className={styles.matchHead}><strong>โต๊ะ —</strong><span>รอประกาศ</span></div><div className={styles.versus}>{side("black")}<b className={styles.vs}>VS</b>{side("white")}</div><footer>ผลการแข่งขัน: — <small>รอผลการแข่งขัน</small></footer></article>:<div className={styles.tableScroll} tabIndex={0} role="region" aria-label="ตารางคู่แข่งขันรอประกาศ"><table><thead><tr><th scope="col">รอบ</th><th scope="col">โต๊ะ</th><th scope="col">ฝ่ายดำ ●</th><th scope="col">ฝ่ายขาว ○</th><th scope="col">ผลการแข่งขัน</th></tr></thead><tbody><tr><td>{selected}</td><td>—</td><td>{side("black")}</td><td>{side("white")}</td><td>—<small>รอผลการแข่งขัน</small></td></tr></tbody></table></div>}
     </div>
   </CompetitionPanel>
   {roster.length>0&&<section className={styles.roster}><h3>รายชื่อนักกีฬาในสังกัด{divisionName==="รอข้อมูลรุ่นแข่งขัน"?"":"ในรุ่นนี้"}</h3><p>รายชื่อสำหรับติดตาม · ยังไม่ระบุคู่แข่งขัน โต๊ะ หรือสีหมาก</p><ul>{roster.map((p,i)=><li key={`${p.name}:${i}`}><AthletePhotoViewer name={p.name} src={p.photo}/><strong>{p.name}</strong><small>รอประกาศคู่แข่งขัน</small></li>)}</ul></section>}
 </section>;
}
