"use client";

import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { portalError } from "@/lib/institution-portal.mjs";
import { inputCls } from "./bits";

type Inst = { name: string; academy_id: string | null; entrants: number };
export default function Join({ onJoined, onCancel }: { admin: boolean; onJoined:(id:string)=>void; onCancel?:()=>void }) {
  const [q,setQ]=useState("");
  const [list,setList]=useState<Inst[]|null>(null);
  const [selected,setSelected]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const createCoach=async()=>{
    if(busy)return;
    setBusy(true);setError("");setMessage("");
    const db=staffDb();
    if(!db){setBusy(false);setError("ระบบยังไม่พร้อมใช้งาน");return;}
    const {data,error:err}=await db.rpc("gt_my_coach_workspace_v1");
    setBusy(false);
    if(err||!data?.ok){setError(data?.error==="EMAIL_UNVERIFIED"?"กรุณายืนยันบัญชีอีเมลก่อนเปิดพื้นที่ครูอิสระ":"เปิดพื้นที่ครูอิสระไม่สำเร็จ กรุณาลองใหม่");return;}
    onJoined(data.academy_id);
  };
  useEffect(()=>{
    let active=true;
    const t=setTimeout(async()=>{
      const db=staffDb();if(!db)return;
      const {data,error:err}=await db.rpc("gt_institutions_v1",{p_query:q.trim()||null});
      if(active)setList(err?[]:(data??[]) as Inst[]);
    },q?300:0);
    return()=>{active=false;clearTimeout(t);};
  },[q]);
  const typed=q.trim().replace(/\s+/g," ");
  const existing=list?.find(a=>a.name.toLocaleLowerCase()===typed.toLocaleLowerCase());
  const knownName=Boolean(list?.some(a=>a.name===selected));
  const isExisting=Boolean(list?.find(a=>a.name===selected)?.academy_id);
  const join=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!selected||busy||message)return;
    setBusy(true);setError("");
    try{
      const db=staffDb();if(!db)throw Error("ระบบยังไม่พร้อม กรุณาลองใหม่");
      const {data,error:err}=await db.rpc("gt_academy_join_v1",{p_name:selected,p_role:knownName?"teacher":"manager"});
      if(err||!data?.ok) {
        const reason=data?.error==="EMAIL_UNVERIFIED"?"กรุณายืนยันอีเมลของบัญชีก่อน":data?.error==="REVOKED"?"บัญชีนี้ถูกยกเลิกสิทธิ์สถาบันแล้ว":portalError(data?.error);
        setError(reason);return;
      }
      if(data.status==="pending"){
        setMessage(`ส่งคำขอเข้าร่วม “${selected}” สำเร็จแล้ว · ไม่ต้องกดสมัครซ้ำ หากสถาบันมีเจ้าของที่ยืนยันแล้ว เจ้าของสามารถอนุมัติครูได้เอง ส่วนชื่อสถาบันเดิมที่ยังไม่มีเจ้าของยืนยันจะต้องตรวจสอบสิทธิ์ก่อน`);
        return;
      }
      setMessage("เปิดหน้าสถาบันเรียบร้อยแล้ว");
      onJoined(data.academy_id);
    }catch(x){setError(x instanceof Error?x.message:"เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");}
    finally{setBusy(false);}
  };
  return <div className="mx-auto max-w-2xl py-5">
    <form onSubmit={join} className="space-y-5 rounded-2xl border-2 border-[#b7cdeb] bg-white p-5 shadow-md sm:p-7">
      <div className="rounded-xl border-b-4 border-[#e6ba5e] bg-[#0864c5] p-5 text-white">
        <p className="text-xs font-semibold text-[#ffdf8a]">GO TOURNAMENT</p>
        <h1 className="mt-1 text-2xl font-bold">เลือกสถาบันของคุณ</h1>
        <p className="mt-2 text-sm">เลือกชื่อเดิมหรือเพิ่มสถาบันใหม่ เพียงครั้งเดียว</p>
      </div>
      <div className="rounded-xl border-[3px] border-[#e3b454] bg-[#fff9ea] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-[#82590d]">เป็นครูอิสระ ไม่ได้มีสถาบัน?</h2><p className="mt-1 text-sm text-[#715a2d]">เปิดพื้นที่ส่วนตัวเพื่อติดตามนักเรียนได้เอง นักเรียนหนึ่งคนมีได้หลายครู โดยไม่เปลี่ยนชื่อสังกัดในการแข่งขัน</p></div>
          <button type="button" disabled={busy} onClick={()=>void createCoach()} className="min-h-12 rounded-xl border-2 border-[#e2b454] bg-[#0c5bb8] px-5 font-bold text-white disabled:opacity-60">เปิดพื้นที่ครูอิสระ</button>
        </div>
      </div>
      <section aria-label="คำแนะนำสำหรับผู้สมัครใหม่" className="space-y-3 rounded-xl border-2 border-[#bed5ef] bg-[#f3f8ff] p-4">
        <h2 className="text-lg font-bold text-[#0e478f]">เริ่มใช้งานอย่างไร?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#c5d8f2] bg-white p-3">
            <p className="font-bold text-[#125ab0]">👩‍🏫 ฉันเป็นครูในสถาบัน</p>
            <p className="mt-1 text-sm text-[#355473]">เลือกชื่อสถาบันที่สอนอยู่ แล้วกดส่งคำขอ เจ้าของสถาบันจะอนุมัติให้ครั้งเดียว ไม่ต้องใช้รหัสผ่านของเจ้าของ</p>
          </div>
          <div className="rounded-xl border border-[#e6ce90] bg-white p-3">
            <p className="font-bold text-[#82570a]">🏫 ฉันเป็นเจ้าของสถาบัน</p>
            <p className="mt-1 text-sm text-[#355473]">หากเป็นสถาบันใหม่ที่ยังไม่มีชื่อในระบบ สามารถสร้างสถาบันได้เอง ส่วนสถาบันที่มีชื่ออยู่แล้วต้องตรวจสอบสิทธิ์เจ้าของก่อน</p>
          </div>
        </div>
        <p className="text-xs text-[#4b6079]">หลังได้รับสิทธิ์แล้ว ใช้บัญชีของตนเองเข้าสู่ระบบเพื่อดูนักกีฬา ติดตามผล และสมัครแข่งขันได้ ไม่ต้องสมัครใหม่ทุกครั้ง</p>
      </section>
      <label htmlFor="institute-search" className="block font-bold">ชื่อสถาบัน
       <input id="institute-search" type="search" value={q} onChange={e=>{setQ(e.target.value);setSelected("");setMessage("");}} className={`${inputCls} mt-2 border-2 border-[#b7cdeb]`} placeholder="พิมพ์ชื่อสถาบัน เช่น GO MASTER" autoComplete="off"/>
      </label>
      <div role="radiogroup" aria-label="เลือกสถาบัน" className="max-h-72 space-y-2 overflow-y-auto">
        {list===null?<p role="status" className="text-sm">กำลังค้นหารายชื่อ…</p>:<>
          {list.map(i=><label key={i.name} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${selected===i.name?"border-[#0e67cb] bg-[#e9f3ff]":"border-[#d4e1f3]"}`}>
            <input type="radio" name="academy" checked={selected===i.name} onChange={()=>setSelected(i.name)} className="h-5 w-5 accent-[#0e67cb]"/>
            <span className="min-w-0 flex-1 font-semibold">{i.name}</span>
            {i.entrants>0&&<span className="text-xs text-[#526a89]">{i.entrants} นักกีฬา</span>}
          </label>)}
          {typed.length>=2&&!existing&&<label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 ${selected===typed?"border-[#0e67cb] bg-[#e9f3ff]":"border-[#dfc67a]"}`}>
            <input type="radio" name="academy" checked={selected===typed} onChange={()=>setSelected(typed)} className="h-5 w-5 accent-[#0e67cb]"/>
            <span>+ สร้างสถาบันใหม่: <b>{typed}</b></span>
          </label>}
        </>}
      </div>
      <p className="rounded-xl bg-[#edf5ff] p-3 text-sm text-[#345778]">{isExisting?
        "สถาบันนี้มีบัญชีแล้ว หากคุณเป็นครู ระบบจะส่งคำขอให้เจ้าของสถาบันอนุมัติ ไม่ต้องใช้รหัสผ่านของเจ้าของ":
        knownName ? "ชื่อนี้มีในผลการแข่งขันเดิมแล้ว หากยังไม่มีเจ้าของที่ยืนยันสิทธิ์ ระบบจะบันทึกคำขอไว้ก่อนเพื่อป้องกันการแอบอ้าง" :
        "สถาบันใหม่: ระบบสร้างบัญชีเจ้าของให้ผู้สมัครที่ยืนยันบัญชีแล้วโดยอัตโนมัติ ไม่ต้องให้แอดมินออกบัญชี"}</p>
      {message&&<div role="status" aria-live="polite" className="rounded-xl border-2 border-[#81c5a5] bg-[#effaf4] p-4 text-[#1a6039]"><b>✓ บันทึกสำเร็จ</b><p className="mt-1 text-sm">{message}</p></div>}
      {error&&<p role="alert" className="rounded-xl border border-[#eeb0b0] bg-[#fff2f2] p-3 text-sm text-[#aa2222]">{error}</p>}
      <button type="submit" disabled={!selected||busy||Boolean(message)} className="min-h-14 w-full rounded-xl bg-[#0c61c3] px-5 text-lg font-bold text-white disabled:opacity-60">{busy?"กำลังบันทึก…":message?"ส่งคำขอแล้ว":"ยืนยันและไปต่อ"}</button>
      {onCancel&&<button type="button" onClick={onCancel} className="min-h-11 w-full text-sm font-semibold text-[#0a58b2] underline">กลับหน้าสถาบัน</button>}
    </form>
  </div>;
}
