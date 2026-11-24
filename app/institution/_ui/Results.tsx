"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { OUTCOME, atRound, shortRank, trackStatus, trackedEvents } from "@/lib/institution-portal.mjs";
import { Avatar, ICONS, type Overview, type Student, type Track, type TrackRound, type View } from "./bits";
import { DisplayModeToggle, useInstitutionDisplayMode } from "./DisplayMode";
import ShareSave, { capture } from "./ShareSave";
import StudentPanel, { useOpenStudent } from "./StudentPanel";
import { StatTile, shortName, thDate } from "./Overview";
import { RankBadge } from "./StudentsPage";

/**
 * ผลการแข่งขัน (design approved 24 Nov 2026): one competition at a time, filtered by status, division (รุ่น/สาย)
 * and round; list (table) or student cards. Phone cards are 4 per row, grouped by division.
 * The page reloads the data every 30 seconds while this view is open (Portal).
 */

type Status = "all" | "live" | "done" | "waiting";
type Row = Track & { student: Student | undefined; colour: TrackRound["colour"] | undefined; key: string };

const STATUS_LABEL: Record<Exclude<Status, "all">, string> = { live: "กำลังแข่ง", done: "มีผลแล้ว", waiting: "รอจับคู่" };
const field = "min-h-11 rounded-xl border border-[#c4d7f0] bg-white px-3 text-[15px] text-[#0d2a5c]";
const colourTh = (c: TrackRound["colour"] | undefined) => (c === "black" ? "ดำ" : c === "white" ? "ขาว" : "");

/** Result badge: colour + words, never colour alone. */
function ResultBadge({ row, small = false }: { row: Row; small?: boolean }) {
  const st = trackStatus(row);
  const size = small ? "min-h-7 px-1.5 text-[12px]" : "min-h-9 px-3 text-sm";
  if (st === "waiting") return <span className={`inline-flex items-center justify-center gap-1 rounded-lg bg-[#eef2f7] font-semibold text-[#475569] ${size}`}>รอจับคู่</span>;
  if (st === "live") return <span className={`inline-flex items-center justify-center gap-1 rounded-lg bg-[#16a34a] font-semibold text-white ${size}`}><span aria-hidden="true">▶</span>{small ? "กำลังแข่ง" : "กำลังแข่งขัน"}</span>;
  const o = row.outcome;
  const tone = o === "win" ? "bg-[#dcf5e5] text-[#176738]" : o === "loss" ? "bg-[#ffe3e6] text-[#b4232f]" : o === "bye" ? "bg-[#e4efff] text-[#1660d0]" : "bg-[#eef2f7] text-[#334155]";
  const mark = o === "win" ? "✓" : o === "loss" ? "✕" : "";
  const c = colourTh(row.colour);
  return <span className={`inline-flex items-center justify-center gap-1 rounded-lg font-bold ${tone} ${size}`}>{mark && <span aria-hidden="true">{mark}</span>}{OUTCOME[o].label}{c && !small && o !== "bye" ? <span className="font-semibold">({c})</span> : null}</span>;
}

