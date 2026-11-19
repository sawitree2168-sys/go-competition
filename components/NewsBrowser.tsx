"use client";
/* eslint-disable @next/next/no-img-element -- existing event posters */
import {useState} from 'react';
import Link from 'next/link';
import type {Story} from '@/lib/site-news';
import {groupNewsEvents} from '@/lib/news-events.mjs';
import {thaiDate} from '@/lib/division-display';
export default function NewsBrowser({stories}:{stories:Story[]}){
 const [q,setQ]=useState(''),[kind,setKind]=useState('all');const rows=(groupNewsEvents(stories) as Story[]).filter(s=>(kind==='all'||s.kind===kind)&&`${s.title} ${s.event} ${s.body} ${s.people.map(p=>p.full_name).join(' ')}`.toLowerCase().includes(q.toLowerCase()));
 return <><div className="gt-card mb-5 space-y-3 p-4"><input className="min-h-12 w-full border px-4" value={q} onChange={e=>setQ(e.target.value)} placeholder="ค้นหาข่าว / รายการแข่งขัน / นักกีฬา" aria-label="ค้นหาข่าวสาร"/><div className="site-operation-nav">{[['all','ทั้งหมด'],['results','สรุปผลการแข่งขัน'],['announcement','ประกาศ'],['registration','รับสมัคร']].map(([v,t])=><button key={v} aria-pressed={kind===v} onClick={()=>setKind(v)}>{t}</button>)}</div></div><div className="site-news-grid">{rows.map(s=><article key={s.id} className="gt-card site-news-card"><img className="site-news-cover" src={s.poster} alt={s.event||s.title}/><div><small>{thaiDate(s.date)||''}</small><h2>{s.title}</h2><strong>{s.event}</strong>{s.kind==='results'&&<span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${s.complete?'bg-green-100 text-green-800':'bg-amber-100 text-amber-900'}`}>{s.complete?'ตรวจสอบแล้ว • ผลครบตามข้อมูลที่บันทึก':'ตรวจสอบแล้ว • ข้อมูลบางส่วน'}</span>}<p>{s.body}</p><Link className="gt-cta-btn" href={s.href}>อ่านข่าว</Link></div></article>)}</div>{!rows.length&&<p className="gt-card p-8 text-center">ยังไม่มีข่าวที่ตรงกับคำค้น</p>}<div className="gt-card mt-6 flex flex-wrap items-center justify-between gap-4 p-5"><div><strong className="text-xl">ร่วมเติมประวัติการแข่งขันให้ครบยิ่งขึ้น</strong><p>ส่งภาพได้โดยไม่ต้องล็อกอิน • ตรวจสอบก่อนนำข้อมูลไปใช้</p></div><Link href="/results/submit" className="gt-cta-btn inline-flex min-h-12 items-center px-5">ส่งภาพผลการแข่งขัน</Link></div></>;
}
