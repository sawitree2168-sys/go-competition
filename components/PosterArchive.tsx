"use client";

import { useState } from "react";
import Link from "next/link";
import TournamentPoster from "@/components/TournamentPoster";
import PosterArchiveLinkLabel from "./PosterArchiveLinkLabel";
import styles from "./PosterArchive.module.css";
import { thaiDate } from "@/lib/division-display";
import { POSTER_ARCHIVE_PAGE_SIZE, type ArchivePoster } from "@/lib/poster-archive-shared";

function searchTitle(value: string) {
  return value.normalize("NFC").toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

export default function PosterArchive({
  events, home = false, compactOnMobile = false, archivePage,
}: {
  events: ArchivePoster[];
  home?: boolean;
  compactOnMobile?: boolean;
  archivePage?: number;
}) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"cards" | "list">("cards");

  if (!events.length) return null;

  const interactive = compactOnMobile || archivePage !== undefined;
  const years = [...new Set(events.map(event => event.event_year))].sort((a, b) => b - a);
  const term = searchTitle(query);
  const filtered = Boolean(term || year);
  const matches = filtered
    ? events.filter(event => (!year || String(event.event_year) === year) && searchTitle(event.title).includes(term))
    : events;
  const pages = Math.ceil(matches.length / POSTER_ARCHIVE_PAGE_SIZE);
  const current = Math.min((filtered ? page : archivePage ?? page), Math.max(1, pages));
  const first = (current - 1) * POSTER_ARCHIVE_PAGE_SIZE;
  const visible = interactive || home ? matches.slice(first, first + POSTER_ARCHIVE_PAGE_SIZE) : matches;

  const list = view === "list";
  const compactCards = compactOnMobile && !list;
  const status = filtered ? `พบ ${matches.length} จาก ${events.length} รายการ` : `${events.length} รายการ`;

  function clearFilters() {
    setQuery("");
    setYear("");
    setPage(1);
  }

  return (
    <section id="poster-archive" className={compactOnMobile ? "space-y-2.5 md:space-y-4" : "space-y-4"} aria-label="คลังโปสเตอร์การแข่งขันย้อนหลัง">
      {home && (
        <header className={`flex items-center justify-between gap-2 ${compactOnMobile ? "poster-archive-header md:flex-wrap" : "flex-wrap"}`}>
          <h2 className="site-section-title">คลังโปสเตอร์การแข่งขันย้อนหลัง</h2>
          <Link href="/results/history" className="gt-outline-btn inline-flex min-h-11 items-center px-4">ดูทั้งหมด {events.length} รายการ →</Link>
        </header>
      )}
      {interactive && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-auto sm:flex-1">
            <label className="min-w-0">
              <span className="sr-only">ค้นหาชื่อรายการย้อนหลัง</span>
              <input type="search" value={query} placeholder="ค้นหาชื่อรายการย้อนหลัง…"
                onChange={event => { setQuery(event.target.value); setPage(1); }}
                className="block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base focus-visible:outline-2 focus-visible:outline-blue-700 sm:text-sm" />
            </label>
            <label>
              <span className="sr-only">ปีการแข่งขันย้อนหลัง</span>
              <select value={year} onChange={event => { setYear(event.target.value); setPage(1); }}
                className="min-h-11 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-2 text-base font-semibold focus-visible:outline-2 focus-visible:outline-blue-700 sm:text-sm">
                <option value="">ทุกปี</option>
                {years.map(value => <option key={value} value={value}>ปี {value + 543}</option>)}
              </select>
            </label>
          </div>
          <div role="group" aria-label="มุมมองคลังโปสเตอร์" className="flex gap-1">
            <button type="button" onClick={() => setView("cards")} aria-pressed={!list}
              className={`${list ? "gt-outline-btn" : "gt-cta-btn"} min-h-11 px-3 text-sm`}>การ์ด</button>
            <button type="button" onClick={() => setView("list")} aria-pressed={list}
              className={`${list ? "gt-cta-btn" : "gt-outline-btn"} min-h-11 px-3 text-sm`}>ลิสต์</button>
          </div>
          <p role="status" className="ml-auto text-xs text-[var(--gt-muted)] sm:ml-0">{status}</p>
        </div>
      )}
      {visible.length ? (
        <ul aria-label={list ? "โปสเตอร์แบบลิสต์" : "โปสเตอร์แบบการ์ด"}
          className={list ? "grid gap-2" : compactCards ? "grid grid-cols-3 gap-2 md:gap-4" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
          {visible.map(event => {
            const fallbackDate = `ปี ${event.event_year + 543}`;
            return (
              <li key={event.id} className="min-w-0">
                <Link href={event.href} prefetch={false}
                  className={`${styles.card} gt-card relative h-full overflow-hidden rounded-2xl border-2 transition-colors hover:border-[#c28c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${list ? "grid min-h-20 grid-cols-[100px_minmax(0,1fr)] items-center sm:grid-cols-[144px_minmax(0,1fr)]" : "flex flex-col"}`}>
                  {list ? (
                    <div className="aspect-video overflow-hidden rounded-md ml-2 sm:ml-3">
                      <TournamentPoster choice={event.poster} title={event.title} thumbnail landscape />
                    </div>
                  ) : (
                    <TournamentPoster choice={event.poster} title={event.title} year={event.event_year + 543} landscape={compactOnMobile} />
                  )}
                  <div className={`flex flex-1 min-w-0 flex-col gap-1 p-3 sm:p-4 ${compactCards ? "max-md:gap-0.5 max-md:p-[clamp(0.3125rem,1.5vw,0.625rem)]" : ""}`}>
                    <h3 className={`break-words text-base font-bold leading-snug ${compactCards ? "max-md:text-[clamp(0.46rem,2.2vw,0.9rem)] [overflow-wrap:anywhere]" : ""}`}>{event.title}</h3>
                    <p className={`text-sm text-[var(--gt-muted)] ${compactCards ? "max-md:text-[clamp(0.42rem,1.95vw,0.8rem)] max-md:leading-snug" : ""}`}>
                      {compactCards && <span className="md:hidden">{thaiDate(event.event_date, "short") ?? fallbackDate}</span>}
                      <span className={compactCards ? "hidden md:inline" : undefined}>{thaiDate(event.event_date) ?? fallbackDate}</span>
                      <span> · {event.divisions} รุ่น</span>
                    </p>
                    <PosterArchiveLinkLabel className={`mt-auto pt-2 text-sm font-semibold text-[var(--gt-cta)] ${compactCards ? "max-md:pt-1 max-md:text-[clamp(0.42rem,1.95vw,0.8rem)]" : ""}`} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="gt-card p-5 text-center">
          <p>ไม่พบรายการที่ตรงกับคำค้นหรือปีที่เลือก</p>
          <button type="button" onClick={clearFilters} className="gt-outline-btn mt-2 min-h-11 px-4 text-sm">ล้างตัวกรอง</button>
        </div>
      )}
      {interactive && pages > 1 && (
        <nav aria-label="หน้าโปสเตอร์ย้อนหลัง" className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => {
            const number = i + 1;
            const selected = number === current ? "page" : undefined;
            const className = `${selected ? "gt-cta-btn" : "gt-outline-btn"} inline-flex min-h-11 min-w-11 items-center justify-center`;
            return archivePage !== undefined && !filtered ? (
              <Link key={number} href={number === 1 ? "/results/history" : `/results/history?page=${number}`} aria-current={selected} className={className}>{number}</Link>
            ) : (
              <button key={number} type="button" aria-current={selected} className={className} onClick={() => {
                setPage(number);
                document.getElementById("poster-archive")?.scrollIntoView();
              }}>{number}</button>
            );
          })}
        </nav>
      )}
    </section>
  );
}
