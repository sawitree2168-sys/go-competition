"use client";

import { useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";

export type RefEvent = { access_id: string; id: string; title: string; event_date: string | null };

/** Events where the organiser chose this account as referee: one tap opens the referee console (no link or 6-digit code to type). */
export function RefereeEvents({ events }: { events: RefEvent[] }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const open = async (e: RefEvent) => {
    setBusy(e.access_id); setError("");
    const { data, error: err } = await staffDb()!.rpc("gt_referee_open_mine_v1", { p_access: e.access_id });
    if (err || !data?.token) { setBusy(""); setError("เปิดหน้ากรรมการไม่สำเร็จ กรุณาลองใหม่ หรือแจ้งผู้จัด"); return; }
    // The referee page re-opens itself with the code saved on this phone (same key it uses).
    try { localStorage.setItem(`gt-referee-${String(data.token).slice(0, 10)}`, data.code); } catch { /* private mode */ }
    window.location.assign(`/referee/${encodeURIComponent(data.token)}`);
  };
  return (
    <section className="gt-card border-2 border-[var(--gt-cta)] p-5">
      <h2 className="font-bold">งานที่เป็นกรรมการ</h2>
      <p className="mt-1 text-sm text-[var(--gt-muted)]">กดเปิดหน้ากรรมการเพื่อเช็คอินและลงผล ไม่ต้องใช้ลิงก์หรือรหัส 6 หลัก</p>
      <ul className="mt-3 space-y-2">
        {events.map((e) => (
          <li key={e.access_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--gt-line)] p-3">
            <span><b>{e.title}</b>{e.event_date && <span className="block text-sm text-[var(--gt-muted)]">{new Date(e.event_date).toLocaleDateString("th-TH", { dateStyle: "long" })}</span>}</span>
            <button type="button" onClick={() => open(e)} disabled={!!busy} className="gt-cta-btn min-h-11 px-5 disabled:opacity-60">{busy === e.access_id ? "กำลังเปิด…" : "เปิดหน้ากรรมการ →"}</button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-[var(--gt-bad)]">{error}</p>}
    </section>
  );
}
