"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Athlete } from "@/lib/athletes";

const levels = ["ทั้งหมด", "Dan", "Kyu", "Beginner"];

export function AthleteSearch({ athletes }: { athletes: Athlete[] }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("ทั้งหมด");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("th");
    return athletes.filter((athlete) => {
      const matchesText =
        !normalizedQuery ||
        [athlete.id, athlete.displayName, athlete.institute, athlete.level]
          .join(" ")
          .toLocaleLowerCase("th")
          .includes(normalizedQuery);
      const matchesLevel =
        level === "ทั้งหมด" ||
        (level === "Dan" && athlete.rankType === "DAN") ||
        (level === "Kyu" && athlete.rankType === "KYU") ||
        (level === "Beginner" && athlete.rankType === "BEGINNER");
      return matchesText && matchesLevel;
    });
  }, [athletes, level, query]);

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-6">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="relative">
            <span className="sr-only">ค้นหานักกีฬา</span>
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400">⌕</span>
            <input
              className="min-h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              type="search"
              placeholder="ชื่อ รหัสนักกีฬา หรือสถาบัน"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {levels.map((item) => (
              <button
                className={`min-h-14 whitespace-nowrap rounded-xl px-4 font-semibold ${
                  level === item
                    ? "bg-blue-700 text-white"
                    : "border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                }`}
                type="button"
                key={item}
                onClick={() => setLevel(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">ผลการค้นหา</h2>
        <span className="text-sm text-slate-500">{results.length} คน</span>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {results.map((athlete) => (
          <Link
            className="grid grid-cols-[72px_1fr] gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            href={`/athletes/${encodeURIComponent(athlete.id)}`}
            key={athlete.id}
          >
            <div className="grid h-[90px] w-[72px] place-items-center rounded-xl bg-gradient-to-br from-blue-100 to-slate-200 text-2xl font-black text-blue-700 dark:from-blue-950 dark:to-slate-800">
              {athlete.displayName.slice(-1)}
            </div>
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">{athlete.displayName}</h3>
                  <p className="text-xs text-slate-500">{athlete.id}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                  {athlete.level}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{athlete.institute}</p>
              <div className="mt-3 flex flex-wrap gap-5 text-sm">
                <span><b>{athlete.events.length}</b> รายการ</span>
                <span>ผลงานดีที่สุด <b>{athlete.bestResult}</b></span>
              </div>
              <span className="mt-3 inline-block text-sm font-bold text-blue-700 dark:text-blue-300">
                ดูข้อมูลนักกีฬา →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          ไม่พบนักกีฬาที่ตรงกับการค้นหา ลองตรวจชื่อ รหัส หรือเปลี่ยนระดับฝีมือ
        </div>
      ) : null}
    </>
  );
}
