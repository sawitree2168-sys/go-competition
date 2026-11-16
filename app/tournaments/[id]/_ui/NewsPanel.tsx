"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { STONES_IMAGE, Thumb } from "./chrome";
import { showTab } from "./DivisionTabs";
import { scoreText } from "@/lib/round-news.mjs";
import { thaiDate } from "@/lib/division-display";
import type { Announcement } from "./data";

/** One finished round of one pool (from lib/round-news). */
export type RoundItem = {
  key: string; round: number; pool: string; headline: string; deck: string; body: string;
  upsets: string[]; tables: number; leaderScore: number;
};

type Filter = "all" | "rounds" | "notices";
type Open = { kind: "round"; item: RoundItem };

const chip = "rounded-full px-2.5 py-0.5 text-xs font-bold";
const roundChip = `${chip} bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]`;
const readMore = "inline-flex min-h-10 items-center gap-1 font-bold text-[var(--gt-cta)] hover:underline";

const Megaphone = ({ className = "h-9 w-9" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} shrink-0 text-[var(--gt-cta)]`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M3 10v4h3l7 4V6L6 10H3Z" fill="currentColor" fillOpacity=".15" /><path d="M7 14l1.5 5h2.5L10 15.5M17 9.5a3.5 3.5 0 0 1 0 5M19.5 7a7 7 0 0 1 0 10" strokeLinecap="round" />
  </svg>
);

const dateOf = (iso: string) => thaiDate(new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })) ?? "";

export default function NewsPanel({ rounds, notices, multiPool }: { rounds: RoundItem[]; notices: Announcement[]; multiPool: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Open | null>(null);
  const roundLabel = (it: RoundItem) => `รอบที่ ${it.round}${multiPool && it.pool ? ` · สาย ${it.pool}` : ""}`;

  const chips: { id: Filter; label: string }[] = [{ id: "all", label: "ทั้งหมด" }, { id: "rounds", label: "สรุปแต่ละรอบ" }, { id: "notices", label: "ประกาศ" }];
  const latest = rounds[0];
  const rest = rounds.slice(1);

  const standingsBtn = (
    <button type="button" onClick={() => showTab("standings")} className="gt-cta-btn flex min-h-12 w-full items-center justify-center gap-2 px-4">ดูตารางอันดับ →</button>
  );

  const featured = (it: RoundItem) => (
    <article className="gt-card grid overflow-hidden sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <Thumb src={STONES_IMAGE} alt="" shift={it.round} className="h-40 w-full sm:h-full sm:min-h-52" />
      <div className="min-w-0 p-4">
        <p className="flex flex-wrap gap-1.5"><span className={`${chip} bg-[var(--gt-cta)] text-white`}>ล่าสุด</span><span className={roundChip}>{roundLabel(it)}</span></p>
        <h3 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">{it.headline}</h3>
        <p className="mt-1.5 text-[var(--gt-muted)]">{it.deck}</p>
        <button type="button" onClick={() => setOpen({ kind: "round", item: it })} className={`${readMore} mt-1`}>อ่านสรุปการแข่งขัน →</button>
      </div>
    </article>
  );

  const small = (it: RoundItem) => (
    <article className="gt-card flex min-w-0 gap-3 overflow-hidden p-2.5">
      <Thumb src={STONES_IMAGE} alt="" shift={it.round + 3} className="h-24 w-28 rounded-xl sm:h-32 sm:w-32" />
      <div className="min-w-0 py-0.5">
        <span className={roundChip}>{roundLabel(it)}</span>
        <h3 className="mt-1 font-bold leading-snug">{it.headline}</h3>
        <p className="line-clamp-2 text-xs text-[var(--gt-muted)]">{it.body}</p>
        <button type="button" onClick={() => setOpen({ kind: "round", item: it })} className={`${readMore} min-h-8 text-sm`}>อ่านต่อ →</button>
      </div>
    </article>
  );

  const noticeCard = (n: Announcement) => (
    <article className="gt-card flex min-w-0 gap-3 p-4">
      <Megaphone className="h-8 w-8" />
      <div className="min-w-0">
        <p className="text-xs text-[var(--gt-muted)]">ประกาศจากผู้จัด · {dateOf(n.created_at)}</p>
        <h3 className="font-bold leading-snug">{n.title}</h3>
        {n.body && <p className="mt-1 whitespace-pre-line text-sm text-[var(--gt-muted)]">{n.body}</p>}
      </div>
    </article>
  );

  const LatestBox = latest && (
    <section className="gt-card overflow-hidden">
      <h3 className="border-b border-[var(--gt-line)] bg-[var(--gt-cta-soft)] px-4 py-3 text-lg font-bold">สรุปล่าสุด</h3>
      <div className="space-y-3 p-4">
        <span className={roundChip}>{roundLabel(latest)}</span>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>แข่งครบ {latest.tables} กระดาน</li>
          <li>ผู้นำ {scoreText(latest.leaderScore)} คะแนน</li>
        </ul>
        {standingsBtn}
      </div>
    </section>
  );

  const NoticeBox = (
    <section className="gt-card p-4">
      <Megaphone />
      <h3 className="mt-2 text-lg font-bold">ประกาศจากผู้จัด</h3>
      {notices.length ? (
        <>
          <p className="mt-1 font-semibold">{notices[0].title}</p>
          <p className="line-clamp-3 text-sm text-[var(--gt-muted)]">{notices[0].body ?? dateOf(notices[0].created_at)}</p>
          <button type="button" onClick={() => setFilter("notices")} className={`${readMore} text-sm`}>ดูประกาศทั้งหมด ({notices.length}) →</button>
        </>
      ) : <p className="mt-1 text-sm text-[var(--gt-muted)]">ติดตามประกาศและกำหนดการแข่งขันได้ที่นี่</p>}
    </section>
  );

  const roundsList = rounds.length ? (
    <div className="space-y-3">
      {featured(latest!)}
      {rest.length > 0 && <div className="grid gap-3 md:grid-cols-2">{rest.map((it) => <div key={it.key} className="min-w-0">{small(it)}</div>)}</div>}
    </div>
  ) : (
    <div className="gt-card flex items-center gap-3 px-4 py-4">
      <Megaphone className="h-8 w-8" />
      <p><span className="block font-semibold">ยังไม่มีสรุปการแข่งขัน</span><span className="block text-sm text-[var(--gt-muted)]">ข่าวสรุปจะขึ้นอัตโนมัติเมื่อแข่งจบแต่ละรอบ</span></p>
    </div>
  );

  const noticesList = notices.length
    ? <div className="space-y-3">{notices.map((n) => <div key={n.id}>{noticeCard(n)}</div>)}</div>
    : <div className="gt-card px-4 py-4 text-sm text-[var(--gt-muted)]">ยังไม่มีประกาศจากผู้จัด</div>;

  return (
    <div className="mt-5 space-y-4">
      <div className="border-l-4 border-[var(--gt-cta)] pl-3">
        <h2 className="text-2xl font-bold leading-tight">ข่าวการแข่งขัน</h2>
        <p className="text-sm text-[var(--gt-muted)]">อัปเดตผลและบรรยากาศการแข่งขัน · สรุปอัตโนมัติจากผลที่ยืนยันแล้ว</p>
      </div>
      <div role="group" aria-label="ประเภทข่าว" className="grid grid-cols-3 gap-2 sm:flex">
        {chips.map((c) => (
          <button key={c.id} type="button" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}
            className={`min-h-11 whitespace-nowrap rounded-full border px-2 text-[13px] font-semibold sm:px-6 sm:text-sm ${filter === c.id ? "border-transparent bg-[var(--gt-cta)] text-white" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`}>
            {c.label}{c.id === "notices" && notices.length ? ` (${notices.length})` : ""}
          </button>
        ))}
      </div>

      {filter === "notices" ? noticesList : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_15.5rem]">
          <div className="min-w-0 space-y-3">
            {roundsList}
            {filter === "all" && notices.length > 0 && <div className="lg:hidden">{noticesList}</div>}
            {rounds.length > 0 && <div className="lg:hidden">{standingsBtn}</div>}
          </div>
          <aside className="hidden space-y-4 lg:block">
            {LatestBox}
            {filter === "all" && NoticeBox}
          </aside>
        </div>
      )}

      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="news-title" onClick={() => setOpen(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--gt-surface)] text-[var(--gt-ink)] shadow-xl">
            {open.kind === "round" && (
              <>
                <Thumb src={STONES_IMAGE} alt="" shift={open.item.round} className="h-36 w-full" />
                <div className="p-5">
                  <p className="text-sm font-semibold text-[var(--gt-gold-ink)]">หลังจบ{roundLabel(open.item)}</p>
                  <h3 id="news-title" className="mt-1 text-xl font-bold">{open.item.headline}</h3>
                  <p className="mt-2 leading-relaxed">{open.item.body}</p>
                  {open.item.upsets.length > 0 && (
                    <>
                      <h4 className="mt-4 font-bold">พลิกล็อก</h4>
                      <ul className="mt-1 list-disc space-y-1 pl-5">{open.item.upsets.map((u) => <li key={u}>{u}</li>)}</ul>
                    </>
                  )}
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setOpen(null)} className="gt-outline-btn min-h-12 font-semibold">ปิด</button>
                    <button type="button" onClick={() => { setOpen(null); showTab("standings"); }} className="gt-cta-btn min-h-12">ดูตารางอันดับ →</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        (document.querySelector(".gt") as HTMLElement | null) ?? document.body,
      )}
    </div>
  );
}
