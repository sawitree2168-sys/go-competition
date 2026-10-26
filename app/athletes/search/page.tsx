"use client";

import { useState, type FormEvent } from "react";
type Athlete = { athleteId: string; displayName: string; nickname?: string; level?: string; institution?: string };
type Result = { status: "found"|"not_linked"|"verification_required"|"error"; athletes?: Athlete[]; message?: string };

export default function AthleteLookupPage() {
  const [name,setName]=useState("");
  const [state,setState]=useState<"idle"|"loading"|"found"|"not_linked"|"verification_required"|"error">("idle");
  const [athletes,setAthletes]=useState<Athlete[]>([]);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<Athlete|null>(null);
  async function search(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); const term=name.trim().replace(/\s+/g," ");
    if(term.length<2) return;
    setState("loading");setAthletes([]);setError("");setSelected(null);
    try {
      const response=await fetch("/api/athletes/search",{
        method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
        body:JSON.stringify({name:term})
      });
      const json:Result=await response.json();
      if(json.status==="verification_required"){setState("verification_required");return;}
      if(!response.ok || json.status==="error") throw new Error(json.message || "ไม่สามารถตรวจสอบรายชื่อได้");
      if(json.status!=="found" && json.status!=="not_linked") throw new Error("รูปแบบผลค้นหาไม่ถูกต้อง");
      if(json.status==="found" && !Array.isArray(json.athletes)) throw new Error("ข้อมูลที่ส่งกลับไม่ถูกต้อง");
      setAthletes(json.athletes||[]);
      setState(json.status);
    } catch(e) {
      setError(e instanceof Error?e.message:"การค้นหาขัดข้อง");
      setState("error");
    }
  }
  return <main className="min-h-screen bg-[#f2f5fa] text-[#122b52]">
    <header className="bg-[#0b2854] px-5 py-5 text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <strong className="text-xl tracking-widest text-[#f2ce72]">GO TOURNAMENT</strong>
        <span className="text-sm">ระบบรับสมัครแข่งขัน</span>
      </div>
    </header>
    <div className="mx-auto max-w-xl px-4 py-7">
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-3 text-sm font-semibold text-blue-700">ขั้นตอนที่ 1 — ตรวจสอบรายชื่อ</div>
        <h1 className="text-2xl font-extrabold">ค้นหานักกีฬาก่อนสมัคร</h1>
        <p className="mt-3 leading-relaxed text-slate-600">กรุณาพิมพ์ชื่อ-นามสกุลเพื่อตรวจสอบโปรไฟล์ที่ผูกกับบัญชีของคุณ หลังจากยืนยันตัวตนแล้ว</p>
        <form onSubmit={search} className="mt-7 space-y-3">
          <label htmlFor="athlete-name" className="block font-semibold">ชื่อ-นามสกุลนักกีฬา</label>
          <input id="athlete-name" type="text" autoComplete="name" required minLength={2} value={name}
            onChange={e=>{setName(e.target.value);setState("idle");setAthletes([]);setSelected(null)}}
            placeholder="เช่น สมชาย ใจดี"
            className="w-full rounded-xl border border-slate-300 px-4 py-4 text-base text-slate-900 focus:border-blue-700 focus:outline-blue-700"/>
          <button disabled={state==="loading"||name.trim().length<2} className="w-full rounded-xl bg-blue-800 px-4 py-4 font-bold text-white disabled:opacity-50">
            {state==="loading"?"กำลังตรวจสอบรายชื่อ...":"ค้นหานักกีฬา"}
          </button>
        </form>
        <div aria-live="polite" className="mt-6">
          {state==="verification_required" && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900"><strong>ต้องยืนยันตัวตนก่อนค้นหา</strong><p className="mt-1">เพื่อคุ้มครองข้อมูลนักกีฬา ระบบจะแสดงเฉพาะโปรไฟล์ที่เจ้าของบัญชีเข้าถึงได้ ฟังก์ชันเข้าสู่ระบบอยู่ระหว่างการพัฒนา</p></div>}
          {state==="error" && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <strong>ยังตรวจสอบข้อมูลไม่ได้</strong><p className="mt-1">{error}</p>
            <p className="mt-2 text-sm">กรุณาค้นหาใหม่เมื่อระบบพร้อม เพื่อป้องกันการสร้างโปรไฟล์ซ้ำ</p>
          </div>}
          {state==="not_linked" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <strong>ยังไม่พบรายชื่อที่ผูกกับบัญชีนี้</strong>
            <p className="mt-1 text-sm">ผลนี้ตรวจได้เฉพาะนักกีฬาที่ผูกกับบัญชีที่ยืนยันตัวตนแล้ว ไม่ใช่การยืนยันว่าไม่มีชื่อในระบบทั้งหมด</p>
            <p className="mt-3 font-medium">หากเคยแข่งขันแต่ยังไม่ผูกบัญชี กรุณาให้ผู้จัดการแข่งขันตรวจสอบก่อนสร้างโปรไฟล์ใหม่</p>
          </div>}
          {state==="found" && <div className="space-y-3">
            <h2 className="font-bold">พบรายชื่อที่อาจตรงกัน</h2>
            {athletes.map(a=><button key={a.athleteId} type="button" onClick={()=>setSelected(a)}
              className="w-full rounded-xl border border-slate-300 bg-white p-4 text-left focus:ring-2 focus:ring-blue-600">
              <strong>{a.displayName}</strong>
              <div className="text-sm text-slate-600">{[a.nickname,a.level,a.institution].filter(Boolean).join(" • ")}</div>
            </button>)}
            {selected && <div className="rounded-xl bg-blue-50 p-4 text-blue-900">
              <strong>เลือก: {selected.displayName}</strong>
              <p className="mt-1 text-sm">ต้องยืนยันตัวตนกับระบบก่อนเข้าถึงหรือแก้ไขข้อมูลเดิม</p>
            </div>}
          </div>}
        </div>
      </section>
      <p className="mt-5 text-center text-sm text-slate-500">ไม่มีการแสดงผลนักกีฬาสมมติ และไม่แสดงข้อมูลส่วนตัวก่อนยืนยันสิทธิ์</p>
    </div>
  </main>;
}
