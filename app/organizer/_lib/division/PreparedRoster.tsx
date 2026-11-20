"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { divisionKey } from "@/lib/division-display";
import { staffDb } from "../staff";

type SourceEntrant = { source_row: number; full_name: string; institution: string | null; division_name: string };
/** Read-only source registration preview. Never treats a Google Form row as a confirmed player. */
export default function PreparedRoster({ eventId, divisionId, divisionName }: { eventId: string; divisionId: string; divisionName: string }) {
  const [rows,setRows] = useState<SourceEntrant[] | null>(null);
  const [error,setError] = useState(false);
  const [query,setQuery] = useState("");
  useEffect(()=>{
    let mounted=true;
    const db=staffDb();
    if(!db){queueMicrotask(()=>{if(mounted)setError(true)});return ()=>{mounted=false}};
    db.from("gt_public_entrants").select("source_row,full_name,institution,division_name").eq("tournament_id",eventId).order("source_row").limit(2000)
      .then(({data,error})=>{if(!mounted)return;if(error)setError(true);else setRows(((data??[]) as SourceEntrant[]).filter(r=>divisionKey(r.division_name)===divisionKey(divisionName)));});
    return ()=>{mounted=false};
  },[eventId,divisionName]);
  const filtered=useMemo(()=>rows?.filter(r=>[r.full_name,r.institution].some(s=>(s??"").toLocaleLowerCase("th").includes(query.trim().toLocaleLowerCase("th"))))??[],[rows,query]);
  return <section className="overflow-hidden rounded-2xl border-[3px] border-[#d4a33a] bg-[var(--gt-surface)] shadow-sm" aria-label="ข้อมูลเตรียมแข่งขัน">
    <header className="bg-[linear-gradient(110deg,#0d6ad2,#074896)] p-4 text-white">
      <h2 className="text-xl font-bold">เตรียมรายชื่อก่อนจับคู่</h2>
      <p className="mt-1 text-sm text-[#e5f0ff]">ข้อมูลใบสมัครที่มีอยู่จริง ยังไม่ได้ผูกเข้าทะเบียนนักกีฬาเพื่อออกคู่</p>
    </header>
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border-2 border-[#83b3eb] p-3"><p className="text-sm text-[var(--gt-muted)]">ใบสมัครรุ่นนี้</p><strong className="gt-num text-3xl text-[var(--gt-cta)]">{rows===null?"—":rows.length}</strong><p className="text-xs text-[var(--gt-muted)]">รายการที่รอตรวจ</p></div>
        <div className="rounded-xl border-2 border-[#83b3eb] p-3"><p className="text-sm text-[var(--gt-muted)]">พร้อมจัดคู่</p><strong className="gt-num text-3xl text-[var(--gt-cta)]">0</strong><p className="text-xs text-[var(--gt-muted)]">ยังไม่มีผู้เล่นที่ลงทะเบียนในรุ่น</p></div>
      </div>
      <div className="rounded-xl border-2 border-[#dfb44a] bg-[#fff7db] p-3 text-sm text-[#604711]">
        ขั้นตอนถัดไป: ตรวจรายชื่อและรุ่นที่สมัคร จากนั้นกดนำเข้าในหน้าผู้จัด แล้วกลับมารุ่นนี้เพื่อจัดสายและออกคู่จริง
      </div>
      <Link href={`/organizer/${eventId}#event-readiness`} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-[#d4a33a] bg-[var(--gt-cta)] px-4 text-center font-bold text-white">กลับหน้าผู้จัด · ตรวจและนำเข้ารายชื่อ</Link>
      <Link href={`/organizer/${eventId}/${divisionId}/simulation`} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-[#d4a33a] bg-[#ffefb0] px-4 text-center font-bold text-[#134583]">▶ ทดลองหน้าวันแข่งขัน · การ์ด / ตาราง / รูป / ผลสด (ไม่บันทึกจริง)</Link>
      {rows===null && !error && <p role="status" className="text-sm text-[var(--gt-muted)]">กำลังอ่านรายชื่อใบสมัคร…</p>}
      {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">โหลดรายชื่อใบสมัครไม่ได้ กรุณาลองรีเฟรช</p>}
      {rows!==null && rows.length>0 && <>
        <label className="block text-sm font-semibold">ค้นหาใบสมัคร
          <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ชื่อ / สถาบัน" className="mt-1 min-h-12 w-full rounded-xl border-2 border-[#87b5e8] bg-[var(--gt-surface)] px-3"/>
        </label>
        <div className="max-h-[22rem] overflow-auto rounded-xl border-2 border-[#8eb6e9]">
          <table className="w-full min-w-[400px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-[#095fbf] text-white"><tr><th className="p-3">แถว</th><th className="p-3">ชื่อผู้สมัคร</th><th className="p-3">สถาบัน</th></tr></thead>
            <tbody>{filtered.map((r,i)=><tr key={r.source_row} className={i%2?"bg-[var(--gt-surface-2)]":""}><td className="border-b border-[var(--gt-line)] p-3">{r.source_row}</td><td className="border-b border-[var(--gt-line)] p-3 font-semibold">{r.full_name}</td><td className="border-b border-[var(--gt-line)] p-3">{r.institution||"—"}</td></tr>)}</tbody>
          </table>
        </div>
        {!filtered.length&&<p className="text-sm text-[var(--gt-muted)]">ไม่พบชื่อที่ค้นหา</p>}
      </>}
      {rows!==null && !rows.length && <p className="text-sm text-[var(--gt-muted)]">ยังไม่พบรายชื่อในใบสมัครของรุ่นนี้</p>}
    </div>
  </section>;
}
