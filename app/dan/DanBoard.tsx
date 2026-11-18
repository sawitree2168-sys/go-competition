"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AthleteAvatar from "@/components/AthleteAvatar";

export type Person = { dan: number | null; name: string; level: string | null; diamond: boolean; go_id: string | null; photo: string | null; profile_id: string | null };
export type Examiner = Person & { role: string };
export type Announcement = Person & { title: string | null; announced_on: string; examiners: Examiner[] };
export type DirEntry = { dan: number; name: string; level: string | null; diamond: boolean; year: number | null; go_id: string | null; photo: string | null };
export type Board = { synced_at: string | null; source_url: string; announcements: Announcement[]; directory: DirEntry[] };

type Tab = "new" | "diamond" | "all";
const TABS: { id: Tab; label: string }[] = [
  { id: "new", label: "ดั้งใหม่" },
  { id: "diamond", label: "ดั้งเพชร" },
  { id: "all", label: "ทำเนียบดั้งทั้งหมด" },
];
const FIRST_NEW = 10;
const PAGE = 60;

const key = (s: string) => s.replace(/[\s​-‍﻿]+/g, "").toLowerCase();
const num = (n: number) => n.toLocaleString("en-US");
const thaiDate = (iso: string, month: "short" | "long" = "short") =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month, year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
const beYear = (iso: string) => Number(iso.slice(0, 4)) + 543;

function matches(q: string, name: string, dan: number | null) {
  if (!q) return true;
  const k = key(q);
  return key(name).includes(k) || (dan !== null && (String(dan) === k.replace(/,/g, "") || num(dan) === q.trim()));
}

/** Ring of gold leaves around an avatar (decoration only). */
function Laurel() {
  const leaves = Array.from({ length: 6 }, (_, i) => i);
  return (
    <svg viewBox="0 0 120 100" aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-1 mx-auto h-[104px] w-[124px] text-[var(--gt-gold)]">
      {[1, -1].map((side) => (
        <g key={side} transform={side === -1 ? "translate(120 0) scale(-1 1)" : undefined}>
          <path d="M44 92 C20 80 12 52 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {leaves.map((i) => {
            const t = i / 5, x = 44 - 26 * t + 4 * Math.sin(t * 3), y = 90 - 68 * t;
            return <ellipse key={i} cx={x - 5} cy={y} rx="6.5" ry="3" transform={`rotate(${-35 - 25 * t} ${x - 5} ${y})`} fill="currentColor" opacity={0.9} />;
          })}
        </g>
      ))}
    </svg>
  );
}

function Diamond({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6 3h12l4 6-10 12L2 9z" fill="#3fa9f5" />
      <path d="M2 9h20M8 3l4 18M16 3l-4 18M6 3l2 6M18 3l-2 6" stroke="#0d5fb3" strokeWidth="1" fill="none" />
    </svg>
  );
}

function NameLink({ p, className }: { p: Person; className?: string }) {
  return p.profile_id
    ? <Link href={`/athletes/${p.profile_id}`} className={`${className ?? ""} underline-offset-2 hover:underline`}>{p.name}</Link>
    : <span className={className}>{p.name}</span>;
}

