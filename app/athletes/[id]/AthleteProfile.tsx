"use client";
/* eslint-disable @next/next/no-img-element -- athlete photos are storage URLs */

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { DEFAULT_AVATAR } from "@/app/tournaments/[id]/_ui/MatchCard";
import { divisionLabel, thaiDate } from "@/lib/division-display";
import { decided, headToHead, isForfeit, opponents, outcome, percent, summary } from "@/lib/athlete-profile.mjs";
import { thaiYear } from "@/lib/event-list.mjs";
import Certificates from "./Certificates";
import type { Cert } from "./certificate-draw";

export type Athlete = { id: string; full_name: string; institution: string | null; current_rank: string | null; photo: string | null };
export type GameRow = {
  kind: "match" | "bye"; tournament_id: string; title: string; event_date: string | null; division_id: string; division_name: string;
  round_number: number; colour: "black" | "white" | null; opponent_id: string | null; opponent_name: string | null;
  opponent_institution: string | null; opponent_rank: string | null; opponent_photo: string | null;
  winner_id: string | null; result_code: string | null; result_margin: string | null; state: string;
};
type Tab = "history" | "stats" | "h2h" | "certs";
type Outcome = ReturnType<typeof outcome>;
type Decided = GameRow & { outcome: Outcome };

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: "history", label: "ประวัติการแข่งขัน", short: "ประวัติแข่ง" },
  { id: "stats", label: "สถิติ", short: "สถิติ" },
  { id: "h2h", label: "ประวัติการพบกัน", short: "พบกัน" },
  { id: "certs", label: "ใบประกาศ", short: "ใบประกาศ" },
];
const noop = () => () => {};
const param = (k: string) => () => new URLSearchParams(window.location.search).get(k);
const setParam = (k: string, v: string | null) => {
  const u = new URL(window.location.href);
  if (v) u.searchParams.set(k, v); else u.searchParams.delete(k);
  window.history.replaceState(window.history.state, "", u);
};

/* ---------- small pieces ---------- */

const Ico = {
  cal: <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" /></svg>,
  board: <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17" /></svg>,
  trophy: <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 20h8" strokeLinecap="round" /></svg>,
  cross: <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  club: <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.1em] w-[1.1em] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V8l8-4 8 4v12M4 20h16M9 20v-5h6v5M8 10h.01M12 10h.01M16 10h.01" strokeLinecap="round" /></svg>,
  bars: <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 shrink-0 text-[var(--gt-cta)]" fill="currentColor"><rect x="4" y="13" width="4" height="7" rx="1" /><rect x="10" y="8" width="4" height="12" rx="1" /><rect x="16" y="4" width="4" height="16" rx="1" /></svg>,
  people: <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 shrink-0 text-[var(--gt-cta)]" fill="currentColor"><circle cx="9" cy="8" r="3.6" /><path d="M2.5 20c.4-4 3.2-6.3 6.5-6.3s6.1 2.3 6.5 6.3Z" /><circle cx="17" cy="9" r="2.8" opacity=".55" /><path d="M15.6 13.9c2.9-.4 5.5 1.5 5.9 5.1h-4.6c-.2-2-.7-3.6-1.3-5.1Z" opacity=".55" /></svg>,
  search: <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>,
};

const Stone = ({ colour, className = "h-5 w-5" }: { colour: "black" | "white"; className?: string }) => (
  <span aria-hidden="true" className={`inline-block shrink-0 rounded-full ${className} ${colour === "black"
    ? "bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)]" : "border border-[#b7bfcc] bg-[radial-gradient(circle_at_35%_30%,#fff,#e2e6ec_70%)]"}`} />
);

function Avatar({ src, size = "h-10 w-10", ring = false }: { src: string | null; size?: string; ring?: boolean }) {
  // The default picture is already round with its own rim and stones: show it whole, no crop or ring.
  if (!src) return <img src={DEFAULT_AVATAR} alt="" className={`${size} shrink-0 object-contain`} />;
  return <img src={src} alt="" className={`${size} shrink-0 rounded-full bg-[var(--gt-avatar-top)] object-cover ${ring ? "border-4 border-[var(--gt-surface)] shadow-[0_0_0_3px_var(--gt-cta)]" : ""}`} />;
}

