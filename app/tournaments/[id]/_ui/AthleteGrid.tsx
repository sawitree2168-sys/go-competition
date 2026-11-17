"use client";
/* eslint-disable @next/next/no-img-element -- athlete photos come from arbitrary storage URLs */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { DEFAULT_AVATAR } from "./MatchCard";
import { shortRank } from "./CrossTable";
import { resultLabel } from "@/lib/competition-day.mjs";
import type { Bye, Match, Person } from "./data";
import type { ResultEvent } from "@/lib/public-site";
import { thaiDate } from "@/lib/division-display";

/** One athlete of the division (from imported registrations, or from the sign-up sheet before import). */
export type AthleteCard = { key: string; id: string | null; name: string; institution: string; rank: string | null; photo: string | null; payment: string | null };

const PAGE = 12;

function payBadge(s: string | null) {
  if (!s) return null;
  if (s === "ชำระเงินแล้ว") return { text: "ชำระแล้ว", cls: "text-[var(--gt-ok)]" };
  if (s.includes("รอตรวจ")) return { text: "รอตรวจสอบ", cls: "text-[var(--gt-warn)]" };
  if (s.includes("ยังไม่")) return { text: "ยังไม่ชำระ", cls: "text-[var(--gt-muted)]" };
  return { text: s.slice(0, 12), cls: "text-[var(--gt-muted)]" };
}

/**
 * แท็บ "นักกีฬา" (approved design 16 Nov 2026): count, search by name/institution, rank filter,
 * card grid (3 per row on desktop, list on phone), pagination, and "ดูประวัติการแข่งขัน" = this athlete's games in this event.
 */
export default function AthleteGrid({ athletes, historicalResults, matches, byes, people }: { athletes: AthleteCard[]; historicalResults: ResultEvent[]; matches: Match[]; byes: Bye[]; people: Record<string, Person> }) {
  const [q, setQ] = useState("");
  const [rank, setRank] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AthleteCard | null>(null);
  const query = useDeferredValue(q.trim().toLowerCase());
  const ranks = useMemo(() => [...new Set(athletes.map((a) => shortRank(a.rank)).filter(Boolean) as string[])]
    .sort((a, b) => (a.endsWith("d") === b.endsWith("d") ? (a.endsWith("d") ? parseInt(b) - parseInt(a) : parseInt(a) - parseInt(b)) : a.endsWith("d") ? -1 : 1)), [athletes]);
  const filtered = athletes.filter((a) => (!query || `${a.name} ${a.institution}`.toLowerCase().includes(query)) && (rank === "all" || shortRank(a.rank) === rank));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE, current * PAGE);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section className="mt-4 space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-[var(--gt-brand)]" />นักกีฬา
          <span className="gt-num rounded-full bg-[var(--gt-surface-2)] px-2.5 py-0.5 text-sm font-semibold">{athletes.length} คน</span></h2>
        <p className="text-sm text-[var(--gt-muted)]">รู้จักผู้เข้าแข่งขัน และดูประวัติการแข่งขัน</p>
      </div>
      <div className="flex gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5 shrink-0 text-[var(--gt-muted)]" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
          <span className="sr-only">ค้นหาชื่อหรือสถาบัน</span>
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อ หรือสถาบัน…" autoComplete="off"
            className="w-full min-w-0 bg-transparent py-3 text-base outline-none placeholder:text-[var(--gt-muted)]" />
        </label>
        {ranks.length > 0 && (
          <select value={rank} onChange={(e) => { setRank(e.target.value); setPage(1); }} aria-label="กรองตามระดับ"
            className="min-h-12 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-2 text-base">
            <option value="all">ทุกระดับ</option>
            {ranks.map((r) => <option key={r} value={r}>{r.replace(/d$/, " Dan").replace(/k$/, " Kyu")}</option>)}
          </select>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((a) => {
          const pay = payBadge(a.payment);
          const k = shortRank(a.rank);
          return (
            <li key={a.key} className="gt-card flex gap-3 overflow-hidden p-2.5 sm:flex-col sm:gap-0 sm:p-0">
              <div className="shrink-0 rounded-xl bg-[linear-gradient(180deg,var(--gt-avatar-top),var(--gt-surface-2))] p-2 sm:rounded-none sm:py-3">
                <img src={a.photo || DEFAULT_AVATAR} alt="" loading="lazy" className={`mx-auto h-20 w-20 sm:h-28 sm:w-28 ${a.photo ? "rounded-full object-cover" : "object-contain"}`} />
              </div>
              <div className="min-w-0 flex-1 space-y-1 sm:px-3 sm:py-3">
                {a.id
                  ? <Link href={`/athletes/${a.id}`} className="block truncate text-lg font-bold leading-tight hover:underline">{a.name}</Link>
                  : <p className="truncate text-lg font-bold leading-tight">{a.name}</p>}
                <p className="truncate text-sm text-[var(--gt-muted)]">{a.institution || "—"}</p>
                <p className="flex flex-wrap items-center gap-2">
                  {k && <span className="rounded-full bg-[var(--gt-surface-2)] px-2.5 py-0.5 text-sm font-bold text-[var(--gt-brand)]">{k.replace(/d$/, " Dan").replace(/k$/, " Kyu")}</span>}
                  {pay && <span className={`text-xs font-semibold ${pay.cls}`}>{pay.text}</span>}
                </p>
                <button type="button" onClick={() => setOpen(a)} className="mt-1 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg bg-[var(--gt-surface-2)] text-sm font-semibold text-[var(--gt-brand)]">
                  ดูประวัติการแข่งขัน <span aria-hidden="true">→</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {!filtered.length && <p className="gt-card p-4 text-center text-sm text-[var(--gt-muted)]">ไม่พบนักกีฬาที่ค้นหา</p>}

      {pages > 1 && (
        <nav aria-label="เลือกหน้า" className="flex items-center justify-center gap-1.5">
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="หน้าก่อน" className="h-11 w-11 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] disabled:opacity-40">‹</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => setPage(n)} aria-current={n === current ? "page" : undefined}
              className={`gt-num h-11 min-w-11 rounded-xl border px-2 font-semibold ${n === current ? "border-[var(--gt-brand)] bg-[var(--gt-brand)] text-white" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`}>{n}</button>
          ))}
          <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="หน้าถัดไป" className="h-11 w-11 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] disabled:opacity-40">›</button>
        </nav>
      )}

      {open && createPortal(<History athlete={open} historicalResults={historicalResults} matches={matches} byes={byes} people={people} onClose={() => setOpen(null)} />,
        (document.querySelector(".gt") as HTMLElement | null) ?? document.body)}
    </section>
  );
}

