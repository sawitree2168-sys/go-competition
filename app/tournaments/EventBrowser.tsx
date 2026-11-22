"use client";

import TournamentPoster from "@/components/TournamentPoster";
import type { PosterChoice } from "@/lib/tournament-posters";
import EventOrganizer from "@/components/EventOrganizer";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { STATUS_LABEL, eventStatus, thaiYear } from "@/lib/event-list.mjs";
import { thaiDate } from "@/lib/division-display";

export type EventCard = {
  id: string; title: string; event_date: string | null; poster: PosterChoice; venue: string | null;
  registration_open_date: string | null; registration_close_date: string | null; registration_mode: string | null; kinds: string; href?: string; archived?: boolean; inArchive?: boolean;
};
type Filter = "all" | "open" | "live" | "finished";
type Status = ReturnType<typeof eventStatus>;

const PER_PAGE = 9;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" }, { id: "open", label: "เปิดรับสมัคร" }, { id: "live", label: "กำลังแข่งขัน" }, { id: "finished", label: "จบการแข่งขัน" },
];
const CHIP: Record<Status, string> = {
  live: "bg-[var(--gt-cta)] text-white", open: "bg-[#1f9a4b] text-white", finished: "bg-[#6b7a90] text-white",
  upcoming: "bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]", closed: "bg-[var(--gt-gold-soft)] text-[var(--gt-gold-ink)]", tba: "bg-[var(--gt-surface-2)] text-[var(--gt-muted)]",
};

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const noop = () => () => {};
const urlStatus = () => new URLSearchParams(window.location.search).get("status");

const CalIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" /></svg>;
const PinIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;

