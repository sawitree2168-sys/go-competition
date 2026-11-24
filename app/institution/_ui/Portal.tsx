"use client";

import { shownName } from "@/lib/easy-auth.mjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { ROLE_LABEL, eventsOf, filterRecords, yearsOf } from "@/lib/institution-portal.mjs";
import { BoardLogo, ICONS, selectCls, type Application, type Overview as OverviewData, type View } from "./bits";
import { Awards, Stats, Reports } from "./views";
import Students from "./StudentsPage";
import Overview from "./Overview";
import Results from "./Results";
import { Banner, Shell, viewTitle } from "./Shell";
import Apply from "./Apply";
import Join from "./Join";
import StaffUsername from "./StaffUsername";
import ChangeInstitutionPassword from "./ChangeInstitutionPassword";
import InstituteLogin from "./InstituteLogin";
import { AcademyStaff } from "./AcademyPeople";
import AcademyTeam from "./AcademyTeam";
import LiveBoard from "./LiveBoard";
import LogoEditor,{type Branding} from "./LogoEditor";
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
  const signOut=async()=>{try{localStorage.removeItem(INSTITUTION_RETURN_KEY);}catch{}await staffDb()?.auth.signOut();location.assign("/");};
  if(state.mode==="ready"&&!joining&&selected)return <InstituteWorkspace academyId={academyId} mine={state.mine} selected={selected} userName={state.email} onJoin={()=>setJoining(true)} onSignOut={()=>void signOut()} />;
  return <div className="min-h-screen bg-[#f0f6ff] text-[#102b5b]">
    <header className="sticky top-0 z-30 border-b-[3px] border-[#e9bd55] bg-[#082957] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-bold sm:gap-3 sm:text-xl"><BoardLogo className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" /><span className="hidden sm:inline">GO TOURNAMENT</span></Link>
        <nav className="flex items-center gap-1.5 text-sm sm:gap-2">
          <Link href="/tournaments" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:inline">รายการแข่งขัน</Link>
          {state.mode!=="out"&&state.mode!=="loading"&&<button type="button" onClick={()=>void signOut()} className="min-h-11 rounded-lg border border-white/40 px-3">ออกจากระบบ</button>}
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-9">
      {state.mode==="loading"&&<p role="status" className="rounded-2xl border border-[#bfd1eb] bg-white p-10 text-center">กำลังเปิดหน้าสถาบัน…</p>}
      {state.mode==="out"&&<InstituteLogin onSuccess={loadMine}/>}
      {(state.mode==="none"||joining)&&<div>
        <Join admin={state.admin} onCancel={joining?()=>setJoining(false):undefined} onJoined={async id=>{setJoining(false);setAcademyId(id);await loadMine();}}/>
      </div>}
    </main>
  </div>;
}

const SUBTITLE:Partial<Record<View,string>>={students:"รายชื่อนักกีฬา / นักเรียน",tracking:"ผลการแข่งขันนักเรียนในสถาบัน",live:"กระดานสด · ทุกคนในงานบนจอเดียว"};

