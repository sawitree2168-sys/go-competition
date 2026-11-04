"use client";

import { useDeferredValue, useState } from "react";

export type RosterRow = { key: number; name: string; institution: string; payment: string };

/** Short, fixed-width payment labels so long statuses never push the row off-screen. */
function payBadge(s: string) {
  if (s === "ชำระเงินแล้ว") return { text: "ชำระแล้ว", tone: "ok" as const };
  if (s.includes("รอตรวจ")) return { text: "รอตรวจสอบ", tone: "warn" as const };
  if (s.includes("ยังไม่")) return { text: "ยังไม่ชำระ", tone: "muted" as const };
  return { text: s ? s.slice(0, 12) : "รอตรวจสอบ", tone: "muted" as const };
}
const toneCls = { ok: "text-[var(--gt-ok)]", warn: "text-[var(--gt-warn)]", muted: "text-[var(--gt-muted)]" };

export default function RosterList({ rows }: { rows: RosterRow[] }) {
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const shown = query ? rows.filter((r) => `${r.name} ${r.institution}`.toLowerCase().includes(query)) : rows;

  return (
    <>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5 shrink-0 text-[var(--gt-muted)]" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
        <span className="sr-only">ค้นหาชื่อหรือสถาบัน</span>
        <input id="roster-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อหรือสถาบัน" autoComplete="off"
          className="w-full min-w-0 bg-transparent py-3 text-[15px] outline-none placeholder:text-[var(--gt-muted)]" />
      </label>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">รายชื่อผู้สมัคร</h2>
        <span className="gt-num shrink-0 font-semibold">{query ? `${shown.length} จาก ${rows.length}` : rows.length} คน</span>
      </div>
      {shown.length ? (
        <ol className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1.5">
          {shown.map((r, i) => {
            const b = payBadge(r.payment);
            return (
              <li key={r.key} className="gt-card flex min-w-0 items-center gap-2.5 px-2.5 py-2">
                <span className="gt-num grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--gt-surface-2)] text-sm font-semibold">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block truncate text-xs text-[var(--gt-muted)]">{r.institution || "ไม่ระบุสถาบัน"}</span>
                </span>
                <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${toneCls[b.tone]}`}>
                  {b.tone === "ok" && <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M7.5 12.5l3 3 6-6" fill="none" stroke="var(--gt-surface)" strokeWidth="2.4" strokeLinecap="round" /></svg>}
                  {b.text}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="gt-card mt-2 p-5 text-center text-sm text-[var(--gt-muted)]">{query ? "ไม่พบชื่อที่ค้นหาในรุ่นนี้" : "ยังไม่มีรายชื่อที่เผยแพร่ในรุ่นนี้"}</p>
      )}
    </>
  );
}
