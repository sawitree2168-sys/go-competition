"use client";

import { useEffect, useState, type FormEvent } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";

type AcademyOption = { name: string; academy_id: string | null; entrants?: number };

export default function ChooseAcademy({ athleteId }: { athleteId?: string }) {
  const [allowed, setAllowed] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AcademyOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    let active = true;
    const db = staffDb();
    if (!db) return;
    void db.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const result = await db.rpc("gt_my_access_v1");
      if (!active) return;
      setAllowed(Boolean(result.data?.athlete) && (!athleteId || result.data.athlete.id === athleteId));
    });
    return () => { active = false; };
  }, [athleteId]);

  if (!allowed) return null;

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const db = staffDb();
    if (!db || query.trim().length < 2) return;
    setBusy(true);
    setMessage("");
    const { data, error } = await db.rpc("gt_institutions_v1", { p_query: query.trim() });
    setBusy(false);
    setSearched(true);
    setRows(!error && Array.isArray(data) ? data : []);
    if (error) setMessage("ค้นหาสถาบันไม่สำเร็จ กรุณาลองใหม่");
  }

  async function add(option: AcademyOption) {
    if (!option.academy_id || busy || selected.includes(option.academy_id)) return;
    const db = staffDb();
    if (!db) return;
    setBusy(true);
    setMessage("");
    const { data, error } = await db.rpc("gt_athlete_choose_institution_v2", { p_name: option.name });
    setBusy(false);
    if (error || !data?.ok) {
      setMessage("เพิ่มสถาบันไม่สำเร็จ กรุณาตรวจสอบบัญชีและลองใหม่");
      return;
    }
    setSelected(previous => [...previous, option.academy_id!]);
    setMessage(`เพิ่ม ${option.name} ให้โปรไฟล์แล้ว สามารถเลือกสถาบันอื่นต่อได้`);
  }

  return <section className="gt-card space-y-3 border-2 border-[#b5cff0] p-3 sm:p-5">
    <div>
      <h2 className="text-lg font-bold text-[#0a4289]">สถาบันที่เรียน / คุณครูที่สอน</h2>
      <p className="mt-1 text-sm text-[var(--gt-muted)]">
        นักเรียนหนึ่งคนเลือกได้หลายสถาบันโดยใช้ GO ID เดิม ไม่ต้องย้ายสังกัดหรือสร้างโปรไฟล์ใหม่
        คุณครูแต่ละสถาบันสามารถเชื่อมนักเรียนกับผู้สอนหลายคนได้ในหน้าสถาบัน
      </p>
    </div>
    <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
      <input aria-label="ค้นหาสถาบันที่เรียน" value={query} onChange={event => { setQuery(event.target.value); setSearched(false); }}
        placeholder="ค้นหาชื่อสถาบัน เช่น GO MASTER" minLength={2} required
        className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-[#adc9ea] bg-[var(--gt-surface)] px-3 text-base" />
      <button type="submit" disabled={busy || query.trim().length < 2} className="gt-cta-btn min-h-12 px-5 disabled:opacity-50">ค้นหาสถาบัน</button>
    </form>
    {selected.length > 0 && <p className="rounded-lg border border-[#98d3a5] bg-[#eaf8ee] p-3 text-sm text-[#175a2d]" role="status">
      เพิ่มสำเร็จในการใช้งานครั้งนี้ {selected.length} สถาบัน · สามารถค้นหาและเพิ่มแห่งอื่นต่อได้
    </p>}
    <ul className="space-y-2">
      {rows.slice(0, 30).map(option => {
        const chosen = Boolean(option.academy_id && selected.includes(option.academy_id));
        return <li key={option.academy_id ?? option.name} className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-[#cfdef0] bg-[var(--gt-surface)] p-3">
          <span className="mr-auto min-w-0 break-words font-semibold">{option.name}</span>
          {!option.academy_id ? <span className="text-xs text-[var(--gt-muted)]">ยังไม่มีหน้าสถาบันในระบบ · ติดต่อผู้ดูแล</span> :
            <button type="button" disabled={busy || chosen} onClick={() => void add(option)}
              className="gt-outline-btn min-h-11 px-4 text-sm font-semibold disabled:opacity-60">
              {chosen ? "เพิ่มแล้ว ✓" : "เพิ่มสถาบันนี้"}
            </button>}
        </li>;
      })}
    </ul>
    {searched && rows.length === 0 && !busy && <p className="rounded-lg bg-[var(--gt-surface-2)] p-3 text-sm text-[var(--gt-muted)]">ไม่พบสถาบันที่ค้นหา</p>}
    {message && <p role="status" className="rounded-xl border border-[#e5c875] bg-[#fffaec] p-3 text-sm">{message}</p>}
    <p className="text-xs text-[var(--gt-muted)]">การเพิ่มสถาบันไม่เปลี่ยนสังกัดในรายการแข่งขันย้อนหลัง · รายการที่แสดงว่า “เพิ่มแล้ว” ในหน้านี้หมายถึงการเพิ่มสำเร็จระหว่างการใช้งานครั้งนี้</p>
  </section>;
}
