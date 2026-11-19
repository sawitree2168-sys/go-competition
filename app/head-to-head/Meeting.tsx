'use client';
import {useEffect,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import AthleteAvatar from '@/components/AthleteAvatar';
import CompetitionPanel from '@/components/CompetitionPanel';
import type {DirectoryAthlete} from '@/components/AthleteDirectory';
import type {HistoryProfile} from '@/lib/central-history';
import {meetingGames,meetingStats,meetingPercent as pct,pairGoGames,type PairGoGame} from '@/lib/head-to-head';
import PairGoHistory from './PairGoHistory';
function Picker({side,selected,other,onPick}:{side:number;selected:DirectoryAthlete|null;other:string;onPick:(id:string)=>void}){
 const [q,setQ]=useState(''),[rows,setRows]=useState<DirectoryAthlete[]>([]),[note,setNote]=useState('');
 useEffect(()=>{const controller=new AbortController();const timer=setTimeout(async()=>{if(q.trim().length<2){setRows([]);setNote('');return;}setNote('กำลังค้นหา…');try{const r=await fetch(`/api/athletes/search?q=${encodeURIComponent(q.trim())}`,{signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();setRows(data.rows);setNote(data.rows.length?`พบ ${data.total} คน · แสดงไม่เกิน 30 คน กรุณาพิมพ์เพิ่มเพื่อเจาะจง`:'ไม่พบรายชื่อ');}catch{if(!controller.signal.aborted)setNote('ค้นหาไม่สำเร็จ กรุณาลองใหม่');}},250);return()=>{clearTimeout(timer);controller.abort();};},[q]);
 return <div className="meeting-picker"><label htmlFor={`player-${side}`}>นักกีฬาคนที่ {side}</label><input id={`player-${side}`} type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={selected?selected.full_name:'ค้นหาชื่อ นามสกุล หรือรหัส GO'} autoComplete="off"/><p className="meeting-picker-current">{selected?`เลือกแล้ว: ${selected.full_name} · ${selected.go_id}`:'ยังไม่ได้เลือกนักกีฬา'}</p><span role="status" className="meeting-search-note">{note}</span>{rows.length>0&&<ul className="meeting-options" aria-label={`ผลค้นหานักกีฬาคนที่ ${side}`}>{rows.map(a=><li key={a.go_id}><button disabled={a.go_id===other} onClick={()=>onPick(a.go_id)}><span>{a.full_name}</span><small>{a.rank??'ยังไม่ระบุระดับ'} · {a.go_id}{a.go_id===other?' · เลือกไว้แล้วอีกฝั่ง':''}</small></button></li>)}</ul>}</div>;
}
function Card({athlete,wins,losses,draws,total}:{athlete:DirectoryAthlete|null;wins:number;losses:number;draws:number;total:number}){
 return <article className="meeting-player">{athlete?<><div className="meeting-portrait"><AthleteAvatar src={athlete.photo} name={athlete.full_name} zoom variant="portrait"/></div><div className="meeting-player-info"><Link href={`/athletes/history/${athlete.go_id}`} className="meeting-name">{athlete.full_name}</Link><p className="meeting-level">{athlete.rank??'ยังไม่ระบุระดับ'}</p><small>{athlete.go_id}</small>{athlete.institution&&<p className="meeting-school">{athlete.institution}</p>}<div className="meeting-counts">{[['ชนะ',wins,'win'],['แพ้',losses,'loss'],['เสมอ',draws,'draw']].map(([label,n,cls])=><div key={label} className={String(cls)}><span>{label}</span><strong>{total?n:'—'}</strong><small>{pct(Number(n),total)}</small></div>)}</div><p className="meeting-rate">อัตราชนะ <strong>{pct(wins,total)}</strong></p></div></>:<div className="meeting-unselected">เลือกนักกีฬาจากช่องค้นหาด้านบน</div>}</article>;
}
export default function Meeting({left,right,history,error,pairHistory,pairError,initialYear}:{
 left:DirectoryAthlete|null;
 right:DirectoryAthlete|null;
 history:HistoryProfile|null;
 error:string;
 pairHistory:PairGoGame[];
 pairError:boolean;
 initialYear:string;
}){
 const router=useRouter(),[pending,start]=useTransition(),[year,setYear]=useState(initialYear),[shareNote,setShareNote]=useState('');
 const same=!!left&&left.go_id===right?.go_id,ready=!!left&&!!right&&!same;
 const games=ready?meetingGames(history?.games??[],right.go_id,year):[];const stats=meetingStats(games);
 const pairPlayer=left??right;
 const years=[...new Set([
  ...meetingGames(history?.games??[],right?.go_id??'','all').map(g=>g.event_year),
  ...pairHistory.map(g=>g.event_year),
  ...(year==='all'?[]:[Number(year)]),
 ])].sort((a,b)=>b-a);
 function choose(side:number,id:string){const p=new URLSearchParams();const a=side===1?id:left?.go_id,b=side===2?id:right?.go_id;if(a)p.set('a',a);if(b)p.set('b',b);start(()=>router.push(`/head-to-head?${p}`));}
 function filter(v:string){setYear(v);const q=new URLSearchParams(window.location.search);if(v==='all')q.delete('year');else q.set('year',v);window.history.replaceState(null,'',`/head-to-head?${q}`);}
 async function share(){try{await navigator.clipboard.writeText(window.location.href);setShareNote('คัดลอกลิงก์แล้ว');}catch{setShareNote('คัดลอก URL จากแถบที่อยู่เพื่อแชร์ได้เลย');}}
 return <div className="meeting-page" aria-busy={pending}><div className="meeting-searches"><Picker side={1} selected={left} other={right?.go_id??''} onPick={id=>choose(1,id)}/><Picker side={2} selected={right} other={left?.go_id??''} onPick={id=>choose(2,id)}/></div>{pending&&<p role="status">กำลังโหลดสถิติ…</p>}{error&&<p role="alert">{error}</p>}{same&&<p role="alert">กรุณาเลือกนักกีฬาคนละคน</p>}
 {left&&!right&&history?.opponents.some(o=>o.opponent_go_id)&&<div className="meeting-recent"><p>เลือกจากคู่แข่งที่เคยพบกัน</p><div>{history.opponents.filter(o=>o.opponent_go_id&&o.opponent_go_id!==left.go_id).slice(0,12).map(o=><button key={o.opponent_key} onClick={()=>choose(2,o.opponent_go_id!)}>{o.opponent_name}</button>)}</div></div>}
 <CompetitionPanel title="สถิติการพบกัน" context={`${left?.full_name??'นักกีฬาคนที่ 1'} พบ ${right?.full_name??'นักกีฬาคนที่ 2'} · ${year==='all'?'ทุกปีในระบบ':Number(year)+543}`}>
 <div className="meeting-pair"><Card athlete={left} wins={stats.wins} losses={stats.losses} draws={stats.draws} total={stats.played}/><span className="meeting-vs" aria-label="พบกับ">VS</span><Card athlete={right} wins={stats.losses} losses={stats.wins} draws={stats.draws} total={stats.played}/></div>
 {pairPlayer&&!same&&<div className="meeting-history-title meeting-year" data-export-ignore="true"><label>ปีการแข่งขัน <select value={year} onChange={e=>filter(e.target.value)}><option value="all">ทุกปีที่มีข้อมูล</option>{years.map(y=><option key={y} value={y}>{y+543}</option>)}</select></label></div>}
 {pairPlayer&&!same&&<PairGoHistory games={pairGoGames(pairHistory,year)} playerName={pairPlayer.full_name} playerGoId={pairPlayer.go_id} opponentGoId={ready?right.go_id:undefined} error={pairError}/>}
 {ready&&!error&&<><div className="meeting-summary"><h2>พบกันทั้งหมด <strong>{stats.played}</strong> เกมที่เล่นจริง</h2>{stats.played>0?<div className="meeting-bar" aria-label="สัดส่วนผลการพบกัน">{[[stats.wins,'a','ฝั่งซ้ายชนะ'],[stats.draws,'draw','เสมอ'],[stats.losses,'b','ฝั่งขวาชนะ']].map(([n,c,label])=>Number(n)>0&&<div key={c} className={String(c)} style={{flexGrow:Number(n)}}><span>{label} {pct(Number(n),stats.played)}</span></div>)}</div>:<p>ยังไม่พบประวัติการพบกันที่เล่นจริงและมีผลยืนยันในระบบ{year!=='all'?'สำหรับปีที่เลือก':''}</p>}</div>
 <div className="meeting-history-title"><h2>ประวัติการพบกันรายบุคคล</h2></div>
 <div className="meeting-table"><table><thead><tr><th>วันที่</th><th>รายการแข่งขัน / รุ่น</th><th>รอบ</th><th>ผลของ {left.full_name}</th></tr></thead><tbody>{games.map(g=><tr key={g.id}><td>{g.event_date?new Date(`${g.event_date}T00:00:00+07:00`).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'}):`ปี ${g.event_year+543} · ยังไม่ยืนยันวันที่`}</td><td><Link href={`/results/history/${g.event_id}`}>{g.title}</Link><small>{g.division}</small><a href={g.source_url} target="_blank" rel="noopener noreferrer">ต้นทาง ↗</a></td><td>{g.round_label??'–'}</td><td><span className={`meeting-result ${g.outcome}`}>{g.kind==='walkover'?(g.outcome==='win'?'ชนะผ่าน':'แพ้ผ่าน'):g.kind==='bye'?'บาย':g.kind!=='played'?'ไม่ได้แข่งขัน':g.outcome==='win'?'ชนะ':g.outcome==='loss'?'แพ้':g.outcome==='draw'?'เสมอ':'รอผล'}</span></td></tr>)}</tbody></table></div><p className="meeting-note">นับจากข้อมูลประวัติกลางที่ตรวจสอบแล้ว ยังไม่ใช่ประวัติทั้งหมด · แยกบาย ชนะ/แพ้ผ่าน และเกมที่ยังไม่มีผลออกจากเปอร์เซ็นต์ ({stats.excluded} รายการ)</p><p className="meeting-note">เปอร์เซ็นต์ = จำนวนผลนั้น ÷ (ชนะ + แพ้ + เสมอ) × 100 · 0 เกมแสดง “—”</p></>}
 </CompetitionPanel><div className="meeting-share"><button onClick={share} disabled={!ready} className="gt-outline-btn min-h-12 px-5">แชร์สถิติการพบกัน</button><span role="status">{shareNote}</span></div></div>;
}
