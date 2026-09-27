"use client";

import { useMemo, useState } from "react";

type Athlete = {
  id: string;
  displayName: string;
  institute: string;
  level: string;
  events: number;
  bestResult: string;
};

const athletes: Athlete[] = [
  { id: "GT-0001", displayName: "นักกีฬา A", institute: "สถาบันตัวอย่าง 1", level: "1 Dan", events: 12, bestResult: "อันดับ 1" },
  { id: "GT-0002", displayName: "นักกีฬา B", institute: "สถาบันตัวอย่าง 2", level: "3 Kyu", events: 8, bestResult: "อันดับ 3" },
  { id: "GT-0003", displayName: "นักกีฬา C", institute: "สถาบันตัวอย่าง 1", level: "5 Kyu", events: 5, bestResult: "Top 8" },
  { id: "GT-0004", displayName: "นักกีฬา D", institute: "อิสระ", level: "2 Dan", events: 19, bestResult: "อันดับ 2" },
];

const levels = ["ทั้งหมด", "Dan", "Kyu", "Beginner"];

export default function AthletesPage() {
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
        (level === "Dan" && athlete.level.includes("Dan")) ||
        (level === "Kyu" && athlete.level.includes("Kyu")) ||
        (level === "Beginner" && athlete.level.includes("Beginner"));
      return matchesText && matchesLevel;
    });
  }, [level, query]);

  return (
    <section className="section-shell page-section">
      <div className="page-title">
        <span className="eyebrow">ATHLETE DIRECTORY</span>
        <h1>ค้นหาข้อมูลนักกีฬา</h1>
        <p>ค้นหาจากชื่อ รหัสนักกีฬา สถาบัน หรือระดับฝีมือ เพื่อดูผลงานการแข่งขันที่เผยแพร่สาธารณะ</p>
      </div>

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
                  level === item ? "bg-blue-700 text-white" : "border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
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
          <article className="grid grid-cols-[72px_1fr] gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" key={athlete.id}>
            <div className="grid h-[90px] w-[72px] place-items-center rounded-xl bg-gradient-to-br from-blue-100 to-slate-200 text-2xl font-black text-blue-700 dark:from-blue-950 dark:to-slate-800">
              {athlete.displayName.slice(-1)}
            </div>
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="text-lg font-bold">{athlete.displayName}</h3><p className="text-xs text-slate-500">{athlete.id}</p></div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">{athlete.level}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{athlete.institute}</p>
              <div className="mt-3 flex gap-5 text-sm"><span><b>{athlete.events}</b> รายการ</span><span>ผลงานดีที่สุด <b>{athlete.bestResult}</b></span></div>
            </div>
          </article>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          ไม่พบนักกีฬาที่ตรงกับการค้นหา ลองตรวจชื่อ รหัส หรือเปลี่ยนระดับฝีมือ
        </div>
      ) : null}

      <div className="mt-8 rounded-2xl bg-slate-100 p-5 text-sm leading-6 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <strong className="text-slate-900 dark:text-white">ความเป็นส่วนตัว</strong>
        <p className="mt-1">หน้านี้แสดงเฉพาะข้อมูลการแข่งขันที่ได้รับอนุญาต ไม่แสดงวันเกิด เบอร์โทร อีเมล ข้อมูลผู้ปกครอง หรือเอกสารส่วนตัว</p>
      </div>
    </section>
  );
}
