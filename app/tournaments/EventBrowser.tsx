"use client";
/* eslint-disable @next/next/no-img-element -- posters come from storage URLs of any size */

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { STATUS_LABEL, eventStatus, thaiYear } from "@/lib/event-list.mjs";
import { thaiDate } from "@/lib/division-display";

export type EventCard = {
  id: string; title: string; event_date: string | null; poster_url: string | null; venue: string | null;
  registration_open_date: string | null; registration_close_date: string | null; registration_mode: string | null; kinds: string;
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

function Banner({ e }: { e: EventCard }) {
  if (e.poster_url) {
    return (
      <div className="relative h-44 overflow-hidden rounded-xl bg-[#0a2f6e] sm:h-40">
        <img src={e.poster_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-md" />
        <img src={e.poster_url} alt={`โปสเตอร์ ${e.title}`} loading="lazy" className="relative mx-auto h-full w-auto max-w-full object-contain drop-shadow-lg" />
      </div>
    );
  }
  return (
    <div className="relative flex h-44 items-center overflow-hidden rounded-xl bg-[linear-gradient(120deg,#e9f2ff,#bcd5fb_55%,#7fb0f5)] px-5 sm:h-40">
      <svg viewBox="0 0 200 120" aria-hidden="true" className="absolute -right-4 bottom-0 h-28 w-48 opacity-90">
        <path d="M0 120 L200 70 L200 120 Z" fill="#d9a35e" />
        {[[70, 104, 1], [100, 98, 0], [128, 106, 1], [150, 92, 0], [172, 100, 1], [118, 88, 0]].map(([x, y, b], i) => (
          <ellipse key={i} cx={x} cy={y} rx="11" ry="6" fill={b ? "#111" : "#fff"} stroke={b ? "none" : "#9aa3b2"} />
        ))}
      </svg>
      <p className="relative max-w-[75%] text-2xl font-bold italic leading-tight text-[#0b2a5b] [text-shadow:0_1px_0_#fff]">{e.title}</p>
    </div>
  );
}

export default function EventBrowser({ events, serverToday }: { events: EventCard[]; serverToday: string }) {
  // Server date first (no flash), then the visitor's clock in case the cached page is from yesterday.
  const day = useSyncExternalStore(noop, today, () => serverToday);
  const fromUrl = useSyncExternalStore(noop, urlStatus, () => null);
  const [picked, setPicked] = useState<Filter | null>(null);
  const filter: Filter = picked ?? (FILTERS.some((f) => f.id === fromUrl) ? (fromUrl as Filter) : "all");
  const [q, setQ] = useState("");
  const [year, setYear] = useState("all");
  const [page, setPage] = useState(1);

  const withStatus = useMemo(() => events.map((e) => ({ ...e, status: eventStatus(e, day) as Status })), [events, day]);
  const years = useMemo(() => [...new Set(events.map((e) => thaiYear(e.event_date)).filter((y): y is number => y !== null))].sort((a, b) => b - a), [events]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const order: Record<Status, number> = { live: 0, open: 1, upcoming: 2, closed: 3, tba: 4, finished: 5 };
    return withStatus
      .filter((e) => (filter === "all" || e.status === filter)
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
    : e.status === "finished" ? { label: "ดูผลการแข่งขัน", primary: false }
    : e.status === "open" ? { label: "ดูรายละเอียดและสมัคร", primary: true }
    : { label: "ดูรายละเอียด", primary: true };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <label className="relative block">
          <span className="sr-only">ค้นหาชื่อการแข่งขัน</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--gt-muted)]" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อการแข่งขัน…"
            className="block min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] pl-12 pr-4 text-base outline-none focus:border-[var(--gt-cta)] focus:ring-2 focus:ring-[var(--gt-cta)]/25" />
        </label>
        <label className="block">
          <span className="sr-only">ปี</span>
          <select value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}
            className="block min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-4 text-base font-semibold outline-none focus:border-[var(--gt-cta)]">
            <option value="all">ทุกปี</option>
            {years.map((y) => <option key={y} value={String(y)}>พ.ศ. {y}</option>)}
          </select>
        </label>
      </div>

      <div role="group" aria-label="สถานะการแข่งขัน" className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-center sm:gap-3">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => { setPicked(f.id); setPage(1); }}
            className={`min-h-11 rounded-full border px-6 text-sm font-semibold sm:min-w-36 ${filter === f.id ? "border-transparent bg-[var(--gt-cta)] text-white shadow" : "border-[var(--gt-line)] bg-[var(--gt-cta-soft)]"}`}>{f.label}</button>
        ))}
      </div>

      <p id="event-results" className="mt-5 scroll-mt-4 text-sm text-[var(--gt-muted)]" aria-live="polite">{shown.length ? `พบ ${shown.length} รายการ` : ""}</p>
      {slice.length ? (
        <ul className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slice.map((e) => {
            const a = action(e);
            return (
              <li key={e.id} className="gt-card flex flex-col p-2.5">
                <Link href={e.status === "open" ? `/tournaments/${e.id}/register` : `/tournaments/${e.id}`} aria-label={e.status === "open" ? `สมัคร ${e.title}` : e.title} className="block rounded-xl"><Banner e={e} /></Link>
                <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
                  <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-bold ${CHIP[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                  <h2 className="mt-1.5 text-lg font-bold leading-snug">{e.title}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm"><CalIcon />{thaiDate(e.event_date) ?? "รออัปเดตวันแข่งขัน"}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-sm"><PinIcon />{e.venue ?? "สถานที่รอยืนยัน"}</p>
                  {e.kinds && <p className="mt-2 border-t border-[var(--gt-line)] pt-2 text-sm font-semibold">{e.kinds}</p>}
                  <div className={`mt-auto pt-3 ${e.status === "open" ? "grid grid-cols-2 gap-2" : ""}`}>
                    {e.status === "open" && (
                      <Link href={`/tournaments/${e.id}/register`} className="gt-cta-btn flex min-h-11 items-center justify-center rounded-xl px-2 text-[15px] font-bold">สมัครแข่งขัน</Link>
                    )}
                    <Link href={`/tournaments/${e.id}`}
                      className={`flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-[15px] font-bold ${a.primary && e.status !== "open" ? "gt-cta-btn" : "border border-[var(--gt-line)] bg-[var(--gt-cta-soft)] text-[var(--gt-ink)]"}`}>
                      {e.status === "open" ? "รายละเอียด" : `${a.label} →`}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
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
