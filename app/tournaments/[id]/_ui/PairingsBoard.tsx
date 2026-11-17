"use client";
/* eslint-disable @next/next/no-img-element -- athlete photos come from storage URLs */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { resultLabel, scoresFrom } from "@/lib/competition-day.mjs";
import { staffDb } from "@/app/organizer/_lib/staff";
import { DEFAULT_AVATAR } from "./MatchCard";
import ResultControls from "./ResultControls";
import { pingLive } from "./live";
import type { Bye, Match, Person } from "./data";

/**
 * Public "จับคู่ & ผลการแข่งขัน" board (design 16 Nov 2026, light + dark): round buttons, search, pool filter,
 * one card per table (photo, colour, name, institution, rank, points before the round), paged.
 * Everyone sees the status; an organiser of this event who is signed in also gets the result buttons on each
 * table of the latest round (the database checks it again).
 */
const PAGE = 10;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Is the signed-in user (if any) staff of this event? */
function useCanManage(tournamentId: string) {
  const [can, setCan] = useState(false);
  useEffect(() => {
    const db = staffDb();
    if (!db) return;
    let live = true;
    db.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: ok } = await db.rpc("gt_can_manage_tournament_v1", { p_tournament: tournamentId });
      if (live) setCan(Boolean(ok));
    });
    return () => { live = false; };
  }, [tournamentId]);
  return can;
}

type SeatInfo = { id: string; name: string; institution?: string; rank?: string | null; photo?: string | null; score: number; won: boolean; lost: boolean };

function Photo({ s, className }: { s: SeatInfo; className: string }) {
  if (!s.photo) return <img src={DEFAULT_AVATAR} alt="" loading="lazy" className={`${className} shrink-0 object-contain`} />;
  return <img src={s.photo} alt="" loading="lazy" onError={(e) => { if (!e.currentTarget.src.endsWith(DEFAULT_AVATAR)) e.currentTarget.src = DEFAULT_AVATAR; }} className={`${className} shrink-0 rounded-full border-2 border-[var(--gt-cta)]/40 object-cover`} />;
}
function ColourChip({ colour }: { colour: "black" | "white" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--gt-line)] bg-[var(--gt-surface-2)] py-0.5 pl-0.5 pr-2 text-xs font-semibold">
      <span aria-hidden="true" className={`h-5 w-5 rounded-full ${colour === "black" ? "bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)]" : "border border-[#b7bfcc] bg-[radial-gradient(circle_at_35%_30%,#fff,#dfe3ea_70%)]"}`} />
      {colour === "black" ? "ดำ" : "ขาว"}
    </span>
  );
}
function WonTag() { return <span className="ml-1.5 inline-block rounded-md bg-[var(--gt-win-bg)] px-1.5 align-middle text-xs font-semibold text-[var(--gt-win-ink)]">ชนะ</span>; }

/** Desktop: photo left, details right. Mobile: centred column. */
function Side({ s, colour }: { s: SeatInfo; colour: "black" | "white" }) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-1.5 text-center md:flex-row md:items-center md:gap-4 md:text-left ${s.lost ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2 md:contents">
        <span className="md:hidden"><ColourChip colour={colour} /></span>
        <Photo s={s} className={`h-20 w-20 md:h-24 md:w-24 ${s.won ? "ring-4 ring-[var(--gt-gold)] rounded-full" : ""}`} />
      </div>
      <div className="min-w-0">
        <p className="flex items-center justify-center gap-2 md:justify-start">
          <span className="hidden md:inline-flex"><ColourChip colour={colour} /></span>
          <span className="break-words text-[17px] font-bold leading-tight md:text-xl">{s.name}{s.won && <WonTag />}</span>
        </p>
        {s.institution && <p className="mt-0.5 truncate text-sm text-[var(--gt-muted)]"><span className="hidden md:inline">สถาบัน </span>{s.institution}</p>}
        <p className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-sm md:justify-start">
          {s.rank && <span className="rounded-md bg-[var(--gt-cta-soft)] px-2 py-0.5 font-semibold text-[var(--gt-cta)]">{s.rank}</span>}
          <span className="gt-num">{fmt(s.score)} คะแนน</span>
        </p>
      </div>
    </div>
  );
}

