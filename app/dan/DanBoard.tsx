"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AthleteAvatar from "@/components/AthleteAvatar";
import RankTable, { type Ranking } from "./RankTable";

export type Person = { dan: number | null; name: string; level: string | null; diamond: boolean; go_id: string | null; photo: string | null; profile_id: string | null };
export type Examiner = Person & { role: string };
export type Announcement = Person & { title: string | null; announced_on: string; examiners: Examiner[] };
export type DirEntry = { dan: number; name: string; level: string | null; diamond: boolean; year: number | null; go_id: string | null; photo: string | null };
export type Board = { synced_at: string | null; source_url: string; announcements: Announcement[]; directory: DirEntry[] };

type Tab = "new" | "rank" | "diamond" | "all";
const TABS: { id: Tab; label: string }[] = [
  { id: "new", label: "ดั้งใหม่" },
  { id: "rank", label: "อันดับคะแนน" },
  { id: "diamond", label: "ดั้งเพชร" },
  { id: "all", label: "ทำเนียบดั้งทั้งหมด" },
];
const PAGE = 12;
const ROWS = 50;

const key = (s: string) => s.replace(/[\s​-‍﻿]+/g, "").toLowerCase();
const num = (n: number) => n.toLocaleString("en-US");
const thaiDate = (iso: string, month: "short" | "long" = "short") =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month, year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
const beYear = (iso: string) => Number(iso.slice(0, 4)) + 543;
const danLabel = (level: string | null) => `${level ?? 1} Dan`;

function matches(q: string, name: string, dan: number | null) {
  if (!q.trim()) return true;
  const k = key(q);
  return key(name).includes(k) || (dan !== null && String(dan) === k.replace(/,/g, ""));
}

function Diamond({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6 3h12l4 6-10 12L2 9z" fill="#3fa9f5" />
      <path d="M2 9h20M8 3l4 18M16 3l-4 18M6 3l2 6M18 3l-2 6" stroke="#0d5fb3" strokeWidth="1" fill="none" />
    </svg>
  );
}

function Name({ p, className = "" }: { p: { name: string; profile_id?: string | null }; className?: string }) {
  return p.profile_id
    ? <Link href={`/athletes/${p.profile_id}`} className={`${className} hover:underline`}>{p.name}</Link>
    : <span className={className}>{p.name}</span>;
}

const PeopleIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14c2.6 0 4.4 1.5 5 4" /></svg>;
const Chevron = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** One newly announced dan in the approved athlete-card layout (avatar band, rank pill, outlined action). */
function NewDanCard({ a }: { a: Announcement }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="gt-card gt-athlete-card flex min-w-0 flex-col gap-0 overflow-hidden p-0">
      <div className="relative shrink-0 bg-[linear-gradient(180deg,var(--gt-avatar-top),var(--gt-surface-2))] px-2 pb-2 pt-4 sm:py-4">
        <span className="absolute left-2 top-2 rounded-md bg-[var(--gt-gold-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--gt-gold-ink)] sm:text-xs">ดั้งใหม่</span>
        {a.diamond && <span className="absolute right-2 top-2" title="ดั้งเพชร"><Diamond className="h-5 w-5" /></span>}
        <div className="flex justify-center"><AthleteAvatar src={a.photo} name={a.name} zoom className="h-20 w-20 sm:h-28 sm:w-28" /></div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 px-2.5 py-3 text-center sm:px-3">
        <Name p={a} className="block min-h-10 break-words text-sm font-semibold leading-snug sm:text-lg" />
        <p className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded-full bg-[var(--gt-surface-2)] px-2.5 py-0.5 text-sm font-bold text-[var(--gt-brand)]">{danLabel(a.level)}</span>
          <span className="gt-num text-sm font-semibold">เลขดั้ง {a.dan ? num(a.dan) : "-"}</span>
        </p>
        <p className="text-xs text-[var(--gt-muted)] sm:text-sm">ประกาศเมื่อ {thaiDate(a.announced_on)}</p>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="mt-auto flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-2 text-xs font-semibold text-[var(--gt-brand)] sm:text-sm">
          <PeopleIcon /><span>{open ? "ซ่อนผู้สอบ" : "ดูผู้สอบ"}</span>
        </button>
        {open && (
          <ul className="w-full space-y-2 pt-1 text-left">
            {a.examiners.map((e) => (
              <li key={e.role} className="flex items-center gap-2">
                <AthleteAvatar src={e.photo} name={e.name} zoom className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-[var(--gt-muted)] sm:text-xs">{e.role}</span>
                  <span className="block break-words text-xs font-semibold leading-snug sm:text-sm">
                    <Name p={e} />{e.diamond && <span className="ml-1 inline-flex translate-y-0.5"><Diamond className="h-3.5 w-3.5" /></span>}
                  </span>
                  <span className="gt-num block text-[11px] text-[var(--gt-muted)] sm:text-xs">{e.dan ? `${danLabel(e.level)} · เลขดั้ง ${num(e.dan)}` : "เหล่าซือ (โปร)"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/** Dan list in the approved table / list layout. */
function DanTable({ rows }: { rows: DirEntry[] }) {
  return (
    <div className="gt-athlete-table overflow-hidden rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)]">
      <div className="hidden grid-cols-[72px_54px_minmax(0,1fr)_92px_110px_72px] items-center gap-3 border-b border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 py-3 text-xs font-semibold text-[var(--gt-muted)] lg:grid">
        <span className="text-center">เลขดั้ง</span><span>รูป</span><span>ชื่อ–นามสกุล</span><span>ระดับ</span><span>ปีที่ได้ดั้ง</span><span className="text-center">ดั้งเพชร</span>
      </div>
      <ol className="divide-y divide-[var(--gt-line)]" aria-label="รายชื่อดั้ง">
        {rows.map((d) => (
          <li key={d.dan} className="grid grid-cols-[52px_48px_minmax(0,1fr)] items-center gap-2 px-3 py-3 lg:grid-cols-[72px_54px_minmax(0,1fr)_92px_110px_72px] lg:gap-3">
            <span className="gt-num text-center text-sm font-semibold text-[var(--gt-brand)]">{num(d.dan)}</span>
            <AthleteAvatar src={d.photo} name={d.name} zoom className="h-11 w-11 sm:h-12 sm:w-12" />
            <span className="min-w-0">
              <span className="block break-words text-sm font-semibold leading-snug sm:text-base">{d.name}{d.diamond && <span className="ml-1 inline-flex translate-y-0.5 lg:hidden"><Diamond /></span>}</span>
              <span className="gt-num mt-0.5 block text-xs text-[var(--gt-muted)] lg:hidden">{danLabel(d.level)}{d.year ? ` · ได้ดั้งปี ${d.year}` : ""}</span>
            </span>
            <span className="hidden lg:block"><span className="rounded-full bg-[var(--gt-surface-2)] px-2.5 py-0.5 text-sm font-bold text-[var(--gt-brand)]">{danLabel(d.level)}</span></span>
            <span className="gt-num hidden text-sm text-[var(--gt-muted)] lg:block">{d.year ?? "-"}</span>
            <span className="hidden justify-center lg:flex">{d.diamond ? <Diamond className="h-5 w-5" /> : <span className="text-[var(--gt-muted)]">-</span>}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Pager({ page, pages, go }: { page: number; pages: number; go: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn = "grid min-h-11 min-w-11 place-items-center rounded-full border border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)] px-3 text-sm font-semibold disabled:opacity-40";
  return (
    <nav aria-label="เลือกหน้า" className="mt-5 flex items-center justify-center gap-2">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => go(page - 1)} aria-label="หน้าก่อน">‹</button>
      <span className="gt-num px-2 text-sm text-[var(--gt-muted)]">หน้า {page} / {pages}</span>
      <button type="button" className={btn} disabled={page >= pages} onClick={() => go(page + 1)} aria-label="หน้าถัดไป">›</button>
    </nav>
  );
}

export default function DanBoard({ board, ranking }: { board: Board; ranking: Ranking | null }) {
  const [tab, setTab] = useState<Tab>("new");
  const [q, setQ] = useState("");
  const [year, setYear] = useState("all");
  const [level, setLevel] = useState("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [sort, setSort] = useState<"score" | "dan">("score");
  const [scope, setScope] = useState<"active" | "all">("active");

  const latest = board.announcements[0]?.announced_on ?? null;
  const diamondCount = board.directory.filter((d) => d.diamond).length;

  const years = useMemo(() => {
    const ys = tab === "new" ? board.announcements.map((a) => beYear(a.announced_on)) : board.directory.map((d) => d.year).filter((y): y is number => !!y);
    return [...new Set(ys)].sort((a, b) => b - a);
  }, [tab, board]);
  const levels = useMemo(() => [...new Set(board.directory.map((d) => d.level).filter((l): l is string => !!l))].sort(), [board]);

  const news = useMemo(() => board.announcements.filter((a) =>
    matches(q, a.name, a.dan) && (year === "all" || beYear(a.announced_on) === Number(year)) && (level === "all" || a.level === level)), [board, q, year, level]);
  const dir = useMemo(() => board.directory.filter((d) =>
    (tab !== "diamond" || d.diamond) && matches(q, d.name, d.dan) && (year === "all" || d.year === Number(year)) && (level === "all" || d.level === level)), [board, tab, q, year, level]);

  const activeCount = ranking?.rows.filter((r) => r.active && r.score !== null).length ?? 0;
  const ranked = useMemo(() => (ranking?.rows ?? [])
    .filter((r) => r.score !== null && (scope === "all" || r.active) && matches(q, r.name, r.dan) && (level === "all" || r.level === level))
    .sort((a, b) => sort === "dan" ? a.dan - b.dan : (b.score! - a.score!) || (Number(b.active) - Number(a.active)) || a.dan - b.dan), [ranking, scope, q, level, sort]);

  const per = tab === "new" && view === "cards" ? PAGE : ROWS;
  const total = tab === "new" ? news.length : tab === "rank" ? ranked.length : dir.length;
  const pages = Math.max(1, Math.ceil(total / per));
  const cur = Math.min(page, pages);
  const go = (p: number) => { setPage(p); document.getElementById("dan-results")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const newAsRows: DirEntry[] = news.map((a) => ({ dan: a.dan ?? 0, name: a.name, level: a.level, diamond: a.diamond, year: beYear(a.announced_on), go_id: a.go_id, photo: a.photo }));
  const select = "block min-h-12 w-full appearance-none rounded-full border border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)] pl-5 pr-10 text-base font-semibold outline-none focus:border-[var(--gt-cta)]";

  return (
    <div>
      <div className="gt-directory-tools gt-dan-tools">
        <label className="gt-directory-search relative block">
          <span className="sr-only">ค้นหาชื่อหรือเลขดั้ง</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--gt-muted)]" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อ หรือเลขดั้ง…"
            className="block min-h-12 w-full rounded-full border border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)] pl-12 pr-4 text-base outline-none focus:border-[var(--gt-cta)] focus:ring-2 focus:ring-[var(--gt-cta)]/25" />
        </label>
        {tab === "rank" ? (
          <label className="gt-directory-year relative block">
            <span className="sr-only">เรียงตาม</span>
            <select value={sort} onChange={(e) => { setSort(e.target.value as "score" | "dan"); setPage(1); }} className={select}>
              <option value="score" className="text-black">เรียงตามคะแนน</option>
              <option value="dan" className="text-black">เรียงตามเลขดั้ง</option>
            </select>
            <Chevron />
          </label>
        ) : (
          <label className="gt-directory-year relative block">
            <span className="sr-only">{tab === "new" ? "ปีที่ประกาศ" : "ปีที่ได้ดั้ง"}</span>
            <select value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }} className={select}>
              <option value="all" className="text-black">ทุกปี</option>
              {years.map((y) => <option key={y} value={String(y)} className="text-black">ปี {y}</option>)}
            </select>
            <Chevron />
          </label>
        )}
        <label className="gt-directory-year relative block">
          <span className="sr-only">ระดับดั้ง</span>
          <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} className={select}>
            <option value="all" className="text-black">ทุกระดับ</option>
            {levels.map((l) => <option key={l} value={l} className="text-black">{l} Dan</option>)}
          </select>
          <Chevron />
        </label>
        <div role="group" aria-label="ประเภทรายชื่อ" className="gt-directory-filters">
          {TABS.filter((t) => t.id !== "rank" || ranking).map((t) => (
            <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => { setTab(t.id); setYear("all"); setPage(1); }}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${tab === t.id ? "border-transparent bg-[var(--gt-cta)] text-white" : "border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)]"}`}>
              {t.id === "diamond" && <Diamond />}{t.label}
              <span className={`gt-num rounded-full px-2 text-xs ${tab === t.id ? "bg-white/20" : "bg-[var(--gt-surface-2)]"}`}>
                {num(t.id === "new" ? board.announcements.length : t.id === "rank" ? activeCount : t.id === "diamond" ? diamondCount : board.directory.length)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="gt-directory-results" id="dan-results">
        <div className="gt-directory-results-heading">
          <h2>{tab === "new" ? "รายชื่อผู้ได้รับการรับรองดั้งใหม่" : tab === "rank" ? `อันดับคะแนนประเทศไทย ปี ${(ranking?.as_of ? beYear(ranking.as_of) : beYear(new Date().toISOString()))}` : tab === "diamond" ? "ดั้งเพชร" : "ทำเนียบดั้งทั้งหมด"}</h2>
          <p className="text-sm text-[var(--gt-muted)]" aria-live="polite">{num(total)} คน</p>
        </div>
        {tab === "rank" && (
          <div role="group" aria-label="สถานะนักกีฬา" className="gt-directory-view-toggle">
            <button type="button" aria-pressed={scope === "active"} onClick={() => { setScope("active"); setPage(1); }} className={scope === "active" ? "is-active" : ""}>● Active</button>
            <button type="button" aria-pressed={scope === "all"} onClick={() => { setScope("all"); setPage(1); }} className={scope === "all" ? "is-active" : ""}>รวม Inactive</button>
          </div>
        )}
        {tab === "new" && (
          <div role="group" aria-label="รูปแบบการแสดงรายชื่อ" className="gt-directory-view-toggle">
            <button type="button" aria-pressed={view === "cards"} onClick={() => { setView("cards"); setPage(1); }} className={view === "cards" ? "is-active" : ""}>▦ การ์ด</button>
            <button type="button" aria-pressed={view === "list"} onClick={() => { setView("list"); setPage(1); }} className={view === "list" ? "is-active" : ""}>☷ ตาราง / ลิสต์</button>
          </div>
        )}
      </div>
      <p className="-mt-2 mb-4 text-sm text-[var(--gt-muted)]">
        {tab === "new" && latest && <>ประกาศล่าสุด {thaiDate(latest, "long")} · </>}
        {tab === "diamond" && <>ผู้ที่มีเครื่องหมายเพชรในทำเนียบดั้ง · </>}
        {tab === "rank" && ranking && <>
          จัดอันดับเฉพาะผู้ที่ Active (มีผลแข่งใน {ranking.inactive_months} เดือนล่าสุด) · คะแนนกับระดับดั้งแยกกัน ระดับดั้งเปลี่ยนเมื่อสอบผ่านเท่านั้น
          {ranking.as_of && <> · คะแนนถึง {thaiDate(ranking.as_of)}</>} · </>}
        ข้อมูลจาก<a href={board.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--gt-cta)] hover:underline">สมาคมกีฬาหมากล้อมแห่งประเทศไทย</a>
        {board.synced_at && <> · อัปเดต {thaiDate(board.synced_at)}</>}
      </p>

      {total === 0 ? (
        <div className="gt-card mt-2 px-5 py-8 text-center">
          <p className="font-semibold">ไม่พบรายชื่อที่ตรงกับเงื่อนไข</p>
          <button type="button" onClick={() => { setQ(""); setYear("all"); setLevel("all"); setPage(1); }} className="gt-outline-btn mt-3 min-h-11 px-5 text-sm font-semibold">ล้างตัวกรอง</button>
        </div>
      ) : tab === "new" && view === "cards" ? (
        <ul className="grid grid-cols-2 items-start gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {news.slice((cur - 1) * per, cur * per).map((a) => <NewDanCard key={a.dan ?? a.name} a={a} />)}
        </ul>
      ) : tab === "rank" ? (
        <RankTable rows={ranked.slice((cur - 1) * per, cur * per)} />
      ) : (
        <DanTable rows={(tab === "new" ? newAsRows : dir).slice((cur - 1) * per, cur * per)} />
      )}
      <Pager page={cur} pages={pages} go={go} />

      <p className="mt-8 text-center text-sm text-[var(--gt-muted)]">
        แตะรูปเพื่อดูภาพใหญ่ · อยากเปลี่ยนรูปของตัวเอง? <Link href="/account/photo" className="font-semibold text-[var(--gt-cta)] hover:underline">เข้าสู่ระบบเพื่อเปลี่ยนรูป</Link>
      </p>
    </div>
  );
}
