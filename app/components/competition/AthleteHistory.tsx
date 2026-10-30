'use client';
import {useEffect,useState} from 'react';
import {Panel,Notice} from './CompetitionShell';
import type {LinkedHistoryRow} from '../../../lib/competition/linked-history';
import {groupHistoricalMatches,historicalSourceUrl,type HistoricalMatch,type EventSummary} from '../../../lib/competition/live-history';
type History={go_id:string;coverage:string;imported_at:string;checked_at:string;walllist_events:LinkedHistoryRow[];legacy_matches:HistoricalMatch[];events:EventSummary[];pending_identity_count:number;pending_match_count:number};
export function AthleteHistory({token,goId}:{token:string;goId:string}){
 const [state,setState]=useState<{goId:string;data:History}|null>(null),[failure,setFailure]=useState<{goId:string;message:string}|null>(null),[retry,setRetry]=useState(0);
 const data=state?.goId===goId?state.data:null,error=failure?.goId===goId?failure.message:'';
 useEffect(()=>{
  const c=new AbortController();let loading=false;
  async function load(){if(loading)return;loading=true;try{const r=await fetch('/api/me/history?go_id='+encodeURIComponent(goId),{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:c.signal});const d=await r.json();if(!r.ok)throw Error(d.message);if(d.history?.go_id!==goId)throw Error('ข้อมูลนักกีฬาไม่ตรงกัน');if(!c.signal.aborted){setState({goId,data:d.history});setFailure(null)}}catch(e){if(!c.signal.aborted)setFailure({goId,message:e instanceof Error?e.message:'โหลดประวัติไม่ได้'})}finally{loading=false}}
  const refresh=()=>{if(document.visibilityState==='visible')void load()};
  void load();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const timer=window.setInterval(refresh,60000);
  return()=>{c.abort();window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)};
 },[token,goId,retry]);
 const groups=groupHistoricalMatches(data?.legacy_matches||[]);
 return <Panel title="ประวัติการแข่งขัน">{error&&<><Notice error>{error}</Notice><button className="competition-button" onClick={()=>setRetry(x=>x+1)}>ลองโหลดประวัติอีกครั้ง</button></>}{!data?!error&&<Notice>กำลังค้นประวัติของคุณอัตโนมัติ…</Notice>:<>
 <p>เชื่อมประวัติกับ GO ID ของคุณอัตโนมัติ</p>
 {data.walllist_events.map(e=><section className="competition-card" key={e.source_key}><h3>{e.event_title}</h3><p>{e.event_date||e.event_date_status} · {e.division}</p><p><strong>อันดับ {e.placing_raw}</strong> · ข้อมูลหลังรอบ {e.after_round}</p><dl><div><dt>Points</dt><dd>{e.points}</dd></div><div><dt>SOS / SOSOS</dt><dd>{e.sos} / {e.sosos}</dd></div></dl><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{e.rounds.map((r,i)=><span className="competition-tag" key={i}>รอบ {i+1}: {r||'ไม่ระบุ'}</span>)}</div><a className="competition-button" href={'https://docs.google.com/spreadsheets/d/'+e.source_file_id+'/edit#gid=1704810772&range=A'+e.source_row+':L'+e.source_row} target="_blank" rel="noreferrer">ดูผลต้นฉบับ ↗</a></section>)}
 {groups.length>0&&<><h3>รายการย้อนหลังที่พบ</h3><Notice>ผลรายรอบตามข้อมูลต้นทาง ชื่อและเลขทะเบียนตรงกับคุณแล้ว วันที่และรายละเอียดงานบางส่วนยังรอตรวจ จึงยังไม่รวมเป็นสถิติสะสม</Notice>{groups.map(({key,items})=>{const first=items[0],source=historicalSourceUrl(first);return <details className="competition-card" key={key}><summary style={{cursor:'pointer',padding:'12px 0',overflowWrap:'anywhere'}}><strong>{first.event_title||'รายการที่ยังไม่ระบุชื่อ'}</strong><p>แฟ้มข้อมูลปี {first.source_file_year} · {first.event_date||'วันที่แข่งขันรอตรวจสอบ'}</p></summary>{items.map(m=><div key={m.source_key} style={{borderTop:'1px solid currentColor',padding:'12px 0',overflowWrap:'anywhere'}}><p><strong>รอบ {m.round_no} · {m.result==='win'?'ชนะ':'แพ้'}</strong></p><p>พบ {m.opponent_name} · เลขทะเบียนดั้ง {m.opponent_dan}</p></div>)}{source&&<a className="competition-button" href={source} target="_blank" rel="noreferrer">ดูข้อมูลต้นฉบับ ↗</a>}</details>})}</>}
 {data.events.length>0&&<><h3>ผลสรุปที่บันทึกไว้</h3><Notice>แสดงตามข้อมูลต้นทางเดิม ยังไม่ยืนยันเป็นผล Walllist และไม่นำมานับรวมซ้ำกับผลรายรอบ</Notice>{data.events.map(e=><section className="competition-card" key={e.source_key}><h3>{e.event_title}</h3><p>{e.event_date_raw||'วันที่รอตรวจสอบ'}{e.division?' · '+e.division:''}</p>{e.placing_raw&&<p>อันดับตามต้นทาง: {e.placing_raw}</p>}<p>{e.wins!==null?'ชนะ '+e.wins+' ':''}{e.losses!==null?'แพ้ '+e.losses+' ':''}{e.byes!==null?'บาย '+e.byes:''}</p><p className="competition-muted">{e.source_label||'ข้อมูลสรุปย้อนหลัง'} · แถว {e.source_row}</p></section>)}</>}
 {!data.walllist_events.length&&!groups.length&&!data.events.length&&<p>ยังไม่พบประวัติในแหล่งข้อมูลที่ระบบเชื่อมไว้ ระบบจะตรวจให้อัตโนมัติเมื่อเปิดหน้านี้ ไม่ได้หมายความว่าคุณไม่เคยแข่งขัน</p>}
 {data.pending_identity_count>0&&<Notice>มีรายการที่ชื่อสะกดต่างจากทะเบียน จึงยังไม่เชื่อมรวม เพื่อป้องกันประวัติผิดคน</Notice>}{data.pending_match_count>0&&<Notice>มีข้อมูลผลที่ยังขัดแย้ง รอตรวจสอบก่อนแสดง</Notice>}
 <p className="competition-muted">อัปเดตอัตโนมัติเมื่อเปิดหน้านี้และเมื่อกลับมาที่หน้า · แสดงเฉพาะข้อมูลที่มีในฐานระบบ ไม่ใช่ทุกการแข่งขันตลอดชีวิต</p>
 </>}</Panel>;
}
