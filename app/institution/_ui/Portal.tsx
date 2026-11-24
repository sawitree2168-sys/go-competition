"use client";

import "./institution-theme.css";
import { shownName } from "@/lib/easy-auth.mjs";
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
import AcademyTeam from "./AcademyTeam";
import LiveBoard from "./LiveBoard";
import LogoEditor,{LogoDisplay,type Branding} from "./LogoEditor";
import MenuIcon from "@/components/MenuIcon";
import { INSTITUTION_RETURN_KEY } from "@/components/InstitutionReturn";

type Mine = { id: string; name: string; role: "manager" | "teacher"; status: "active" | "pending" };
type State = { mode:"loading" | "out" | "none" | "ready"; mine:Mine[]; email:string; admin:boolean };
const VIEWS:View[] = ["home","tracking","live","students","teachers","awards","stats","reports","apply","settings"];
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
    setState({mode:list.length?"ready":"none",mine:list,email:shownName(session.session.user),admin:Boolean(access?.platform_role)});
    setAcademyId(current=>{const requested=new URLSearchParams(window.location.search).get("academy");return list.some(a=>a.id===current)?current:(list.find(a=>a.id===requested)??list.find(a=>a.status==="active")??list[0])?.id??"";});
  },[]);
  useEffect(()=>{void loadMine();},[loadMine]);
  const selected=state.mine.find(a=>a.id===academyId);
  return <div className="gt-inst">
    <header className="inst-topbar sticky top-0 z-30 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-bold sm:gap-3 sm:text-xl"><span className="inst-brand-mark" aria-hidden="true">Go</span><span className="text-sm tracking-wide sm:text-xl">GO TOURNAMENT</span></Link>
        <nav className="flex items-center gap-1.5 text-sm sm:gap-2">
          {state.mode==="ready"&&<a href="/institution" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#e9bd55] bg-[#e9bd55] px-3 font-bold text-[#082957]"><MenuIcon name="school" className="h-5 w-5"/><span>หน้าสถาบัน</span></a>}
          <Link href="/tournaments" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:inline">รายการแข่งขัน</Link>
          {state.mode!=="out"&&state.mode!=="loading"&&<button type="button" onClick={async()=>{try{localStorage.removeItem(INSTITUTION_RETURN_KEY);}catch{}await staffDb()?.auth.signOut();location.assign("/");}} className="min-h-11 rounded-lg border border-white/40 px-3">ออกจากระบบ</button>}
        </nav>
      </div>
    </header>
    <main className="inst-shell">
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
  const [workspaceType,setWorkspaceType]=useState<"academy"|"independent_coach">("academy");
  const [branding,setBranding]=useState<Branding|null>(null);
  const [view,setView]=useState<View>("home");
  const [year,setYear]=useState<number|null>(new Date().getFullYear()+543);
  const [event,setEvent]=useState("");
  const load=useCallback(async()=>{
    const db=staffDb();
    if(!db)return;
    const [o,a,w,b]=await Promise.all([db.rpc("gt_academy_overview_v1",{p_academy:academyId}),db.rpc("gt_academy_applications_v1",{p_academy:academyId}),db.rpc("gt_workspace_kind_v1",{p_academy:academyId}),db.rpc("gt_academy_branding_v1",{p_academy:academyId})]);
    if(b.data?.ok)setBranding({logo_path:b.data.logo_path??null,shape:b.data.shape==="square"?"square":"circle",zoom:b.data.zoom??100,x:b.data.x??50,y:b.data.y??50});
    setWorkspaceType(w.data==="independent_coach"?"independent_coach":"academy");
    if(o.error||!o.data?.ok){setError("ยังไม่สามารถเปิดข้อมูลสถาบันได้ กรุณาตรวจสอบสิทธิ์บัญชี");return;}
    setError("");setOv(o.data as Overview);setApps((a.data?.items??[]) as Application[]);
  },[academyId]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{setView(initialView());const onPop=()=>setView(initialView());addEventListener("popstate",onPop);return()=>removeEventListener("popstate",onPop);},[]);
  useEffect(()=>{if(view!=="tracking"&&view!=="live")return;const id=setInterval(()=>{void load();},30000);return()=>clearInterval(id);},[view,load]);
  const go=(next:View)=>{setView(next);history.pushState(null,"",next==="home"?"/institution":`/institution?v=${next}`);window.scrollTo({top:0,behavior:"smooth"});};
  // Remember where to come back to (shown as "กลับหน้าสถาบัน" on the profile and other pages).
  useEffect(()=>{try{localStorage.setItem(INSTITUTION_RETURN_KEY,JSON.stringify({href:`${location.pathname}${location.search}`,name:selected.name}));}catch{}},[view,selected.name]);
  const records=useMemo(()=>ov?.records??[],[ov]);
  const years=useMemo(()=>yearsOf(records),[records]);
  const events=useMemo(()=>eventsOf(records,year),[records,year]);
  const filtered=useMemo(()=>filterRecords(records,{year,event}),[records,year,event]);
  const tracking=useMemo(()=>{
    if(!ov)return [];
    // A confirmed registration must be visible before pairing, without inventing a board or result.
    const paired=new Set(ov.tracking.map(t=>`${t.athlete_id}:${t.division_id}`));
    const awaiting=ov.records.filter(r=>r.source!=="history"&&!paired.has(`${r.athlete_id}:${r.division_id}`))
      .map(r=>({athlete_id:r.athlete_id,tournament_id:r.tournament_id,title:r.title,date:r.date,
        division_id:r.division_id,division:r.division,round:0,board:null,outcome:"pending" as const}));
    return [...ov.tracking,...awaiting].filter(t=>(!year||Number(String(t.date??"").slice(0,4))+543===year)&&(!event||t.tournament_id===event));
  },[ov,year,event]);
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
    <div className="inst-page-title"><span className="inst-page-title__icon" aria-hidden="true"><MenuIcon name="school" className="h-7 w-7" /></span><div className="min-w-0"><h2 className="text-lg font-bold sm:text-2xl">สถาบันของฉัน</h2><p className="text-xs text-white/90 sm:text-sm">จัดการนักกีฬา คุณครู และติดตามการแข่งขันทุกระดับฝีมือ</p></div></div>
    <section className="inst-hero px-4 py-5 text-white sm:px-7 sm:py-7">
      <div className="relative z-10 flex flex-wrap items-center gap-5">
        <div className="inst-hero-logo relative">
          <LogoDisplay branding={branding} name={selected.name} className="h-20 w-20 sm:h-28 sm:w-28"/>
          <button type="button" onClick={()=>go("settings")} title="เปิดการตั้งค่าโลโก้สถาบัน" aria-label="เปิดหน้าตั้งค่าโลโก้สถาบัน" className="inst-edit-logo" >✎</button>
        </div>
        <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-[.04em] text-[#ffdb77]">GO TOURNAMENT · {workspaceType==="independent_coach"?"ครูอิสระ":"สถาบัน"}</p>
        <h1 className="mt-2 break-words text-2xl font-bold sm:text-4xl">{ov?.academy.name??selected.name}</h1>
        <p className="mt-2 text-base font-medium text-white sm:text-lg">{workspaceType==="independent_coach"?"พื้นที่ส่วนตัวสำหรับติดตามนักเรียนที่สอน แม้จะลงแข่งขันในนามโรงเรียนอื่น":"ระบบติดตามนักกีฬาและการแข่งขันของสถาบัน"}</p>
        <p className="inst-access-pill mt-3" data-active={selected.status==="active"}>{selected.status==="active"?"✓ บัญชีสถาบันเปิดใช้งาน":"รออนุมัติสิทธิ์"}</p>
      </div>
      <div className="relative z-10 hidden w-[470px] shrink-0 grid-cols-4 gap-2 xl:grid">
        {([
          {id:"students" as Exclude<View, "home">,label:"นักกีฬา"},
          {id:"live" as Exclude<View, "home">,label:"ติดตามสด"},
          {id:"apply" as Exclude<View, "home">,label:"สมัครแข่งขัน"},
          {id:"settings" as Exclude<View, "home">,label:"โลโก้ / ตั้งค่า"},
        ]).map(action=><button key={action.id} type="button" onClick={()=>go(action.id)} className="inst-hero-action">
          <span className="h-8 w-8 text-[#0969d9]">{ICONS[action.id]}</span><span>{action.label}</span>
        </button>)}
      </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-3 h-48 w-48 rounded-full border-[20px] border-[#f0bd58]/20 sm:h-72 sm:w-72"/>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#bdd2eb] bg-white p-3"><span className="text-sm font-semibold text-[#164476]">{workspaceType==="independent_coach"?"พื้นที่ติดตามนักเรียนของครูอิสระ":"สถาบันและครูสามารถใช้คนละบัญชีได้"}</span><button type="button" onClick={onJoin} className="min-h-11 rounded-xl border-2 border-[#e4b64f] bg-[#fff7df] px-4 text-sm font-black text-[#76510b]">+ เพิ่มสถาบัน / เปิดพื้นที่ครูอิสระ</button></div>
    {mine.length>1&&<div className="rounded-xl border border-[#bdcfe8] bg-white p-3">
      <label className="mr-3 text-sm font-semibold" htmlFor="academy-select">สถาบันของฉัน</label>
      <select id="academy-select" className={selectCls} value={academyId} onChange={e=>location.assign(`/institution?academy=${encodeURIComponent(e.target.value)}`)}>{mine.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
    </div>}
    <div className="inst-workspace">
    <aside aria-label="เครื่องมือสถาบัน">
    <nav aria-label="เมนูสถาบัน" className={`inst-nav inst-shortcut-grid ${view==="home"?"grid":"hidden sm:grid"}`}>
      <button type="button" onClick={()=>go("home")} aria-current={view==="home"?"page":undefined} className={navClass(view==="home")}>
        <span className="text-2xl" aria-hidden="true">⌂</span><span>ภาพรวม</span>
      </button>
      {MENU.map(m=><button key={m.id} type="button" onClick={()=>go(m.id)} aria-current={view===m.id?"page":undefined} className={navClass(view===m.id)}>
        <span className="h-7 w-7 text-[#bd8c27]">{ICONS[m.id]}</span><span>{m.title}</span>
      </button>)}
    </nav>
    </aside>
    <div className="inst-workspace-main space-y-5">
    {view!=="home"&&<div className="flex items-center gap-2 text-sm"><button type="button" onClick={()=>go("home")} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-[#bcd1eb] bg-white px-3 font-bold text-[#0b4f9e]">← ภาพรวมสถาบัน</button><span className="text-[#5b6f88]">› {MENU.find(m=>m.id===view)?.title??""}</span></div>}
    {ov?.access==="pending"&&<p role="status" className="rounded-xl border-2 border-[#d6a331] bg-[#fff7df] p-4 text-base font-medium text-[#704d10]">รับคำขอเข้าร่วมสถาบันแล้ว · รอผู้จัดการ GO MASTER อนุมัติสิทธิ์ก่อนจึงจะเพิ่มนักกีฬา สมัครแข่งขัน หรือแก้ไขโลโก้ได้ กรุณาให้ผู้จัดการที่มีสิทธิ์เปิดเมนู “เจ้าของและครู” เพื่อตรวจคำขอ</p>}
    {!ov?<div className="rounded-xl border border-[#bfd1eb] bg-white p-8 text-center" role={error?"alert":"status"}>{error||"กำลังโหลดข้อมูลสถาบัน…"}</div>:<div className="space-y-5">
      {view==="home"&&<Home ov={ov} records={filtered} track={tracking} apps={apps} filters={filters} go={go}/>}
      {view==="tracking"&&<Tracking ov={ov} track={tracking} filters={filters}/>}
      {view==="live"&&<LiveBoard ov={ov}/>}
      {view==="teachers"&&<AcademyTeam academyId={academyId}/>}
      {view==="teachers"&&<AcademyStaff academyId={academyId} students={ov.students.filter(a=>!a.history_only).map(a=>({id:a.id,name:a.name}))}/>}
      {view==="students"&&<Students ov={ov} canEdit={access} reload={load} workspaceType={workspaceType}/>}
      {view==="awards"&&<Awards ov={ov} records={filtered} filters={filters}/>}
      {view==="stats"&&<Stats ov={ov} records={filtered} filters={filters}/>}
      {view==="reports"&&<Reports ov={ov} records={filtered} filters={filters}/>}
      {view==="apply"&&<Apply ov={ov} apps={apps} canEdit={access} reload={load}/>}
      {view==="settings"&&<section className="space-y-4 rounded-[22px] border-[3px] border-[#b7d0ee] bg-white p-4 sm:p-6">
        <h2 className="border-b-[3px] border-[#d5a42c] pb-3 text-xl font-semibold text-[#103e83] sm:text-2xl">ตั้งค่าสถาบันและบัญชี</h2>
        {!access?<div role="status" className="space-y-3 rounded-xl border-2 border-[#d9aa3e] bg-[#fff8e6] p-4 text-base text-[#624710]">
          <p className="text-lg font-semibold">บัญชีนี้ยังรออนุมัติสิทธิ์สถาบัน</p>
          <p>ขณะนี้สามารถดูข้อมูลและติดตามการแข่งขันได้ แต่ยังเปลี่ยนโลโก้หรือแก้ไขข้อมูลสถาบันไม่ได้</p>
          <p>ให้ผู้จัดการสถาบันที่มีสิทธิ์แล้วเข้าบัญชีของตนเอง ไปที่เมนู “เจ้าของและครู” แล้วอนุมัติคำขอของบัญชีนี้</p>
          <button type="button" onClick={()=>go("teachers")} className="inst-settings-link">ดูหน้าเจ้าของและครู</button>
        </div>:<>
          {selected.role==="manager"?<LogoEditor academyId={academyId} branding={branding} onSaved={setBranding}/>:
           <div className="rounded-xl border-2 border-[#c4d5ec] bg-[#f4f8ff] p-4">
             <p className="font-semibold">โลโก้และข้อมูลสถาบัน</p>
             <p className="mt-2 text-base">เฉพาะเจ้าของหรือผู้จัดการสถาบันเท่านั้นที่แก้ไขโลโก้ได้ หากต้องการเปลี่ยน ให้ติดต่อผู้จัดการที่มีสิทธิ์</p>
           </div>}
          <StaffUsername role={selected.role} academyName={selected.name}/>
          <ChangeInstitutionPassword/>
          {selected.role==="manager"&&<p className="rounded-xl border-2 border-[#d9aa3e] bg-[#fff7e5] p-3 text-base">เพิ่มและอนุมัติครูได้ในเมนู “เจ้าของและครู”</p>}
        </>}
      </section>}
    </div>}
    </div>
    </div>
    <footer className="border-t border-[#c8d7ec] py-6 text-center text-xs text-[#49617d]">GO TOURNAMENT · ข้อมูลการแข่งขันมาจากระบบจริง</footer>
  </div>;
}
function navClass(_active:boolean){ return "inst-shortcut"; }