const PILL: Record<Outcome, { text: string; cls: string }> = {
  win: { text: "ชนะ", cls: "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]" },
  loss: { text: "แพ้", cls: "bg-[var(--gt-loss-bg)] text-[var(--gt-loss-ink)]" },
  draw: { text: "เสมอ", cls: "bg-[var(--gt-surface-2)] text-[var(--gt-ink)]" },
  bye: { text: "บาย", cls: "bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]" },
  pending: { text: "รอผล", cls: "bg-[var(--gt-surface-2)] text-[var(--gt-muted)]" },
};
function ResultPill({ o, forfeit, wide }: { o: Outcome; forfeit?: boolean; wide?: boolean }) {
  const p = PILL[o];
  return (
    <span className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1 text-sm font-bold ${wide ? "min-w-28" : ""} ${p.cls}`}>
      {o === "win" && <span aria-hidden="true">✓</span>}{o === "loss" && <span aria-hidden="true">✕</span>}{p.text}
      {forfeit && o !== "bye" && <span className="text-[11px] font-semibold">(คู่ไม่มา)</span>}
    </span>
  );
}

function Tile({ icon, label, value, tone = "plain", compact, iconless }: { icon: React.ReactNode; label: string; value: string; tone?: "plain" | "win" | "loss"; compact?: boolean; iconless?: boolean }) {
  const t = tone === "win" ? "border-[var(--gt-win-ink)]/30 bg-[var(--gt-win-bg)]" : tone === "loss" ? "border-[var(--gt-loss-ink)]/30 bg-[var(--gt-loss-bg)]" : "border-[var(--gt-line)] bg-[var(--gt-cta-soft)]";
  const ic = tone === "win" ? "text-[var(--gt-win-ink)]" : tone === "loss" ? "text-[var(--gt-loss-ink)]" : "text-[var(--gt-cta)]";
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 sm:gap-3 ${compact ? "py-2" : "py-3"} ${t}`}>
      <span className={`${compact ? "h-6 w-6" : "h-6 w-6 sm:h-8 sm:w-8"} ${iconless ? "hidden sm:block" : ""} shrink-0 ${ic}`}>{icon}</span>
      <span className="min-w-0 leading-tight">
        <span className={`block text-xs ${tone === "plain" ? "text-[var(--gt-muted)]" : ic}`}>{label}</span>
        <span className={`block whitespace-nowrap font-bold ${compact ? "text-lg" : "text-lg sm:text-2xl"} ${tone === "plain" ? "" : ic}`}>{value}</span>
      </span>
    </div>
  );
}

function YearSelect({ years, value, onChange, label = "ปี" }: { years: number[]; value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 font-semibold outline-none focus:border-[var(--gt-cta)]">
        <option value="all">ทุกปี</option>
        {years.map((y) => <option key={y} value={String(y)}>ปี {y}</option>)}
      </select>
    </label>
  );
}

const inYear = (r: { event_date: string | null }, y: string) => y === "all" || String(thaiYear(r.event_date)) === y;
const divHref = (r: GameRow, tab = "standings") => `/tournaments/${r.tournament_id}/divisions/${r.division_id}?tab=${tab}`;

/* ---------- page ---------- */

