"use client";
import {useEffect,useRef,useState} from "react";
import AthletePhotoViewer from "@/components/AthletePhotoViewer";
import type {FanData} from "@/lib/go-fan-data";
import {roundsOf} from "@/lib/competition-day.mjs";
import {fanOutcome} from "@/lib/go-fan.mjs";
import type {Rec,Student} from "./bits";
import "@/app/competition/competition.css";
import styles from "./InstitutionResults.module.css";

export type WallCell={round:number;opponent:string;board:number|null;colour:string;label:string;kind:string};
export type WallRow={key:string;student?:Student;record:Rec;rounds:number;cells:WallCell[];score:number|null;sos:number|null;sosos:number|null;pos:number|null};

/** Preserve source scores/rank; missing details never become invented wins, opponents or totals. */
export function buildWallRow(record:Rec,student?:Student,data?:FanData):WallRow {
 const d=data?.divisions.find(d=>d.division.id===record.division_id);
 const standing=d?.standings.find(s=>s.athlete_id===record.athlete_id);
 const games=(d?.matches??[]).filter(m=>m.state!=="void"&&(m.black_athlete_id===record.athlete_id||m.white_athlete_id===record.athlete_id));
 const byes=(d?.byes??[]).filter(b=>b.athlete_id===record.athlete_id);
 const people=new Map(d?.people??[]);
 const cells:WallCell[]=games.map(m=>{
   const black=m.black_athlete_id===record.athlete_id;
   const outcome=fanOutcome(m,record.athlete_id);
   return {round:m.round_number,opponent:people.get(black?m.white_athlete_id:m.black_athlete_id)?.name??"รอชื่อคู่แข่งขัน",board:m.board_number,colour:black?"หมากดำ":"หมากขาว",label:outcome.label,kind:outcome.kind};
 });
 cells.push(...byes.map(b=>({round:b.round_number,opponent:"ไม่มีคู่แข่งขัน",board:null,colour:"—",label:"บาย",kind:"win"})));
 const confirmed=games.some(m=>m.state==="verified")||byes.length>0;
 return {key:`${record.tournament_id}:${record.division_id}:${record.athlete_id}`,student,record,cells,rounds:Math.max(roundsOf(d?.division),...cells.map(c=>c.round)),score:confirmed?standing?.score??null:null,sos:confirmed?standing?.sos??null:null,sosos:confirmed?standing?.sosos??null:null,pos:confirmed?standing?.pos??record.pos:record.games>0?record.pos:null};
}

export default function InstitutionWallList({rows,mode}:{rows:WallRow[];mode:"cards"|"table"}) {
 const [detail,setDetail]=useState<{row:WallRow;cell:WallCell}|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(!detail)return;const node=dialog.current;node?.showModal();return()=>node?.close();},[detail]);
 const groups=new Map<string,WallRow[]>();
 for(const row of rows){const key=`${row.record.tournament_id}:${row.record.division_id}`;groups.set(key,[...(groups.get(key)??[]),row]);}
 if(!groups.size)groups.set("empty",[]);
 const who=(row?:WallRow)=><div className={styles.athlete}>{row?.student?<><AthletePhotoViewer name={row.student.name} src={row.student.photo}/><span><strong>{row.student.name}</strong><small>{row.student.rank??"—"}</small></span></>:<span>—</span>}</div>;
 const cell=(row:WallRow,round:number)=>{const c=row.cells.find(c=>c.round===round);return c?<button type="button" className={`${styles.roundResult} ${c.kind==="win"?styles.win:c.kind==="loss"?styles.loss:""}`} onClick={()=>setDetail({row,cell:c})} aria-label={`รอบ ${round} ${row.student?.name??"นักกีฬา"} ${c.label} พบ ${c.opponent}`}><b>{c.label}</b><small>{c.opponent}</small></button>:<span aria-label={`รอบ ${round} รอข้อมูล`}>—</span>;};
 return <>
   {[...groups.entries()].map(([key,group])=>{const rounds=group.length?Math.max(...group.map(r=>r.rounds)):5;group.sort((a,b)=>(a.pos??Infinity)-(b.pos??Infinity)||(a.student?.name??"").localeCompare(b.student?.name??"","th"));const nums=Array.from({length:rounds},(_,i)=>i+1);const first=group[0];return <section key={key} className={styles.wallGroup}>
     <h2>{first?.record.title??"รอข้อมูลรายการแข่งขัน"}<small>รุ่น {first?.record.division??"—"}</small></h2>
     {!group.length||group.every(r=>!r.cells.length)?<p className={styles.waiting}>รอข้อมูลผลการแข่งขัน · ช่องที่ยังไม่มีข้อมูลแสดง “—”</p>:null}
     {mode==="table"?<div data-wall-scroll className={styles.tableScroll} tabIndex={0} role="region" aria-label={`ตารางวอลิส ${first?.record.title??"รอข้อมูล"}`}><table className={styles.wallTable}>
       <thead><tr><th scope="col">อันดับ</th><th scope="col">รูป–ชื่อนักกีฬา</th><th scope="col">รุ่น</th>{nums.map(n=><th scope="col" key={n}>รอบ {n}</th>)}<th scope="col">คะแนนรวม</th><th scope="col">SOS</th><th scope="col">SOSOS</th></tr></thead>
       <tbody>{group.length?group.map(row=><tr key={row.key}><td>{row.pos??"—"}</td><td>{who(row)}</td><td>{row.record.division}</td>{nums.map(n=><td key={n}>{cell(row,n)}</td>)}<td>{row.score??"—"}</td><td>{row.sos??"—"}</td><td>{row.sosos??"—"}</td></tr>):<tr><td>—</td><td>—</td><td>—</td>{nums.map(n=><td key={n}>—</td>)}<td>—</td><td>—</td><td>—</td></tr>}</tbody>
     </table></div>:<div className={styles.cards}>{(group.length?group:[null]).map((row,i)=><article key={row?.key??i}>{who(row??undefined)}<p>อันดับ {row?.pos??"—"} · รุ่น {row?.record.division??"—"}</p><div className={styles.roundGrid}>{nums.map(n=><div key={n}><b>รอบ {n}</b>{row?cell(row,n):"—"}</div>)}</div><dl className={styles.scores}><div><dt>คะแนนรวม</dt><dd>{row?.score??"—"}</dd></div><div><dt>SOS</dt><dd>{row?.sos??"—"}</dd></div><div><dt>SOSOS</dt><dd>{row?.sosos??"—"}</dd></div></dl></article>)}</div>}
   </section>;})}
   {detail&&<dialog ref={dialog} data-export-ignore="true" aria-label="รายละเอียดผลรายรอบ" className={styles.detail} onClose={()=>setDetail(null)} onClick={e=>{if(e.target===e.currentTarget)setDetail(null);}}><button type="button" autoFocus onClick={()=>setDetail(null)}>ปิด ✕</button><h2>{detail.row.student?.name??"นักกีฬา"} · รอบ {detail.cell.round}</h2><p>{detail.row.record.title} · {detail.row.record.division}</p><p>คู่แข่งขัน: {detail.cell.opponent}</p><p>โต๊ะ {detail.cell.board??"—"} · {detail.cell.colour}</p><strong>{detail.cell.label}</strong></dialog>}
 </>;
}