function InstituteWorkspace({academyId,mine,selected,userName,onJoin,onSignOut}:{academyId:string;mine:Mine[];selected:Mine;userName:string;onJoin:()=>void;onSignOut:()=>void}){
  const [ov,setOv]=useState<OverviewData|null>(null);
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
    setError("");setOv(o.data as OverviewData);setApps((a.data?.items??[]) as Application[]);
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
  /** Every tracked row (all years), with confirmed entries that are not paired yet. */
  const allTracking=useMemo(()=>{
    if(!ov)return [];
    // A confirmed registration must be visible before pairing, without inventing a board or result.
    const paired=new Set(ov.tracking.map(t=>`${t.athlete_id}:${t.division_id}`));
    const awaiting=ov.records.filter(r=>r.source!=="history"&&!paired.has(`${r.athlete_id}:${r.division_id}`))
      .map(r=>({athlete_id:r.athlete_id,tournament_id:r.tournament_id,title:r.title,date:r.date,
        division_id:r.division_id,division:r.division,round:0,board:null,outcome:"pending" as const}));
    return [...ov.tracking,...awaiting];
  },[ov]);
  const access=ov?.access==="active"||ov?.access==="admin";
  const filters=<div className="flex flex-wrap gap-2">
    <select aria-label="เลือกปี" className={selectCls} value={year??""} onChange={e=>{setYear(e.target.value?Number(e.target.value):null);setEvent("");}}>
      {years.map(y=><option value={y} key={y}>ปี {y}</option>)}<option value="">ทุกปี</option>
    </select>
    <select aria-label="เลือกรายการแข่งขัน" className={selectCls} value={event} onChange={e=>setEvent(e.target.value)}>
      <option value="">ทุกรายการ</option>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
    </select>
  </div>;
  const name=ov?.academy.name??selected.name;
  const typeLabel=workspaceType==="independent_coach"?"ครูอิสระ":"สถาบันหมากล้อม";
  const role=ROLE_LABEL[(ov?.access==="admin"?"admin":selected.role) as keyof typeof ROLE_LABEL];
  const home=view==="home";
  return <Shell view={view} go={go} mine={mine} academyId={academyId} academyName={name} userName={userName} roleLabel={role} onJoin={onJoin} onSignOut={onSignOut}>
    <div className="space-y-4 sm:space-y-5">
      <Banner branding={branding} name={name} compact={!home}
        subtitle={home?(workspaceType==="independent_coach"?"พื้นที่ติดตามนักเรียนของครูอิสระ":"ระบบติดตามนักกีฬาและการแข่งขันของสถาบัน"):(SUBTITLE[view]??viewTitle(view))}
        pills={home?[<span key="t" className="flex items-center gap-1.5"><span className="h-4 w-4 text-[#0b5fc6]">{ICONS.teachers}</span>{typeLabel}</span>,<span key="r">{role}</span>,<span key="s" className={selected.status==="active"?"text-[#176738]":"text-[#8a5a00]"}>{selected.status==="active"?"● เปิดใช้งาน":"● รออนุมัติสิทธิ์"}</span>]:undefined}
        actions={home?<>
          {selected.role==="manager"&&access&&<button type="button" onClick={()=>go("settings")} className="min-h-10 rounded-full bg-white px-4 text-sm font-semibold text-[#0b4aa6] shadow">✎ แก้ไขข้อมูลสถาบัน</button>}
          <a href={`/institutions/${academyId}`} className="inline-flex min-h-10 items-center rounded-full border border-white/60 px-4 text-sm font-semibold text-white hover:bg-white/10">หน้าสาธารณะ ↗</a>
        </>:undefined}/>
      {ov?.access==="pending"&&<p role="status" className="rounded-xl border-2 border-[#e6c16c] bg-[#fff8e8] p-4 text-sm">รับคำขอเข้าร่วมสถาบันแล้ว · รอผู้ดูแลอนุมัติสิทธิ์ก่อนจึงจะเพิ่มนักกีฬาและสมัครแข่งขันได้</p>}
      {!ov?<div className="rounded-xl border border-[#bfd1eb] bg-white p-8 text-center" role={error?"alert":"status"}>{error||"กำลังโหลดข้อมูลสถาบัน…"}</div>:<div className="space-y-5">
        {view==="home"&&<Overview ov={ov} apps={apps} track={allTracking} go={go}/>}
        {view==="tracking"&&<Results ov={ov} track={allTracking} go={go}/>}
        {view==="live"&&<LiveBoard ov={ov}/>}
        {view==="teachers"&&<AcademyTeam academyId={academyId}/>}
        {view==="teachers"&&<AcademyStaff academyId={academyId} students={ov.students.filter(a=>!a.history_only).map(a=>({id:a.id,name:a.name}))}/>}
        {view==="students"&&<Students ov={ov} canEdit={access} reload={load} workspaceType={workspaceType}/>}
        {view==="awards"&&<Awards ov={ov} records={filtered} filters={filters}/>}
        {view==="stats"&&<Stats ov={ov} records={filtered} filters={filters}/>}
        {view==="reports"&&<Reports ov={ov} records={filtered} filters={filters}/>}
        {view==="apply"&&<Apply ov={ov} apps={apps} canEdit={access} reload={load}/>}
        {view==="settings"&&!access&&<p className="rounded-xl border border-[#bfd1eb] bg-white p-6 text-center">ตั้งค่าได้เมื่อได้รับอนุมัติสิทธิ์แล้ว</p>}
        {view==="settings"&&access&&<section className="space-y-4 rounded-[24px] border-[3px] border-[#bcd1eb] bg-white p-4 sm:p-6">
          <h2 className="border-b-[3px] border-[#e5b753] pb-3 text-2xl font-black text-[#0e3974]">ตั้งค่าสถาบันและบัญชี</h2>
          {selected.role==="manager"&&<LogoEditor academyId={academyId} branding={branding} onSaved={setBranding}/>}
          <StaffUsername role={selected.role} academyName={selected.name}/>
          <ChangeInstitutionPassword/>
          {selected.role==="manager"&&<p className="rounded-xl border border-[#efcf79] bg-[#fff7e5] p-3 text-sm">เพิ่มและอนุมัติครูได้ในเมนู “เจ้าของและครู”</p>}
        </section>}
      </div>}
      <footer className="py-4 text-center text-xs text-[#49617d]">GO TOURNAMENT · ข้อมูลการแข่งขันมาจากระบบจริง</footer>
    </div>
  </Shell>;
}
