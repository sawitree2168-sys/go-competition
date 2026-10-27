"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {SiteSectionBanner} from "../components/SiteSectionBanner";
type Tournament={id:string;title:string;start_at:string|null;status:string};
export default function TournamentSchedulePage(){
 const [rows,setRows]=useState<Tournament[]>([]);
 const [state,setState]=useState<"loading"|"ok"|"error">("loading");
 useEffect(()=>{let active=true;
  async function load(){try{
   const response=await fetch("/api/tournaments",{cache:"no-store"});
   const result=await response.json();
   if(!response.ok||result.status!=="ok"||!Array.isArray(result.tournaments))throw new Error("Unavailable");
   if(active){setRows(result.tournaments);setState("ok");}
  }catch{if(active)setState("error");}}
  void load();return()=>{active=false;};
 },[]);
 return <main className="min-h-screen bg-[#f2f5fa] text-[#132b50]">
  <header className="bg-[#0b2854] px-5 py-5 font-extrabold tracking-wider text-[#f0c774]"><Link href="/">GO TOURNAMENT</Link></header>
  <section className="mx-auto max-w-5xl px-4 py-7 sm:py-9">
   <SiteSectionBanner slot="calendar" eyebrow="GO TOURNAMENT · CALENDAR" title="ปฏิทินการแข่งขัน" description="ค้นหารายการแข่งขันหมากล้อมและตรวจสอบกำหนดการที่ประกาศอย่างเป็นทางการ"/>
   <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
    <p className="text-sm font-semibold text-blue-700">รายการแข่งขันจากฐานข้อมูลจริง</p>
    <h2 className="mt-2 text-2xl font-extrabold">รายการแข่งขันที่เผยแพร่</h2>
    {state==="loading"&&<p role="status" className="mt-5 text-slate-600">กำลังอ่านรายการแข่งขัน...</p>}
    {state==="error"&&<p role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">ไม่สามารถตรวจสอบรายการแข่งขันได้ กรุณาลองใหม่อีกครั้ง</p>}
    {state==="ok"&&rows.length===0&&<p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">ยังไม่มีรายการแข่งขันที่ประกาศเผยแพร่ใน GO TOURNAMENT</p>}
    {state==="ok"&&rows.length>0&&<ul className="mt-5 space-y-3">{rows.map(t=><li key={t.id} className="rounded-xl border p-4"><h2 className="font-bold">{t.title}</h2><p className="mt-1 text-sm text-slate-600">{t.start_at?new Date(t.start_at).toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Bangkok"}):"ยังไม่กำหนดวันแข่งขัน"}</p><p className="mt-1 text-sm text-slate-600">สถานะ: {t.status}</p></li>)}</ul>}
    <Link href="/athletes/search" className="mt-6 inline-flex rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white">ค้นหานักกีฬาก่อนสมัคร</Link>
   </div>
  </section>
 </main>;
}