function NewDanCard({ a }: { a: Announcement }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="gt-card flex flex-col items-center px-2 pb-3 pt-4 text-center sm:px-4 sm:pb-4 sm:pt-5 shadow-[0_10px_24px_-20px_rgba(11,61,145,.6)]">
      <div className="relative grid h-[104px] w-[124px] place-items-center">
        <Laurel />
        <AthleteAvatar src={a.photo} name={a.name} className="relative h-[76px] w-[76px] ring-4 ring-[var(--gt-gold-soft)]" />
        <span className="absolute -bottom-1 rounded-full bg-[linear-gradient(180deg,var(--gt-gold-2),var(--gt-gold))] px-3 py-0.5 text-sm font-bold text-[#10264f] shadow">
          {a.level ?? 1} DAN
        </span>
      </div>
      <p className="mt-3 text-sm font-bold leading-snug sm:text-base">
        <NameLink p={a} />
        {a.diamond && <span className="ml-1 inline-flex translate-y-0.5" title="ดั้งเพชร"><Diamond /></span>}
      </p>
      <p className="gt-num mt-1 text-base font-bold text-[var(--gt-brand)] sm:text-lg">เลขดั้ง {a.dan ? num(a.dan) : "-"}</p>
      <p className="text-xs text-[var(--gt-muted)] sm:text-sm">ประกาศเมื่อ {thaiDate(a.announced_on)}</p>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="mt-3 min-h-11 rounded-lg px-3 text-sm font-semibold text-[var(--gt-cta)] hover:bg-[var(--gt-cta-soft)]">
        {open ? "ซ่อนผู้สอบ" : "ดูผู้สอบ"}
      </button>
      {open && (
        <ul className="mt-1 w-full space-y-2 border-t border-[var(--gt-line)] pt-3 text-left">
          {a.examiners.map((e) => (
            <li key={e.role} className="flex items-center gap-2">
              <AthleteAvatar src={e.photo} name={e.name} className="h-8 w-8 sm:h-9 sm:w-9" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-[var(--gt-muted)]">{e.role} · {e.dan ? `${e.level ?? "?"} ดั้ง · ${num(e.dan)}` : "โปร"}</span>
                <span className="block text-xs font-semibold leading-snug sm:text-sm"><NameLink p={e} />{e.diamond && <span className="ml-1 inline-flex translate-y-0.5"><Diamond className="h-3.5 w-3.5" /></span>}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`gt-card flex items-center gap-3 px-4 py-3 ${highlight ? "border-[var(--gt-gold)] shadow-[0_0_0_1px_var(--gt-gold)]" : ""}`}>
      <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center">{icon}</span>
      <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
      <span className="gt-num text-2xl font-extrabold">{num(value)} <span className="text-base font-semibold">คน</span></span>
    </div>
  );
}

const Stones = () => (
  <span className="relative inline-block h-9 w-11">
    <span className="absolute left-0 top-1 h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] shadow" />
    <span className="absolute left-4 top-2 h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)] shadow" />
  </span>
);
const People = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8 text-[var(--gt-cta)]" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="7.5" r="3.5" /><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" /><circle cx="5" cy="9" r="2.4" opacity=".6" /><circle cx="19" cy="9" r="2.4" opacity=".6" />
  </svg>
);

export default function DanBoard({ board }: { board: Board }) {
  const [tab, setTab] = useState<Tab>("new");
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [level, setLevel] = useState("");
  const [showAllNew, setShowAllNew] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const latest = board.announcements[0]?.announced_on ?? null;
  const latestYear = latest ? latest.slice(0, 4) : null;
  const newThisYear = latestYear ? board.announcements.filter((a) => a.announced_on.startsWith(latestYear)).length : 0;
  const diamondCount = board.directory.filter((d) => d.diamond).length;

  const years = useMemo(() => {
    const ys = tab === "new"
      ? board.announcements.map((a) => beYear(a.announced_on))
      : board.directory.map((d) => d.year).filter((y): y is number => !!y);
    return [...new Set(ys)].sort((a, b) => b - a);
  }, [tab, board]);
  const levels = useMemo(() => [...new Set(board.directory.map((d) => d.level).filter((l): l is string => !!l))].sort(), [board]);

  const news = useMemo(() => board.announcements.filter((a) =>
    matches(q, a.name, a.dan) && (!year || beYear(a.announced_on) === Number(year)) && (!level || a.level === level)), [board, q, year, level]);
  const dir = useMemo(() => board.directory.filter((d) =>
    (tab !== "diamond" || d.diamond) && matches(q, d.name, d.dan) && (!year || d.year === Number(year)) && (!level || d.level === level)), [board, tab, q, year, level]);

  function pick(t: Tab) { setTab(t); setYear(""); setShown(PAGE); }
  const select = "min-h-11 rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base";

  return (
    <main className="pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#0a3d9e,#0b56cf_60%,#0a3d9e)] px-4 py-8 text-center text-white sm:py-10">
        <span aria-hidden="true" className="absolute -left-6 bottom-2 hidden h-24 w-40 rotate-[-8deg] rounded-xl bg-[#e3b56b] opacity-90 shadow-xl sm:block" />
        <span aria-hidden="true" className="absolute bottom-5 left-6 hidden h-8 w-8 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] sm:block" />
        <span aria-hidden="true" className="absolute bottom-8 left-16 hidden h-8 w-8 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)] sm:block" />
        <span aria-hidden="true" className="absolute right-6 top-1/2 hidden h-14 w-14 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] shadow-[0_0_40px_10px_rgba(120,190,255,.35)] sm:block" />
        <span aria-hidden="true" className="absolute right-20 top-[58%] hidden h-14 w-14 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)] sm:block" />
        <h1 className="relative text-3xl font-extrabold tracking-tight text-[var(--gt-gold-2)] [text-shadow:0_2px_0_#6e4a0c] sm:text-5xl">ประกาศรายชื่อดั้งใหม่</h1>
        <p className="relative mx-auto mt-3 inline-block rounded-full border-2 border-[var(--gt-gold)] px-5 py-1 text-sm font-semibold tracking-[.18em] text-[var(--gt-gold-2)] sm:text-lg">NEW DAN ACHIEVEMENTS</p>
        <p className="relative mt-3 text-sm text-white/90 sm:text-lg">ขอแสดงความยินดีกับนักกีฬาหมากล้อมที่ได้รับการรับรองระดับดั้ง</p>
      </section>

      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        {/* Tabs */}
        <div role="tablist" aria-label="ประเภทรายชื่อ" className="gt-card -mt-5 relative grid grid-cols-3 gap-1 p-1 shadow-md">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => pick(t.id)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold sm:text-lg ${tab === t.id ? "bg-[linear-gradient(180deg,#0b56cf,#0a3d9e)] text-white shadow-[inset_0_-3px_0_var(--gt-gold)]" : "text-[var(--gt-ink)] hover:bg-[var(--gt-cta-soft)]"}`}>
              {t.id === "diamond" && <Diamond className="h-5 w-5" />}
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="gt-card col-span-2 flex min-h-12 items-center gap-2 px-3 sm:col-span-1">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[var(--gt-muted)]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            <span className="sr-only">ค้นหา</span>
            <input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="ค้นหาชื่อ / เลขดั้ง"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--gt-muted)]" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold sm:flex-row sm:items-center sm:gap-2">
            {tab === "new" ? "ปีที่ประกาศ" : "ปีที่ได้ดั้ง"}
            <select value={year} onChange={(e) => { setYear(e.target.value); setShown(PAGE); }} className={select}>
              <option value="">ทุกปี</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold sm:flex-row sm:items-center sm:gap-2">
            ระดับดั้ง
            <select value={level} onChange={(e) => { setLevel(e.target.value); setShown(PAGE); }} className={select}>
              <option value="">ทั้งหมด</option>
              {levels.map((l) => <option key={l} value={l}>{l} ดั้ง</option>)}
            </select>
          </label>
        </div>

        {/* Totals */}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <StatCard icon={<Stones />} label={latestYear ? `ดั้งใหม่ปี ${Number(latestYear) + 543}` : "ดั้งใหม่"} value={newThisYear} highlight />
          <StatCard icon={<Diamond className="h-9 w-9" />} label="ดั้งเพชร" value={diamondCount} />
          <StatCard icon={<People />} label="รวมทั้งหมด" value={board.directory.length} />
        </div>
        <p className="mt-2 text-sm text-[var(--gt-muted)]">
          ข้อมูลจาก<a href={board.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--gt-cta)] underline">สมาคมกีฬาหมากล้อมแห่งประเทศไทย</a>
          {board.synced_at && <> · อัปเดตล่าสุด {thaiDate(board.synced_at, "long")}</>}
        </p>

        {tab === "new" && (
          <section className="mt-6" aria-labelledby="new-title">
            <div className="flex flex-wrap items-end justify-between gap-2 rounded-t-2xl bg-[linear-gradient(90deg,#0a3d9e,#0b56cf)] px-4 py-3 text-white">
              <h2 id="new-title" className="text-lg font-bold sm:text-xl">⭐ รายชื่อผู้ได้รับการรับรองดั้งใหม่</h2>
              {latest && <p className="text-sm">ประกาศล่าสุด: {thaiDate(latest, "long")}</p>}
            </div>
            {news.length === 0
              ? <p className="gt-card rounded-t-none p-6 text-center text-[var(--gt-muted)]">ไม่พบรายชื่อที่ค้นหา</p>
              : <ul className="grid grid-cols-2 items-start gap-2 rounded-b-2xl bg-[var(--gt-surface-2)] p-2 sm:gap-3 sm:p-3 lg:grid-cols-4">
                  {(showAllNew || q || year || level ? news : news.slice(0, FIRST_NEW)).map((a) => <NewDanCard key={a.dan ?? a.name} a={a} />)}
                </ul>}
            {!showAllNew && !q && !year && !level && news.length > FIRST_NEW && (
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setShowAllNew(true)} className="gt-outline-btn inline-flex min-h-12 items-center gap-2 px-8 text-base font-bold">ดูรายชื่อทั้งหมด ({news.length}) →</button>
              </div>
            )}
          </section>
        )}

        {tab === "diamond" && (
          <section className="mt-6" aria-label="ดั้งเพชร">
            <p className="mb-3 text-sm text-[var(--gt-muted)]">ดั้งเพชร คือผู้ที่สมาคมทำเครื่องหมายเพชรไว้ในทำเนียบดั้ง</p>
            {dir.length === 0
              ? <p className="gt-card p-6 text-center text-[var(--gt-muted)]">ไม่พบรายชื่อที่ค้นหา</p>
              : <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {dir.slice(0, shown).map((d) => (
                    <li key={d.dan} className="gt-card flex items-center gap-3 p-3">
                      <AthleteAvatar src={d.photo} name={d.name} className="h-12 w-12" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{d.name}</span>
                        <span className="gt-num block text-sm text-[var(--gt-muted)]">เลขดั้ง {num(d.dan)}{d.level ? ` · ${d.level} ดั้ง` : ""}{d.year ? ` · ${d.year}` : ""}</span>
                      </span>
                      <Diamond className="h-6 w-6 shrink-0" />
                    </li>
                  ))}
                </ul>}
          </section>
        )}

        {tab === "all" && (
          <section className="mt-6" aria-label="ทำเนียบดั้งทั้งหมด">
            <p className="mb-2 text-sm text-[var(--gt-muted)]">พบ {num(dir.length)} คน</p>
            <div className="gt-card overflow-hidden">
              <ul className="divide-y divide-[var(--gt-line)]">
                {dir.slice(0, shown).map((d) => (
                  <li key={d.dan} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="gt-num w-14 shrink-0 text-right text-sm font-bold text-[var(--gt-brand)]">{num(d.dan)}</span>
                    <AthleteAvatar src={d.photo} name={d.name} className="h-10 w-10" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{d.name}{d.diamond && <span className="ml-1 inline-flex translate-y-0.5"><Diamond /></span>}</span>
                    <span className="gt-num shrink-0 text-right text-sm"><span className="block font-semibold">{d.level ? `${d.level} ดั้ง` : "-"}</span><span className="block text-[var(--gt-muted)]">{d.year ?? ""}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {tab !== "new" && dir.length > shown && (
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setShown((s) => s + PAGE)} className="gt-outline-btn inline-flex min-h-12 items-center px-8 text-base font-bold">แสดงเพิ่ม ({num(dir.length - shown)} คน)</button>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-[var(--gt-muted)]">
          มีรูปผิดคนหรืออยากเปลี่ยนรูปโปรไฟล์? <Link href="/account" className="font-semibold text-[var(--gt-cta)] underline">เข้าสู่ระบบเพื่อเปลี่ยนรูปของตัวเอง</Link>
        </p>
      </div>
    </main>
  );
}
