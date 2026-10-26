"use client";

import { useState, type FormEvent } from "react";
type Summary = {games:number; athleteA:{wins:number;losses:number;winPercent:number|null};athleteB:{wins:number;losses:number;winPercent:number|null}};
type H2HResponse = {status:"ok";data:Summary}|{status:"error";message:string};
export default function HeadToHeadPage(){
  const [a,setA]=useState("");const[b,setB]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const[result,setResult]=useState<Summary|null>(null);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setResult(null);setError("");
    const first=a.trim(),second=b.trim();
    if(!first||!second||first===second){setError("กรุณาระบุนักกีฬาสองคนที่แตกต่างกัน");return;}
    setLoading(true);
    try{
      const res=await fetch("/api/athletes/head-to-head",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({athleteA:first,athleteB:second}),cache:"no-store"});
      const body:H2HResponse=await res.json();
      if(!res.ok||body.status!=="ok") throw new Error(body.status==="error"?body.message:"ข้อมูลไม่ถูกต้อง");
      setResult(body.data);
    }catch(err){setError(err instanceof Error?err.message:"ไม่สามารถตรวจสอบสถิติได้");}
    finally{setLoading(false);}
  }
  return <main className="min-h-screen bg-[#f2f5fa] text-[#10294f]">
    <header className="bg-[#0b2854] px-5 py-5 text-center font-extrabold tracking-wider text-[#f1c96f]">GO TOURNAMENT</header>
    <section className="mx-auto max-w-xl px-4 py-8">
      <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">HEAD TO HEAD</p>
        <h1 className="mt-2 text-2xl font-extrabold">ตรวจสอบประวัติการพบกัน</h1>
        <p className="mt-3 text-slate-600">เปรียบเทียบจำนวนกระดาน ชนะ แพ้ และเปอร์เซ็นต์จากผลการแข่งขันที่ยืนยันแล้ว</p>
        <p className="mt-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">หน้านี้อยู่ระหว่างเชื่อมระบบฐานข้อมูลจริง ยังไม่แสดงผลการแข่งขันสมมติ</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label htmlFor="player-a" className="block font-semibold">GO ID นักกีฬา A</label>
          <input id="player-a" className="w-full rounded-xl border border-slate-300 px-4 py-4 text-base" value={a} onChange={e=>setA(e.target.value)} placeholder="GO ID คนที่ 1" maxLength={80}/>
          <label htmlFor="player-b" className="block font-semibold">GO ID นักกีฬา B</label>
          <input id="player-b" className="w-full rounded-xl border border-slate-300 px-4 py-4 text-base" value={b} onChange={e=>setB(e.target.value)} placeholder="GO ID คนที่ 2" maxLength={80}/>
          <button disabled={loading||!a.trim()||!b.trim()} className="w-full rounded-xl bg-blue-800 px-4 py-4 font-bold text-white disabled:opacity-50">{loading?"กำลังตรวจสอบ...":"ตรวจสอบผลการพบกัน"}</button>
        </form>
        {error&&<div role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">{error}</div>}
        {result&&<section aria-live="polite" className="mt-6 rounded-xl border p-5">
          <div className="text-center text-sm text-slate-600">จำนวนกระดานที่ยืนยันผลแล้ว</div>
          <div className="text-center text-4xl font-bold">{result.games}</div>
          {result.games===0?<p className="mt-3 text-center">ไม่พบประวัติการพบกันในผลการแข่งขันที่บันทึกไว้</p>:
          <div className="mt-5 grid grid-cols-2 gap-4 text-center">
            <div><div className="font-bold">นักกีฬา A</div><div className="text-3xl font-extrabold">{result.athleteA.winPercent}%</div><div>ชนะ {result.athleteA.wins} / แพ้ {result.athleteA.losses}</div></div>
            <div><div className="font-bold">นักกีฬา B</div><div className="text-3xl font-extrabold">{result.athleteB.winPercent}%</div><div>ชนะ {result.athleteB.wins} / แพ้ {result.athleteB.losses}</div></div>
          </div>}
        </section>}
      </div>
    </section>
  </main>;
}