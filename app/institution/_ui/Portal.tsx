"use client";

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
import LogoEditor,{LogoDisplay,type Branding} from "./LogoEditor";

type Mine = { id: string; name: string; role: "manager" | "teacher"; status: "active" | "pending" };
type State = { mode:"loading" | "out" | "none" | "ready"; mine:Mine[]; email:string; admin:boolean };
const VIEWS:View[] = ["home","tracking","students","teachers","awards","stats","reports","apply","settings"];
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
  return <div className="min-h-screen bg-[#f0f6ff] text-[#102b5b]">
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
    <section className="relative overflow-hidden rounded-[24px] border-[3px] border-[#e9bd55] bg-[#093878] bg-[url(/institution-banner.svg)] bg-cover bg-right px-5 py-7 text-white shadow-[0_14px_30px_rgba(8,48,104,.18)] sm:px-9">
      <div className="relative z-10 flex flex-wrap items-center gap-5">
        <LogoDisplay branding={branding} name={selected.name} className="h-24 w-24 sm:h-32 sm:w-32"/>
        <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-[.18em] text-[#f9d67d]">GO TOURNAMENT · {workspaceType==="independent_coach"?"ครูอิสระ":"สถาบัน"}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{ov?.academy.name??selected.name}</h1>
        <p className="mt-2 text-base text-white/90">{workspaceType==="independent_coach"?"พื้นที่ส่วนตัวสำหรับติดตามนักเรียนที่สอน แม้จะลงแข่งขันในนามโรงเรียนอื่น":"ระบบติดตามนักกีฬาและการแข่งขันของสถาบัน"}</p>
        <p className="mt-3 inline-flex rounded-full border border-[#f5d784] bg-[#f5d784] px-3 py-1 text-xs font-bold text-[#12335c]">{selected.status==="active"?"บัญชีสถาบันเปิดใช้งาน":"รออนุมัติสิทธิ์"}</p>
      </div></div>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-3 h-48 w-48 rounded-full border-[20px] border-[#f0bd58]/20 sm:h-72 sm:w-72"/>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#bdd2eb] bg-white p-3"><span className="text-sm font-semibold text-[#164476]">{workspaceType==="independent_coach"?"พื้นที่ติดตามนักเรียนของครูอิสระ":"สถาบันและครูสามารถใช้คนละบัญชีได้"}</span><button type="button" onClick={onJoin} className="min-h-11 rounded-xl border-2 border-[#e4b64f] bg-[#fff7df] px-4 text-sm font-black text-[#76510b]">+ เพิ่มสถาบัน / เปิดพื้นที่ครูอิสระ</button></div>
    {mine.length>1&&<div className="rounded-xl border border-[#bdcfe8] bg-white p-3">
      <label className="mr-3 text-sm font-semibold" htmlFor="academy-select">สถาบันของฉัน</label>
      <select id="academy-select" className={selectCls} value={academyId} onChange={e=>location.assign(`/institution?academy=${encodeURIComponent(e.target.value)}`)}>{mine.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
    </div>}
    <nav aria-label="เมนูสถาบัน" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
      {view==="teachers"&&<AcademyStaff academyId={academyId} students={ov.students.map(a=>({id:a.id,name:a.name}))}/>}
      {view==="students"&&<Students ov={ov} canEdit={access} reload={load} workspaceType={workspaceType}/>}
      {view==="awards"&&<Awards ov={ov} records={filtered} filters={filters}/>}
      {view==="stats"&&<Stats ov={ov} records={filtered} filters={filters}/>}
      {view==="reports"&&<Reports ov={ov} records={filtered} filters={filters}/>}
      {view==="apply"&&<Apply ov={ov} apps={apps} canEdit={access} reload={load}/>}
      {view==="settings"&&access&&<section className="space-y-4 rounded-[24px] border-[3px] border-[#bcd1eb] bg-white p-4 sm:p-6">
        <h2 className="border-b-[3px] border-[#e5b753] pb-3 text-2xl font-black text-[#0e3974]">ตั้งค่าสถาบันและบัญชี</h2>
        {selected.role==="manager"&&<LogoEditor academyId={academyId} branding={branding} onSaved={setBranding}/>}
        <StaffUsername role={selected.role} academyName={selected.name}/>
        <ChangeInstitutionPassword/>
        {selected.role==="manager"&&<p className="rounded-xl border border-[#efcf79] bg-[#fff7e5] p-3 text-sm">เพิ่มและอนุมัติครูได้ในเมนู “ครูในสถาบัน”</p>}
      </section>}
    </div>}
    <footer className="border-t border-[#c8d7ec] py-6 text-center text-xs text-[#49617d]">GO TOURNAMENT · ข้อมูลการแข่งขันมาจากระบบจริง</footer>
  </div>;
}
function navClass(active:boolean){
 return `flex min-h-[95px] flex-col items-center justify-center gap-1.5 rounded-[18px] border-[3px] px-2 py-3 text-center text-[13px] font-black shadow-[0_4px_10px_rgba(9,48,100,.08)] transition active:scale-[.98] sm:text-sm ${active?"border-[#e9bd55] bg-[#0b55b5] text-white shadow-md":"border-[#b8cde8] bg-white text-[#123969] hover:border-[#e0b44e] hover:bg-[#fffaf0]"}`;
}
