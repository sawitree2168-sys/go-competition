"use client";

import { useMemo, useState } from "react";
import { isDan, isKyu, moveUpHint, rankGroup, rankGroups, rankStrength, shortRank, studentStats } from "@/lib/institution-portal.mjs";
import { LinkStudents } from "./AcademyPeople";
import { DisplayModeToggle, useInstitutionDisplayMode } from "./DisplayMode";
import StudentPanel, { useOpenStudent } from "./StudentPanel";
import { StatTile } from "./Overview";
import { Avatar, ICONS, type Overview, type Student } from "./bits";

type Row = { student: Student; events: number; games: number; wins: number; losses: number; draws: number; rate: number | null; latest: string };
type Sort = "rank" | "rate" | "games" | "recent" | "name";
type Status = "all" | "played" | "new" | "history" | "moveup";
const field = "min-h-11 rounded-xl border border-[#c4d7f0] bg-white px-3 text-[15px] text-[#0d2a5c]";

/** Rank badge in the approved style: light blue pill, dan in deeper blue. */
export function RankBadge({ rank, className = "" }: { rank: string | null; className?: string }) {
  const r = shortRank(rank);
  if (!r) return <span className={`rounded-lg bg-[#eef2f7] px-2.5 py-0.5 text-sm font-semibold text-[#64748b] ${className}`}>—</span>;
  return <span className={`gt-num rounded-lg px-2.5 py-0.5 text-[15px] font-bold ${isDan(rank) ? "bg-[#d8e6ff] text-[#0a3a9e]" : "bg-[#e4efff] text-[#1660d0]"} ${className}`}>{r}</span>;
}

export function Crown({ place }: { place: number }) {
  const c = ["#e8a900", "#8ea0b8", "#c8742c"][place - 1];
  if (!c) return null;
  return (
    <span aria-label={`อันดับ ${place} อัตราชนะในสถาบัน`} title={`อันดับ ${place} อัตราชนะในสถาบัน`} className="relative inline-grid h-7 w-7 place-items-center">
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-7 w-7" aria-hidden="true"><path fill={c} d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 11H5Z" /></svg>
      <span className="relative mt-1.5 text-[11px] font-bold text-white">{place}</span>
    </span>
  );
}

