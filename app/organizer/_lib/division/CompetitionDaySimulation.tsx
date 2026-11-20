"use client";
/* Demonstration only. No Supabase writes or use of real entrants. */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AthleteAvatar from "@/components/AthleteAvatar";
import RoundReportButtons, { type ReportMatch, type ReportPerson } from "@/components/RoundReport";
import CompetitionPanel from "@/components/CompetitionPanel";
import SimulationResultDialog from "./SimulationResultDialog";
import "./competition-reference.css";
import { resultLabel, scoresFrom } from "@/lib/competition-day.mjs";

type Person = ReportPerson & { id: string };
type Game = ReportMatch & { table_status: "waiting" | "checked" | "playing" | "finished" };
const NAMES = [
  "ด.ช.ตัวอย่าง กิตติชัย","ด.ญ.ตัวอย่าง วรินทร์","ด.ช.ทดลอง ภูมินทร์","ด.ญ.ทดลอง นภัสสร",
  "ด.ช.สาธิต ธนกฤต","ด.ญ.สาธิต ปัญญา","ด.ช.จำลอง พิชญ์","ด.ญ.จำลอง พิมพ์ชนก",
  "ด.ช.ฝึกซ้อม อนันต์","ด.ญ.ฝึกซ้อม กานต์","ด.ช.ตัวอย่าง กวิน","ด.ญ.ตัวอย่าง รินดา"
];
const CLUBS = ["สถาบันตัวอย่าง A","สถาบันตัวอย่าง B","โรงเรียนตัวอย่าง C"];
const people: Person[] = NAMES.map((name,i)=>({id:`demo-${i+1}`,name,institution:CLUBS[i%CLUBS.length],rank:`${(i%5)+1} คิว`,photo:null}));
const personMap: Record<string,ReportPerson> = Object.fromEntries(people.map(({id,name,institution,rank,photo})=>[id,{name,institution,rank,photo}]));
const makeRound = (round: number, existing: Game[]): Game[] => {
  const {score}=scoresFrom(people.map(p=>p.id),existing,[]);
  const taken = new Set(existing.map(g=>[g.black_athlete_id,g.white_athlete_id].sort().join("|")));
  const available = [...people].sort((a,b)=>(score.get(b.id)??0)-(score.get(a.id)??0)||a.id.localeCompare(b.id));
  const matches: Game[]=[];
  while(available.length>1){
    const first=available.shift()!;
    const idx=available.findIndex(next=>!taken.has([first.id,next.id].sort().join("|")));
    const second=available.splice(idx<0?0:idx,1)[0];
    matches.push({id:`sim-${round}-${matches.length+1}`,round_number:round,board_number:matches.length+1,black_athlete_id:round%2?first.id:second.id,white_athlete_id:round%2?second.id:first.id,
      winner_athlete_id:null,result_code:null,result_margin:null,state:"pending",pool_label:null,table_status:"waiting"});
  }
  return matches;
};
const INITIAL = makeRound(1,[]);
const label = (g: Game) => g.state==="verified"?resultLabel(g):({waiting:"รอเช็กชื่อ",checked:"ตรวจผู้เล่นแล้ว",playing:"กำลังแข่งขัน",finished:"บันทึกผลแล้ว"} as const)[g.table_status];
const stateStyle = (g:Game)=>g.state==="verified"?"border-green-600 bg-green-50 text-green-800":g.table_status==="playing"?"border-blue-600 bg-blue-50 text-blue-900":"border-amber-500 bg-amber-50 text-amber-900";
const DEMO_BG="gt-reference-banner";