export default function AthleteProfile({ athlete, rows, today, certs = [] }: { athlete: Athlete; rows: GameRow[]; today: string; certs?: Cert[] }) {
  const urlTab = useSyncExternalStore(noop, param("tab"), () => null);
  const [picked, setPicked] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (TABS.some((t) => t.id === urlTab) ? (urlTab as Tab) : "history");
  const choose = (t: Tab) => { setPicked(t); setParam("tab", t); };

  const all = useMemo(() => summary(rows, athlete.id), [rows, athlete.id]);
  const years = useMemo(() => [...new Set(rows.map((r) => thaiYear(r.event_date)).filter((y): y is number => y !== null))].sort((a, b) => b - a), [rows]);

  return (
    <div className="pb-6">
      <BackLink />

      {/* Header card */}
      <section className="gt-card relative mt-3 overflow-hidden bg-[linear-gradient(120deg,var(--gt-surface),var(--gt-cta-soft))] p-4 sm:p-6">
        {/* Decorative backgrounds from the site owner: wide (computer) and framed (mobile); faded in dark mode. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden bg-[url(/profile-hero.webp)] bg-cover bg-[position:right_center] bg-no-repeat opacity-[var(--gt-hero-img)] sm:block xl:bg-[length:auto_150%] xl:bg-[position:right_24rem_center] xl:[mask-image:linear-gradient(to_right,#000_calc(100%-30rem),transparent_calc(100%-23rem))]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url(/profile-hero-m.png)] bg-[length:auto_100%] bg-[position:right_bottom] bg-no-repeat opacity-[var(--gt-hero-img)] sm:hidden" />
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative shrink-0">
              <Avatar src={athlete.photo} size="h-24 w-24 sm:h-40 sm:w-40" ring />
              {athlete.photo && <span aria-hidden="true" className="absolute -bottom-1 right-0 flex"><Stone colour="black" className="h-6 w-6 sm:h-9 sm:w-9" /><Stone colour="white" className="-ml-2 h-6 w-6 sm:h-9 sm:w-9" /></span>}
            </div>
            <div className="min-w-0">
              <span className="inline-block rounded-full border border-[var(--gt-cta)]/30 bg-[var(--gt-cta-soft)] px-3 py-0.5 text-xs font-semibold text-[var(--gt-cta)] sm:text-sm">โปรไฟล์นักกีฬา</span>
              <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-4xl">{athlete.full_name}</h1>
              {athlete.institution && <p className="mt-1 flex items-center gap-2 text-[var(--gt-muted)] sm:text-lg">{Ico.club}{athlete.institution}</p>}
              {athlete.current_rank && <span className="mt-2 inline-block rounded-full bg-[var(--gt-cta)] px-4 py-0.5 font-bold text-white sm:text-lg">{athlete.current_rank}</span>}
            </div>
          </div>
          <div className="lg:w-[23rem] lg:border-l lg:border-[var(--gt-line)] lg:pl-6">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Tile compact icon={Ico.cal} label="แข่งขัน" value={`${all.events} รายการ`} />
              <Tile compact icon={Ico.board} label="เล่น" value={`${all.played} เกม`} />
              <Tile compact tone="win" icon={Ico.trophy} label="ชนะ" value={`${all.wins} เกม`} />
              <Tile compact tone="loss" icon={Ico.cross} label="แพ้" value={`${all.losses} เกม`} />
            </div>
            <p className="mt-2 text-center text-xs text-[var(--gt-muted)]">สถิติจากรายการที่บันทึกในระบบ{all.draws ? ` · เสมอ ${all.draws} เกม` : ""}</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div role="tablist" aria-label="ข้อมูลนักกีฬา" className="mt-5 grid grid-cols-4 gap-1 border-b border-[var(--gt-line)] sm:flex sm:gap-2">
        {TABS.map((t) => (
          <button key={t.id} id={`ptab-${t.id}`} role="tab" type="button" aria-selected={tab === t.id} aria-controls={`ppanel-${t.id}`} onClick={() => choose(t.id)}
            className={`min-h-12 rounded-t-xl border border-b-0 px-1 text-[13px] font-bold sm:px-6 sm:text-base ${tab === t.id ? "border-transparent bg-[var(--gt-cta)] text-white" : "border-[var(--gt-line)] bg-[var(--gt-cta-soft)]"}`}>
            <span className="sm:hidden">{t.short}</span><span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`ppanel-${tab}`} aria-labelledby={`ptab-${tab}`} className="pt-4">
        {tab === "history" && <History athlete={athlete} rows={rows} years={years} today={today} />}
        {tab === "stats" && <Stats athlete={athlete} rows={rows} years={years} />}
        {tab === "h2h" && <H2H athlete={athlete} rows={rows} years={years} />}
        {tab === "certs" && <Certificates certs={certs} name={athlete.full_name} athleteId={athlete.id} />}
      </div>
    </div>
  );
}

function BackLink() {
  const back = (e: React.MouseEvent) => {
    try {
      if (document.referrer && new URL(document.referrer).origin === window.location.origin && window.history.length > 1) { e.preventDefault(); window.history.back(); }
    } catch { /* follow the link */ }
  };
  return (
    <Link href="/tournaments" onClick={back} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-4 font-semibold text-[var(--gt-cta)]">
      <span aria-hidden="true">←</span> กลับหน้านักกีฬา
    </Link>
  );
}

