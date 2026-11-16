"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "./chrome";

export type SeatRow = { id: string; label: string; count: number; limit: number | null; tone: string; status: string; left: number | null; waitlist: number };

const FILTERS = [
  { v: "", label: "ทุกสถานะ" },
  { v: "open", label: "ว่าง" },
  { v: "near", label: "ใกล้เต็ม / เหลือน้อย" },
  { v: "full", label: "เต็ม" },
];
const fold = (s: string) => s.toLowerCase().replace(/[\s–—−-]+/g, "").replace(/kyu/g, "คิว").replace(/friendship/g, "เฟรนชิพ");

/** Search + status filter + one row per division (รุ่น · สมัคร/รับสูงสุด · ที่ว่าง · สถานะ). */
export default function DivisionSeats({ eventId, rows }: { eventId: string; rows: SeatRow[] }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState("");
  const shown = useMemo(() => rows.filter((r) => {
    if (q && !fold(r.label).includes(fold(q))) return false;
    if (f === "open") return r.tone === "open" || r.tone === "none";
    if (f === "near") return r.tone === "near" || r.tone === "last";
    if (f === "full") return r.tone === "full";
    return true;
  }), [rows, q, f]);

  return (
    <>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
        <label className="gt-dash-panel flex min-h-12 items-center gap-2 px-3">
          <Icon name="search" className="h-5 w-5 shrink-0 text-[var(--gt-muted)]" />
          <span className="sr-only">ค้นหารุ่น</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหารุ่น…"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--gt-muted)]" />
        </label>
        <label className="gt-dash-panel relative flex min-h-12 items-center gap-2 pl-3 pr-2">
          <Icon name="filter" className="h-5 w-5 shrink-0 text-[var(--gt-muted)]" />
          <span className="sr-only">กรองตามสถานะ</span>
          <select value={f} onChange={(e) => setF(e.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent pr-6 text-base outline-none">
            {FILTERS.map((x) => <option key={x.v} value={x.v} className="text-black">{x.label}</option>)}
          </select>
          <Icon name="chevron" className="pointer-events-none absolute right-2.5 h-4 w-4 rotate-90 text-[var(--gt-muted)]" />
        </label>
        <Link href={`/tournaments/${eventId}/entrants`} className="gt-cta-btn col-span-2 flex min-h-12 items-center justify-center gap-2 px-5 md:col-span-1">
          <Icon name="users" className="h-5 w-5" />ดูรายชื่อผู้สมัคร
        </Link>
      </div>

      <div className="gt-dash-panel mt-3 overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.6fr)_minmax(0,1fr)_1.25rem] items-center gap-1 bg-[image:var(--gt-dash-head)] px-3 py-2.5 text-xs font-semibold text-white sm:px-5 sm:text-sm">
          <span>รุ่น</span><span className="text-center"><span className="sm:hidden">สมัคร/รับ</span><span className="hidden sm:inline">สมัคร · รับสูงสุด</span></span><span className="text-center">ที่ว่าง</span><span className="text-center">สถานะ</span><span />
        </div>
        {shown.length ? (
          <ul>
            {shown.map((r) => (
              <li key={r.id} className="border-t border-[var(--gt-dash-row-line)] first:border-t-0">
                <Link href={`/tournaments/${eventId}/divisions/${r.id}`}
                  className="grid min-h-12 grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.6fr)_minmax(0,1fr)_1.25rem] items-center gap-1 px-3 py-2 hover:bg-[var(--gt-cta-soft)] sm:px-5">
                  <span className="truncate text-sm font-semibold sm:text-lg">{r.label}</span>
                  <span className="gt-num text-center text-sm sm:text-lg">{r.count} / {r.limit ?? "–"}</span>
                  <span className="gt-num text-center text-sm sm:text-lg">{r.left ?? "–"}</span>
                  <span className="text-center"><span className="gt-chip !min-w-0 !px-2 text-[11px] sm:!min-w-[4.6rem] sm:!px-3 sm:text-sm" data-tone={r.tone}>{r.status}</span>
                    {r.waitlist > 0 && <span className="mt-0.5 block text-[11px] text-[var(--gt-muted)]">สำรอง {r.waitlist}</span>}</span>
                  <Icon name="chevron" className="h-5 w-5 text-[var(--gt-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-center text-[var(--gt-muted)]" role="status">{rows.length ? "ไม่พบรุ่นที่ค้นหา" : "ผู้จัดยังไม่ประกาศรุ่นการแข่งขัน"}</p>
        )}
      </div>
    </>
  );
}
