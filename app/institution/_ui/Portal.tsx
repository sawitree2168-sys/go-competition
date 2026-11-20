"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { ROLE_LABEL, eventsOf, filterRecords, yearsOf } from "@/lib/institution-portal.mjs";
import { BoardLogo, ICONS, MENU, selectCls, type Application, type Overview, type View } from "./bits";
import { Home, Students, Tracking, Awards, Stats, Reports } from "./views";
import Apply from "./Apply";
import Join from "./Join";
import StaffUsername from "./StaffUsername";
import ChangeInstitutionPassword from "./ChangeInstitutionPassword";
import InstituteLogin from "./InstituteLogin";
import { AcademyStaff } from "./AcademyPeople";

type Mine = { id: string; name: string; role: "manager" | "teacher"; status: "active" | "pending" };
type State = { mode:"loading" | "out" | "none" | "ready"; mine:Mine[]; email:string; admin:boolean };
const VIEWS:View[] = ["home","tracking","students","awards","stats","reports","apply"];
const initialView=():View=>{
  if(typeof window==="undefined") return "home";
  const value=new URLSearchParams(location.search).get("v") as View;
  return VIEWS.includes(value)?value:"home";
};

export default function Portal(){
  const [state,setState]=useState<State>({mode:"loading",mine:[],email:"",admin:false});
  const [academyId,setAcademyId]=useState("");
  const [joining,setJoining]=useState(false);
  const loadMine=useCallback(async()=>{
    const db=staffDb();
    if(!db){setState({mode:"out",mine:[],email:"",admin:false});return;}
    const {data:session}=await db.auth.getSession();
    if(!session.session){setState({mode:"out",mine:[],email:"",admin:false});return;}
    const [{data:mine},{data:access}]=await Promise.all([db.rpc("gt_my_academies_v1"),db.rpc("gt_my_access_v1")]);
    const list=(mine??[]) as Mine[];
    setState({mode:list.length?"ready":"none",mine:list,email:session.session.user.email??"",admin:Boolean(access?.platform_role)});
    setAcademyId(current=>{const requested=new URLSearchParams(window.location.search).get("academy");return list.some(a=>a.id===current)?current:(list.find(a=>a.id===requested)??list.find(a=>a.status==="active")??list[0])?.id??"";});
  },[]);
  useEffect(()=>{void loadMine();},[loadMine]);
  const selected=state.mine.find(a=>a.id===academyId);
  return <div className="min-h-screen bg-[#f5f8fd] text-[#102b5b]">
    <header className="border-b-[3px] border-[#e9bd55] bg-[#082957] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3 font-bold sm:text-xl"><BoardLogo className="h-11 w-11" /><span>GO TOURNAMENT</span></Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/tournaments" className="rounded-lg px-3 py-2 hover:bg-white/10">รายการแข่งขัน</Link>
          {state.mode!=="out"&&state.mode!=="loading"&&<button type="button" onClick={async()=>{await staffDb()?.auth.signOut();location.assign("/");}} className="rounded-lg border border-[#e9bd55] px-3 py-2">ออกจากระบบ</button>}
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-9">
      {state.mode==="loading"&&<p role="status" className="rounded-2xl border border-[#bfd1eb] bg-white p-10 text-center">กำลังเปิดหน้าสถาบัน…</p>}
      {state.mode==="out"&&<InstituteLogin onSuccess={loadMine}/>}
      {(state.mode==="none"||joining)&&<div>
        <Join admin={state.admin} onCancel={joining?()=>setJoining(false):undefined} onJoined={async id=>{setJoining(false);setAcademyId(id);await loadMine();}}/>
      </div>}
      {state.mode==="ready"&&!joining&&selected&&<InstituteWorkspace academyId={academyId} mine={state.mine} selected={selected} onJoin={()=>setJoining(true)} />}
    </main>
  </div>;
}

