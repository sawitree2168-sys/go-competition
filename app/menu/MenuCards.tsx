'use client';
import {useState} from 'react';
import Link from 'next/link';
import MenuIcon,{type MenuIconName} from '@/components/MenuIcon';
type Item={label:string;href:string;icon:MenuIconName|'meeting'|'board'|'heart'|'id'|'school';desc:string};
const groups:{title:string;items:Item[]}[]=[
 {title:'การแข่งขัน',items:[
 {label:'รายการแข่งขัน',href:'/tournaments',icon:'trophy',desc:'ดูรายการแข่งขันหมากล้อมทั้งหมด'},
 {label:'สมัครแข่งขัน',href:'/register',icon:'register',desc:'สมัครเข้าร่วมการแข่งขันที่สนใจ'},
 {label:'ผลการแข่งขัน',href:'/results',icon:'board',desc:'ตรวจสอบผลและคู่แข่งขัน'},
 {label:'GO FAN',href:'/go-fan',icon:'heart',desc:'ติดตามนักกีฬาที่คุณชื่นชอบ'}]},
 {title:'นักกีฬาและสถิติ',items:[
 {label:'นักกีฬา',href:'/athletes',icon:'athlete',desc:'ค้นหาข้อมูลและประวัตินักกีฬา'},
 {label:'ทำเนียบนักกีฬา',href:'/dan',icon:'id',desc:'อันดับคะแนนและทำเนียบดั้ง'},
 {label:'สถิติการพบกัน',href:'/head-to-head',icon:'meeting',desc:'ดูผลการพบกันของนักกีฬา'},
 {label:'อันดับและสถิติ',href:'/stats',icon:'stats',desc:'อันดับนักกีฬาและสถิติที่น่าสนใจ'}]},
 {title:'ข่าวสารและบริการ',items:[
 {label:'ข่าวสาร',href:'/news',icon:'news',desc:'ข่าวประกาศและกิจกรรมล่าสุด'},
 {label:'แกลเลอรี',href:'/gallery',icon:'gallery',desc:'ภาพกิจกรรมและบรรยากาศแข่งขัน'},
 {label:'เอกสารดาวน์โหลด',href:'/documents',icon:'documents',desc:'ดาวน์โหลดเอกสารและแบบฟอร์ม'},
 {label:'หน้าสถาบัน',href:'/institution',icon:'school',desc:'ดูแลนักเรียนและติดตามการแข่งขัน'}]}
];
const quick:Item[]=[{label:'เข้าสู่ระบบ',href:'/login',icon:'athlete',desc:'บัญชีนักกีฬา ครู และผู้จัด'},{label:'ส่งผลการแข่งขัน',href:'/results/submit',icon:'upload',desc:'ส่งผลเพื่อเก็บประวัตินักกีฬา'},{label:'เกี่ยวกับและติดต่อ',href:'/about',icon:'faq',desc:'รู้จักเว็บไซต์และติดต่อทีมงาน'},{label:'คำถามที่พบบ่อย',href:'/faq',icon:'faq',desc:'คำแนะนำการใช้งาน'},{label:'หน้าแรก',href:'/',icon:'home',desc:'ภาพรวม GO TOURNAMENT'}];
function Icon({name}:{name:Item['icon']}){
 const custom=name==='meeting'||name==='board'||name==='heart'||name==='id'||name==='school';
 if(!custom)return <MenuIcon name={name as MenuIconName} className="menu-tile-svg"/>;
 return <svg className="menu-tile-svg" viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
 {name==='board'&&<><path d="M12 4v40M22 4v40M32 4v40M42 4v40M52 4v40M9 7h46M9 17h46M9 27h46M9 37h46"/><circle cx="22" cy="17" r="6" fill="white" stroke="#b5d1f5"/><circle cx="42" cy="27" r="6" fill="#131b27" stroke="#62718a"/><circle cx="32" cy="37" r="6" fill="white" stroke="#b5d1f5"/></>}
 {name==='heart'&&<><path d="M32 42 10 23C-2 9 17-3 32 12 47-3 66 9 54 23Z"/><circle cx="27" cy="24" r="8" fill="white" stroke="#a3c6f0"/><circle cx="39" cy="28" r="8" fill="#162333" stroke="#687c96"/></>}
 {name==='meeting'&&<><rect x="2" y="6" width="20" height="34" rx="4"/><circle cx="12" cy="17" r="4" fill="white" stroke="none"/><path d="M6 32c0-9 12-9 12 0"/><rect x="42" y="6" width="20" height="34" rx="4"/><circle cx="52" cy="17" r="4" fill="white" stroke="none"/><path d="M46 32c0-9 12-9 12 0"/><text x="32" y="29" textAnchor="middle" fontSize="12" fontWeight="700" fill="white" stroke="none">VS</text></>}
 {name==='id'&&<><rect x="4" y="8" width="56" height="34" rx="4"/><rect x="25" y="3" width="14" height="10" rx="2"/><circle cx="18" cy="22" r="5" fill="white" stroke="none"/><path d="M10 35c0-10 16-10 16 0M34 22h17M34 30h17"/></>}
 {name==='school'&&<><path d="M4 17 32 4l28 13H4ZM8 42h48M5 46h54M13 20v19M25 20v19M39 20v19M51 20v19"/><circle cx="32" cy="13" r="2" fill="white"/></>}
 </svg>;
}
const norm=(s:string)=>s.replace(/\s+/g,'').toLocaleLowerCase('th');
export default function MenuCards(){
 const [q,setQ]=useState('');const query=norm(q);
 const matches=(a:Item)=>!query||norm(`${a.label}${a.desc}`).includes(query);
 const visible=groups.map(g=>({...g,items:g.items.filter(matches)})).filter(g=>g.items.length);
 const links=quick.filter(matches);const count=visible.reduce((n,g)=>n+g.items.length,0)+links.length;
 return <><div className="menu-intro"><div><h1>เมนูทั้งหมด</h1><p>ทุกบริการหมากล้อมในที่เดียว</p></div><div className="menu-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><label className="sr-only" htmlFor="menu-search">ค้นหาเมนู</label><input id="menu-search" type="search" placeholder="ค้นหาเมนูที่ต้องการ…" value={q} onChange={e=>setQ(e.target.value)}/></div></div>
 {q&&<p className="menu-search-status" role="status">พบ {count} เมนู <button onClick={()=>setQ('')}>ล้างคำค้น</button></p>}
 <nav aria-label="เมนูเว็บไซต์ทั้งหมด">{visible.map(g=><section className="menu-group" key={g.title} aria-label={g.title}><h2>{g.title}</h2><div className="menu-grid">{g.items.map(a=><Link href={a.href} className="menu-tile" key={a.href}><div className="menu-tile-art"><Icon name={a.icon}/></div><h3>{a.label}</h3><p>{a.desc}</p><div className="menu-tile-bottom" aria-hidden="true"><span/><b>➜</b></div></Link>)}</div></section>)}
 {links.length>0&&<div className="menu-quick" aria-label="บัญชีและความช่วยเหลือ">{links.map(a=><Link href={a.href} key={a.href}>{a.label}</Link>)}</div>}
 </nav>{!count&&<div className="menu-empty"><p>ไม่พบเมนูที่ตรงกับคำค้น</p><button onClick={()=>setQ('')}>ดูเมนูทั้งหมด</button></div>}</>;
}