export default function Students({ ov, canEdit, reload, workspaceType = "academy" }: { ov: Overview; canEdit: boolean; reload: () => Promise<void>; workspaceType?: "academy" | "independent_coach" }) {
  const [mode, setMode] = useInstitutionDisplayMode("students", "cards");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"all" | "dan" | "kyu" | "none">("all");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("rank");
  const [group, setGroup] = useState("");
  const [per, setPer] = useState(12);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useOpenStudent();
  const [more, setMore] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const last = new Map<string, string>();
    for (const r of ov.records) if (r.date && (last.get(r.athlete_id) ?? "") < r.date) last.set(r.athlete_id, r.date);
    return (studentStats(ov.records, ov.students) as Omit<Row, "latest">[]).map((r) => ({ ...r, latest: last.get(r.student.id) ?? "" }));
  }, [ov.records, ov.students]);
  const place = useMemo(() => new Map(rows.filter((r) => r.games >= 3).slice(0, 3).map((r, i) => [r.student.id, i + 1])), [rows]);
  const rated = rows.filter((r) => r.rate != null);
  const avgRate = rated.length ? Math.round(rated.reduce((n, r) => n + (r.rate ?? 0), 0) / rated.length) : null;
  const groups = useMemo(() => rankGroups(ov.students), [ov.students]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    const found = rows.filter(({ student: s, games }) =>
      (!k || `${s.name} ${s.nickname ?? ""} ${s.go_id ?? ""} ${s.rank ?? ""} ${shortRank(s.rank)}`.toLowerCase().includes(k))
      && (level === "all" || (level === "dan" ? isDan(s.rank) : level === "kyu" ? isKyu(s.rank) : !isDan(s.rank) && !isKyu(s.rank)))
      && (!group || rankGroup(s.rank) === group)
      && (status === "all" || (status === "played" ? games > 0 : status === "new" ? games === 0 : status === "history" ? s.history_only : !!moveUpHint(ov.records, s.id))));
    const by: Record<Sort, (a: Row, b: Row) => number> = {
      rank: (a, b) => rankStrength(b.student.rank) - rankStrength(a.student.rank),
      rate: (a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.games - a.games,
      games: (a, b) => b.games - a.games,
      recent: (a, b) => b.latest.localeCompare(a.latest),
      name: () => 0,
    };
    return found.slice().sort((a, b) => by[sort](a, b) || a.student.name.localeCompare(b.student.name, "th"));
  }, [rows, q, level, group, status, sort, ov.records]);

  const pages = Math.max(1, Math.ceil(list.length / per));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * per, cur * per);
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const chosen = ov.students.find((s) => s.id === open);
  if (chosen) return <StudentPanel academyId={ov.academy.id} academyName={ov.academy.name} student={chosen} records={ov.records} rank={null} onClose={() => setOpen(null)} backLabel="← กลับไปรายชื่อนักเรียน" />;

  const addBtn = canEdit && <button type="button" onClick={() => document.getElementById("add-student")?.scrollIntoView({ behavior: "smooth", block: "start" })}
    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b5fc6] px-5 font-semibold text-white shadow hover:bg-[#0a52ab]"><span className="text-xl leading-none">+</span> เพิ่มนักเรียน</button>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <StatTile tone="blue" icon={ICONS.students} label="นักเรียนทั้งหมด" value={ov.students.length} unit="คน" />
        <StatTile tone="gold" icon={<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 11H5Z" /></svg>} label="ระดับดั้ง" value={ov.students.filter((s) => isDan(s.rank)).length} unit="คน" />
        <StatTile tone="purple" icon={<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>} label="ระดับคิว" value={ov.students.filter((s) => isKyu(s.rank)).length} unit="คน" />
        <StatTile tone="green" icon={ICONS.awards} label="อัตราชนะเฉลี่ย" value={avgRate == null ? "—" : `${avgRate}%`} />
      </div>

      <div className="space-y-3 rounded-2xl border border-[#cfe0f5] bg-white p-3 shadow-[0_4px_14px_rgba(10,60,130,.06)] sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="hidden text-sm font-semibold sm:inline">มุมมอง :</span>
          <DisplayModeToggle mode={mode} onChange={setMode} />
          <span className="ml-auto hidden sm:inline-flex">{addBtn}</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <input type="search" value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="🔍 ค้นหาชื่อ, รหัส (GO ID), ระดับฝีมือ…" aria-label="ค้นหานักเรียน" className={`${field} w-full`} />
          <button type="button" onClick={() => setMore(!more)} aria-expanded={more} aria-label="ตัวกรองเพิ่มเติม" className={`grid h-11 w-11 place-items-center rounded-xl border sm:hidden ${more || level !== "all" || status !== "all" ? "border-[#0b5fc6] bg-[#e4efff] text-[#0b5fc6]" : "border-[#c4d7f0] text-[#21406e]"}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 5h18l-7 8.5V19l-4 2v-7.5Z" /></svg>
          </button>
          <div className={`${more ? "grid" : "hidden"} col-span-2 gap-2 sm:col-span-3 sm:grid sm:grid-cols-3`}>
          <select aria-label="ระดับฝีมือ" value={level} onChange={(e) => reset(setLevel)(e.target.value as typeof level)} className={field}>
            <option value="all">ระดับฝีมือ : ทั้งหมด</option><option value="dan">ระดับดั้ง</option><option value="kyu">ระดับคิว</option><option value="none">ยังไม่ระบุระดับ</option>
          </select>
          <select aria-label="สถานะ" value={status} onChange={(e) => reset(setStatus)(e.target.value as Status)} className={field}>
            <option value="all">สถานะ : ทั้งหมด</option><option value="played">มีผลการแข่งขัน</option><option value="new">ยังไม่เคยแข่ง</option><option value="history">ข้อมูลจากประวัติ</option><option value="moveup">ควรพิจารณาขยับรุ่น</option>
          </select>
          <select aria-label="เรียงลำดับ" value={sort} onChange={(e) => reset(setSort)(e.target.value as Sort)} className={field}>
            <option value="rank">เรียง : ระดับฝีมือ</option><option value="rate">เรียง : อัตราชนะ</option><option value="games">เรียง : แข่งมากที่สุด</option><option value="recent">เรียง : แข่งล่าสุด</option><option value="name">เรียง : ชื่อ</option>
          </select>
          </div>
        </div>
        <div role="group" aria-label="กรองตามระดับฝีมือ" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ group: "", count: ov.students.length }, ...groups].map((g) => {
            const on = group === g.group;
            return (
              <button key={g.group || "all"} type="button" aria-pressed={on} onClick={() => reset(setGroup)(g.group)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold ${on ? "border-[#0b5fc6] bg-[#0b5fc6] text-white" : "border-[#cfe0f5] bg-[#f4f8fe] text-[#21406e] hover:border-[#0b5fc6]"}`}>
                {g.group || "ทั้งหมด"} <span className={`gt-num rounded-full px-1.5 text-xs ${on ? "bg-white/25" : "text-[#4b6588]"}`}>{g.count}</span>
              </button>
            );
          })}
        </div>

        {!shown.length ? <p className="rounded-xl bg-[#f3f7fd] px-4 py-8 text-center text-sm text-[#4b6588]">{q || group || level !== "all" || status !== "all" ? "ไม่พบนักเรียนตามเงื่อนไขที่เลือก" : "ยังไม่มีนักเรียน — เพิ่มนักเรียนได้ด้านล่าง หรือรายชื่อจะขึ้นเองเมื่อนักเรียนลงแข่งในนามสถาบันนี้"}</p>
          : mode === "cards" ? (
            <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
              {shown.map((r) => <li key={r.student.id}><StudentCard r={r} place={place.get(r.student.id)} moveUp={!!moveUpHint(ov.records, r.student.id)} onOpen={() => setOpen(r.student.id)} /></li>)}
            </ul>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#cfe0f5]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#eaf3ff] text-[#123a74]"><tr><th className="px-3 py-3">นักเรียน</th><th className="px-2 py-3">GO ID</th><th className="px-2 py-3 text-center">ระดับ</th><th className="px-2 py-3 text-center">รายการ</th><th className="px-2 py-3 text-center">ชนะ</th><th className="px-2 py-3 text-center">แพ้</th><th className="px-2 py-3 text-center">อัตราชนะ</th></tr></thead>
                <tbody className="divide-y divide-[#e3ecf7]">
                  {shown.map((r) => (
                    <tr key={r.student.id} onClick={() => setOpen(r.student.id)} className="cursor-pointer hover:bg-[#f2f7ff]">
                      <td className="px-3 py-2"><button type="button" onClick={(e) => { e.stopPropagation(); setOpen(r.student.id); }} className="flex items-center gap-2.5 text-left"><Avatar src={r.student.photo} className="h-9 w-9" /><span><b className="block">{r.student.name}</b>{r.student.history_only && <span className="text-xs text-[#4b6588]">จากประวัติ</span>}</span>{place.get(r.student.id) && <Crown place={place.get(r.student.id)!} />}</button></td>
                      <td className="gt-num px-2 text-[#4b6588]">{r.student.go_id ?? "—"}</td>
                      <td className="px-2 text-center"><RankBadge rank={r.student.rank} /></td>
                      <td className="gt-num px-2 text-center">{r.events}</td>
                      <td className="gt-num px-2 text-center text-[#176738]">{r.wins}</td>
                      <td className="gt-num px-2 text-center text-[#b4232f]">{r.losses}</td>
                      <td className="gt-num px-2 text-center font-semibold">{r.rate == null ? "—" : `${r.rate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <select aria-label="จำนวนต่อหน้า" value={per} onChange={(e) => reset(setPer)(Number(e.target.value))} className={`${field} text-sm`}>
            {[12, 24, 48].map((n) => <option key={n} value={n}>แสดง {n} รายการ/หน้า</option>)}
          </select>
          <Pager page={cur} pages={pages} onPage={setPage} />
          <span className="text-sm font-semibold">ทั้งหมด {list.length} คน</span>
        </div>
      </div>

      {canEdit && <div className="sm:hidden">{addBtn && <div className="[&>button]:w-full [&>button]:min-h-12">{addBtn}</div>}</div>}
      <p className="text-sm text-[#4b6588]">แตะนักเรียนเพื่อดูกราฟการเติบโตและประวัติการแข่งขัน · มงกุฎ 1–3 คืออัตราชนะสูงสุดในสถาบัน (แข่งอย่างน้อย 3 เกม)</p>
      {canEdit && <div id="add-student" className="scroll-mt-20"><LinkStudents academyId={ov.academy.id} reload={reload} workspaceType={workspaceType} /></div>}
      {workspaceType === "academy" && <div className="rounded-xl border-2 border-[#e8bd58] bg-[#fff9ea] p-3 text-sm text-[#694d15]" role="note"><strong>เพิ่มนักเรียนด้วยโปรไฟล์เดิม</strong><p className="mt-1">ค้นหาชื่อหรือ GO ID ในส่วน “ค้นหาและเพิ่มนักเรียนที่มีประวัติอยู่แล้ว” เพื่อเชื่อมเข้าหลายสถาบันได้โดยไม่สร้าง GO ID ซ้ำ หากไม่พบชื่อ ให้ตรวจสอบก่อนสร้างโปรไฟล์นักกีฬาใหม่</p></div>}
      <p className="text-xs text-[#4b6588]">{workspaceType === "academy" ? "รายชื่อรวมผู้ที่ลงแข่งในนามสถาบันนี้ และนักเรียนที่ครูเชื่อมเอง" : "รายชื่อรวมเฉพาะนักเรียนที่ครูเชื่อมกับพื้นที่ส่วนตัว"} · นักเรียนหนึ่งคนมีได้หลายครูและหลายสถาบัน โดยไม่เปลี่ยนชื่อในรายการแข่งขันเดิม · ไม่แสดงข้อมูลส่วนตัวของผู้ปกครอง</p>
    </div>
  );
}

function StudentCard({ r, place, moveUp, onOpen }: { r: Row; place?: number; moveUp: boolean; onOpen: () => void }) {
  const s: Student = r.student;
  return (
    <button type="button" onClick={onOpen} className="relative flex h-full w-full flex-col gap-2.5 rounded-2xl border border-[#cfe0f5] bg-white p-3 text-left shadow-[0_3px_10px_rgba(10,60,130,.06)] transition hover:border-[#0b5fc6] active:scale-[.99]">
      <span className="flex items-center gap-3">
        <span className="relative shrink-0"><Avatar src={s.photo} className="h-[68px] w-[68px]" />
          {moveUp && <span title="ควรพิจารณาขยับรุ่น" className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-white bg-[#16a34a] px-1.5 text-[10px] font-bold text-white">⬆ รุ่น</span>}</span>
        <span className="min-w-0 flex-1">
          <b className="block break-words text-[17px] leading-snug">{s.nickname?.trim() || s.name}</b>
          {s.nickname?.trim() && <span className="block truncate text-xs text-[#4b6588]">{s.name}</span>}
          <span className="gt-num block truncate text-[13px] text-[#4b6588]">{s.go_id ?? (s.history_only ? "จากประวัติ" : "ยังไม่มี GO ID")}</span>
          <RankBadge rank={s.rank} className="mt-1 inline-block" />
        </span>
        <span className="flex shrink-0 flex-col items-center gap-2 self-start">{place ? <Crown place={place} /> : null}<span aria-hidden="true" className="text-xl text-[#0b5fc6] sm:hidden">›</span></span>
      </span>
      <span className="mt-auto flex flex-wrap gap-1.5 text-[13px]">
        <span className="rounded-md bg-[#e9f8ef] px-2 py-0.5 text-[#176738]">ชนะ <b className="gt-num">{r.wins}</b></span>
        <span className="rounded-md bg-[#fff0f1] px-2 py-0.5 text-[#b4232f]">แพ้ <b className="gt-num">{r.losses}</b></span>
        <span className="rounded-md bg-[#e9f8ef] px-2 py-0.5 text-[#176738]">อัตราชนะ <b className="gt-num">{r.rate == null ? "—" : `${r.rate}%`}</b></span>
      </span>
    </button>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  const btn = "grid h-10 min-w-10 place-items-center rounded-lg border px-2 text-sm font-semibold";
  return (
    <nav aria-label="เปลี่ยนหน้า" className="flex items-center gap-1.5">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="หน้าก่อน" className={`${btn} border-[#cfe0f5] bg-white disabled:opacity-40`}>‹</button>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-0.5 text-[#4b6588]">…</span>}
          <button type="button" onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined} className={`${btn} ${n === page ? "border-[#0b5fc6] bg-[#0b5fc6] text-white" : "border-[#cfe0f5] bg-white"}`}>{n}</button>
        </span>
      ))}
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="หน้าถัดไป" className={`${btn} border-[#cfe0f5] bg-white disabled:opacity-40`}>›</button>
    </nav>
  );
}