/* ---------- ประวัติการแข่งขัน ---------- */

function History({ athlete, rows, years, today }: { athlete: Athlete; rows: GameRow[]; years: number[]; today: string }) {
  const [year, setYear] = useState("all");
  const [q, setQ] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  const events = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const by = new Map<string, GameRow[]>();
    for (const r of rows) {
      if (!inYear(r, year) || (needle && !r.title.toLowerCase().includes(needle))) continue;
      const k = `${r.tournament_id}|${r.division_id}`;
      by.set(k, [...(by.get(k) ?? []), r]);
    }
    return [...by.entries()].map(([key, games]) => ({ key, games: games.sort((a, b) => a.round_number - b.round_number), first: games[0] }))
      .sort((a, b) => (b.first.event_date ?? "").localeCompare(a.first.event_date ?? ""));
  }, [rows, year, q]);

  const groups = useMemo(() => {
    const g = new Map<string, typeof events>();
    for (const e of events) { const y = String(thaiYear(e.first.event_date) ?? "ไม่ระบุปี"); g.set(y, [...(g.get(y) ?? []), e]); }
    return [...g.entries()];
  }, [events]);

  if (!rows.length) return <Empty text="ยังไม่มีประวัติการแข่งขันในระบบ" />;

  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_18rem] sm:items-center">
        <h2 className="text-2xl font-bold sm:text-3xl">ประวัติการแข่งขัน</h2>
        <YearSelect years={years} value={year} onChange={setYear} />
        <label className="relative hidden sm:block">
          <span className="sr-only">ค้นหารายการแข่งขัน</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gt-muted)]">{Ico.search}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหารายการแข่งขัน" className="block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] pl-10 pr-3 outline-none focus:border-[var(--gt-cta)]" />
        </label>
      </div>

      {!events.length && <div className="mt-4"><Empty text="ไม่พบรายการที่ตรงกับเงื่อนไข" /></div>}
      {groups.map(([y, list]) => (
        <div key={y} className="mt-4">
          <div className="rounded-xl bg-[var(--gt-cta-soft)] px-1.5 py-1"><span className="inline-block rounded-lg bg-[var(--gt-cta)] px-4 py-0.5 text-lg font-bold text-white">{y}</span></div>
          <div className="mt-3 space-y-3">
            {list.map(({ key, games, first }, i) => {
              const open = closed[key] === undefined ? i === 0 && y === groups[0][0] : !closed[key];
              const dec = decided(games, athlete.id) as Decided[];
              const w = dec.filter((g) => g.outcome === "win").length, l = dec.filter((g) => g.outcome === "loss").length, d = dec.filter((g) => g.outcome === "draw").length;
              const doneRounds = games.filter((g) => g.state === "verified").length;
              const status = first.event_date && first.event_date === today ? { t: "กำลังแข่งขัน", c: "bg-[var(--gt-cta)] text-white" }
                : first.event_date && first.event_date < today ? { t: "จบการแข่งขัน", c: "bg-[#6b7a90] text-white" }
                : { t: "ยังไม่เริ่ม", c: "bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]" };
              return (
                <article key={key} className="gt-card overflow-hidden">
                  <button type="button" aria-expanded={open} onClick={() => setClosed((c) => ({ ...c, [key]: open }))}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left sm:items-center">
                    <span aria-hidden="true" className="mt-1 flex sm:mt-0"><Stone colour="black" className="h-5 w-5" /><Stone colour="white" className="-ml-1.5 h-5 w-5" /></span>
                    <span className="min-w-0 flex-1 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                      <span className="block text-lg font-bold leading-snug sm:text-xl">{first.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--gt-muted)]">
                        <span className="flex items-center gap-1"><span className="h-4 w-4">{Ico.cal}</span>{thaiDate(first.event_date, "short") ?? "—"}</span>
                        <span>{divisionLabel(first.division_name)}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.c}`}>{status.t}</span>
                        <span className="font-bold text-[var(--gt-ink)]">ชนะ {w} แพ้ {l}{d ? ` เสมอ ${d}` : ""} <span className="font-normal text-[var(--gt-muted)]">(แข่งแล้ว {doneRounds} รอบ)</span></span>
                      </span>
                    </span>
                    <span aria-hidden="true" className={`mt-1 shrink-0 text-xl text-[var(--gt-cta)] transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
                  </button>
                  {open && (
                    <div className="border-t border-[var(--gt-line)] px-2 pb-3 sm:px-4">
                      <table className="hidden w-full text-left sm:table">
                        <thead><tr className="bg-[var(--gt-cta-soft)] text-sm"><th className="px-3 py-2 font-bold">รอบ</th><th className="px-3 py-2 font-bold">คู่แข่งขัน</th><th className="px-3 py-2 font-bold">ระดับ</th><th className="px-3 py-2 text-center font-bold">ผลการแข่งขัน</th></tr></thead>
                        <tbody>
                          {games.map((g) => (
                            <tr key={`${g.round_number}-${g.kind}`} className="border-b border-[var(--gt-line)] last:border-0">
                              <td className="px-3 py-2.5">รอบ {g.round_number}</td>
                              <td className="px-3 py-2.5"><Opponent g={g} /></td>
                              <td className="px-3 py-2.5">{g.opponent_rank ?? "—"}</td>
                              <td className="px-3 py-2.5 text-center"><ResultPill wide o={outcome(g, athlete.id)} forfeit={isForfeit(g)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <ul className="divide-y divide-[var(--gt-line)] sm:hidden">
                        {games.map((g) => (
                          <li key={`${g.round_number}-${g.kind}`} className="flex items-center gap-2 py-2">
                            <span className="shrink-0 rounded-md bg-[var(--gt-cta-soft)] px-2 py-0.5 text-xs font-bold text-[var(--gt-cta)]">รอบ {g.round_number}</span>
                            <span className="min-w-0 flex-1"><Opponent g={g} compact /></span>
                            <ResultPill o={outcome(g, athlete.id)} forfeit={isForfeit(g)} />
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-right"><Link href={divHref(first)} className="inline-flex min-h-10 items-center font-bold text-[var(--gt-cta)] hover:underline">ดูรายละเอียดการแข่งขัน →</Link></p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function Opponent({ g, compact }: { g: GameRow; compact?: boolean }) {
  if (g.kind === "bye") return <span className="text-[var(--gt-muted)]">ได้บาย (ไม่มีคู่แข่ง)</span>;
  const name = g.opponent_name ?? "ผู้เข้าแข่งขัน";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar src={g.opponent_photo} size={compact ? "h-8 w-8" : "h-10 w-10"} />
      <span className="min-w-0">
        {g.opponent_id ? <Link href={`/athletes/${g.opponent_id}`} className="block truncate font-bold hover:underline">{name}</Link> : <span className="block truncate font-bold">{name}</span>}
        <span className="block truncate text-xs text-[var(--gt-muted)]">{compact ? g.opponent_rank ?? "" : g.opponent_institution ?? ""}</span>
      </span>
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="gt-card px-4 py-8 text-center text-[var(--gt-muted)]">{text}</div>;
}

/* ---------- สถิติ ---------- */

function Stats({ athlete, rows, years }: { athlete: Athlete; rows: GameRow[]; years: number[] }) {
  const [year, setYear] = useState("all");
  const s = useMemo(() => summary(rows.filter((r) => inYear(r, year)), athlete.id), [rows, year, athlete.id]);
  const lossShare = s.played ? s.losses / s.played : 0;
  return (
    <section className="gt-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">{Ico.bars}สถิติการแข่งขัน</h2>
        <div className="flex items-center gap-2"><span className="hidden text-sm sm:inline">ปีการแข่งขัน :</span><div className="w-36"><YearSelect years={years} value={year} onChange={setYear} label="ปีการแข่งขัน" /></div></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Ico.cal} label="แข่งขัน" value={`${s.events} รายการ`} />
        <Tile icon={Ico.board} label="เล่น" value={`${s.played} เกม`} />
        <Tile tone="win" icon={Ico.trophy} label="ชนะ" value={`${s.wins} เกม`} />
        <Tile tone="loss" icon={Ico.cross} label="แพ้" value={`${s.losses} เกม`} />
      </div>
      {s.played > 0 ? (
        <>
          <div className="mt-4 rounded-xl border border-[var(--gt-line)] p-3 sm:border-0 sm:p-0">
            <p className="mb-2 flex items-baseline gap-3 sm:hidden"><span className="text-sm font-bold">อัตราชนะ</span><span className="text-3xl font-bold">{percent(s.winRate)}</span></p>
            <div className="flex h-10 overflow-hidden rounded-xl text-sm font-bold text-white sm:h-12 sm:text-lg" role="img" aria-label={`ชนะ ${percent(s.winRate)} แพ้ ${percent(lossShare)}${s.draws ? ` เสมอ ${s.draws} เกม` : ""}`}>
              {s.wins > 0 && <span className="grid place-items-center bg-[#43b356]" style={{ width: `${s.winRate * 100}%` }}><span className="hidden sm:inline">ชนะ {percent(s.winRate)} ({s.wins} เกม)</span><span className="sm:hidden">{s.wins}/{s.played}</span></span>}
              {s.draws > 0 && <span className="grid place-items-center bg-[#8a96a8]" style={{ width: `${(s.draws / s.played) * 100}%` }}>{s.draws}</span>}
              {s.losses > 0 && <span className="grid place-items-center bg-[#e8668f]" style={{ width: `${lossShare * 100}%` }}><span className="hidden sm:inline">แพ้ {percent(lossShare)} ({s.losses} เกม)</span><span className="sm:hidden">{s.losses}/{s.played}</span></span>}
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-[var(--gt-line)]">
              <h3 className="flex items-center gap-2 bg-[var(--gt-cta-soft)] px-4 py-2.5 text-lg font-bold"><span className="h-6 w-6 text-[var(--gt-cta)]">{Ico.trophy}</span>ผลงานแยกตามรายการ</h3>
              <table className="w-full text-left">
                <thead><tr className="border-b border-[var(--gt-line)] text-sm"><th className="px-4 py-2">รายการแข่งขัน</th><th className="w-14 px-2 py-2 text-center">เล่น</th><th className="w-14 px-2 py-2 text-center">ชนะ</th><th className="w-14 px-2 py-2 text-center">แพ้</th></tr></thead>
                <tbody>
                  {s.perEvent.map((e) => {
                    const r = rows.find((x) => x.tournament_id === e.tournament_id)!;
                    return (
                      <tr key={e.tournament_id} className="border-b border-[var(--gt-line)] last:border-0">
                        <td className="px-4 py-2.5"><Link href={divHref(r)} className="font-semibold text-[var(--gt-cta)] hover:underline">{e.title}</Link></td>
                        <td className="px-2 text-center font-bold">{e.played}</td>
                        <td className="px-2 text-center font-bold text-[var(--gt-win-ink)]">{e.wins}</td>
                        <td className="px-2 text-center font-bold text-[var(--gt-loss-ink)]">{e.losses}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--gt-line)]">
              <h3 className="flex items-center gap-2 bg-[var(--gt-cta-soft)] px-4 py-2.5 text-lg font-bold"><span className="flex"><Stone colour="black" /><Stone colour="white" className="-ml-1.5 h-5 w-5" /></span>ผลการแข่งขันตามสีหมาก</h3>
              <table className="w-full text-left">
                <thead><tr className="border-b border-[var(--gt-line)] text-sm"><th className="px-4 py-2">สีหมาก</th><th className="px-2 py-2 text-center">เล่น</th><th className="px-2 py-2 text-center">ชนะ</th><th className="px-2 py-2 text-center">แพ้</th></tr></thead>
                <tbody>
                  {(["black", "white"] as const).map((c) => (
                    <tr key={c} className="border-b border-[var(--gt-line)] last:border-0">
                      <td className="px-4 py-2.5"><span className="flex items-center gap-2 font-semibold"><Stone colour={c} className="h-6 w-6" />{c === "black" ? "หมากดำ" : "หมากขาว"}</span></td>
                      <td className="px-2 text-center font-bold">{s[c].played} เกม</td>
                      <td className="px-2 text-center font-bold text-[var(--gt-win-ink)]">{s[c].wins} เกม</td>
                      <td className="px-2 text-center font-bold text-[var(--gt-loss-ink)]">{s[c].losses} เกม</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : <p className="mt-4 text-center text-[var(--gt-muted)]">ยังไม่มีเกมที่บันทึกผลในช่วงนี้</p>}
      <p className="mt-4 text-sm text-[var(--gt-muted)]">ⓘ สถิติจากผลการแข่งขันที่บันทึกในระบบ ไม่นับรอบที่ได้บายและเกมที่ยังไม่มีผล{s.draws ? ` · เสมอ ${s.draws} เกม` : ""}</p>
    </section>
  );
}

/* ---------- ประวัติการพบกัน ---------- */

function H2H({ athlete, rows, years }: { athlete: Athlete; rows: GameRow[]; years: number[] }) {
  const urlVs = useSyncExternalStore(noop, param("vs"), () => null);
  const [year, setYear] = useState("all");
  const [q, setQ] = useState("");
  const [vsPicked, setVsPicked] = useState<string | null>(null);
  const scoped = useMemo(() => rows.filter((r) => inYear(r, year)), [rows, year]);
  const opps = useMemo(() => opponents(scoped), [scoped]);
  const vsId = vsPicked ?? urlVs;
  const opp = opps.find((o) => o.id === vsId) ?? opponents(rows).find((o) => o.id === vsId) ?? null;
  const h = opp ? (headToHead(scoped, athlete.id, opp.id) as { games: Decided[]; played: number; wins: number; losses: number; draws: number }) : null;
  const pick = (id: string | null) => { setVsPicked(id ?? ""); setParam("vs", id); setQ(""); };
  const needle = q.trim().toLowerCase();
  const matches = needle ? opps.filter((o) => o.name.toLowerCase().includes(needle)) : opps;
  const first = athlete.full_name.split(" ")[0];

  return (
    <section className="gt-card p-4 sm:p-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem_10rem] lg:items-center">
        <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">{Ico.people}ประวัติการพบกัน</h2>
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2 lg:contents">
          <label className="relative block">
            <span className="sr-only">ค้นหาชื่อคู่แข่งขัน</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gt-muted)]">{Ico.search}</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={opp ? opp.name : "ค้นหาชื่อคู่แข่งขัน…"}
              className="block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] pl-10 pr-3 outline-none focus:border-[var(--gt-cta)]" />
          </label>
          <YearSelect years={years} value={year} onChange={setYear} />
        </div>
      </div>

      {(!opp || needle) && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-[var(--gt-muted)]">{opps.length ? "เลือกคู่แข่งขันที่เคยพบกัน" : "ยังไม่มีคู่แข่งขันที่บันทึกผลในช่วงนี้"}</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => pick(o.id)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 py-2 text-left hover:border-[var(--gt-cta)]">
                  <Avatar src={o.photo} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{o.name}</span><span className="block truncate text-xs text-[var(--gt-muted)]">{[o.rank, o.institution].filter(Boolean).join(" · ")}</span></span>
                  <span className="shrink-0 text-sm font-semibold text-[var(--gt-cta)]">{o.games} เกม</span>
                </button>
              </li>
            ))}
          </ul>
          {needle && !matches.length && <p className="text-sm text-[var(--gt-muted)]">ไม่พบชื่อนี้ในคู่แข่งขันที่เคยพบกัน</p>}
        </div>
      )}

      {opp && h && !needle && (
        <>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-cta-soft)] p-3 sm:gap-6 sm:p-5">
            <Side photo={athlete.photo} name={athlete.full_name} inst={athlete.institution} rank={athlete.current_rank} />
            <span className="rounded-lg bg-[var(--gt-surface)] px-2 py-1 text-xl font-black italic text-[var(--gt-cta)] sm:px-6 sm:text-4xl">VS</span>
            <Side photo={opp.photo} name={opp.name} inst={opp.institution} rank={opp.rank} href={`/athletes/${opp.id}`} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            <Tile iconless icon={Ico.cal} label="พบกัน" value={`${h.played} เกม`} />
            <Tile iconless tone="win" icon={Ico.trophy} label={`${first} ชนะ`} value={`${h.wins} เกม`} />
            <Tile iconless tone="loss" icon={Ico.cross} label={`${opp.name.split(" ")[0]} ชนะ`} value={`${h.losses} เกม`} />
          </div>
          <p className="mt-2 text-center text-sm text-[var(--gt-muted)]">ผลการแข่งขันจากมุมมองของ {athlete.full_name}{h.draws ? ` · เสมอ ${h.draws} เกม` : ""}</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--gt-line)]">
            <h3 className="bg-[var(--gt-cta-soft)] px-4 py-2.5 text-lg font-bold">รายละเอียดการพบกัน</h3>
            <table className="hidden w-full text-center sm:table">
              <thead><tr className="border-b border-[var(--gt-line)] text-sm"><th className="px-3 py-2">วันที่</th><th className="px-3 py-2">รายการแข่งขัน</th><th className="px-3 py-2">รอบ</th><th className="px-3 py-2">สีหมากของ{first}</th><th className="px-3 py-2">ผลการแข่งขัน</th></tr></thead>
              <tbody>
                {h.games.map((g) => (
                  <tr key={`${g.tournament_id}-${g.round_number}`} className="border-b border-[var(--gt-line)] last:border-0">
                    <td className="px-3 py-2.5">{thaiDate(g.event_date, "short") ?? "—"}</td>
                    <td className="px-3 py-2.5"><Link href={divHref(g as GameRow, "results")} className="font-semibold text-[var(--gt-cta)] underline-offset-2 hover:underline">{g.title} ›</Link></td>
                    <td className="px-3 py-2.5">รอบ {g.round_number}</td>
                    <td className="px-3 py-2.5"><span className="inline-flex items-center gap-2"><Stone colour={g.colour!} className="h-6 w-6" />{g.colour === "black" ? "หมากดำ" : "หมากขาว"}</span></td>
                    <td className="px-3 py-2.5"><ResultPill wide o={g.outcome} forfeit={isForfeit(g)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="space-y-2 p-2 sm:hidden">
              {h.games.map((g) => (
                <li key={`${g.tournament_id}-${g.round_number}`} className="flex items-center gap-3 rounded-xl border border-[var(--gt-line)] p-3">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex items-center gap-1.5"><span className="h-4 w-4">{Ico.cal}</span>{thaiDate(g.event_date, "short") ?? "—"}</p>
                    <Link href={divHref(g as GameRow, "results")} className="block truncate font-bold text-[var(--gt-cta)]">{g.title} ›</Link>
                    <p className="flex items-center gap-1.5">รอบ {g.round_number} • <Stone colour={g.colour!} className="h-4 w-4" />{g.colour === "black" ? "หมากดำ" : "หมากขาว"}</p>
                  </div>
                  <ResultPill o={g.outcome} forfeit={isForfeit(g)} />
                </li>
              ))}
            </ul>
            {!h.games.length && <p className="px-4 py-4 text-center text-[var(--gt-muted)]">ไม่มีเกมที่บันทึกผลในช่วงนี้</p>}
          </div>
          <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--gt-muted)]">
            <span>ⓘ แสดงเฉพาะเกมที่พบกันในรายการที่บันทึกในระบบ</span>
            <button type="button" onClick={() => pick(null)} className="min-h-10 font-semibold text-[var(--gt-cta)] hover:underline">เลือกคู่แข่งขันคนอื่น</button>
          </p>
        </>
      )}
    </section>
  );
}

function Side({ photo, name, inst, rank, href }: { photo: string | null; name: string; inst: string | null; rank: string | null; href?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
      <Avatar src={photo} size="h-16 w-16 sm:h-28 sm:w-28" ring />
      <div className="min-w-0">
        {href ? <Link href={href} className="block text-base font-bold leading-tight hover:underline sm:text-2xl">{name}</Link> : <p className="text-base font-bold leading-tight sm:text-2xl">{name}</p>}
        {inst && <p className="mt-0.5 hidden items-center gap-1.5 text-[var(--gt-muted)] sm:flex">{Ico.club}{inst}</p>}
        {rank && <span className="mt-1 inline-block rounded-full bg-[var(--gt-cta)] px-3 py-0.5 text-sm font-bold text-white">{rank}</span>}
      </div>
    </div>
  );
}