function History({ athlete, historicalResults, matches, byes, people, onClose }: { athlete: AthleteCard; historicalResults: ResultEvent[]; matches: Match[]; byes: Bye[]; people: Record<string, Person>; onClose: () => void }) {
  const id = athlete.id;
  const nameKey = (name: string) => name.normalize("NFC").replace(/^(?:ด\.?ช\.?|ด\.?ญ\.?|เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง)\s*/, "").replace(/[\s\u200b-\u200d\ufeff]+/g, "").toLowerCase();
  const history = historicalResults.flatMap((event) => event.divisions.flatMap((division) => division.people
    .filter((person) => id && person.athlete_id ? person.athlete_id === id : nameKey(person.full_name) === nameKey(athlete.name))
    .map((person) => ({ event, division: division.division, person }))));
  const rounds = [
    ...matches.filter((m) => id && (m.black_athlete_id === id || m.white_athlete_id === id)).map((m) => {
      const black = m.black_athlete_id === id;
      const opp = black ? m.white_athlete_id : m.black_athlete_id;
      const verdict = m.state !== "verified" ? "รอผล" : m.result_code === "draw" ? "เสมอ" : m.winner_athlete_id === id ? "ชนะ" : "แพ้";
      return { round: m.round_number, board: m.board_number, black, opp, verdict, detail: resultLabel(m) };
    }),
    ...byes.filter((b) => id && b.athlete_id === id).map((b) => ({ round: b.round_number, board: null, black: null, opp: null, verdict: "บาย", detail: "ได้ 1 คะแนน" })),
  ].sort((a, b) => a.round - b.round);
  const tone: Record<string, string> = { ชนะ: "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]", แพ้: "bg-[var(--gt-loss-bg)] text-[var(--gt-loss-ink)]", เสมอ: "bg-[var(--gt-gold-soft)] text-[var(--gt-gold-ink)]", บาย: "bg-[var(--gt-surface-2)] text-[var(--gt-brand)]", รอผล: "border border-[var(--gt-line)] text-[var(--gt-muted)]" };
  const points = rounds.reduce((n, r) => n + (r.verdict === "ชนะ" || r.verdict === "บาย" ? 1 : r.verdict === "เสมอ" ? 0.5 : 0), 0);

  return (
    <div role="dialog" aria-modal="true" aria-label={`ประวัติการแข่งขัน ${athlete.name}`} onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[var(--gt-surface)] p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <img src={athlete.photo || DEFAULT_AVATAR} alt="" className={`h-16 w-16 ${athlete.photo ? "rounded-full object-cover" : "object-contain"}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{athlete.name}</p>
            <p className="text-xs text-[var(--gt-muted)]">สถาบันที่สมัครรายการปัจจุบัน</p>
            <p className="text-sm text-[var(--gt-muted)]">{athlete.institution || "ไม่ระบุสถาบัน"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="grid h-11 w-11 place-items-center rounded-full border border-[var(--gt-line)]">✕</button>
        </div>
        <h3 className="mt-4 font-bold">ผลการแข่งขันที่ผ่านมา</h3>
        {!history.length && <p className="mt-2 text-sm text-[var(--gt-muted)]">ยังไม่พบผลการแข่งขันที่ผ่านมาของนักกีฬาคนนี้ในข้อมูลที่บันทึกไว้</p>}
        <ul className="mt-2 space-y-3">
          {history.map(({ event, division, person }) => (
            <li key={`${event.title}-${division}`} className="rounded-xl border border-[var(--gt-line)] p-3">
              <p className="text-xs text-[var(--gt-muted)]">{thaiDate(event.date) ?? "ไม่ระบุวันที่"}</p>
              <p className="mt-1 font-bold">{event.title}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--gt-muted)]">สถาบันในรายการนี้: {person.institution?.trim() || "ไม่ระบุในข้อมูลการแข่งขัน"}</p>
              <p className="text-sm text-[var(--gt-muted)]">{division}{person.placing != null ? ` · อันดับ ${person.placing}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm font-bold">
                <span className="rounded-lg bg-[var(--gt-win-bg)] px-3 py-1 text-[var(--gt-win-ink)]">ชนะ {person.wins}</span>
                <span className="rounded-lg bg-[var(--gt-loss-bg)] px-3 py-1 text-[var(--gt-loss-ink)]">แพ้ {person.losses}</span>
                {person.byes > 0 && <span className="px-1 py-1">บาย {person.byes}</span>}
              </div>
              {(person.points != null || person.sos != null) && <p className="mt-2 text-sm">{person.points != null ? `คะแนน ${person.points}` : ""}{person.sos != null ? ` · SOS ${person.sos}` : ""}</p>}
              <Link href={`/results?event=${encodeURIComponent(event.title)}`} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-[var(--gt-brand)]">ดูผลการแข่งขันรายการนี้ →</Link>
            </li>
          ))}
        </ul>
        <h3 className="mt-4 font-bold">การแข่งขันในรายการปัจจุบัน <span className="gt-num font-normal text-[var(--gt-muted)]">({points} คะแนน จาก {rounds.length} รอบ)</span></h3>
        {!rounds.length && <p className="mt-2 text-sm text-[var(--gt-muted)]">ยังไม่มีการแข่งขัน</p>}
        <ol className="mt-2 space-y-2">
          {rounds.map((r) => (
            <li key={r.round} className="flex items-center gap-3 rounded-xl border border-[var(--gt-line)] px-3 py-2">
              <span className="gt-num w-14 shrink-0 text-sm font-semibold text-[var(--gt-muted)]">รอบ {r.round}</span>
              <span className="min-w-0 flex-1 text-sm">
                {r.opp ? <>
                  <span className="block truncate font-semibold">พบ {people[r.opp]?.name ?? "ผู้เข้าแข่งขัน"}</span>
                  <span className="block truncate text-xs text-[var(--gt-muted)]">โต๊ะ {r.board ?? "–"} · ถือ{r.black ? "ดำ" : "ขาว"}{r.detail ? ` · ${r.detail}` : ""}</span>
                </> : <span className="text-[var(--gt-muted)]">{r.detail}</span>}
              </span>
              <span className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ${tone[r.verdict]}`}>{r.verdict}</span>
            </li>
          ))}
        </ol>
        {athlete.id && (
          <Link href={`/athletes/${athlete.id}`} className="gt-cta-btn mt-4 flex min-h-12 items-center justify-center gap-1">ดูโปรไฟล์และสถิติทุกรายการ →</Link>
        )}
      </div>
    </div>
  );
}
