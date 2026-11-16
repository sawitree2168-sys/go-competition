"use client";

import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { portalError } from "@/lib/institution-portal.mjs";
import { BoardLogo, inputCls } from "./bits";

type Inst = { name: string; academy_id: string | null; entrants: number };

/** First visit: pick your institution from those that have entered competitions (or type a new one). */
export default function Join({ admin, onJoined, onCancel }: { admin: boolean; onJoined: (id: string) => void; onCancel?: () => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Inst[] | null>(null);
  const [chosen, setChosen] = useState("");
  const [role, setRole] = useState<"teacher" | "manager">("teacher");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await staffDb()!.rpc("gt_institutions_v1", { p_query: q.trim() || null });
      setList((data ?? []) as Inst[]);
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);

  const typed = q.trim().replace(/\s+/g, " ");
  const exact = list?.some((i) => i.name.trim().toLowerCase() === typed.toLowerCase());

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen) return;
    setBusy(true); setError("");
    const { data, error: err } = await staffDb()!.rpc("gt_academy_join_v1", { p_name: chosen, p_role: role });
    setBusy(false);
    if (err || !data?.ok) { setError(portalError(data?.error)); return; }
    onJoined(data.academy_id);
  };

  return (
    <div className="mx-auto max-w-2xl px-3 pb-12 pt-6 sm:px-6">
      <form onSubmit={join} className="gt-card space-y-5 p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <BoardLogo className="h-14 w-14" />
          <div>
            <h1 className="text-2xl font-bold">เลือกสถาบันของคุณ</h1>
            <p className="text-sm text-[var(--gt-muted)]">สำหรับครูและเจ้าของสถาบันที่ส่งนักเรียนลงแข่ง</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="inst-q" className="block font-medium">ค้นหาชื่อสถาบัน</label>
          <input id="inst-q" type="search" value={q} onChange={(e) => { setQ(e.target.value); setChosen(""); }} placeholder="เช่น สถาบันหมากล้อมต้นกล้า" className={inputCls} autoComplete="off" />
          <div role="radiogroup" aria-label="สถาบัน" className="max-h-80 space-y-1.5 overflow-y-auto">
            {list === null && <p className="py-3 text-sm text-[var(--gt-muted)]" role="status">กำลังโหลดรายชื่อสถาบัน…</p>}
            {list?.map((i) => (
              <label key={i.name} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${chosen === i.name ? "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)]" : "border-[var(--gt-line)] hover:bg-[var(--gt-surface-2)]"}`}>
                <input type="radio" name="inst" checked={chosen === i.name} onChange={() => setChosen(i.name)} className="h-5 w-5 accent-[var(--gt-cta)]" />
                <span className="min-w-0 flex-1 truncate font-medium">{i.name}</span>
                {i.entrants > 0 && <span className="shrink-0 text-xs text-[var(--gt-muted)]">นักกีฬา {i.entrants} คน</span>}
              </label>
            ))}
            {list && typed.length >= 2 && !exact && (
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 ${chosen === typed ? "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)]" : "border-[var(--gt-line)]"}`}>
                <input type="radio" name="inst" checked={chosen === typed} onChange={() => setChosen(typed)} className="h-5 w-5 accent-[var(--gt-cta)]" />
                <span className="min-w-0 flex-1">ไม่พบในรายชื่อ — ใช้ชื่อใหม่ “<b className="font-semibold">{typed}</b>”</span>
              </label>
            )}
            {list?.length === 0 && typed.length < 2 && <p className="py-3 text-sm text-[var(--gt-muted)]">ยังไม่มีสถาบันในระบบ พิมพ์ชื่อสถาบันของคุณเพื่อเพิ่มใหม่</p>}
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 font-medium">ตำแหน่งของคุณ</legend>
          <div className="flex flex-wrap gap-2">
            {([["teacher", "ครู"], ["manager", "เจ้าของสถาบัน"]] as const).map(([v, l]) => (
              <label key={v} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-4 ${role === v ? "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)]" : "border-[var(--gt-line)]"}`}>
                <input type="radio" name="role" checked={role === v} onChange={() => setRole(v)} className="h-5 w-5 accent-[var(--gt-cta)]" />{l}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="rounded-xl bg-[var(--gt-surface-2)] px-4 py-3 text-sm text-[var(--gt-muted)]">
          {admin ? "บัญชีเจ้าของระบบ: ใช้งานได้ทันที" : "ยืนยันแล้วใช้งานได้ทันที · ครูและเจ้าของสถาบันใช้ได้ทุกเมนูเหมือนกัน (ส่งชื่อนักเรียนแข่ง แชร์ผลงาน ติดตามการแข่ง) ต่างกันแค่ตำแหน่งที่แสดง · กรุณาเลือกเฉพาะสถาบันที่คุณสอนหรือเป็นเจ้าของจริง"}
        </p>
        {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={!chosen || busy} className="gt-cta-btn min-h-12 flex-1 px-6 disabled:opacity-50">{busy ? "กำลังบันทึก…" : "ยืนยันสถาบันของฉัน"}</button>
          {onCancel && <button type="button" onClick={onCancel} className="gt-outline-btn min-h-12 px-5">ยกเลิก</button>}
        </div>
      </form>
    </div>
  );
}
