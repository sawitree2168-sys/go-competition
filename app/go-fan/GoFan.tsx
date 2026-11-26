"use client";
/* eslint-disable @next/next/no-img-element -- local decorative artwork */
import Link from "next/link";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import { useEffect, useRef, useState } from "react";
import MenuIcon, { type MenuIconName } from "@/components/MenuIcon";
import AthletePhotoViewer from "@/components/AthletePhotoViewer";
import CompetitionPanel from "@/components/CompetitionPanel";
import { divisionLabel, thaiDate } from "@/lib/division-display";
import { fanOutcome, readFanFollows } from "@/lib/go-fan.mjs";
import { divisionProgress } from "@/lib/competition-dashboard.mjs";
import { roundsOf } from "@/lib/competition-day.mjs";
import {scopeFanData,type InstitutionFanScope} from "@/lib/institution-fan";
import {fanName} from "@/lib/go-fan.mjs";
import type { FanData, FanPerson } from "@/lib/go-fan-data";

type Follow = { key:string; eventId:string; name:string; institution:string; divisionName:string; photo:string|null; notify:boolean };
type Tab="follow"|"pairings"|"results"|"ranking"|"summary";
const STORAGE="go-tournament:fan-follows:v1";
const tabs:{id:Tab;label:string;short:string;icon:MenuIconName}[]=[
  {id:"follow",label:"ติดตามนักกีฬา",short:"ติดตาม",icon:"entrants"},
  {id:"pairings",label:"ผลจับคู่ (Pairing)",short:"ผลจับคู่",icon:"register"},
  {id:"results",label:"ผลการแข่งขัน",short:"ผลแข่ง",icon:"trophy"},
  {id:"ranking",label:"ตารางอันดับ",short:"อันดับ",icon:"stats"},
  {id:"summary",label:"สรุปผลการแข่งขัน",short:"สรุป",icon:"documents"},
];
function Bell() { return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a2 2 0 0 1 2 2v.3A6 6 0 0 1 18 10v5l2 3H4l2-3v-5a6 6 0 0 1 4-5.7V4a2 2 0 0 1 2-2ZM9 20h6a3 3 0 0 1-6 0Z"/></svg>; }
function ShareIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="5" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m7.5 10.5 8-4M7.5 13.5l8 4"/></svg>; }
function Portrait({person}:{person:{name:string;photo?:string|null}}) { return <AthletePhotoViewer src={person.photo} name={person.name} />; }
function Instructions({institution=false}:{institution?:boolean}) { return <section className="gf-instructions"><h2>ⓘ วิธีใช้งาน GO FAN</h2><ol><li>ค้นหาชื่อนักกีฬา</li><li>กด “ติดตาม” (★)</li><li>ดูผลจับคู่และผลแข่งขันอัตโนมัติ</li><li>บันทึกผลเป็นรูป PNG / PDF</li></ol><p>{institution?"เฉพาะนักกีฬาในสังกัด · รายชื่อเก็บในเครื่องนี้":"ไม่ต้องล็อกอิน · รายชื่อเก็บในเครื่องนี้"}<br />แจ้งอัปเดตเมื่อเปิดหน้านี้อยู่</p></section>; }

export default function GoFan({initial,scope,embedded=false}:{initial:FanData;scope?:InstitutionFanScope;embedded?:boolean}) {
  const storageKey=scope?`${STORAGE}:institution:${scope.id}`:STORAGE;
  const allowedFollow=(f:Follow)=>!scope||scope.students.some(s=>fanName(s.name)===fanName(f.name));
  const [data,setData]=useState(()=>scopeFanData(initial,scope));
  const [follows,setFollows]=useState<Follow[]>([]);
  const [ready,setReady]=useState(false);
  const [selectedKey,setSelectedKey]=useState("");
  const [tab,setTab]=useState<Tab>("follow");
  const [section,setSection]=useState<"following"|"all">("following");
  const [eventQuery,setEventQuery]=useState("");
  const [subtab,setSubtab]=useState<"results"|"pairings"|"ranking">("results");
  const [query,setQuery]=useState("");
  const [search,setSearch]=useState("");
  const [divisionFilter,setDivisionFilter]=useState("");
  const [filtersOpen,setFiltersOpen]=useState(embedded);
  const [browsePeople,setBrowsePeople]=useState(false);
  const [manage,setManage]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(initial.error ?? "");
  const [notice,setNotice]=useState("");
  const [detail,setDetail]=useState<string|null>(null);
  const liveSignature=useRef<string|null>(null);
  const currentEvent=useRef(initial.event?.id ?? "");
  const followsRef=useRef(follows);
  useEffect(()=>{followsRef.current=follows;},[follows]);
  useEffect(()=>{
    try { const saved=localStorage.getItem(storageKey);setFollows(saved===null&&scope?data.participants.slice(0,100).map(p=>({key:p.key,eventId:initial.event?.id??"",name:p.name,institution:p.institution,divisionName:p.divisionName,photo:p.photo??null,notify:true})):readFanFollows(saved).filter(allowedFollow)); }
    catch { setNotice("เครื่องนี้ไม่อนุญาตให้บันทึกการติดตาม รายชื่อจะอยู่จนกว่าจะปิดหน้านี้"); }
    setSelectedKey(new URLSearchParams(window.location.search).get("athlete") ?? "");
    const initialSearch=new URLSearchParams(window.location.search).get("search");if(initialSearch){setQuery(initialSearch);setSearch(initialSearch);}
    setReady(true);
    const sync=(e:StorageEvent)=>{if(e.key===storageKey)setFollows(readFanFollows(e.newValue).filter(allowedFollow));};
    window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync);
  },[]);
  useEffect(()=>{
    if(!ready)return;
    try {localStorage.setItem(storageKey,JSON.stringify(follows));}
    catch {setNotice("บันทึกลงเครื่องไม่ได้ รายชื่อจะอยู่เฉพาะระหว่างเปิดหน้านี้");}
  },[follows,ready]);

  const eventId=data.event?.id ?? "";
  async function changeEvent(id:string, selection=""):Promise<boolean> {
    if(!id)return false;
    if(id===currentEvent.current){setSelectedKey(selection);return true;}
    currentEvent.current=id;setLoading(true);setError("");liveSignature.current=null;
    try {const response=await fetch(`/api/go-fan?event=${encodeURIComponent(id)}`,{cache:"no-store"});const fresh=await response.json() as FanData;
      if(!response.ok || fresh.error)throw new Error(fresh.error);
      if(currentEvent.current===id){setData(scopeFanData(fresh,scope));setSelectedKey(selection);setDivisionFilter("");setDetail(null);return true;}
      return false;
    } catch {if(currentEvent.current===id){currentEvent.current=data.event?.id ?? "";setError("เปลี่ยนรายการไม่สำเร็จ กรุณาลองใหม่");}return false;}
    finally {setLoading(false);}
  }
  useEffect(()=>{
    if(!eventId)return;
    let stopped=false,busy=false;
    const check=async()=>{
      if(busy || document.visibilityState!=="visible")return;busy=true;
      try {const response=await fetch(`/api/go-fan?event=${encodeURIComponent(eventId)}`,{cache:"no-store"});const fresh=await response.json() as FanData;
        if(!response.ok || fresh.error)throw new Error();
        if(stopped || currentEvent.current!==eventId)return;
        const tracked=new Set(followsRef.current.filter(f=>f.eventId===eventId && f.notify).map(f=>f.key));
        const ids=new Set(fresh.participants.filter(p=>tracked.has(p.key)).map(p=>p.athleteId));
        const signature=JSON.stringify(fresh.divisions.map(d=>({id:d.division.id,matches:d.matches.filter(m=>ids.has(m.black_athlete_id)||ids.has(m.white_athlete_id)),byes:d.byes.filter(b=>ids.has(b.athlete_id))})));
        if(liveSignature.current!==null && liveSignature.current!==signature && tracked.size)setNotice("มีการอัปเดตคู่แข่งขันหรือผลของนักกีฬาที่ติดตามแล้ว");
        liveSignature.current=signature;setData(scopeFanData(fresh,scope));setError("");
      }catch{if(!stopped && currentEvent.current===eventId)setError("เชื่อมต่อขัดข้อง กำลังลองใหม่ · แสดงข้อมูลล่าสุดที่โหลดได้");}
      finally{busy=false;}
    };
    const timer=window.setInterval(()=>void check(),15000);
    const wake=()=>{if(document.visibilityState==="visible")void check();};
    window.addEventListener("focus",wake);window.addEventListener("online",wake);document.addEventListener("visibilitychange",wake);
    return()=>{stopped=true;window.clearInterval(timer);window.removeEventListener("focus",wake);window.removeEventListener("online",wake);document.removeEventListener("visibilitychange",wake);};
  },[eventId]);

  const currentFollows=follows.filter(f=>f.eventId===eventId);
  const selected=data.participants.find(p=>p.key===selectedKey) ?? data.participants.find(p=>currentFollows.some(f=>f.key===p.key)) ?? data.participants[0];
  const division=data.divisions.find(d=>d.division.id===selected?.divisionId);
  const people=new Map(division?.people ?? []);
  const following=!!selected && follows.some(f=>f.key===selected.key);
  const followed=follows.find(f=>f.key===selected?.key);
  const matches=(division?.matches ?? []).filter(m=>m.state!=="void" && selected?.athleteId && (m.black_athlete_id===selected.athleteId || m.white_athlete_id===selected.athleteId)).sort((a,b)=>a.round_number-b.round_number);
  const byes=(division?.byes ?? []).filter(b=>b.athlete_id===selected?.athleteId);
  const games=[...matches.map(m=>({round:m.round_number,match:m,bye:false})),...byes.map(b=>({round:b.round_number,match:null,bye:true}))].sort((a,b)=>a.round-b.round);
  const standing=division?.standings.find(s=>s.athlete_id===selected?.athleteId);
  const complete=division ? divisionProgress(division.matches,division.byes,roundsOf(division.division)).complete : false;
  const filtered=data.participants.filter(p=>(!divisionFilter||p.divisionId===divisionFilter) && `${p.name} ${p.institution} ${p.divisionName}`.toLowerCase().includes(search.toLowerCase()));
  const showSearch=browsePeople || !!scope || !!search || !!divisionFilter;
  const view=tab==="follow" ? subtab : tab==="summary" ? "summary" : tab;
  function toggleFollow(p:FanPerson) {
    if(follows.some(f=>f.key===p.key)){setFollows(prev=>prev.filter(f=>f.key!==p.key));setNotice(`เลิกติดตาม ${p.name} แล้ว`);}
    else {if(follows.length>=100){setNotice("ติดตามได้สูงสุด 100 รายชื่อ");return;}setFollows(prev=>[...prev,{key:p.key,eventId,name:p.name,institution:p.institution,divisionName:p.divisionName,photo:p.photo ?? null,notify:true}]);setSelectedKey(p.key);setNotice(`ติดตาม ${p.name} แล้ว · บันทึกไว้ในเครื่องนี้`);}
    liveSignature.current=null;
  }
  function toggleNotice(key:string) {setFollows(prev=>prev.map(f=>f.key===key?{...f,notify:!f.notify}:f));liveSignature.current=null;}
  async function share(p:FanPerson) {
    const url=new URL("/go-fan",window.location.origin);url.searchParams.set("event",eventId);url.searchParams.set("athlete",p.key);
    try {if(navigator.share) await navigator.share({title:`GO FAN · ${p.name}`,text:`ติดตามผล ${p.name} · ${data.event?.title}`,url:url.toString()});else{await navigator.clipboard.writeText(url.toString());setNotice("คัดลอกลิงก์ผลการแข่งขันแล้ว");}}
    catch(e){if(!(e instanceof DOMException && e.name==="AbortError"))setNotice("แชร์ไม่สำเร็จ กรุณาลองใหม่");}
  }
  // ทุกคนที่ติดตามในรายการนี้ ดูพร้อมกันได้: รอบล่าสุด (คู่ โต๊ะ สีหมาก ผล) + สถิติรวม
  const overview=currentFollows.map(f=>{
    const p=data.participants.find(x=>x.key===f.key);
    const d=p?data.divisions.find(x=>x.division.id===p.divisionId):undefined;
    const ms=p?.athleteId?(d?.matches??[]).filter(m=>m.state!=="void"&&(m.black_athlete_id===p.athleteId||m.white_athlete_id===p.athleteId)):[];
    const bs=p?.athleteId?(d?.byes??[]).filter(b=>b.athlete_id===p.athleteId):[];
    const lastRound=Math.max(0,...ms.map(m=>m.round_number),...bs.map(b=>b.round_number));
    const m=ms.find(x=>x.round_number===lastRound)??null;
    const bye=!m&&bs.some(b=>b.round_number===lastRound);
    const opp=m&&p?.athleteId?new Map(d?.people??[]).get(m.black_athlete_id===p.athleteId?m.white_athlete_id:m.black_athlete_id):undefined;
    const st=p?.athleteId?d?.standings.find(s=>s.athlete_id===p.athleteId):undefined;
    return {f,p,lastRound,m,bye,opp,st,outcome:bye?{kind:"win",label:"ได้บาย",detail:""}:fanOutcome(m,p?.athleteId??null)};
  });
  const otherEventFollows=follows.length-currentFollows.length;
  const caption=view==="pairings"?"ผลจับคู่ (Pairing)":view==="ranking"?"ตารางอันดับ":view==="summary"?"สรุปผลการแข่งขัน":"ผลการแข่งขันของนักกีฬา";
  return <div className="gf-page competition-page cd-dashboard">{!scope&&!embedded&&<SiteBar current="/go-fan" />}
    {!embedded&&<header className="gf-hero"><svg className="gf-desktop-hero-art" viewBox="0 47 1672 153" aria-hidden="true" focusable="false"><image href="/go-fan/approved-desktop.webp" width="1672" height="941" /></svg><div><h1><span>GO</span> FAN <svg className="gf-megaphone" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m8 18 23-9 7 26-25-1Z"/><path d="m15 34 4 11 7-2-4-9M31 9c-1-6 1-7 3-5l10 30c1 4-3 5-6 1M5 20l-3 1 3 11 7 2M39 9l5-4M42 17l6-1"/></svg></h1><p>{scope?`ติดตามผลการแข่งขันนักกีฬาในสังกัด ${scope.name}`:"ติดตามผลการแข่งขันนักกีฬาที่คุณสนใจ"}</p><ul><li>ค้นหาชื่อ</li><li>กดติดตาม</li><li>ดูผลจับคู่</li><li>ผลการแข่งขัน</li><li>บันทึกรูปได้</li></ul></div></header>}
    <main className="gf-container">
      {!embedded&&<h2 className="gf-tracking-title">ติดตามการแข่งขัน</h2>}
      {!embedded&&<nav className="gf-primary-tabs" aria-label="หน้าติดตามการแข่งขัน">
        <button type="button" aria-current={section==="following"?"page":undefined} onClick={()=>setSection("following")}><MenuIcon name="entrants"/><span>การแข่งขันที่กำลังติดตาม<small>นักกีฬาที่เลือกไว้ · {ready?follows.length:0} คน</small></span></button>
        <button type="button" aria-current={section==="all"?"page":undefined} onClick={()=>setSection("all")}><MenuIcon name="trophy"/><span>การแข่งขันทั้งหมด<small>เลือกรายการเพื่อค้นหาและติดตามนักกีฬา</small></span></button>
      </nav>}
      {error && <p className="gf-error" role="alert">{error}</p>}
      {section==="all"&&<section className="gf-event-browser" aria-label="การแข่งขันทั้งหมด">
        <label htmlFor="gf-event-search">ค้นหารายการแข่งขัน</label>
        <input id="gf-event-search" type="search" value={eventQuery} onChange={e=>setEventQuery(e.target.value)} placeholder="พิมพ์ชื่อรายการแข่งขัน"/>
        <ul>{data.events.filter(e=>e.title.toLowerCase().includes(eventQuery.trim().toLowerCase())).map(e=><li key={e.id}>
          <MenuIcon name="trophy"/><div><h3>{e.title}</h3><p>{thaiDate(e.event_date??null)??"รอประกาศวันแข่งขัน"}{e.venue?` · ${e.venue}`:""}</p><small>ติดตามนักกีฬา {follows.filter(f=>f.eventId===e.id).length} คน</small></div>
          <button type="button" disabled={loading} onClick={async()=>{if(await changeEvent(e.id)){setSection("following");setTab("follow");setSearch("");setQuery("");setDivisionFilter("");setBrowsePeople(true);}}}>{loading?"กำลังโหลด…":"เลือกนักกีฬา →"}</button>
        </li>)}</ul>
        {!data.events.some(e=>e.title.toLowerCase().includes(eventQuery.trim().toLowerCase()))&&<p className="gf-empty">{data.events.length?"ไม่พบรายการที่ค้นหา":"ยังไม่มีรายการแข่งขันที่เผยแพร่"}</p>}
      </section>}
      <div hidden={section!=="following"}>

      {scope&&<div className="gf-institution-tools"><strong>นักกีฬาในสังกัดที่ลงรายการนี้ {data.participants.length} คน</strong><button type="button" onClick={()=>{setFollows(prev=>{const keys=new Set(prev.map(f=>f.key));return [...prev,...data.participants.filter(p=>!keys.has(p.key)).map(p=>({key:p.key,eventId,name:p.name,institution:p.institution,divisionName:p.divisionName,photo:p.photo??null,notify:true}))].slice(0,100);});setNotice("ติดตามนักกีฬาในสังกัดรายการนี้แล้ว · บันทึกไว้ในเครื่องนี้");}}>★ ติดตามทั้งสถาบันในรายการนี้</button></div>}
      <div className="gf-search-row"><form onSubmit={e=>{e.preventDefault();setSearch(query.trim());}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></svg><label className="sr-only" htmlFor="gf-search">ค้นหาชื่อนักกีฬา สถาบัน หรือรุ่นแข่งขัน</label><input id="gf-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาชื่อนักกีฬา / สถาบัน / รุ่นแข่งขัน" /><button type="submit">ค้นหา</button></form><button className="gf-follow-count" type="button" onClick={()=>{setTab("follow");document.getElementById("gf-follow-list")?.scrollIntoView({behavior:"smooth",block:"center"});}}>★ นักกีฬาที่ติดตาม ({follows.length})</button></div>
      <div className="gf-filter-disclosure" data-open={filtersOpen}><button className="gf-filter-toggle" type="button" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(v=>!v)}>ตัวกรองรายการ / รุ่นแข่งขัน</button><div className="gf-event-picker"><label>รายการแข่งขัน <select value={eventId} onChange={e=>void changeEvent(e.target.value)} disabled={loading}>{data.events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label><label>รุ่นแข่งขัน <select value={divisionFilter} onChange={e=>setDivisionFilter(e.target.value)} disabled={loading}><option value="">ทุกรุ่น</option>{data.divisions.map(d=><option key={d.division.id} value={d.division.id}>{divisionLabel(d.division.name)}</option>)}</select></label><span>{loading?"กำลังโหลด…":`ตรวจอัปเดตทุก 15 วินาที · ${new Date(data.checkedAt).toLocaleTimeString("th-TH",{timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit"})}`}</span></div></div>
      <section className="gf-event-banner"><MenuIcon name="trophy" /><h2>{data.event?.title ?? "รอประกาศรายการแข่งขัน"}</h2><div><p>▦ {thaiDate(data.event?.event_date ?? null) ?? "รอประกาศวันแข่งขัน"}</p><p>● {data.event?.venue || (/zeer/i.test(data.event?.title ?? "")?"เซียร์ รังสิต":"รอประกาศสถานที่")}</p></div></section>
      <nav className="gf-tabs" aria-label="เมนู GO FAN">{tabs.map(t=><button type="button" key={t.id} aria-current={tab===t.id?"page":undefined} onClick={()=>{setTab(t.id);setDetail(null);}}><MenuIcon name={t.icon} /><span className="gf-desktop-label">{t.label}</span><span className="gf-mobile-label">{t.short}</span></button>)}</nav>

      <p className="gf-notice" role="status" aria-live="polite">{notice}</p>
      {showSearch && <section className="gf-search-results"><div><h2>{scope?"นักกีฬาในสังกัด":"ผลการค้นหา"} ({filtered.length} คน)</h2><button type="button" onClick={()=>{setSearch("");setQuery("");setDivisionFilter("");setBrowsePeople(false);}}>ล้างการค้นหา</button></div><ul>{filtered.map(p=><li key={p.key}><Portrait person={p} /><button className="gf-person-choice" type="button" onClick={()=>{setSelectedKey(p.key);setTab("follow");}}><strong data-athlete-id={p.athleteId??undefined}>{p.name}</strong><small>{p.institution} · {divisionLabel(p.divisionName)}</small></button><button type="button" className="gf-star" aria-pressed={follows.some(f=>f.key===p.key)} aria-label={`${follows.some(f=>f.key===p.key)?"เลิกติดตาม":"ติดตาม"} ${p.name}`} onClick={()=>toggleFollow(p)}>★</button></li>)}</ul>{!filtered.length && <p className="gf-empty">ไม่พบรายชื่อ ลองค้นหาชื่อจริง หรือเลือกทุกรุ่น</p>}</section>}
      <div className="gf-layout"><aside className="gf-sidebar">
        <section className="gf-follow-panel" id="gf-follow-list"><h2><span>★ นักกีฬาที่ติดตาม ({follows.length})</span><button type="button" onClick={()=>setManage(v=>!v)}>{manage?"เสร็จ":"✎ จัดการ"}</button></h2>
          {!currentFollows.length && <p className="gf-empty">ยังไม่ได้ติดตามนักกีฬาในรายการนี้<br />ค้นหาชื่อแล้วกด ★ เพื่อเริ่มติดตาม</p>}
          <ul>{follows.map(f=>{const p=data.participants.find(p=>p.key===f.key) ?? f;return <li key={f.key} className={selected?.key===f.key?"selected":""}><Portrait person={p} /><button type="button" className="gf-person-choice" onClick={()=>{if(f.eventId!==eventId)void changeEvent(f.eventId,f.key);else setSelectedKey(f.key);setTab("follow");}}><strong data-athlete-id={"athleteId" in p ? p.athleteId ?? undefined : undefined}>{p.name}</strong><small>{p.institution || "ไม่ระบุสถาบัน"}</small><small>{divisionLabel(p.divisionName)}</small></button>{manage?<button type="button" aria-label={`เลิกติดตาม ${f.name}`} onClick={()=>setFollows(prev=>prev.filter(x=>x.key!==f.key))}>ลบ</button>:<button type="button" className="gf-bell" aria-pressed={f.notify} aria-label={`${f.notify?"ปิด":"เปิด"}แจ้งอัปเดตบนหน้านี้ ${f.name}`} onClick={()=>toggleNotice(f.key)}><Bell /></button>}{selected && selected.key===f.key && !manage && <div className="gf-follow-mobile-actions"><button className="gf-follow-button active" type="button" onClick={()=>toggleFollow(selected)}>★ กำลังติดตาม</button><button className="gf-bell" type="button" aria-pressed={f.notify} aria-label="แจ้งอัปเดตบนหน้านี้" onClick={()=>toggleNotice(f.key)}><Bell/></button><button type="button" aria-label="แชร์ผลของนักกีฬาที่ติดตาม" onClick={()=>void share(selected)}><ShareIcon/></button></div>}</li>;})}</ul>
          {!follows.length && !showSearch && <div className="gf-suggestions"><h3>เลือกนักกีฬาจากรายชื่อจริง</h3>{data.participants.slice(0,3).map(p=><div key={p.key}><Portrait person={p} /><button className="gf-person-choice" type="button" onClick={()=>setSelectedKey(p.key)}><strong data-athlete-id={p.athleteId??undefined}>{p.name}</strong><small>{divisionLabel(p.divisionName)}</small></button><button className="gf-star" type="button" aria-label={`ติดตาม ${p.name}`} onClick={()=>toggleFollow(p)}>☆</button></div>)}</div>}
        </section><Instructions institution={!!scope} />
      </aside>
      <div className="gf-main">
        {tab==="follow"&&overview.length>0&&<section className="gf-overview" aria-label="นักกีฬาที่ติดตามทั้งหมด">
          <h2>★ ดูทุกคนที่ติดตาม ({overview.length}) <small>แตะการ์ดเพื่อดูรายละเอียดทุกรอบ</small></h2>
          <ul>{overview.map(({f,p,lastRound,m,bye,opp,st,outcome})=>{const person=p??f;return <li key={f.key} className={selected?.key===f.key?"selected":""}>
            <Portrait person={person}/>
            <button type="button" className="gf-overview-body" onClick={()=>{setSelectedKey(f.key);document.querySelector(".gf-selected")?.scrollIntoView({behavior:"smooth",block:"start"});}}>
              <strong data-athlete-id={p?.athleteId??undefined}>{person.name}</strong>
              <small>{divisionLabel(person.divisionName)}{st?` · ชนะ ${st.wins} แพ้ ${st.losses}${st.byes?` บาย ${st.byes}`:""} · คะแนน ${st.score}`:""}</small>
              {!p?<small>ไม่พบชื่อในรายชื่อล่าสุดของรายการนี้</small>
                :!lastRound?<small className="gf-overview-wait">รอประกาศคู่แข่งขัน</small>
                :<span className="gf-overview-round"><b>รอบ {lastRound}</b>{bye?<span>ได้บาย</span>:<span>โต๊ะ {m?.board_number??"–"} · {m?.black_athlete_id===p.athleteId?"● ดำ":"○ ขาว"} · พบ {opp?.name??"รอชื่อคู่"}</span>}<span className={`gf-outcome ${outcome.kind}`}><b>{outcome.kind==="win"?"✓ ":outcome.kind==="loss"?"✕ ":""}{outcome.label}</b></span></span>}
            </button>
          </li>;})}</ul>
          {otherEventFollows>0&&<p className="gf-overview-note">ติดตามในรายการอื่นอีก {otherEventFollows} คน · เลือกรายการแข่งขันด้านบน หรือแตะชื่อในรายการติดตาม</p>}
        </section>}
        {selected ? <>
        <section className={`gf-selected ${following?"gf-already-followed":""}`}><Portrait person={selected} /><div><h2><span data-athlete-id={selected.athleteId??undefined}>{selected.name}</span></h2><p>สังกัด : {selected.institution || "ไม่ระบุสถาบัน"}</p><span>{divisionLabel(selected.divisionName)}</span></div><div className="gf-selected-actions"><button className={`gf-follow-button ${following?"active":""}`} type="button" aria-pressed={following} onClick={()=>toggleFollow(selected)}>★ {following?"กำลังติดตาม":"ติดตามนักกีฬา"}</button>{following&&<button className="gf-bell" type="button" aria-pressed={followed?.notify} aria-label="แจ้งอัปเดตบนหน้านี้" onClick={()=>toggleNotice(selected.key)}><Bell /></button>}<button type="button" aria-label="แชร์ผลการแข่งขันของนักกีฬา" onClick={()=>void share(selected)}><ShareIcon /></button></div></section>
        {tab==="follow"&&<nav className="gf-subtabs" aria-label="ข้อมูลนักกีฬาที่เลือก">{([['results','ผลการแข่งขัน','trophy'],['pairings','ผลจับคู่ (Pairing)','register'],['ranking','อันดับ (Ranking)','stats']] as const).map(([id,label,icon])=><button key={id} type="button" aria-current={subtab===id?"page":undefined} onClick={()=>{setSubtab(id);setDetail(null);}}><MenuIcon name={icon} />{label}</button>)}</nav>}
        <CompetitionPanel className="gf-results-panel" title={caption} context={`${data.event?.title} · ${selected.name} · ${divisionLabel(selected.divisionName)}`}>
          <h2 className="gf-results-title"><MenuIcon name={view==="ranking"?"stats":"trophy"}/>{caption}</h2>
          {division && !division.available && <p className="gf-error">ยังโหลดคู่แข่งขันไม่ได้ กรุณารอระบบลองใหม่</p>}
          {view==="ranking" ? <>{!division?.standingsAvailable?<p className="gf-empty">ยังโหลดอันดับไม่ได้ กรุณาลองใหม่</p>:<><div className="gf-rank-summary"><strong>{standing && (standing.wins+standing.losses+(standing.draws??0)+standing.byes)>0?`อันดับ ${standing.pos}`:"รอผลยืนยันก่อนจัดอันดับ"}</strong><span>{complete?"✓ จบการแข่งขันแล้ว":"กำลังติดตามผล"}</span></div><table className="gf-ranking"><thead><tr><th>อันดับ</th><th>นักกีฬา / สถาบัน</th><th>คะแนน</th><th>SOS</th><th>SOSOS</th></tr></thead><tbody>{division.standings.filter(s=>!s.withdrawn).map((s,i)=><tr key={s.athlete_id??i} className={s.athlete_id===selected.athleteId?"selected":""}><td>{s.wins+s.losses+(s.draws??0)+s.byes>0?s.pos:"–"}</td><td><strong>{s.display_name??"ผู้เข้าแข่งขัน"}</strong><small>{s.institution}</small></td><td>{s.score}</td><td>{s.sos}</td><td>{s.sosos}</td></tr>)}</tbody></table>{!division.standings.length&&<p className="gf-empty">ยังไม่มีอันดับที่ประกาศ</p>}</>}</>
          :view==="summary"?<div className="gf-summary"><h3>{complete?"สรุปผลการแข่งขัน":"สรุปผลที่ยืนยันแล้ว · การแข่งขันยังไม่จบ"}</h3><div><span>คะแนน<b>{standing?.score ?? "–"}</b></span><span>ชนะ<b>{standing?.wins ?? 0}</b></span><span>แพ้<b>{standing?.losses ?? 0}</b></span><span>เสมอ<b>{standing?.draws ?? 0}</b></span><span>บาย<b>{standing?.byes ?? byes.length}</b></span></div><p>นับเฉพาะผลที่ผู้ตัดสินยืนยันแล้ว</p><p>{standing?`SOS ${standing.sos} · SOSOS ${standing.sosos}`:"รอข้อมูลคะแนน"}</p></div>
          :<><table className={`gf-games gf-games-${view}`}><thead><tr><th>รอบ</th><th>คู่แข่งขัน</th><th>{view==="pairings"?"โต๊ะ / สีหมาก":"ผล"}</th><th>รายละเอียด</th></tr></thead><tbody>{games.map(g=>{const m=g.match;const opponent=m?people.get(m.black_athlete_id===selected.athleteId?m.white_athlete_id:m.black_athlete_id):undefined;const outcome=g.bye?{kind:"win",label:"ได้บาย",detail:"1 คะแนน"}:fanOutcome(m,selected.athleteId);const id=m?.id??`bye-${g.round}`;return <tr key={id}><td>รอบ {g.round}</td><td>{opponent?<div className="gf-opponent"><Portrait person={opponent}/><div><strong>{opponent.name}</strong><small>{opponent.institution||"ไม่ระบุสถาบัน"}</small></div></div>:g.bye?"ไม่มีคู่แข่งขัน (บาย)":"รอชื่อคู่แข่งขัน"}</td><td>{view==="pairings"?<div className="gf-board"><b>{g.bye?"ได้บาย":`โต๊ะ ${m?.board_number??"–"}`}</b>{m&&<small>{m.black_athlete_id===selected.athleteId?"● หมากดำ":"○ หมากขาว"}</small>}</div>:<span className={`gf-outcome ${outcome.kind}`}><b>{outcome.kind==="win"?"✓ ":outcome.kind==="loss"?"✕ ":""}{outcome.label}</b><small>{outcome.detail}</small></span>}</td><td><button type="button" data-export-ignore="true" aria-label={`รายละเอียดรอบ ${g.round}`} aria-expanded={detail===id} onClick={()=>setDetail(detail===id?null:id)}><MenuIcon name="news" /></button>{detail===id&&<p className="gf-match-detail">{g.bye?"ได้บาย ไม่ต้องนั่งโต๊ะแข่งขัน":`รอบ ${g.round} · โต๊ะ ${m?.board_number??"รอระบุ"} · ${m?.black_athlete_id===selected.athleteId?"หมากดำ":"หมากขาว"} · ${outcome.label} ${outcome.detail}`}</p>}</td></tr>;})}</tbody></table>{!games.length&&division?.available&&<div className="gf-empty-state"><MenuIcon name="register"/><h3>รอประกาศคู่แข่งขัน</h3><p>{following?"ติดตามไว้แล้ว เมื่อผู้จัดประกาศคู่ ระบบจะแสดงโต๊ะ คู่แข่งขัน และผลที่นี่":"กด ★ ติดตามนักกีฬา เมื่อผู้จัดประกาศคู่ ระบบจะแสดงโต๊ะ คู่แข่งขัน และผลที่นี่"}</p><small>ข้อมูลจากการแข่งขันจริง · ไม่มีการสร้างผลตัวอย่าง</small></div>}</>}
        </CompetitionPanel>
        <button className="gf-summary-link" type="button" onClick={()=>setTab("summary")}>▦ สรุปผลการแข่งขัน</button>
        <button className="gf-share-wide" type="button" onClick={()=>void share(selected)}>แชร์ผลการแข่งขัน <span aria-hidden="true">↗</span></button>
        <p className="gf-live-note">อัปเดตคู่แข่งขันและผลที่ยืนยันแล้วอัตโนมัติเมื่อเปิดหน้านี้ · {thaiDate(data.event?.event_date??null)}</p>
      </>:<div className="gf-empty-state"><h2>{scope?"ยังไม่มีนักกีฬาในสังกัดลงรายการนี้":"ยังไม่มีรายชื่อผู้เข้าแข่งขันที่เผยแพร่"}</h2><p>เลือกรายการแข่งขันอื่น หรือติดตามประกาศจากผู้จัด</p><Link href="/tournaments">ดูรายการแข่งขัน</Link></div>}</div></div>
      </div>
    </main>{!scope&&<footer className="gf-footer"><img className="gf-footer-board" src="/event-hero-board.webp" alt=""/><div><strong>GO TOURNAMENT</strong><p>ติดตามนักกีฬาที่คุณสนใจ · ไม่ต้องล็อกอิน</p><Link href="/tournaments">รายการแข่งขันทั้งหมด →</Link></div></footer>}
  </div>;
}
