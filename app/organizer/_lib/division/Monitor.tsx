"use client";
import {useMemo,useState} from "react";
import AthleteAvatar from "@/components/AthleteAvatar";
import RoundReportButtons,{RoundTable,type ReportPerson} from "@/components/RoundReport";
import CompetitionPanel from "@/components/CompetitionPanel";
import {nameOf,schoolOf,type DivisionData} from "./types";
import {resultLabel,roundsOf} from "@/lib/competition-day.mjs";
export default function Monitor({data,onResults}:{data:DivisionData;onResults:()=>void}){
  const last=Math.max(0,...data.matches.map(m=>m.round_number));
  const [round,setRound]=useState<number|null>(null);
  const [view,setView]=useState<"cards"|"table">("cards");
  const [showPhotos,setShowPhotos]=useState(true);
  const [query,setQuery]=useState("");
  const [expanded,setExpanded]=useState(false);
  const selected=round??last;
  const regs=useMemo(()=>new Map(data.regs.map(r=>[r.athlete_id,r])),[data.regs]);
  const people=useMemo(()=>Object.fromEntries(data.regs.map(r=>[r.athlete_id,{name:nameOf(r),institution:schoolOf(r),rank:r.gt_athletes?.current_rank??null,photo:r.gt_athletes?.avatar_url??null}])),[data.regs]) as Record<string,ReportPerson>;
  const all=data.matches.filter(m=>m.round_number===selected && m.state!=="void");
  const done=all.filter(m=>m.state==="verified").length;
  const rows=all.filter(m=>[m.board_number,nameOf(regs.get(m.black_athlete_id)),nameOf(regs.get(m.white_athlete_id)),schoolOf(regs.get(m.black_athlete_id)),schoolOf(regs.get(m.white_athlete_id))].join(" ").toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th")));
  const player=(id:string,colour:string)=>{
    const r=regs.get(id);
    return <div className="flex min-w-0 items-center gap-2">
      {showPhotos&&<AthleteAvatar src={r?.gt_athletes?.avatar_url} name={nameOf(r)} zoom className="h-14 w-14"/>}
      <span className="min-w-0"><strong className="block break-words text-sm">{colour} {nameOf(r)}</strong><small className="block break-words text-xs text-[var(--gt-muted)]">{schoolOf(r)}</small></span>
    </div>;
  };
  const title=`รุ่น ${data.division.name} · รอบที่ ${selected}`;
  return <section className="gt-monitor-ref space-y-4">
    <div className="site-metrics gt-monitor-ref-metrics"><div>รอบที่แสดง<b>{selected} / {roundsOf(data.division)}</b></div><div>โต๊ะทั้งหมด<b>{all.length}</b></div><div>ลงผลแล้ว<b>{done}</b></div><div>รอลงผล<b>{all.length-done}</b></div></div>
    <div className="gt-card gt-monitor-ref-tools flex flex-wrap gap-3 p-4">
      <label>รอบ <select className="min-h-11 rounded-lg border-2 border-[var(--gt-gold)] px-3" value={selected} onChange={e=>setRound(Number(e.target.value))}>{Array.from({length:last},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      <input type="search" className="min-h-11 min-w-0 flex-1 rounded-lg border-2 border-[var(--gt-line)] px-3" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาโต๊ะ / ชื่อ / สถาบัน" aria-label="ค้นหามอนิเตอร์"/>
      <div className="gt-monitor-ref-switch" role="group" aria-label="มุมมองมอนิเตอร์">
        <button type="button" aria-pressed={view==="cards"} onClick={()=>setView("cards")}>▦ การ์ด</button>
        <button type="button" aria-pressed={view==="table"} onClick={()=>setView("table")}>☷ ตาราง</button>
        <button type="button" aria-pressed={showPhotos} onClick={()=>setShowPhotos(v=>!v)}>{showPhotos?"ซ่อนรูป":"แสดงรูป"}</button>
        <button type="button" onClick={()=>setExpanded(true)}>⛶ เต็มจอ</button>
      </div>
    </div>
    <p className="text-sm">บันทึกผลแล้ว <strong>{done}/{all.length}</strong> คู่ ({all.length?Math.round(done/all.length*100):0}%)</p>
    {selected>0&&<RoundReportButtons eventTitle="GO TOURNAMENT" divisionName={data.division.name} round={selected} matches={data.matches} byes={data.byes} people={people}/>}
    {!rows.length?<p className="gt-card p-8 text-center">{last?"ไม่พบโต๊ะที่ตรงกับคำค้น":"ยังไม่ประกาศคู่แข่งขัน"}</p>:
     view==="cards"?<div className="site-monitor-grid">{rows.map(m=><article className="site-monitor-card" key={m.id}>
       <header><span>โต๊ะ {m.board_number}</span><span className={m.state==="verified"?"text-green-700":"text-amber-700"}>{m.state==="verified"?resultLabel(m):"รอผล"}</span></header>
       <div className="site-monitor-players">{player(m.black_athlete_id,"⚫")}{player(m.white_athlete_id,"⚪")}</div>
       <button type="button" className="gt-cta-btn mx-4 mb-4 min-h-11 w-[calc(100%-2rem)]" onClick={onResults}>{m.state==="verified"?"ดูผล / แก้ผล":"ลงผล"}</button>
     </article>)}</div>:
     <div className="gt-monitor-ref-table gt-card">
       <div className="gt-monitor-mobile">{rows.map(m=><div className="gt-monitor-mobile-item" key={m.id}>
         <button type="button" onClick={()=>setExpanded(true)}><b>โต๊ะ {m.board_number}</b><span>ดำ {nameOf(regs.get(m.black_athlete_id))}<small>ขาว {nameOf(regs.get(m.white_athlete_id))}</small></span><span>{m.state==="verified"?resultLabel(m):"รอผล"}<small>⛶ เต็มจอ</small></span></button>
         <button type="button" onClick={onResults} className="gt-cta-btn min-h-11 px-3">{m.state==="verified"?"ดูผล":"ลงผล"}</button>
       </div>)}</div>
       <div className="gt-monitor-desktop"><table><thead><tr><th>โต๊ะ</th><th>ฝ่ายดำ</th><th>ฝ่ายขาว</th><th>รอบ</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td>{m.board_number}</td><td>{player(m.black_athlete_id,"⚫")}</td><td>{player(m.white_athlete_id,"⚪")}</td><td>{selected}</td><td>{m.state==="verified"?resultLabel(m):"รอผล"}</td><td><button type="button" onClick={onResults} className="gt-outline-btn min-h-11 px-3">{m.state==="verified"?"ดูผล":"ลงผล"}</button></td></tr>)}</tbody></table></div>
     </div>}
    {expanded&&<CompetitionPanel title={title} context={`GO TOURNAMENT · ${title}`} onClose={()=>setExpanded(false)}>
      <div className={showPhotos?"":"gt-hide-photos"}><RoundTable kind="results" round={selected} matches={rows} byes={data.byes} people={people}/></div>
    </CompetitionPanel>}
  </section>;
}