function TableCard({ m, black, white, controls }: { m: Match; black: SeatInfo; white: SeatInfo; controls: React.ReactNode }) {
  const done = m.state === "verified";
  const status = done ? resultLabel(m) || "บันทึกผลแล้ว" : "รอผลการแข่งขัน";
  return (
    <li className={`overflow-hidden rounded-2xl border-2 bg-[var(--gt-surface)] shadow-sm ${done ? "border-[var(--gt-line)]" : "border-[var(--gt-cta)]/60"}`}>
      {/* mobile header */}
      <div className="flex items-center justify-between gap-2 bg-[var(--gt-cta-soft)] px-3 py-2 md:hidden">
        <span className="gt-num rounded-lg bg-[var(--gt-btn-black)] px-3 py-1 text-base font-bold text-white">โต๊ะ {m.board_number ?? "–"}</span>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${done ? "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]" : "bg-[var(--gt-surface)] text-[var(--gt-cta)]"}`}>{done ? status : "รอผล"}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-5 md:px-5 md:py-4">
        <span className="gt-num hidden self-start rounded-lg bg-[var(--gt-btn-black)] px-3 py-1 text-lg font-bold text-white md:inline-block">โต๊ะ {m.board_number ?? "–"}</span>
        <Side s={black} colour="black" />
        <span className="flex h-full flex-col items-center justify-center">
          <span aria-hidden="true" className="w-px flex-1 bg-[var(--gt-line)]" />
          <span className="my-1 rounded-full border border-[var(--gt-cta)]/40 bg-[var(--gt-cta-soft)] px-2.5 py-1 text-sm font-bold text-[var(--gt-cta)] md:text-base">VS</span>
          <span aria-hidden="true" className="w-px flex-1 bg-[var(--gt-line)]" />
        </span>
        <Side s={white} colour="white" />
      </div>
      {/* status / result bar */}
      <div className="mx-3 mb-3 flex flex-col gap-2 rounded-xl bg-[var(--gt-surface-2)] px-3 py-2.5 md:mx-4 md:flex-row md:items-center md:gap-4">
        <p className={`hidden items-center gap-2 text-[15px] md:flex ${done ? "font-semibold text-[var(--gt-win-ink)]" : "text-[var(--gt-muted)]"}`}>
          {done ? <span aria-hidden="true">✓</span> : <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>}
          {status}
        </p>
        {controls && <div className="md:ml-auto md:min-w-[30rem]">{controls}</div>}
        {!controls && <p className={`text-center text-sm md:hidden ${done ? "font-semibold text-[var(--gt-win-ink)]" : "text-[var(--gt-muted)]"}`}>{status}</p>}
      </div>
    </li>
  );
}

function StaffResult({ m, divisionId }: { m: Match; divisionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const done = m.state === "verified";
  const record = async (code: string, margin: string | null) => {
    setBusy(true); setError("");
    const { error: e } = await staffDb()!.rpc("gt_staff_record_result_v1", { p_match: m.id, p_result: code, p_margin: margin });
    setBusy(false);
    if (e) { setError("บันทึกไม่สำเร็จ กรุณาลองใหม่"); return; }
    setEditing(false); pingLive(divisionId);
    window.setTimeout(() => router.refresh(), 500);
  };
  if (done && !editing) return <button type="button" onClick={() => setEditing(true)} className="min-h-10 text-sm text-[var(--gt-muted)] underline">แก้ผล (ผู้จัด)</button>;
  return (
    <div>
      <ResultControls busy={busy} onRecord={record} onCancel={done ? () => setEditing(false) : undefined} />
      {error && <p role="alert" className="mt-1 text-sm text-[var(--gt-bad)]">{error}</p>}
    </div>
  );
}

export default function PairingsBoard({ matches, byes, people, tournamentId, divisionId }: {
  matches: Match[]; byes: Bye[]; people: Record<string, Person>; tournamentId: string; divisionId: string;
}) {
  const rounds = useMemo(() => [...new Set([...matches.map((m) => m.round_number), ...byes.map((b) => b.round_number)])].sort((a, b) => a - b), [matches, byes]);
  const pools = useMemo(() => [...new Set(matches.map((m) => m.pool_label ?? ""))].sort(), [matches]);
  // Follows the newest round as it is announced (live), unless the viewer picked an older one.
  const latest = rounds[rounds.length - 1] ?? 1;
  const [picked, setRound] = useState<number | null>(null);
  const round = picked !== null && rounds.includes(picked) ? picked : latest;
  const [pool, setPool] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const staff = useCanManage(tournamentId);

  const before = useMemo(
    () => scoresFrom(Object.keys(people), matches.filter((m) => m.round_number < round), byes.filter((b) => b.round_number < round)).score,
    [matches, byes, round, people],
  );
  const seat = (id: string, m: Match): SeatInfo => ({
    id, name: people[id]?.name ?? "ผู้เข้าแข่งขัน", institution: people[id]?.institution, rank: people[id]?.rank, photo: people[id]?.photo,
    score: before.get(id) ?? 0, won: m.winner_athlete_id === id, lost: m.state === "verified" && Boolean(m.winner_athlete_id) && m.winner_athlete_id !== id,
  });
  const term = q.trim().toLowerCase();
  const hit = (id: string) => [people[id]?.name, people[id]?.institution].some((x) => (x ?? "").toLowerCase().includes(term));
  const all = matches
    .filter((m) => m.round_number === round && (pool === "all" || (m.pool_label ?? "") === pool))
    .filter((m) => !term || String(m.board_number) === term.replace(/^โต๊ะ\s*/, "") || hit(m.black_athlete_id) || hit(m.white_athlete_id))
    .sort((a, b) => (a.pool_label ?? "").localeCompare(b.pool_label ?? "") || (a.board_number ?? 0) - (b.board_number ?? 0));
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const tables = all.slice(cur * PAGE, cur * PAGE + PAGE);
  const roundByes = byes.filter((b) => b.round_number === round && (pool === "all" || (b.pool_label ?? "") === pool) && (!term || hit(b.athlete_id)));
  const roundMatches = matches.filter((m) => m.round_number === round);
  const done = roundMatches.length > 0 && roundMatches.every((m) => m.state === "verified");
  const pending = roundMatches.filter((m) => m.state !== "verified").length;
  const go = (r: number) => { setRound(r === latest ? null : r); setPage(0); };

  return (
    <section className="mt-4 space-y-4" aria-labelledby="pairs-h">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="pairs-h" className="mr-auto text-2xl font-bold md:text-3xl">จับคู่ &amp; ผลการแข่งขัน</h2>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${done ? "border-[var(--gt-line)] bg-[var(--gt-surface-2)] text-[var(--gt-muted)]" : "border-[var(--gt-ok)]/50 bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]"}`}>
          {!done && <span aria-hidden="true" className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--gt-ok)]" />}
          {done ? `รอบที่ ${round} • จบแล้ว` : `รอบที่ ${round} • กำลังแข่งขัน${pending ? ` (รอผล ${pending})` : ""}`}
        </span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="เลือกรอบ">
          <span className="font-semibold md:hidden">รอบ</span>
          {rounds.map((r) => (
            <button key={r} type="button" onClick={() => go(r)} aria-pressed={r === round}
              className={`gt-num min-h-11 min-w-12 rounded-xl border px-3 font-semibold md:min-w-24 ${r === round ? "border-[var(--gt-cta)] bg-[var(--gt-cta)] text-white shadow" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`}>
              <span className="hidden md:inline">รอบ </span>{r}
            </button>
          ))}
        </div>
        <div className="flex gap-2 lg:ml-auto lg:w-[26rem]">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">ค้นหานักกีฬา</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--gt-muted)]" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="ค้นหานักกีฬา / สถาบัน / โต๊ะ" type="search"
              className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] pl-10 pr-3 text-base" />
          </label>
          {pools.length > 1 && (
            <select value={pool} onChange={(e) => { setPool(e.target.value); setPage(0); }} aria-label="เลือกสาย" className="min-h-12 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-2">
              <option value="all">ทุกสาย</option>
              {pools.map((p) => <option key={p} value={p}>สาย {p}</option>)}
            </select>
          )}
        </div>
      </div>

      {staff && <p className="rounded-xl border border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] px-3 py-2 text-sm text-[var(--gt-gold-ink)]">คุณเป็นผู้จัดงานนี้ — ลงผลได้จากหน้านี้ (เฉพาะรอบล่าสุด) · ผู้ชมทั่วไปจะไม่เห็นปุ่มลงผล</p>}

      <ul className="space-y-3">
        {tables.map((m) => (
          <TableCard key={m.id} m={m} black={seat(m.black_athlete_id, m)} white={seat(m.white_athlete_id, m)}
            controls={staff && round === latest ? <StaffResult key={`${m.id}:${m.state}`} m={m} divisionId={divisionId} /> : null} />
        ))}
        {cur === pages - 1 && roundByes.map((b) => {
          const p = people[b.athlete_id];
          return (
            <li key={b.athlete_id} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--gt-line)] bg-[var(--gt-surface)] px-4 py-3">
              <img src={p?.photo || DEFAULT_AVATAR} alt="" onError={(e) => { if (!e.currentTarget.src.endsWith(DEFAULT_AVATAR)) e.currentTarget.src = DEFAULT_AVATAR; }} className={`h-14 w-14 shrink-0 ${p?.photo ? "rounded-full object-cover" : "object-contain"}`} />
              <span className="min-w-0 flex-1"><span className="block font-semibold">{p?.name ?? "ผู้เข้าแข่งขัน"}</span><span className="block text-sm text-[var(--gt-muted)]">{p?.institution}</span></span>
              <span className="shrink-0 rounded-full bg-[var(--gt-win-bg)] px-3 py-1 text-sm font-semibold text-[var(--gt-win-ink)]">บาย +1 คะแนน</span>
            </li>
          );
        })}
        {!all.length && !roundByes.length && <li className="gt-card p-6 text-center text-sm text-[var(--gt-muted)]">ไม่พบโต๊ะที่ค้นหา</li>}
      </ul>

      {pages > 1 && (
        <nav aria-label="หน้าโต๊ะ" className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" disabled={cur === 0} onClick={() => setPage(cur - 1)} className="min-h-11 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-4 disabled:opacity-40">‹ ก่อนหน้า</button>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" onClick={() => setPage(i)} aria-current={i === cur ? "page" : undefined}
              className={`gt-num min-h-11 min-w-11 rounded-xl border ${i === cur ? "border-[var(--gt-cta)] bg-[var(--gt-cta)] text-white" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`}>{i + 1}</button>
          ))}
          <button type="button" disabled={cur === pages - 1} onClick={() => setPage(cur + 1)} className="min-h-11 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-4 disabled:opacity-40">ถัดไป ›</button>
        </nav>
      )}
    </section>
  );
}
