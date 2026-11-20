"use client";

import { useState } from "react";
import { divisionLabel, divisionSortValue } from "@/lib/division-display";
import { parseHHMM } from "@/lib/event-day.mjs";
import { staffDb } from "../_lib/staff";
import type { DivisionDay, DivisionStatus } from "../_lib/EventDay";

/**
 * ตั้งเวลาแข่งขันทุกรุ่น: planned start of every round and the medal / photo time, one row per division.
 * "เติมต่อ" fills the rest of a row from round 1 every N minutes, so a whole schedule takes a minute to enter.
 */
const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function ScheduleEditor({ rows, days, dayReady, onSaved, onClose }: {
  rows: DivisionStatus[]; days: Map<string, DivisionDay>; dayReady: boolean; onSaved: () => Promise<void>; onClose: () => void;
}) {
  const sorted = [...rows].sort((a, b) => divisionSortValue(a.name) - divisionSortValue(b.name));
  const [draft, setDraft] = useState<Record<string, { times: string[]; ceremony: string }>>(() =>
    Object.fromEntries(sorted.map((d) => {
      const x = days.get(d.id);
      return [d.id, { times: Array.from({ length: d.rounds }, (_, i) => x?.round_times?.[i] ?? ""), ceremony: x?.ceremony_at ?? "" }];
    })));
  const [gap, setGap] = useState("60");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (id: string, i: number | "c", v: string) => setDraft((all) => {
    const row = { ...all[id], times: [...all[id].times] };
    if (i === "c") row.ceremony = v; else row.times[i] = v;
    return { ...all, [id]: row };
  });
  const fill = (id: string) => setDraft((all) => {
    const start = parseHHMM(all[id].times[0]), step = Number(gap);
    if (start === null || !(step > 0)) return all;
    return { ...all, [id]: { ...all[id], times: all[id].times.map((_, i) => fmt(start + i * step)) } };
  });
  const changed = sorted.filter((d) => {
    const x = days.get(d.id), r = draft[d.id];
    return JSON.stringify(r.times.map((t) => t || "")) !== JSON.stringify(Array.from({ length: d.rounds }, (_, i) => x?.round_times?.[i] ?? "")) || (r.ceremony || "") !== (x?.ceremony_at ?? "");
  });
  const save = async () => {
    setBusy(true); setMsg("");
    try {
      for (const d of changed) {
        const { error } = await staffDb()!.rpc("gt_staff_set_division_day_v1", { p_division: d.id, p_round_times: draft[d.id].times, p_ceremony: draft[d.id].ceremony });
        if (error) throw error;
      }
      await onSaved();
      setMsg(`บันทึกแล้ว ${changed.length} รุ่น`);
    } catch { setMsg("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"); } finally { setBusy(false); }
  };

  return (
    <section className="gt-card gt-schedule space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-lg font-bold">⏱ ตั้งเวลาแข่งขันทุกรุ่น</h3>
        <label className="text-sm">เติมต่อทุก <input type="number" min={5} step={5} value={gap} onChange={(e) => setGap(e.target.value)} className="w-16 rounded-lg border border-[var(--gt-line)] px-2 py-1" /> นาที</label>
        <button type="button" onClick={onClose} className="gt-outline-btn min-h-10 px-3 text-sm">ปิด</button>
      </div>
      {!dayReady && <p role="alert" className="rounded-xl bg-[var(--gt-warn-soft)] px-3 py-2 text-sm text-[var(--gt-warn)]">ยังบันทึกเวลาไม่ได้ — ต้องเปิดใช้ส่วนตารางเวลาในฐานข้อมูลก่อน (แจ้งผู้ดูแลระบบ)</p>}
      <p className="text-xs text-[var(--gt-muted)]">ใส่เวลาเริ่มรอบ 1 แล้วกด “เติมต่อ” ระบบจะเติมรอบที่เหลือห่างกันตามจำนวนนาทีด้านบน แก้ทีละช่องได้ · เวลาไทย</p>
      <div className="space-y-2">
        {sorted.map((d) => (
          <div key={d.id} className="gt-schedule-row">
            <b className="gt-schedule-name">{divisionLabel(d.name)}</b>
            <div className="gt-schedule-times">
              {draft[d.id].times.map((t, i) => (
                <label key={i}><span>รอบ {i + 1}</span><input type="time" value={t} onChange={(e) => set(d.id, i, e.target.value)} /></label>
              ))}
              <label className="gt-schedule-cer"><span>🏅 เหรียญ/ถ่ายรูป</span><input type="time" value={draft[d.id].ceremony} onChange={(e) => set(d.id, "c", e.target.value)} /></label>
              <button type="button" onClick={() => fill(d.id)} disabled={!draft[d.id].times[0]} className="gt-outline-btn min-h-10 self-end px-3 text-sm">เติมต่อ</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={busy || !dayReady || !changed.length} className="gt-gold-btn min-h-12 px-6 disabled:opacity-50">{busy ? "กำลังบันทึก…" : changed.length ? `บันทึกเวลา (${changed.length} รุ่น)` : "ยังไม่มีการแก้ไข"}</button>
        {msg && <span role="status" className="text-sm">{msg}</span>}
      </div>
    </section>
  );
}