export default function EventBrowser({ events, serverToday }: { events: EventCard[]; serverToday: string }) {
  // Server date first (no flash), then the visitor's clock in case the cached page is from yesterday.
  const day = useSyncExternalStore(noop, today, () => serverToday);
  const fromUrl = useSyncExternalStore(noop, urlStatus, () => null);
  const [picked, setPicked] = useState<Filter | null>(null);
  const filter: Filter = picked ?? (FILTERS.some((f) => f.id === fromUrl) ? (fromUrl as Filter) : "all");
  const [q, setQ] = useState("");
  const [pickedYear, setYear] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"cards" | "list">("cards");

  const withStatus = useMemo(() => events.map((e) => ({ ...e, status: (e.archived ? "finished" : eventStatus(e, day)) as Status })), [events, day]);
  const years = useMemo(() => [...new Set(events.map((e) => thaiYear(e.event_date)).filter((y): y is number => y !== null))].sort((a, b) => b - a), [events]);
  // The directory opens on every year, including imported historical events.
  const year = pickedYear ?? "all";

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const order: Record<Status, number> = { live: 0, open: 1, upcoming: 2, closed: 3, tba: 4, finished: 5 };
    return withStatus
      .filter((e) => (!e.inArchive || filter === "finished" || Boolean(needle) || year !== "all")
        && (filter === "all" || e.status === filter)
        && (year === "all" || String(thaiYear(e.event_date)) === year)
        && (!needle || e.title.toLowerCase().includes(needle) || (e.venue ?? "").toLowerCase().includes(needle)))
      .sort((a, b) => order[a.status] - order[b.status]
        || (a.status === "finished" ? (b.event_date ?? "").localeCompare(a.event_date ?? "") : (a.event_date ?? "9").localeCompare(b.event_date ?? "9")));
  }, [withStatus, filter, year, q]);

  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const slice = shown.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  const go = (p: number) => { setPage(p); document.getElementById("event-results")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const action = (e: (typeof withStatus)[number]) =>
    e.status === "live" ? { label: "ติดตามการแข่งขัน", primary: true }
    : e.status === "finished" ? { label: e.inArchive ? "ดูวอลล์ลิสต์" : "ดูผลการแข่งขัน", primary: false }
    : e.status === "open" ? { label: "ดูรายละเอียดและสมัคร", primary: true }
    : { label: "ดูรายละเอียด", primary: true };

  return (
    <div>
      <div className="gt-directory-tools">
        <label className="gt-directory-search relative block">
          <span className="sr-only">ค้นหารายการแข่งขัน</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--gt-muted)]" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="ค้นหารายการแข่งขัน…"
            className="block min-h-12 w-full rounded-full border border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)] pl-12 pr-4 text-base outline-none focus:border-[var(--gt-cta)] focus:ring-2 focus:ring-[var(--gt-cta)]/25" />
        </label>
        <label className="gt-directory-year relative block">
          <span className="sr-only">ปี</span>
          <select value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}
            className="block min-h-12 w-full appearance-none rounded-full border border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)] pl-5 pr-10 text-base font-semibold outline-none focus:border-[var(--gt-cta)]">
            <option value="all" className="text-black">ทุกปี</option>
            {years.map((y) => <option key={y} value={String(y)} className="text-black">ปี {y}</option>)}
          </select>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </label>
        <div role="group" aria-label="สถานะการแข่งขัน" className="gt-directory-filters">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => { setPicked(f.id); setPage(1); }}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${filter === f.id ? "border-transparent bg-[var(--gt-cta)] text-white" : "border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)]"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="gt-directory-results" id="event-results">
        <div className="gt-directory-results-heading">
          <h2>รายการแข่งขัน</h2>
          <p className="text-sm text-[var(--gt-muted)]" aria-live="polite">{shown.length} รายการ</p>
        </div>
        <div role="group" aria-label="รูปแบบการแสดงรายการแข่งขัน" className="gt-directory-view-toggle">
          <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")} className={view === "cards" ? "is-active" : ""}>▦ การ์ด</button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={view === "list" ? "is-active" : ""}>☷ ตาราง / ลิสต์</button>
        </div>
      </div>
      {slice.length ? (
        view === "list" ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--gt-dash-panel-line)] bg-[var(--gt-surface)]">
            <div className="hidden grid-cols-[80px_minmax(0,1.5fr)_minmax(0,1fr)_110px_140px] gap-4 border-b border-[var(--gt-dash-panel-line)] bg-[var(--gt-surface-2)] px-4 py-3 text-xs text-[var(--gt-muted)] lg:grid">
              <span>โปสเตอร์</span><span>ชื่อรายการแข่งขัน</span><span>วันและสถานที่</span><span>สถานะ</span><span>รายละเอียด</span>
            </div>
            <ul className="divide-y divide-[var(--gt-dash-panel-line)]" aria-label="การแข่งขันแบบตารางและลิสต์">
              {slice.map((e) => {
                const a = action(e);
                const href = e.href ?? ("/tournaments/" + e.id);
                return (
                  <li key={e.id} className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-3 p-3 sm:grid-cols-[90px_minmax(0,1fr)_auto] lg:grid-cols-[80px_minmax(0,1.5fr)_minmax(0,1fr)_110px_140px] lg:items-center lg:gap-4 lg:px-4">
                    <Link href={href} className="block h-[88px] w-[76px] overflow-hidden rounded-lg sm:w-[90px] lg:h-[68px] lg:w-[80px]" aria-label={e.title}>
                      <TournamentPoster choice={e.poster} title={e.title} year={thaiYear(e.event_date)} thumbnail />
                    </Link>
                    <div className="min-w-0 space-y-1">
                      <Link href={href} className="block break-words text-sm font-semibold leading-relaxed hover:underline">{e.title}</Link>
                      <div className="text-xs text-[var(--gt-muted)]"><EventOrganizer title={e.title} compact /></div>
                      <p className="flex items-center gap-1 text-xs text-[var(--gt-muted)] lg:hidden"><CalIcon />{thaiDate(e.event_date, "short") ?? "รอวันแข่งขัน"}</p>
                      {!e.archived && <p className="text-xs text-[var(--gt-muted)] lg:hidden">{e.venue ?? "สถานที่รอยืนยัน"}</p>}
                      <span className={"inline-flex rounded-md px-2 py-0.5 text-xs lg:hidden " + CHIP[e.status]}>{STATUS_LABEL[e.status]}</span>
                      <div className="pt-1 sm:hidden"><Link href={href} className="inline-flex min-h-9 items-center rounded-lg bg-[var(--gt-cta)] px-3 text-xs font-semibold text-white">{a.label} →</Link></div>
                    </div>
                    <div className="hidden text-xs leading-relaxed text-[var(--gt-muted)] lg:block">
                      <p className="flex items-center gap-2"><CalIcon />{thaiDate(e.event_date, "short") ?? "รอวันแข่งขัน"}</p>
                      {!e.archived && <p className="mt-1 flex items-start gap-2"><PinIcon />{e.venue ?? "สถานที่รอยืนยัน"}</p>}
                    </div>
                    <span className={"hidden w-fit rounded-md px-2.5 py-1 text-xs lg:inline-flex " + CHIP[e.status]}>{STATUS_LABEL[e.status]}</span>
                    <Link href={href} className="gt-cta-btn hidden min-h-10 items-center justify-center px-3 text-center text-xs font-semibold sm:inline-flex">{a.label} →</Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <ul className="gt-event-grid" aria-label="การแข่งขันแบบการ์ด">
          {slice.map((e) => {
            const a = action(e);
            const mobileLabel = e.status === "open" ? "ดูรายละเอียดและสมัคร" : a.label;
            return (
              <li key={e.id} className="gt-event-card">
                <Link href={e.href ?? `/tournaments/${e.id}`} aria-label={e.title} className="gt-event-poster-link"><TournamentPoster choice={e.poster} title={e.title} year={thaiYear(e.event_date)} /></Link>
                <div className="gt-event-info">
                  <span className={`self-start rounded-md px-2.5 py-0.5 text-xs font-bold ${CHIP[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                  <h2 className="gt-event-title">{e.title}</h2>
                  <EventOrganizer title={e.title} compact />
                  <p className="gt-event-meta mt-2 flex items-start gap-2 text-sm"><CalIcon />{thaiDate(e.event_date, "short") ?? "รออัปเดตวันแข่งขัน"}</p>
                  {!e.archived && <p className="gt-event-meta mt-1 flex items-start gap-2 text-sm"><PinIcon />{e.venue ?? "สถานที่รอยืนยัน"}</p>}
                  {e.kinds && <p className="mt-1 text-xs leading-relaxed text-[var(--gt-muted)]">{e.kinds}</p>}
                  <div className="mt-auto pt-3">
                    <Link href={e.href ?? `/tournaments/${e.id}`} className="gt-cta-btn gt-event-action flex min-h-11 items-center justify-center gap-1.5 px-2 text-sm font-semibold">{mobileLabel}<span aria-hidden="true">→</span></Link>
                  </div>
                </div>
              </li>
            );
          })}
          {filter === "all" && !q.trim() && pages === 1 && slice.length < 3 &&
            Array.from({ length: 3 - slice.length }, (_, i) => (
              <li key={`future-${i}`} className="gt-event-placeholder" aria-label="พื้นที่สำหรับรายการแข่งขันในอนาคต">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m4 17 5-5 4 4 3-3 5 5" /><circle cx="15" cy="8" r="1.5" /></svg>
                <p>พื้นที่สำหรับรายการถัดไป</p>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="gt-card mt-2 px-5 py-8 text-center">
          <p className="font-semibold">{events.length ? "ไม่พบการแข่งขันที่ตรงกับเงื่อนไข" : "ยังไม่มีรายการแข่งขันที่เผยแพร่"}</p>
          {events.length > 0 && <button type="button" onClick={() => { setQ(""); setYear("all"); setPicked("all"); setPage(1); }} className="gt-outline-btn mt-3 min-h-11 px-5 text-sm font-semibold">ล้างตัวกรอง</button>}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="หน้า" className="mt-6 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" aria-current={p === cur ? "page" : undefined} onClick={() => go(p)}
              className={`grid h-11 w-11 place-items-center rounded-xl border font-bold ${p === cur ? "border-transparent bg-[var(--gt-cta)] text-white" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`}>{p}</button>
          ))}
          {cur < pages && <button type="button" aria-label="หน้าถัดไป" onClick={() => go(cur + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] font-bold">›</button>}
        </nav>
      )}
    </div>
  );
}