function InstituteWorkspace({academyId,mine,selected,onJoin}:{academyId:string;mine:Mine[];selected:Mine;onJoin:()=>void}){
  const [ov,setOv]=useState<Overview|null>(null);
  const [apps,setApps]=useState<Application[]>([]);
  const [error,setError]=useState("");
  const [view,setView]=useState<View>("home");
  const [year,setYear]=useState<number|null>(new Date().getFullYear()+543);
  const [event,setEvent]=useState("");
  const load=useCallback(async()=>{
    const db=staffDb();
    if(!db)return;
    const [o,a]=await Promise.all([db.rpc("gt_academy_overview_v1",{p_academy:academyId}),db.rpc("gt_academy_applications_v1",{p_academy:academyId})]);
    if(o.error||!o.data?.ok){setError("ยังไม่สามารถเปิดข้อมูลสถาบันได้ กรุณาตรวจสอบสิทธิ์บัญชี");return;}
    setError("");setOv(o.data as Overview);setApps((a.data?.items??[]) as Application[]);
  },[academyId]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{setView(initialView());const onPop=()=>setView(initialView());addEventListener("popstate",onPop);return()=>removeEventListener("popstate",onPop);},[]);
  useEffect(()=>{if(view!=="tracking")return;const id=setInterval(()=>{void load();},30000);return()=>clearInterval(id);},[view,load]);
  const go=(next:View)=>{setView(next);history.pushState(null,"",next==="home"?"/institution":`/institution?v=${next}`);window.scrollTo({top:0,behavior:"smooth"});};
  const records=useMemo(()=>ov?.records??[],[ov]);
  const years=useMemo(()=>yearsOf(records),[records]);
  const events=useMemo(()=>eventsOf(records,year),[records,year]);
  const filtered=useMemo(()=>filterRecords(records,{year,event}),[records,year,event]);
  const tracking=useMemo(()=>(ov?.tracking??[]).filter(t=>(!year||Number(String(t.date??"").slice(0,4))+543===year)&&(!event||t.tournament_id===event)),[ov,year,event]);
  const access=ov?.access==="active"||ov?.access==="admin";
  const filters=<div className="flex flex-wrap gap-2">
    <select aria-label="เลือกปี" className={selectCls} value={year??""} onChange={e=>{setYear(e.target.value?Number(e.target.value):null);setEvent("");}}>
      {years.map(y=><option value={y} key={y}>ปี {y}</option>)}<option value="">ทุกปี</option>
    </select>
    <select aria-label="เลือกรายการแข่งขัน" className={selectCls} value={event} onChange={e=>setEvent(e.target.value)}>
      <option value="">ทุกรายการ</option>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
    </select>
  </div>;
  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-2xl border-b-4 border-[#e9bd55] bg-[linear-gradient(120deg,#0759bf,#0a316b)] px-5 py-7 text-white shadow-md sm:px-9">
      <div className="relative z-10">
        <p className="text-xs font-bold tracking-[.18em] text-[#f9d67d]">GO TOURNAMENT · สถาบัน</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{ov?.academy.name??selected.name}</h1>
        <p className="mt-2 text-base text-white/90">ติดตามนักกีฬาและผลงานของสถาบันในหน้าจอเดียว</p>
        <p className="mt-3 inline-flex rounded-full border border-[#f5d784] bg-[#f5d784] px-3 py-1 text-xs font-bold text-[#12335c]">{selected.status==="active"?"บัญชีสถาบันเปิดใช้งาน":"รออนุมัติสิทธิ์"}</p>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-3 h-48 w-48 rounded-full border-[20px] border-white/10 sm:h-72 sm:w-72"/>
    </section>
    {mine.length>1&&<div className="rounded-xl border border-[#bdcfe8] bg-white p-3">
      <label className="mr-3 text-sm font-semibold" htmlFor="academy-select">สถาบันของฉัน</label>
      <select id="academy-select" className={selectCls} value={academyId} onChange={e=>location.assign(`/institution?academy=${encodeURIComponent(e.target.value)}`)}>{mine.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
    </div>}
    <nav aria-label="เมนูสถาบัน" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      <button type="button" onClick={()=>go("home")} aria-current={view==="home"?"page":undefined} className={navClass(view==="home")}>
        <span className="text-2xl" aria-hidden="true">⌂</span><span>ภาพรวม</span>
      </button>
      {MENU.map(m=><button key={m.id} type="button" onClick={()=>go(m.id)} aria-current={view===m.id?"page":undefined} className={navClass(view===m.id)}>
        <span className="h-7 w-7 text-[#bd8c27]">{ICONS[m.id]}</span><span>{m.title}</span>
      </button>)}
    </nav>
    {ov?.access==="pending"&&<p role="status" className="rounded-xl border-2 border-[#e6c16c] bg-[#fff8e8] p-4 text-sm">รับคำขอเข้าร่วมสถาบันแล้ว · รอผู้ดูแลอนุมัติสิทธิ์ก่อนจึงจะเพิ่มนักกีฬาและสมัครแข่งขันได้</p>}
    {!ov?<div className="rounded-xl border border-[#bfd1eb] bg-white p-8 text-center" role={error?"alert":"status"}>{error||"กำลังโหลดข้อมูลสถาบัน…"}</div>:<div className="space-y-5">
      {view==="home"&&<Home ov={ov} records={filtered} track={tracking} apps={apps} filters={filters} go={go}/>}
      {view==="tracking"&&<Tracking ov={ov} track={tracking} filters={filters}/>}
      {view==="students"&&<Students ov={ov} canEdit={access} reload={load}/>}
      {view==="awards"&&<Awards ov={ov} records={filtered} filters={filters}/>}
      {view==="stats"&&<Stats ov={ov} records={filtered} filters={filters}/>}
      {view==="reports"&&<Reports ov={ov} records={filtered} filters={filters}/>}
      {view==="apply"&&<Apply ov={ov} apps={apps} canEdit={access} reload={load}/>}
      {view==="home"&&access&&<details className="rounded-2xl border border-[#c8d7ec] bg-white p-4">
        <summary className="cursor-pointer text-base font-bold text-[#164986]">ตั้งค่าบัญชีและจัดการครู (สำหรับผู้ดูแล)</summary>
        <div className="mt-4 space-y-4"><StaffUsername role={selected.role}/><ChangeInstitutionPassword/><AcademyStaff academyId={academyId}/></div>
      </details>}
    </div>}
    <footer className="border-t border-[#c8d7ec] py-6 text-center text-xs text-[#49617d]">GO TOURNAMENT · ข้อมูลการแข่งขันมาจากระบบจริง</footer>
  </div>;
}
function navClass(active:boolean){
 return `flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center text-[13px] font-bold shadow-sm transition active:scale-[.98] sm:text-sm ${active?"border-[#e0b44e] bg-[#095fc4] text-white shadow-md":"border-[#b8cde8] bg-white text-[#123969] hover:border-[#e0b44e] hover:bg-[#fffaf0]"}`;
}
