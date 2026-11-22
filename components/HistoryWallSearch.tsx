"use client";

import { useState } from "react";
import HistoryWallTable from "./HistoryWallTable";
import type { HistoryWall } from "@/lib/history-walllist";

export default function HistoryWallSearch({ wall }: { wall: HistoryWall }) {
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
      {rows.length ? <HistoryWallTable wall={wall} rows={rows} /> : <p role="status">ไม่พบชื่อนักกีฬาในข้อมูลรุ่นนี้ สามารถส่งหลักฐานเพิ่มได้ค่ะ</p>}
    </div>
  );
}
