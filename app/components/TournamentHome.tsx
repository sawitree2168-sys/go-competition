"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import styles from "./TournamentHome.module.css";

type Event={id:string;title:string;event_date?:string|null;start_at?:string|null;status:string;registration_open_date?:string|null};
const menus=[
 {label:"หน้าหลัก",href:"/",icon:"home"},
 {label:"รายการแข่งขัน",href:"/schedule",icon:"cup"},
 {label:"ผลการแข่งขัน",href:"/overview/results",icon:"results"},
 {label:"อันดับนักกีฬา",href:"/overview/rankings",icon:"chart"},
 {label:"ข่าวสาร",href:"/overview/news",icon:"news"},
 {label:"แกลเลอรี",href:"/overview/gallery",icon:"image"},
 {label:"เอกสาร",href:"/overview/documents",icon:"file"},
 {label:"FAQ",href:"/faq",icon:"help"},
 {label:"GO FAN",href:"/fan",icon:"fans"},
];
function Icon({name}:{name:string}){
 const paths:Record<string,string>={home:"m3 10 9-7 9 7 M5 9v12h5v-7h4v7h5V9",cup:"M7 3h10v7a5 5 0 0 1-10 0z M7 5H3v3a5 5 0 0 0 5 5 M17 5h4v3a5 5 0 0 1-5 5 M12 15v6 M7 21h10",results:"M4 3h16v18H4z M8 8h8 M8 12h8 M8 16h5",chart:"M4 21V12h3v9 M11 21V7h3v14 M18 21V3h3v18",news:"M3 4h18v16H3z M7 8h4v4H7z M14 8h3 M14 12h3 M7 16h10",image:"M3 3h18v18H3z m0 15 6-6 4 4 3-3 5 5 M16 7h.01",file:"M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h8",help:"M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",fans:"M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 22v-3a7 7 0 0 1 14 0v3 M17 4a4 4 0 0 1 0 8 M19 16a6 6 0 0 1 3 5",search:"M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M14 14l7 7"};
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.file}/></svg>;
}
function eventDate(e:Event){const date=e.event_date?e.event_date+"T12:00:00+07:00":e.start_at;if(!date||Number.isNaN(Date.parse(date)))return "รอประกาศวันแข่งขัน";return new Date(date).toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Bangkok"});}

const ZEER_ID="ce1382d9-1e1f-4697-8fe4-6a1a347d91eb";
function poster(e:Event){return e.id===ZEER_ID?"/posters/zeer-go-kyu-war-2026.jpg":"/go-poster.jpg";}
function isPast(e:Event,today:string){const day=e.event_date||e.start_at?.slice(0,10);return e.status==="completed"||e.status==="finished"||Boolean(day&&day<today);}

export function TournamentHome(){
 const [theme,setTheme]=useState<"light"|"dark">("light");
 const [events,setEvents]=useState<Event[]>([]),[state,setState]=useState<"loading"|"ok"|"error">("loading");
 const [menuOpen,setMenuOpen]=useState(false),[retry,setRetry]=useState(0),[query,setQuery]=useState("");
 const menuButton=useRef<HTMLButtonElement>(null),drawer=useRef<HTMLDialogElement>(null);
 useEffect(()=>{try{const value=localStorage.getItem("go-tournament-theme");if(value==="dark"||value==="light")setTheme(value)}catch{}},[]);
 function toggleTheme(){const next=theme==="light"?"dark":"light";setTheme(next);try{localStorage.setItem("go-tournament-theme",next)}catch{}}
 useEffect(()=>{const ctrl=new AbortController();void(async()=>{try{const r=await fetch("/api/tournaments",{cache:"no-store",signal:ctrl.signal});const d=await r.json();if(!r.ok||d.status!=="ok"||!Array.isArray(d.tournaments))throw Error();setEvents(d.tournaments);setState("ok");}catch{if(!ctrl.signal.aborted)setState("error");}})();return()=>ctrl.abort()},[retry]);
 useEffect(()=>{if(!menuOpen)return;drawer.current?.showModal();const before=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=before}},[menuOpen]);
 function dismiss(){setMenuOpen(false);menuButton.current?.focus()}
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const filtered=events.filter(e=>e.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const upcoming=filtered.filter(e=>!isPast(e,today)),past=filtered.filter(e=>isPast(e,today)).sort((a,b)=>(b.event_date||b.start_at||"").localeCompare(a.event_date||a.start_at||""));
 return <main className={styles.page} data-theme={theme}>
  <a href="#tournament-content" className={styles.skip}>ข้ามไปเนื้อหา</a>
  <header className={styles.header}><div className={styles.headerInner}>
   <button ref={menuButton} type="button" className={styles.menuButton} aria-label="เปิดเมนู" aria-expanded={menuOpen} aria-controls="home-menu" onClick={()=>setMenuOpen(true)}>☰</button>
   <Link href="/" className={styles.brand} aria-label="GO TOURNAMENT หน้าหลัก"><img src="/brand/go-mark-transparent-v1.png" alt="GO" width="1774" height="887"/></Link>
   <Link className={styles.account} href="/athletes/claim">บัญชี / GO ID</Link>
  </div></header>
  {menuOpen&&<dialog ref={drawer} aria-label="เมนูเว็บไซต์" className={styles.backdrop} onClose={dismiss}><button type="button" className={styles.scrim} aria-label="ปิดเมนูด้านข้าง" onClick={dismiss}/><section id="home-menu" className={styles.drawer}>
   <div className={styles.drawerHead}><strong>GO TOURNAMENT</strong><button type="button" onClick={dismiss} aria-label="ปิดเมนู">×</button></div>
   <nav>{menus.map(m=><Link key={m.href} href={m.href} onClick={dismiss}><Icon name={m.icon}/>{m.label}<span>›</span></Link>)}</nav>
  </section></dialog>}
  <div className={styles.container} id="tournament-content">
   <div className={styles.sectionHeading}><h1>รายการแข่งขัน</h1><Link href="/schedule">ดูทั้งหมด ›</Link></div>
   <label className={styles.search}><Icon name="search"/><span className="sr-only">ค้นหารายการแข่งขัน</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหารายการแข่งขัน"/></label>
   <div className={styles.themeRow}><button type="button" onClick={toggleTheme} aria-label={theme==="light"?"เปลี่ยนเป็นโทนมืด":"เปลี่ยนเป็นโทนสว่าง"}>{theme==="light"?"☾ โทนมืด":"☀ โทนสว่าง"}</button></div>
   {state==="loading"&&<p role="status" className={styles.message}>กำลังโหลดรายการแข่งขัน…</p>}
   {state==="error"&&<div role="alert" className={styles.message}>ยังโหลดรายการแข่งขันไม่ได้ <button type="button" onClick={()=>{setState("loading");setRetry(x=>x+1)}}>ลองใหม่</button></div>}
   <section aria-labelledby="upcoming-events"><h2 id="upcoming-events" className={styles.sectionTitle}><Icon name="cup"/>กำลังจะมาถึง</h2>
    {state==="ok"&&!upcoming.length&&<p className={styles.message}>{query?"ไม่พบรายการตามคำค้น":"ยังไม่มีรายการแข่งขันที่กำลังจะมาถึง"}</p>}
    <div className={styles.eventGrid}>{state==="ok"&&upcoming.slice(0,4).map(e=><article key={e.id} className={styles.eventCard}>
     <Link href={"/tournaments/"+e.id} className={styles.cover}><img src={poster(e)} alt={"โปสเตอร์ "+e.title} width="1088" height="1536"/></Link>
     <h3><Link href={"/tournaments/"+e.id}>{e.title}</Link></h3><p className={styles.date}>{eventDate(e)}</p>
     {e.registration_open_date&&<span className={styles.badge}>เปิดรับสมัคร {new Date(e.registration_open_date+"T12:00:00+07:00").toLocaleDateString("th-TH",{day:"numeric",month:"short",timeZone:"Asia/Bangkok"})}</span>}
    </article>)}</div>
   </section>
   <section aria-labelledby="past-events" className={styles.pastSection}><div className={styles.sectionHeading}><h2 id="past-events" className={styles.sectionTitle}><Icon name="results"/>ที่ผ่านมาแล้ว</h2><Link href="/overview/results">ดูทั้งหมด ›</Link></div>
    {state==="ok"&&!past.length&&<p className={styles.message}>{query?"ไม่พบรายการตามคำค้น":"ยังไม่มีรายการแข่งขันที่ผ่านมา"}</p>}
    <div>{state==="ok"&&past.slice(0,3).map(e=><Link key={e.id} href={"/tournaments/"+e.id} className={styles.pastRow}><img src={poster(e)} alt="" width="160" height="104" loading="lazy"/><div><h3>{e.title}</h3><p>{eventDate(e)}</p><span className={styles.finished}>จบการแข่งขัน</span></div><span className={styles.arrow} aria-hidden="true">›</span></Link>)}</div>
   </section>
   <Link href="/fan" className={styles.fanBanner}><Icon name="fans"/><div><strong>GO FAN</strong><p>ติดตามนักกีฬาที่คุณเชียร์</p></div><span className={styles.arrow} aria-hidden="true">›</span></Link>
  </div>
  <nav className={styles.bottomNav} aria-label="เมนูล่าง">{[menus[0],menus[1],menus[8],menus[3],menus[4]].map(m=><Link key={m.href} href={m.href} aria-current={m.href==="/"?"page":undefined}><Icon name={m.icon}/><span>{m.label}</span></Link>)}</nav>
 </main>;
}