export default function Results({ ov, track, go }: { ov: Overview; track: Track[]; go: (v: View) => void }) {
  const events = useMemo(() => trackedEvents(track), [track]);
  const [eventId, setEventId] = useState("");
  const ev = events.find((e) => e.id === eventId) ?? events[0];
  const [status, setStatus] = useState<Status>("all");
  const [division, setDivision] = useState("");
  const [round, setRound] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useInstitutionDisplayMode("results", "cards");
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useOpenStudent();
  const [updated, setUpdated] = useState<Date | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const who = useMemo(() => new Map(ov.students.map((s) => [s.id, s])), [ov.students]);

  useEffect(() => { queueMicrotask(() => setUpdated(new Date())); }, [track]);
  const pickEvent = (id: string) => { setEventId(id); setDivision(""); setRound(null); setStatus("all"); };

  /** Every student's row in this event, as it stood in the chosen round (latest by default). */
  const all = useMemo<Row[]>(() => {
    if (!ev) return [];
    return track.filter((t) => t.tournament_id === ev.id).flatMap((t) => {
      const r = atRound(t, round);
      if (!r) return [];
      const colour = (t.rounds ?? []).find((x) => x.round === r.round)?.colour;
      return [{ ...r, student: who.get(t.athlete_id), colour, key: `${t.athlete_id}:${t.division_id}` }];
    }).sort((a, b) => a.division.localeCompare(b.division, "th") || (b.points ?? 0) - (a.points ?? 0)
      || (a.student?.name ?? "").localeCompare(b.student?.name ?? "", "th"));
  }, [track, ev, round, who]);

  const divisions = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const r of all) { const d = m.get(r.division_id) ?? { id: r.division_id, name: r.division, count: 0 }; d.count++; m.set(r.division_id, d); }
    return [...m.values()];
  }, [all]);
  const rounds = useMemo(() => {
    const s = new Set<number>();
    for (const t of track) if (t.tournament_id === ev?.id) for (const r of t.rounds ?? []) s.add(r.round);
    return [...s].sort((a, b) => a - b);
  }, [track, ev]);

  const inDivision = all.filter((r) => !division || r.division_id === division);
  const count = (s: Exclude<Status, "all">) => inDivision.filter((r) => trackStatus(r) === s).length;
  const k = q.trim().toLowerCase();
  const rows = inDivision.filter((r) => (status === "all" || trackStatus(r) === status)
    && (!k || `${r.student?.name ?? ""} ${r.student?.nickname ?? ""} ${r.student?.go_id ?? ""} ${r.opponent ?? ""} ${r.division}`.toLowerCase().includes(k)));

  // Event totals over every played round (byes are not games).
  const totals = useMemo(() => {
    let wins = 0, losses = 0;
    const people = new Set<string>();
    for (const t of track) {
      if (t.tournament_id !== ev?.id) continue;
      people.add(t.athlete_id);
      for (const r of t.rounds ?? []) { if (r.outcome === "win") wins++; else if (r.outcome === "loss") losses++; }
    }
    return { people: people.size, wins, losses, rate: wins + losses ? Math.round((wins / (wins + losses)) * 100) : null };
  }, [track, ev]);
  const places = useMemo(() => {
    const c = [0, 0, 0];
    for (const r of ov.records) if (r.tournament_id === ev?.id && r.games > 0 && r.pos && r.pos <= 3) c[r.pos - 1]++;
    return c;
  }, [ov.records, ev]);

  const chosen = ov.students.find((s) => s.id === open);
  if (chosen) return <StudentPanel academyId={ov.academy.id} academyName={ov.academy.name} student={chosen} records={ov.records} rank={null} onClose={() => setOpen(null)} backLabel="← กลับไปผลการแข่งขัน" />;

  if (!ev) return (
    <div className="rounded-2xl border border-[#cfe0f5] bg-white p-8 text-center">
      <p className="text-[#4b6588]">ยังไม่มีนักเรียนลงแข่งในรายการที่เผยแพร่แล้ว</p>
      <button type="button" onClick={() => go("apply")} className="mt-4 min-h-11 rounded-xl bg-[#0b5fc6] px-5 font-semibold text-white">สมัครแข่งขัน</button>
    </div>
  );

  const site = !ev.id.startsWith("h:");
  const tabs = (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-sm font-semibold">
      <span className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#0b5fc6] px-4 text-white"><span className="h-4 w-4">{ICONS.tracking}</span>รายการแข่งขัน</span>
      <button type="button" onClick={() => go("live")} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#cfe0f5] bg-white px-4 text-[#21406e] hover:border-[#0b5fc6]"><span className="h-4 w-4">{ICONS.stats}</span>สรุปผลงาน</button>
      {site && <Link href={`/tournaments/${ev.id}/standings`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#cfe0f5] bg-white px-4 text-[#21406e] hover:border-[#0b5fc6]">ตารางคะแนน ↗</Link>}
      {site && division && <Link href={`/tournaments/${ev.id}/divisions/${division}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#cfe0f5] bg-white px-4 text-[#21406e] hover:border-[#0b5fc6]">ผังผู้แข่ง ↗</Link>}
      {ev.live && <span className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#e9f8ef] px-3 text-[#176738]"><span aria-hidden="true" className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#16a34a]" />อัปเดตอัตโนมัติ (ทุก 30 วินาที){updated && <span className="font-normal">· {updated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>}</span>}
    </div>
  );

  const chip = (on: boolean, tone: "blue" | "green" | "grey" = "blue") => `inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border px-4 text-sm font-semibold ${on
    ? "border-[#0b5fc6] bg-[#0b5fc6] text-white"
    : tone === "green" ? "border-[#bfe5cd] bg-[#e9f8ef] text-[#176738]" : tone === "grey" ? "border-[#d6dee9] bg-[#f1f5f9] text-[#334155]" : "border-[#cfe0f5] bg-[#f4f8fe] text-[#21406e]"}`;

  const groups = divisions.filter((d) => !division || d.id === division)
    .map((d) => ({ ...d, rows: rows.filter((r) => r.division_id === d.id) })).filter((g) => g.rows.length);
  const toggle = (id: string) => setClosed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const shareText = `${ov.academy.name} · ${ev.title}\nนักเรียน ${totals.people} คน · ชนะ ${totals.wins} แพ้ ${totals.losses}${totals.rate != null ? ` · อัตราชนะ ${totals.rate}%` : ""}${places.some(Boolean) ? `\nอันดับ 1: ${places[0]} คน · อันดับ 2: ${places[1]} คน · อันดับ 3: ${places[2]} คน` : ""}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#cfe0f5] bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(10,60,130,.06)]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#fff5dd] p-2.5">{ICONS.awards}</span>
          <span className="min-w-0 flex-1">
            <span className="sr-only">เลือกรายการแข่งขัน</span>
            <select value={ev.id} onChange={(e) => pickEvent(e.target.value)} className="w-full truncate bg-transparent text-[17px] font-bold text-[#0d2a5c] outline-none">
              {events.map((e) => <option key={e.id} value={e.id}>{e.live ? "● " : ""}{e.title}</option>)}
            </select>
            <span className="block truncate text-sm text-[#4b6588]">📅 {thDate(ev.date, "long")}{ev.live ? " · กำลังแข่งขัน" : ""}</span>
          </span>
        </label>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <StatTile tone="blue" icon={ICONS.students} label="นักเรียน" value={totals.people} unit="คน" />
          <StatTile tone="green" icon={ICONS.awards} label="ชนะ" value={totals.wins} />
          <StatTile tone="red" icon={<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>} label="แพ้" value={totals.losses} />
          <StatTile tone="gold" icon={ICONS.stats} label="อัตราชนะ" value={totals.rate == null ? "—" : `${totals.rate}%`} />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-[#cfe0f5] bg-white p-3 shadow-[0_4px_14px_rgba(10,60,130,.06)] sm:p-4">
        {tabs}
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="กรองตามสถานะ" className="-mx-1 flex gap-2 overflow-x-auto px-1">
            <button type="button" aria-pressed={status === "all"} onClick={() => setStatus("all")} className={chip(status === "all")}>ทั้งหมด ({inDivision.length})</button>
            {(["live", "done", "waiting"] as const).map((s) => (count(s) || status === s) ? (
              <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={chip(status === s, s === "live" ? "green" : "grey")}>{STATUS_LABEL[s]} ({count(s)})</button>
            ) : null)}
          </div>
          <span className="ml-auto"><DisplayModeToggle mode={mode} onChange={setMode} /></span>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
          <select aria-label="รุ่น / สาย" value={division} onChange={(e) => setDivision(e.target.value)} className={`${field} hidden sm:block`}>
            <option value="">ทุกรุ่น / สาย</option>{divisions.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.count})</option>)}
          </select>
          <select aria-label="รอบ" value={round ?? ""} onChange={(e) => setRound(e.target.value ? Number(e.target.value) : null)} className={field}>
            <option value="">รอบล่าสุดของแต่ละคน</option>{rounds.map((n) => <option key={n} value={n}>รอบ {n}</option>)}
          </select>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ค้นหาชื่อ, รหัส GO ID, คู่แข่ง…" aria-label="ค้นหานักเรียนหรือคู่แข่ง" className={`${field} w-full`} />
        </div>
        {divisions.length > 1 && (
          <div role="group" aria-label="เลือกรุ่น / สาย" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:hidden">
            <button type="button" aria-pressed={!division} onClick={() => setDivision("")} className={chip(!division)}>ทุกรุ่น</button>
            {divisions.map((d) => <button key={d.id} type="button" aria-pressed={division === d.id} onClick={() => setDivision(d.id)} className={chip(division === d.id)}>{d.name} ({d.count})</button>)}
          </div>
        )}

        {!rows.length ? <p className="rounded-xl bg-[#f3f7fd] px-4 py-8 text-center text-sm text-[#4b6588]">{round ? `ไม่มีนักเรียนแข่งในรอบ ${round} ตามเงื่อนไขที่เลือก` : "ไม่พบนักเรียนตามเงื่อนไขที่เลือก"}</p>
          : mode === "table" ? <ResultTable rows={rows} onOpen={setOpen} />
          : (
            <div className="space-y-3">
              {groups.map((g) => {
                const shut = closed.has(g.id);
                return (
                  <section key={g.id} className="overflow-hidden rounded-2xl border border-[#cfe0f5]">
                    <button type="button" onClick={() => toggle(g.id)} aria-expanded={!shut} className={`flex min-h-12 w-full items-center gap-2 px-3 text-left font-bold sm:px-4 ${shut ? "bg-white text-[#0d2a5c]" : "bg-[#0b5fc6] text-white"}`}>
                      <span className="h-5 w-5">{ICONS.students}</span><span className="flex-1">{g.name} <span className="font-semibold opacity-90">({g.rows.length} คน)</span></span><span aria-hidden="true">{shut ? "▾" : "▴"}</span>
                    </button>
                    {!shut && (
                      <ul className="grid grid-cols-4 gap-1.5 bg-[#f6f9fe] p-1.5 sm:gap-3 sm:p-3 xl:grid-cols-6">
                        {g.rows.map((r) => <li key={r.key}><ResultCard row={r} onOpen={() => setOpen(r.athlete_id)} /></li>)}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
      </div>

      <div ref={summary} className="rounded-2xl border border-[#cfe0f5] bg-white p-3 shadow-[0_4px_14px_rgba(10,60,130,.06)] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#4b6588]">{ov.academy.name}</p>
            <b className="block text-lg">สรุปผลงาน · {ev.title}</b>
            <p className="text-sm text-[#4b6588]">นักเรียน {totals.people} คน · ชนะ {totals.wins} · แพ้ {totals.losses}{totals.rate != null ? ` · อัตราชนะ ${totals.rate}%` : ""}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:w-[300px]">
            {([["อันดับ 1", places[0], "bg-[#fff5dd] text-[#a86f00]"], ["อันดับ 2", places[1], "bg-[#eef2f7] text-[#475569]"], ["อันดับ 3", places[2], "bg-[#fdeee3] text-[#a4541b]"]] as const).map(([l, n, c]) => (
              <span key={l} className={`rounded-xl px-3 py-1.5 ${c}`}><span className="block text-[12px] font-semibold">{l}</span><b className="gt-num text-xl">{n}</b> <span className="text-xs">คน</span></span>
            ))}
          </div>
        </div>
        <div data-export-ignore="true" className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr]">
          <ShareSave target={summary} filename={`${ov.academy.name} ${ev.title}`} text={shareText} shareLabel="แชร์ผลให้ผู้ปกครอง"
            url={site ? `/go-fan?event=${encodeURIComponent(ev.id)}` : undefined} />
          <PdfButton target={summary} filename={`${ov.academy.name} ${ev.title}`} />
        </div>
      </div>
      <p className="text-xs text-[#4b6588]">แตะนักเรียนเพื่อดูประวัติและกราฟการเติบโต · ผลมาจากระบบจริง ไม่มีผลเสมอในการแข่งขันปัจจุบัน · รายการในโหมดทดสอบไม่นับในสถิติ</p>
    </div>
  );
}

function ResultCard({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const s = row.student;
  return (
    <button type="button" onClick={onOpen} className="flex h-full w-full flex-col items-center gap-0.5 rounded-xl border border-[#cfe0f5] bg-white px-1 pb-1.5 pt-2 text-center shadow-[0_2px_8px_rgba(10,60,130,.06)] transition hover:border-[#0b5fc6] active:scale-[.98] sm:gap-1 sm:rounded-2xl sm:p-3">
      <Avatar src={s?.photo ?? null} className="h-11 w-11 sm:h-16 sm:w-16" />
      <b className="w-full truncate text-[13px] leading-tight sm:text-base">{shortName(s)}</b>
      <span className="gt-num w-full truncate text-[11px] text-[#4b6588] sm:text-[13px]">{s?.go_id ?? ""}</span>
      <RankBadge rank={s?.rank ?? null} className="!px-1.5 !text-[13px] sm:!px-2.5 sm:!text-[15px]" />
      <span className="w-full truncate text-[11px] text-[#21406e] sm:text-[13px]">{row.round ? <>รอบ {row.round}{row.outcome === "bye" ? "" : <> | โต๊ะ {row.board ?? "–"}</>}</> : "—"}</span>
      <span className="mt-auto w-full pt-0.5 [&>span]:w-full"><ResultBadge row={row} small /></span>
    </button>
  );
}

function ResultTable({ rows, onOpen }: { rows: Row[]; onOpen: (id: string) => void }) {
  return (
    <>
      {/* phone: compact list */}
      <ul className="divide-y divide-[#e3ecf7] rounded-xl border border-[#cfe0f5] sm:hidden">
        {rows.map((r) => (
          <li key={r.key}>
            <button type="button" onClick={() => onOpen(r.athlete_id)} className="flex min-h-14 w-full items-center gap-2.5 px-2.5 py-2 text-left">
              <Avatar src={r.student?.photo ?? null} className="h-10 w-10" />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[15px]">{shortName(r.student)} <span className="text-xs font-normal text-[#4b6588]">({shortRank(r.student?.rank) || "—"})</span></b>
                <span className="block truncate text-xs text-[#4b6588]">{r.division}{r.round ? ` · รอบ ${r.round}` : ""}{r.round && r.outcome !== "bye" ? ` · โต๊ะ ${r.board ?? "–"}` : ""}</span>
                {r.opponent && <span className="block truncate text-xs text-[#4b6588]">พบ {r.opponent}</span>}
              </span>
              <span className="shrink-0"><ResultBadge row={r} small /></span>
            </button>
          </li>
        ))}
      </ul>
      {/* computer: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-[#cfe0f5] sm:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#eaf3ff] text-[#123a74]"><tr>
            <th className="w-10 px-3 py-3 text-center">#</th><th className="px-2 py-3">นักเรียน (ระดับ)</th><th className="px-2 py-3">รุ่น / สาย</th>
            <th className="px-2 py-3 text-center">รอบ</th><th className="px-2 py-3 text-center">โต๊ะ</th><th className="px-2 py-3">คู่แข่ง</th><th className="px-2 py-3 text-center">ผลการแข่งขัน</th><th className="w-24 px-2 py-3 text-center"><span className="sr-only">ดูรายละเอียด</span></th>
          </tr></thead>
          <tbody className="divide-y divide-[#e3ecf7]">
            {rows.map((r, i) => (
              <tr key={r.key} className="hover:bg-[#f2f7ff]">
                <td className="gt-num px-3 py-2 text-center text-[#4b6588]">{i + 1}</td>
                <td className="px-2 py-2"><button type="button" onClick={() => onOpen(r.athlete_id)} className="flex items-center gap-2.5 text-left hover:underline">
                  <Avatar src={r.student?.photo ?? null} className="h-9 w-9" />
                  <span><b className="block">{shortName(r.student)} <span className="font-normal text-[#4b6588]">({shortRank(r.student?.rank) || "—"})</span></b><span className="gt-num text-xs text-[#4b6588]">{r.student?.go_id ?? ""}</span></span>
                </button></td>
                <td className="px-2">{r.division}</td>
                <td className="gt-num px-2 text-center">{r.round ? `รอบ ${r.round}` : "—"}</td>
                <td className="gt-num px-2 text-center">{r.round && r.outcome !== "bye" ? `โต๊ะ ${r.board ?? "–"}` : "—"}</td>
                <td className="px-2">{r.outcome === "bye" ? <span className="text-[#4b6588]">ไม่มีคู่ (ได้บาย)</span> : r.opponent ?? <span className="text-[#4b6588]">—</span>}</td>
                <td className="px-2 text-center"><ResultBadge row={r} /></td>
                <td className="px-2 text-center"><button type="button" onClick={() => onOpen(r.athlete_id)} aria-label={`ดูสถิติ ${r.student?.name ?? ""}`} className="min-h-9 rounded-lg border border-[#cfe0f5] px-3 text-[13px] font-semibold text-[#0b5fc6] hover:border-[#0b5fc6]">สถิติ</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Downloads the summary card as a one-page PDF (same picture as the PNG). */
function PdfButton({ target, filename }: { target: React.RefObject<HTMLElement | null>; filename: string }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!target.current || busy) return;
    setBusy(true);
    try {
      const blob = await capture(target.current);
      const url = URL.createObjectURL(blob);
      const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: img.width > img.height ? "landscape" : "portrait" });
      const pw = pdf.internal.pageSize.getWidth() - 20, ph = pdf.internal.pageSize.getHeight() - 20;
      const scale = Math.min(pw / img.width, ph / img.height);
      pdf.addImage(img, "PNG", 10, 10, img.width * scale, img.height * scale);
      pdf.save(`${filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").slice(0, 120)}.pdf`);
      URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  }
  return <button type="button" onClick={() => void run()} disabled={busy} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-[#0b5fc6] px-3 font-semibold text-white hover:bg-[#0a52ab] disabled:opacity-60">{busy ? "กำลังสร้าง PDF…" : <>ดาวน์โหลดสรุป (PDF) <span aria-hidden="true">↓</span></>}</button>;
}