export default function CompetitionDaySimulation({eventId,divisionId,publicDemo=false}: {eventId:string;divisionId:string;publicDemo?:boolean}) {
  const [games,setGames]=useState<Game[]>(INITIAL);
  const [round,setRound]=useState(1);
  const [mode,setMode]=useState<"cards"|"table">("cards");
  const [showPhotos,setShowPhotos]=useState(true);
  const [view,setView]=useState<"admin"|"referee"|"public">("admin");
  const [search,setSearch]=useState("");
  const [auto,setAuto]=useState(false);
  const [step,setStep]=useState(0);
  const [full,setFull]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [attendance,setAttendance]=useState<Record<string,"present"|"absent">>({});
  const [history,setHistory]=useState<string[]>(["ระบบจำลองพร้อมใช้งาน · รอบ 1 ประกาศคู่แล้ว"]);
  const append=(message:string)=>setHistory(old=>[message,...old].slice(0,12));
  const attendanceKey=(g:Game,side:"black"|"white")=>`${g.id}:${side}`;
  const statusOf=(g:Game,side:"black"|"white")=>attendance[attendanceKey(g,side)]??"unchecked";
  const setAthleteAttendance=(g:Game,side:"black"|"white",value:"present"|"absent")=>{
    if(view==="public"||g.state==="verified"||g.table_status==="playing")return;
    const key=attendanceKey(g,side);
    const next={...attendance,[key]:value};
    setAttendance(next);
    setGames(old=>old.map(m=>m.id!==g.id?m:{...m,table_status:next[attendanceKey(g,"black")]==="present"&&next[attendanceKey(g,"white")]==="present"?"checked":"waiting"}));
    append(`โต๊ะ ${g.board_number} · ${side==="black"?"ฝ่ายดำ":"ฝ่ายขาว"} ${value==="present"?"มาแล้ว":"ไม่มา"} (จำลอง)`);
  };
  const athleteCheck=(g:Game,side:"black"|"white")=>{
    const current=statusOf(g,side);
    return <div className="gt-reference-attendance" role="group" aria-label={`เช็กชื่อ${side==="black"?"ฝ่ายดำ":"ฝ่ายขาว"} โต๊ะ ${g.board_number}`}>
      <span className="gt-reference-attendance-title">{side==="black"?"● ดำ":"○ ขาว"} · {personMap[side==="black"?g.black_athlete_id:g.white_athlete_id].name}</span>
      <div className="gt-reference-attendance-options">
        <button type="button" className="gt-reference-attend-present" aria-pressed={current==="present"} onClick={()=>setAthleteAttendance(g,side,"present")} disabled={g.state==="verified"||g.table_status==="playing"}>✓ มาแล้ว</button>
        <button type="button" className="gt-reference-attend-absent" aria-pressed={current==="absent"} onClick={()=>setAthleteAttendance(g,side,"absent")} disabled={g.state==="verified"||g.table_status==="playing"}>✕ ไม่มา</button>
      </div>
      <span className={`gt-reference-attendance-badge ${current==="present"?"is-present":current==="absent"?"is-absent":"is-unchecked"}`}>{current==="present"?"✓ มาแล้ว":current==="absent"?"✕ ไม่มา":"ยังไม่เช็กชื่อ"}</span>
    </div>;
  };
  const update=(id:string, stage:"check"|"play"|"black"|"white"|"draw")=>{
    const g=games.find(m=>m.id===id);if(!g)return;
    if(view==="public")return;
    if(stage==="black"||stage==="white"||stage==="draw"){
      const winner=stage==="black"?g.black_athlete_id:stage==="white"?g.white_athlete_id:null;
      setGames(old=>old.map(m=>m.id===id?{...m,winner_athlete_id:winner,result_code:stage==="draw"?"draw":stage==="black"?"black_win":"white_win",state:"verified",result_margin:stage==="draw"?null:"R",table_status:"finished"}:m));
      append(`โต๊ะ ${g.board_number} · ${stage==="black"?"ดำชนะ":stage==="white"?"ขาวชนะ":"เสมอ"} (ข้อมูลจำลอง)`);
    } else {
      setGames(old=>old.map(m=>m.id===id?{...m,table_status:stage==="check"?"checked":"playing"}:m));
      append(`โต๊ะ ${g.board_number} · ${stage==="check"?"เช็กชื่อนักกีฬาแล้ว":"เริ่มแข่งขัน"} (จำลอง)`);
    }
  };
  const applyNext=()=>{
    const pending=games.filter(m=>m.round_number===round);
    const waiting=pending.find(m=>m.table_status==="waiting");
    const checked=pending.find(m=>m.table_status==="checked");
    const playing=pending.find(m=>m.state!=="verified"&&m.table_status==="playing");
    if(waiting){const side=statusOf(waiting,"black")==="unchecked"?"black":statusOf(waiting,"white")==="unchecked"?"white":null;if(side)setAthleteAttendance(waiting,side,"present");else {setAthleteAttendance(waiting,"black","present");setAthleteAttendance(waiting,"white","present");}}
    else if(checked)update(checked.id,"play");
    else if(playing){update(playing.id,step%2?"white":"black");setStep(v=>v+1);}
    else if(round<5){const next=round+1;setGames(old=>[...old,...makeRound(next,old)]);setRound(next);append(`ประกาศจับคู่รอบที่ ${next} (ข้อมูลจำลอง)`);}
    else setAuto(false);
  };
  useEffect(()=>{if(!auto)return;const timer=window.setInterval(()=>{const rows=games.filter(m=>m.round_number===round);if(rows.every(m=>m.state==="verified")&&round===5){setAuto(false);return;} // simulation steps run only while enabled
    const w=rows.find(m=>m.table_status==="waiting"),c=rows.find(m=>m.table_status==="checked"),p=rows.find(m=>m.state!=="verified"&&m.table_status==="playing");
    if(w){const side=statusOf(w,"black")==="unchecked"?"black":statusOf(w,"white")==="unchecked"?"white":null;if(side)setAthleteAttendance(w,side,"present");else {setAthleteAttendance(w,"black","present");setAthleteAttendance(w,"white","present");}}else if(c)update(c.id,"play");else if(p)update(p.id,"black");else if(round<5){let nr=round+1;setGames(old=>[...old,...makeRound(nr,old)]);setRound(nr);append(`ประกาศรอบที่ ${nr} (จำลอง)`);}
  },3500);return()=>window.clearInterval(timer); // intentional state-driven interval for demo only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[auto,games,round]);
  const rows=games.filter(m=>m.round_number===round);
  const filtered=rows.filter(m=>[String(m.board_number),personMap[m.black_athlete_id].name,personMap[m.white_athlete_id].name].join(" ").toLocaleLowerCase("th").includes(search.toLocaleLowerCase("th")));
  const done=rows.filter(m=>m.state==="verified").length;
  const checked=rows.filter(m=>m.table_status!=="waiting").length;
  const allDone=rows.length>0&&done===rows.length;
  const progress=Math.round(done/Math.max(1,rows.length)*100);
  const lastRound=Math.max(1,...games.map(g=>g.round_number));
  const reports=<RoundReportButtons eventTitle="ZEER GO KYU WAR 2026 · โหมดจำลอง" divisionName="รุ่นตัวอย่าง 1–2 คิว · ไม่ใช่ผลจริง" round={round} matches={games} byes={[]} people={personMap}/>;
  const photo=(id:string)=>showPhotos&&<AthleteAvatar src={personMap[id].photo} name={personMap[id].name} zoom variant="portrait" className="gt-reference-athlete-photo h-[76px] w-[70px] sm:h-[94px] sm:w-[84px]"/>;
  const person=(id:string,color:"black"|"white")=><div className="gt-reference-person flex min-w-0 items-center gap-3">
    {photo(id)}<span className="min-w-0"><span className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#385577]"><span className={`h-4 w-4 shrink-0 rounded-full border ${color==="black"?"bg-[#101b2e] border-[#101b2e]":"bg-white border-[#7a92b2]"}`}/>{color==="black"?"หมากดำ":"หมากขาว"}</span><strong className="gt-reference-person-name block text-base text-[#102d58] [overflow-wrap:anywhere]">{personMap[id].name}</strong><small className="gt-reference-person-meta block text-sm text-[#536f93]">{personMap[id].rank} · {personMap[id].institution}</small></span>
  </div>;
  const controls=(g:Game)=><div className="gt-reference-actions">
    {(g.table_status==="waiting"||g.table_status==="checked")&&<div className="gt-reference-attendance-grid">
      {athleteCheck(g,"black")}{athleteCheck(g,"white")}
    </div>}
    {g.table_status==="checked"&&<button type="button" onClick={()=>update(g.id,"play")} className="gt-reference-blue">▶ เริ่มแข่งขัน (มาแล้วทั้งคู่)</button>}
    {g.table_status==="playing"&&g.state!=="verified"&&<button type="button" onClick={()=>setEditing(g.id)} className="gt-reference-gold">✎ ลงผลทุกประเภท</button>}
    {g.state==="verified"&&<><strong className="text-green-800">✓ บันทึกผลแล้ว (จำลอง)</strong><button type="button" onClick={()=>setEditing(g.id)} className="gt-reference-secondary">แก้ไขผล</button></>}
  </div>;
  const board=(g:Game,actions=true)=><article key={g.id} className="gt-reference-match-card overflow-hidden rounded-2xl border-[3px] border-[#8fb7eb] border-b-[#d6a43a] bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#d6a43a] bg-[#e9f3ff] p-3">
      <strong className="text-lg text-[#0a418a]">โต๊ะ {g.board_number}</strong><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stateStyle(g)}`}>{label(g)}</span>
    </header>
    <div className="gt-reference-two-players grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">{person(g.black_athlete_id,"black")}{person(g.white_athlete_id,"white")}</div>
    {actions&&view!=="public"&&<div className="border-t border-[#e2ecfa] p-3">{controls(g)}</div>}
  </article>;
  const table=<div className="gt-reference-table">
    <div className="gt-reference-mobile-table">{filtered.map(g=><div className="gt-reference-mobile-record" key={g.id}>
      <button type="button" className="gt-reference-mobile-row" onClick={()=>setFull(true)}><strong>โต๊ะ {g.board_number}</strong><span><b>ดำ</b> {personMap[g.black_athlete_id].name}<small>ขาว {personMap[g.white_athlete_id].name}</small></span><span>{label(g)}<small>⛶ เต็มจอ</small></span></button>
      {view!=="public"&&<div className="p-2">{controls(g)}</div>}
    </div>)}</div>
    <div className="gt-reference-desktop-table"><table><thead><tr><th>โต๊ะ</th><th>ฝ่ายดำ</th><th>ฝ่ายขาว</th><th>ผลการแข่งขัน</th></tr></thead><tbody>{filtered.map(g=><tr key={g.id}><td>โต๊ะ {g.board_number}</td><td>{person(g.black_athlete_id,"black")}</td><td>{person(g.white_athlete_id,"white")}</td><td><p>{label(g)}</p>{view!=="public"&&controls(g)}</td></tr>)}</tbody></table></div>
  </div>;
  const activeGame=games.find(g=>g.id===editing);
  return <div className="gt-reference-day min-h-screen pb-16 text-[#102d58]">
    <header className={`${DEMO_BG} border-b-[5px] border-[#d6a43a] px-4 py-5 text-white`}>
      <div className="mx-auto max-w-6xl gt-reference-title-wrap">{publicDemo ? <Link href="/tournaments" className="text-sm underline">← ดูรายการแข่งขันสาธารณะ</Link> : <Link href={`/organizer/${eventId}/${divisionId}`} className="text-sm underline">← กลับหน้ารุ่นการแข่งขันจริง</Link>}
      <p className="mt-3 text-xs font-bold tracking-widest text-[#ffe29a]">⚫ ⚪ GO TOURNAMENT • INTERACTIVE DEMO</p><h1 className="gt-reference-event-title mt-1 text-2xl font-bold sm:text-3xl">ZEER GO KYU WAR 2026</h1><p className="gt-reference-event-subtitle">วันเสาร์ที่ 5 ธันวาคม 2569 · Zeer Rangsit ชั้น 2 THE HUB</p><p className="mt-2 text-base font-bold text-[#fff0bc]">จำลองการแข่งขันจริง · รุ่น 1–2 คิว</p>
      <p className="mt-2 text-sm text-[#e2efff]">โหมดฝึกใช้งานเท่านั้น — ไม่เขียนผลลงฐานข้อมูล ไม่ใช่รายชื่อหรือผลแข่งขันจริง</p></div>
    </header>
    <main className="gt-reference-main mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-6">
      <nav className="gt-reference-main-nav" aria-label="เมนูจำลองการแข่งขัน"><button type="button" aria-pressed={view==="admin"} onClick={()=>setView("admin")}>♛ แอดมินจับคู่</button><button type="button" aria-pressed={view==="referee"} onClick={()=>setView("referee")}>▣ ลงผลกรรมการ</button><button type="button" aria-pressed={view==="public"} onClick={()=>setView("public")}>◉ หน้าสาธารณะ</button></nav>
      <section className="gt-reference-panel p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong>เลือกมุมมอง</strong><span className="text-xs text-[#647c9f]">ทั้ง 3 มุมมองใช้ข้อมูลจำลองชุดเดียวกัน</span></div>
        <div className="mt-2 grid grid-cols-3 gap-2">{(["admin","referee","public"] as const).map(v=><button key={v} type="button" aria-pressed={view===v} onClick={()=>setView(v)}
          className={`min-h-12 rounded-xl border-2 px-2 text-sm font-semibold ${view===v?"border-[#d6a43a] bg-[#0a62c4] text-white":"border-[#84b4e9] bg-white text-[#0e478e]"}`}>{v==="admin"?"แอดมินจับคู่":v==="referee"?"กรรมการ":"สาธารณะ"}</button>)}</div>
      </section>
      <div className="gt-reference-metrics grid grid-cols-2 gap-2 sm:grid-cols-4">{[
        ["รอบแข่งขัน",`${round} / 5`],["โต๊ะทั้งหมด",String(rows.length)],["เช็กชื่อครบทั้งคู่",`${rows.filter(g=>statusOf(g,"black")==="present"&&statusOf(g,"white")==="present").length} / ${rows.length}`],["ลงผลแล้ว",`${done} / ${rows.length}`]
      ].map(([k,v])=><div key={k} className="rounded-xl border-2 border-[#81b0e6] border-b-[4px] border-b-[#d6a43a] bg-white p-3"><small className="text-[#57769a]">{k}</small><strong className="mt-1 block text-2xl text-[#0958b4]">{v}</strong></div>)}</div>
      <div className="gt-reference-panel grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_auto]">
        <div><strong>ความคืบหน้ารอบ {round}: {progress}%</strong><div className="mt-2 h-4 overflow-hidden rounded-full bg-[#dceaff]"><div className="h-full rounded-full bg-[#d6a43a] transition-all" style={{width:`${progress}%`}}/></div><p className="mt-1 text-xs text-[#647c9f]">ข้อมูลเปลี่ยนเมื่อกดลงผลหรือเปิดจำลองอัตโนมัติ</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={applyNext} className="min-h-11 rounded-xl border-2 border-[#d6a43a] bg-[#0b65c9] px-4 text-sm font-bold text-white">▶ เหตุการณ์ถัดไป</button>
          <button type="button" aria-pressed={auto} onClick={()=>setAuto(v=>!v)} className="min-h-11 rounded-xl border-2 border-[#0b65c9] bg-white px-4 text-sm font-bold text-[#0b65c9]">{auto?"■ หยุดอัตโนมัติ":"⟳ จำลองสดทุก 3.5 วินาที"}</button>
        </div>
      </div>
      <section className="gt-reference-panel p-3">
        <div className="gt-reference-toolbar flex flex-wrap items-center gap-2">
          <label className="font-semibold">รอบ <select className="min-h-11 rounded-lg border-2 border-[#89b6e9] bg-white p-2" value={round} onChange={e=>{setRound(Number(e.target.value));setAuto(false);}}>{Array.from({length:lastRound},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
          <button aria-pressed={mode==="cards"} onClick={()=>setMode("cards")} className={`min-h-11 rounded-xl border-2 px-3 font-semibold ${mode==="cards"?"border-[#d6a43a] bg-[#095fc2] text-white":"border-[#89b6e9]"}`}>▦ การ์ด</button>
          <button aria-pressed={mode==="table"} onClick={()=>setMode("table")} className={`min-h-11 rounded-xl border-2 px-3 font-semibold ${mode==="table"?"border-[#d6a43a] bg-[#095fc2] text-white":"border-[#89b6e9]"}`}>☷ ตาราง</button>
          <button aria-pressed={showPhotos} onClick={()=>setShowPhotos(v=>!v)} className="min-h-11 rounded-xl border-2 border-[#d6a43a] px-3 font-semibold">{showPhotos?"ซ่อนรูป":"แสดงรูป"}</button>
          <button onClick={()=>setFull(true)} className="min-h-11 rounded-xl border-2 border-[#0b65c9] px-3 font-semibold">⛶ เต็มจอ</button>
        </div>
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)} className="mt-3 min-h-12 w-full rounded-xl border-2 border-[#89b6e9] bg-white px-3" placeholder="ค้นหาชื่อหรือหมายเลขโต๊ะ"/>
      </section>
      {reports}
      <section aria-label="โต๊ะแข่งขัน" className="gt-reference-board-section"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">โต๊ะแข่งขัน · รอบ {round}</h2><span className="text-sm text-[#527298]">แสดง {filtered.length} / {rows.length} โต๊ะ</span></div>
        {!filtered.length?<p className="rounded-xl border-2 border-[#89b6e9] bg-white p-5">ไม่พบโต๊ะที่ค้นหา</p>:mode==="cards"?<div className="gt-reference-card-grid grid gap-3">{filtered.map(g=>board(g))}</div>:table}
      </section>
      {full&&<CompetitionPanel title="โต๊ะแข่งขัน (โหมดจำลอง)" context="ZEER GO KYU WAR 2026 · จำลองเท่านั้น" onClose={()=>setFull(false)}>
        <div className="gt-reference-fullscreen-boards grid gap-3 p-3">{filtered.map(g=>board(g,false))}</div>
      </CompetitionPanel>}
      {activeGame&&<SimulationResultDialog board={activeGame.board_number} black={personMap[activeGame.black_athlete_id].name} white={personMap[activeGame.white_athlete_id].name} onClose={()=>setEditing(null)}
        onConfirm={(code,resultMargin,w,selectedMethod)=>{
          setGames(old=>old.map(g=>g.id===activeGame.id?{...g,winner_athlete_id:w==="black"?g.black_athlete_id:w==="white"?g.white_athlete_id:null,result_code:code,result_margin:resultMargin,state:"verified",table_status:"finished"}:g));
          append(`โต๊ะ ${activeGame.board_number} · ${selectedMethod} · ${w==="black"?"ดำชนะ":w==="white"?"ขาวชนะ":"ผลพิเศษ"} (จำลอง)`);
          setEditing(null);
        }} />}
      <section className="rounded-2xl border-2 border-[#89b6e9] bg-white p-4">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-bold">กิจกรรมล่าสุด (จำลอง)</h2>{allDone&&round<5&&<button onClick={applyNext} className="rounded-lg border-2 border-[#d6a43a] bg-[#095fc2] px-3 py-2 text-white">จับคู่รอบต่อไป ›</button>}</div>
        <ol className="mt-3 space-y-2">{history.map((h,i)=><li key={i} className="rounded-lg border border-[#bdd6f3] bg-[#f4f9ff] p-3 text-sm">{h}</li>)}</ol>
        <button type="button" onClick={()=>{setGames(INITIAL);setRound(1);setAuto(false);setHistory(["เริ่มจำลองใหม่ · รอบที่ 1"]);setAttendance({});}} className="mt-3 min-h-11 rounded-xl border-2 border-[#d6a43a] bg-white px-4 font-semibold">↻ เริ่มจำลองใหม่</button>
      </section>
    </main>
  </div>;
}
