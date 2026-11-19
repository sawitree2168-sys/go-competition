"use client";
import {useState} from 'react';
import Link from 'next/link';
import type {Story} from '@/lib/site-news';
import type {WallGame} from '@/lib/news-wall';
import {divisionKey} from '@/lib/division-display';
import {placingLabel} from '@/lib/placing-label.mjs';
import {wallResult} from '@/lib/news-wall-result.mjs';
const nameKey=(s:string)=>s.replace(/^(ด\.ช\.|ด\.ญ\.|นาย\s|นางสาว\s|นาง\s)/,'').replace(/\s+/g,'').toLowerCase();
const labels={win:'ชนะ',loss:'แพ้',draw:'เสมอ',bye:'บาย',pending:'รอผล'};
export default function NewsDivisionResults({story:s,games,unavailable,showAwards=true}:{story:Story;games:WallGame[];unavailable:boolean;showAwards?:boolean}) {
 const [view,setView]=useState<'summary'|'wall'>('summary');
 const rounds=games.filter(g=>g.division===divisionKey(s.division||''));
 const roundCount=Math.max(0,...rounds.map(g=>g.round),...s.people.map(p=>p.wins+p.losses+p.byes));
 function player(p:Story['people'][number]){return <><strong>{p.athlete_id?<Link className="text-blue-800 underline" href={`/athletes/${p.athlete_id}`}>{p.full_name}</Link>:p.full_name}</strong><small className="block">{p.institution}</small>{!!p.upcoming?.length&&<small className="block text-blue-800">★ สมัคร {(p.upcoming??[]).join(" / ")}</small>}</>;}
 return <section className="news-division space-y-5 rounded-2xl border border-blue-200 p-4">
  <h2 className="site-section-title">{s.division}</h2>
  <div className="site-operation-nav" role="group" aria-label={`รูปแบบผล ${s.division}`} data-export-ignore="true"><button type="button" aria-pressed={view==='summary'} onClick={()=>setView('summary')}>สรุปผล</button><button type="button" aria-pressed={view==='wall'} onClick={()=>setView('wall')}>ผลรายรอบ (วอลล์ลิสต์)</button></div>
  <p className={`rounded-xl p-3 ${s.complete?'bg-green-50 text-green-800':'bg-amber-50 text-amber-900'}`}>{s.complete?'ผลครบทั้งรุ่น • สรุปจากข้อมูลที่บันทึกครบ':'ข้อมูลบางส่วน • แสดงเฉพาะผลที่ตรวจสอบแล้ว ยังไม่สรุปอันดับทั้งรุ่น'}</p>
  {view==='summary'&&s.complete&&showAwards&&<section><h3 className="text-xl font-bold">ผู้ได้รับรางวัล / อันดับสูงสุด</h3><div className="site-athlete-grid">{s.people.filter(p=>p.placing!==null&&p.placing<=3).map(p=><div className="gt-card p-5 text-center" key={p.go_id||p.athlete_id||p.full_name}><strong className="block text-3xl">{p.placing===1?'🥇':p.placing===2?'🥈':'🥉'}</strong><strong className="mt-2 block text-lg">{placingLabel(p.placing)}</strong><h4 className="mt-3 text-lg font-bold">{p.full_name}</h4><p>{p.institution}</p><p>{p.points??p.wins} คะแนน</p></div>)}</div></section>}
  {view==='wall'&&<p className="rounded-xl bg-blue-50 p-3 text-blue-900">แสดงคู่แข่งและผลในแต่ละรอบ • ชนะสีเขียว / แพ้สีชมพู{unavailable?' • โหลดผลรายรอบบางส่วนไม่สำเร็จ กรุณาลองใหม่':''}{!rounds.length?' • งานนี้ยังไม่มีข้อมูลคู่แข่งรายรอบในระบบ มีเฉพาะสรุปอันดับ':''}</p>}
  <div className="news-results-scroll"><table className={`news-results-table ${view==='wall'?'news-wall-table':''}`}><colgroup>{s.complete&&<col className="news-place-col"/>}<col className="news-name-col"/>{view==='wall'?Array.from({length:roundCount},(_,i)=><col key={i} className="news-round-col"/>):<><col className="news-number-col"/><col className="news-number-col"/><col className="news-number-col"/><col className="news-number-col"/></>}</colgroup><thead><tr>{s.complete&&<th>ผลรางวัล</th>}<th className="news-player-cell">นักกีฬา / สถาบัน</th>{view==='wall'?Array.from({length:roundCount},(_,i)=><th key={i}>รอบ {i+1}</th>):<><th>คะแนน</th><th>ชนะ</th><th>แพ้</th><th>SOS</th></>}</tr></thead><tbody>{s.people.map(p=><tr key={p.go_id||p.athlete_id||p.full_name}>{s.complete&&<td className="news-placing-label">{placingLabel(p.placing)}</td>}<td className="news-player-cell">{player(p)}</td>{view==='summary'?<><td>{p.points??p.wins}</td><td>{p.wins}</td><td>{p.losses}</td><td>{p.sos??"–"}</td></>:Array.from({length:roundCount},(_,i)=>{
   const matches=rounds.filter(g=>g.round===i+1&&(p.athlete_id===g.blackId||p.athlete_id===g.whiteId||nameKey(p.full_name)===nameKey(g.blackName)||nameKey(p.full_name)===nameKey(g.whiteName||'')));
   if(matches.length!==1)return <td key={i}><span className="news-round-missing">{matches.length>1?'ข้อมูลซ้ำ รอตรวจสอบ':'ยังไม่มีข้อมูล'}</span></td>;
   const g=matches[0],black=p.athlete_id===g.blackId||nameKey(p.full_name)===nameKey(g.blackName),id=black?g.blackId:g.whiteId;
   const result=wallResult(g,id),opponent=black?g.whiteName:g.blackName;
   return <td key={i}><div className={`news-round-result news-round-${result}`}><strong>{labels[result as keyof typeof labels]}</strong><span>{g.bye?'ไม่มีคู่แข่ง':opponent||'ไม่ระบุคู่แข่ง'}</span>{!g.bye&&<small>{black?'หมากดำ':'หมากขาว'}</small>}</div></td>;
  })}</tr>)}</tbody></table></div>
 </section>;
}
