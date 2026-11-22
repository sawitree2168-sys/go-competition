"use client";

import { useState } from "react";
import CompetitionPanel from "./CompetitionPanel";
import styles from "./HistoryWallTable.module.css";
import HistoryWallTable, { type WallView } from "./HistoryWallTable";
import type { HistoryWall } from "@/lib/history-walllist";

const views = [
  { value: "overview", label: "ตารางรวม" },
  { value: "cards", label: "การ์ดรายคน" },
] as const;

export default function HistoryWallSearch({ wall, date }: { wall: HistoryWall; date: string }) {
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
      <SearchableResults wall={wall} view={view} date={date} />
    </div>
  );
}

function SearchableResults({ wall, view, date }: { wall: HistoryWall; view: WallView; date: string }) {
  const [search, setSearch] = useState({ division: wall.division, text: "" });
  const query = search.division === wall.division ? search.text : "";
  const needle = query.trim().toLocaleLowerCase("th-TH");
  const rows = needle ? wall.rows.filter(row => row.full_name.toLocaleLowerCase("th-TH").includes(needle)
    || row.go_id?.toLowerCase().includes(needle)) : wall.rows;
  return (
    <div className="space-y-3">
      <label className="block max-w-md">
        <span className="sr-only">ค้นหาชื่อนักกีฬาหรือ GO ID ในรุ่นนี้</span>
        <input type="search" value={query} onChange={event => setSearch({ division: wall.division, text: event.target.value })} placeholder="ค้นหาชื่อนักกีฬาหรือ GO ID ในรุ่นนี้"
          className="min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3" />
      </label>
      <CompetitionPanel className={styles.wallPanel} title="วอลล์ลิสต์" context={`GO TOURNAMENT · วอลล์ลิสต์ · ${wall.event.title} · ${wall.division ?? "ผลการแข่งขัน"} · ${view === "overview" ? "ตารางรวม" : "การ์ดรายคน"}`}
        exportHeader={
          <header className={styles.exportHeading}>
            <p>GO TOURNAMENT · วอลล์ลิสต์</p>
            <h3>{wall.event.title}</h3>
            <p><strong>{wall.division}</strong> · {date} · {rows.length} คน</p>
          </header>
        }
        actionsAtTop exportWidth={view === "overview" ? Math.max(1000, 580 + wall.rounds * 48) : 620} disableDownload={!rows.length}>
        {rows.length ? <HistoryWallTable wall={wall} rows={rows} view={view} />
          : <p role="status">ไม่พบชื่อนักกีฬาในข้อมูลรุ่นนี้ สามารถส่งหลักฐานเพิ่มได้ค่ะ</p>}
      </CompetitionPanel>
    </div>
  );
}
