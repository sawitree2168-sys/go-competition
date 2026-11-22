"use client";

import { useState } from "react";
import HistoryWallTable, { type WallView } from "./HistoryWallTable";
import type { HistoryWall } from "@/lib/history-walllist";

const views = [
  { value: "overview", label: "ตารางรวม" },
  { value: "cards", label: "การ์ดรายคน" },
] as const;

export default function HistoryWallSearch({ wall }: { wall: HistoryWall }) {
  const [view, setView] = useState<WallView>("overview");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="มุมมองวอลล์ลิสต์">
        {views.map(item => (
          <button key={item.value} type="button" aria-pressed={view === item.value} onClick={() => setView(item.value)}
            className={`${view === item.value ? "gt-cta-btn" : "gt-outline-btn"} min-h-11 px-4 text-sm font-semibold`}>
            {item.label}
          </button>
        ))}
      </div>
      <SearchableResults key={wall.division} wall={wall} view={view} />
    </div>
  );
}

function SearchableResults({ wall, view }: { wall: HistoryWall; view: WallView }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("th-TH");
  const rows = needle ? wall.rows.filter(row => row.full_name.toLocaleLowerCase("th-TH").includes(needle)
    || row.go_id?.toLowerCase().includes(needle)) : wall.rows;
  return (
    <div className="space-y-3">
      <label className="block max-w-md">
        <span className="sr-only">ค้นหาชื่อนักกีฬาหรือ GO ID ในรุ่นนี้</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหาชื่อนักกีฬาหรือ GO ID ในรุ่นนี้"
          className="min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3" />
      </label>
      {rows.length ? <HistoryWallTable wall={wall} rows={rows} view={view} /> : <p role="status">ไม่พบชื่อนักกีฬาในข้อมูลรุ่นนี้ สามารถส่งหลักฐานเพิ่มได้ค่ะ</p>}
    </div>
  );
}
