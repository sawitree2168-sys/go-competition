"use client";
/* eslint-disable @next/next/no-img-element -- athlete photos and a decorative picture */

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ResultPicker from "@/components/ResultPicker";
import ThemeToggle from "../../tournaments/[id]/_ui/ThemeToggle";
import { pingLive } from "../../tournaments/[id]/_ui/live";
import { DEFAULT_AVATAR } from "../../tournaments/[id]/_ui/MatchCard";
import { resultLabel, staffErrorMessage } from "@/lib/competition-day.mjs";
import { METHODS, buildResult, formFromResult, needsWinner, summaryLine } from "@/lib/referee-result.mjs";
import { divisionLabel, divisionSortValue } from "@/lib/division-display";
import { staffDb } from "@/app/organizer/_lib/staff";

type Side = { id: string; name: string | null; institution: string | null; rank?: string | null; photo?: string | null; score?: number; checked_in: boolean };
type Table = {
  id: string; pool: string | null; round: number; board: number; state: string; result_code: string | null; result_margin: string | null;
  winner: string | null; note?: string | null; black: Side; white: Side;
};
type Division = { id: string; name: string; pending: number; last_round: number | null };
type Opened = { referee_name: string; expires_at: string; tournament: { title: string; event_date: string | null }; divisions: Division[] };
type Call = (fn: string, args: Record<string, unknown>) => Promise<boolean>;

const ERRORS: Record<string, string> = {
  WRONG_CODE: "รหัสไม่ถูกต้อง (ใส่ผิด 8 ครั้ง ลิงก์จะถูกล็อก)",
  LINK_INVALID: "ลิงก์นี้ไม่ถูกต้อง กรุณาขอลิงก์ใหม่จากผู้จัด",
  LINK_EXPIRED: "ลิงก์นี้หมดอายุหรือถูกยกเลิกแล้ว กรุณาขอลิงก์ใหม่จากผู้จัด",
  LINK_LOCKED: "ลิงก์ถูกล็อกเพราะใส่รหัสผิดหลายครั้ง กรุณาขอลิงก์ใหม่จากผู้จัด",
  NOT_THIS_EVENT: "โต๊ะนี้ไม่ได้อยู่ในงานของคุณ",
};

let client: SupabaseClient | null = null;
/** Anonymous client: referees have no account; every call carries the link token + code and is checked in the database. */
function db(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
const storeKey = (token: string) => `gt-referee-${token.slice(0, 10)}`;
const loadCode = (token: string) => { try { return localStorage.getItem(storeKey(token)) ?? ""; } catch { return ""; } };
const saveCode = (token: string, code: string | null) => { try { if (code) localStorage.setItem(storeKey(token), code); else localStorage.removeItem(storeKey(token)); } catch { /* private mode */ } };
const two = (n: number) => String(n).padStart(2, "0");
const firstName = (n: string | null) => (n ?? "").split(" ")[0] || "ผู้เล่น";
const portalTarget = () => (document.querySelector(".gt") as HTMLElement | null) ?? document.body;

function Stone({ colour, className = "h-5 w-5" }: { colour: "black" | "white"; className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full ${className} ${colour === "black"
    ? "bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)]" : "border border-[#b7bfcc] bg-[radial-gradient(circle_at_35%_30%,#fff,#e2e6ec_70%)]"}`} />;
}

function Deco({ className }: { className: string }) {
  return (
    <picture>
      <source srcSet="/referee-deco.webp" type="image/webp" />
      <img src="/referee-deco.png" alt="" aria-hidden="true" className={`pointer-events-none select-none ${className}`} />
    </picture>
  );
}

/* ------------------------------------------------------------------ page */

export default function RefereePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [code, setCode] = useState("");
  const [opened, setOpened] = useState<Opened | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const open = useCallback(async (c: string) => {
    const d = db();
    if (!d) { setError("ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล"); return; }
    setBusy(true); setError("");
    const { data, error: e } = await d.rpc("gt_referee_open_v1", { p_token: token, p_code: c });
    setBusy(false);
    if (e) { setError(staffErrorMessage(e.message)); return; }
    if (!data?.ok) { setError(ERRORS[data?.error] ?? "เข้าใช้ไม่ได้"); saveCode(token, null); setOpened(null); return; }
    saveCode(token, c);
    setCode(c);
    setOpened(data as Opened);
  }, [token]);

  // Re-open automatically with the code saved on this phone.
  useEffect(() => {
    const saved = loadCode(token);
    if (/^\d{6}$/.test(saved)) queueMicrotask(() => open(saved));
  }, [token, open]);

  const signOut = useCallback(() => { saveCode(token, null); setOpened(null); setCode(""); }, [token]);
  const expired = useCallback((msg: string) => { signOut(); setError(msg); }, [signOut]);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[linear-gradient(180deg,var(--gt-cta-soft),transparent_420px)]">
      <TopBar opened={opened} onSignOut={signOut} />
      <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6">
        {!opened ? <CodeForm busy={busy} error={error} onSubmit={open} /> : <Console token={token} code={code} opened={opened} onExpired={expired} />}
      </div>
    </div>
  );
}

function TopBar({ opened, onSignOut }: { opened: Opened | null; onSignOut: () => void }) {
  return (
    <header className="bg-[linear-gradient(180deg,#0d3f8f,#0a2f6e)] text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-6">
        <span aria-hidden="true" className="flex">
          <span className="h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] shadow" />
          <span className="-ml-2 mt-1 h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)] shadow" />
        </span>
        <span className="whitespace-nowrap text-base font-bold tracking-wide sm:text-xl">GO TOURNAMENT</span>
        <div className="ml-auto flex items-center gap-2">
          {opened ? (
            <details className="relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7Z" /></svg>
                กรรมการ <span aria-hidden="true">▾</span>
              </summary>
              <div className="absolute right-0 z-40 mt-2 w-64 space-y-3 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-4 text-[var(--gt-ink)] shadow-xl">
                <div>
                  <p className="text-xs text-[var(--gt-muted)]">กรรมการ</p>
                  <p className="font-semibold">{opened.referee_name}</p>
                  <p className="text-xs text-[var(--gt-muted)]">ลิงก์ใช้ได้ถึง {new Date(opened.expires_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="flex items-center justify-between text-sm">โหมดสี <ThemeToggle /></div>
                <button type="button" onClick={onSignOut} className="gt-outline-btn min-h-11 w-full text-sm">ออกจากหน้ากรรมการ</button>
              </div>
            </details>
          ) : <span className="[&_button]:bg-white/10 [&_button]:text-white"><ThemeToggle /></span>}
        </div>
      </div>
    </header>
  );
}

function CodeForm({ busy, error, onSubmit }: { busy: boolean; error: string; onSubmit: (code: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="relative mx-auto mt-6 max-w-md">
      <form onSubmit={(e) => { e.preventDefault(); if (/^\d{6}$/.test(value)) onSubmit(value); }} className="gt-card relative z-10 space-y-4 p-6 text-center">
        <h1 className="text-2xl font-bold">หน้ากรรมการ</h1>
        <MineShortcut />
        <p className="text-sm text-[var(--gt-muted)]">กรรมการแบบลิงก์: ใส่รหัส 6 หลัก ที่ผู้จัดส่งมาพร้อมลิงก์ (ไม่ใช่รหัสผ่านเข้าระบบ)</p>
        <input value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
          aria-label="รหัส 6 หลัก" placeholder="••••••" autoFocus
          className="gt-num min-h-16 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] text-center text-3xl tracking-[0.4em]" />
        {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}
        <button type="submit" disabled={busy || value.length !== 6} className="gt-cta-btn min-h-12 w-full disabled:opacity-60">{busy ? "กำลังตรวจสอบ…" : "เข้าใช้งาน"}</button>
      </form>
      <Deco className="mx-auto -mt-2 w-full max-w-sm opacity-90" />
    </div>
  );
}

/* --------------------------------------------------------------- console */

function Console({ token, code, opened, onExpired }: { token: string; code: string; opened: Opened; onExpired: (msg: string) => void }) {
  const divisions = useMemo(() => [...opened.divisions].sort((a, b) => divisionSortValue(a.name) - divisionSortValue(b.name)), [opened.divisions]);
  const [divisionId, setDivisionId] = useState(() => divisions.find((d) => d.last_round)?.id ?? divisions[0]?.id ?? "");
  const [tables, setTables] = useState<Table[] | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const [listView, setListView] = useState<"cards" | "table">("cards");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    if (!divisionId) return;
    const { data, error: e } = await db()!.rpc("gt_referee_board_v1", { p_token: token, p_code: code, p_division: divisionId });
    if (e) { setError(staffErrorMessage(e.message)); return; }
    if (!data?.ok) { if (data?.error?.startsWith("LINK") || data?.error === "WRONG_CODE") onExpired(ERRORS[data.error]); else setError(ERRORS[data?.error] ?? "โหลดไม่สำเร็จ"); return; }
    setError("");
    setTables(data.tables as Table[]);
  }, [token, code, divisionId, onExpired]);

  useEffect(() => {
    queueMicrotask(load);
    const t = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 10000); // other referees' and the organiser's changes appear without reloading
    return () => window.clearInterval(t);
  }, [load]);

  const call: Call = async (fn, args) => {
    const { data, error: e } = await db()!.rpc(fn, { p_token: token, p_code: code, ...args });
    if (e) { setError(staffErrorMessage(e.message)); return false; }
    if (!data?.ok) { setError(ERRORS[data?.error] ?? "ทำรายการไม่สำเร็จ"); return false; }
    setError("");
    pingLive(divisionId);
    await load();
    return true;
  };

  const all = tables ?? [];
  const q = query.trim().toLowerCase();
  const matchQ = (t: Table) => !q || String(t.board) === q.replace(/^โต๊ะ\s*/, "").replace(/^0+/, "") || [t.black.name, t.white.name, t.black.institution, t.white.institution].some((x) => (x ?? "").toLowerCase().includes(q));
  const pending = all.filter((t) => t.state !== "verified");
  const done = all.filter((t) => t.state === "verified");
  const list = (tab === "pending" ? pending : done).filter(matchQ);
  const selected = all.find((t) => t.id === selectedId) ?? list[0] ?? all[0] ?? null;
  const round = all[0]?.round ?? null;
  const multiPool = new Set(all.map((t) => t.pool ?? "")).size > 1;
  const seats = all.length * 2;
  const checked = all.reduce((n, t) => n + (t.black.checked_in ? 1 : 0) + (t.white.checked_in ? 1 : 0), 0);
  const division = divisions.find((d) => d.id === divisionId);

  const pick = (t: Table) => { setSelectedId(t.id); setMobileDetail(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const step = (dir: 1 | -1) => {
    if (!selected) return;
    const i = all.findIndex((t) => t.id === selected.id);
    const next = all[(i + dir + all.length) % all.length];
    if (next) setSelectedId(next.id);
  };
  const afterSave = (saved: Table) => {
    setToast(`บันทึกผล โต๊ะ${two(saved.board)} แล้ว`);
    window.setTimeout(() => setToast(""), 3500);
    const nextPending = pending.find((t) => t.id !== saved.id && t.board > saved.board) ?? pending.find((t) => t.id !== saved.id);
    if (nextPending) setSelectedId(nextPending.id);
    else { setMobileDetail(false); setTab("done"); }
  };

  const filters = (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1.4fr)] sm:gap-3">
      <label className="flex min-h-12 items-center overflow-hidden rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)]">
        <span className="h-full shrink-0 bg-[var(--gt-cta-soft)] px-3 py-3 text-sm font-medium">ประเภท</span>
        <select value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setTables(null); setSelectedId(null); }}
          className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-base outline-none" aria-label="ประเภท / รุ่น">
          {divisions.map((d) => <option key={d.id} value={d.id}>{divisionLabel(d.name)}{d.last_round ? "" : " · ยังไม่ออกคู่"}</option>)}
        </select>
      </label>
      <div className="hidden min-h-12 items-center overflow-hidden rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] sm:flex">
        <span className="h-full shrink-0 bg-[var(--gt-cta-soft)] px-3 py-3 text-sm font-medium">รอบ</span>
        <span className="px-3 font-medium">{round ? `รอบ${round}` : "—"}</span>
        <span className="ml-auto pr-3 text-xs text-[var(--gt-muted)]">รอบปัจจุบัน</span>
      </div>
      <label className="relative block">
        <span className="sr-only">ค้นหาโต๊ะ / ชื่อนักกีฬา</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--gt-muted)]" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาโต๊ะ / ชื่อนักกีฬา"
          className="block min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] pl-11 pr-3 text-base outline-none focus:border-[var(--gt-cta)]" />
      </label>
    </div>
  );

  const tableList = (
    <section className="gt-card relative flex min-h-[28rem] flex-col overflow-hidden" aria-label="โต๊ะแข่งขัน">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <h2 className="text-2xl font-bold">โต๊ะแข่งขัน</h2>
        <span className="font-medium text-[var(--gt-cta)]">{all.length} โต๊ะ</span>
      </div>
      <div role="tablist" className="mx-4 mt-2 grid grid-cols-2 border-b border-[var(--gt-line)]">
        {(["pending", "done"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-12 border-b-[3px] text-base font-medium ${tab === k ? "border-[var(--gt-cta)] text-[var(--gt-cta)]" : "border-transparent text-[var(--gt-muted)]"}`}>
            {k === "pending" ? `รอผล (${pending.length})` : `บันทึกแล้ว (${done.length})`}
          </button>
        ))}
      </div>
      <p className="px-4 pt-2 text-xs text-[var(--gt-muted)]">เช็คชื่อแล้ว {checked}/{seats} คน · แตะโต๊ะเพื่อลงผล</p>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-2">
        <button type="button" onClick={() => setListView("cards")} aria-pressed={listView === "cards"} className={`min-h-11 rounded-xl border-2 px-3 text-sm font-bold ${listView === "cards" ? "border-[var(--gt-gold)] bg-[var(--gt-cta)] text-white" : "border-[var(--gt-line)]"}`}>▦ การ์ด</button>
        <button type="button" onClick={() => setListView("table")} aria-pressed={listView === "table"} className={`min-h-11 rounded-xl border-2 px-3 text-sm font-bold ${listView === "table" ? "border-[var(--gt-gold)] bg-[var(--gt-cta)] text-white" : "border-[var(--gt-line)]"}`}>☷ ตาราง</button>
        <button type="button" onClick={() => setShowPhotos(v => !v)} aria-pressed={showPhotos} className="min-h-11 rounded-xl border-2 border-[var(--gt-cta)]/50 bg-[var(--gt-surface)] px-3 text-sm font-semibold">{showPhotos ? "ซ่อนรูป" : "แสดงรูป"}</button>
      </div>
      {listView === "cards" ? <ul className="relative z-10 flex-1 space-y-2.5 p-3 pb-28 lg:pb-36">
        {list.map((t) => {
          const active = selected?.id === t.id;
          const isDone = t.state === "verified";
          return (
            <li key={t.id}>
              <button type="button" onClick={() => pick(t)} aria-current={active ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${active ? "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)] shadow-[inset_4px_0_0_var(--gt-cta)]" : "border-[var(--gt-line)] bg-[var(--gt-surface)] hover:border-[var(--gt-cta)]/50"}`}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-[var(--gt-cta)]/70 text-xl font-bold text-[var(--gt-ink)]">{two(t.board)}</span>
                {showPhotos && <span className="flex shrink-0 -space-x-1"><img src={t.black.photo || DEFAULT_AVATAR} alt="" className="h-11 w-9 rounded-lg border border-[var(--gt-gold)] object-cover" /><img src={t.white.photo || DEFAULT_AVATAR} alt="" className="h-11 w-9 rounded-lg border border-[var(--gt-gold)] object-cover" /></span>}
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex items-center gap-2"><Stone colour="black" /><span className="truncate font-medium">{t.black.name ?? "—"}</span></span>
                  <span className="flex items-center gap-2"><Stone colour="white" /><span className="truncate font-medium">{t.white.name ?? "—"}</span></span>
                </span>
                <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${isDone ? "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]" : "bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]"}`}>
                  {isDone ? "บันทึกแล้ว" : "รอผล"}
                </span>
              </button>
              {multiPool && <span className="sr-only">สาย {t.pool}</span>}
            </li>
          );
        })}
        {tables && !list.length && <li className="py-6 text-center text-sm text-[var(--gt-muted)]">{q ? "ไม่พบโต๊ะที่ค้นหา" : tab === "pending" ? "ลงผลครบทุกโต๊ะแล้ว" : "ยังไม่มีโต๊ะที่บันทึกผล"}</li>}
      </ul> : <div className="relative z-10 w-full overflow-x-auto p-3 pb-24">
        <table className="w-full min-w-[390px] border-collapse text-sm">
          <thead className="bg-[var(--gt-cta)] text-white"><tr><th className="p-2">โต๊ะ</th><th className="p-2">ดำ</th><th className="p-2">ขาว</th><th className="p-2">ผล</th></tr></thead>
          <tbody>{list.map(t => <tr key={t.id} className="border-b-2 border-[var(--gt-line)]">
            <td className="p-2 font-bold">{two(t.board)}</td>
            <td className="p-2">{showPhotos && <img src={t.black.photo || DEFAULT_AVATAR} alt="" className="mb-1 h-10 w-10 rounded-lg border border-[var(--gt-gold)] object-cover" />}<span className="block font-medium">{t.black.name ?? "—"}</span></td>
            <td className="p-2">{showPhotos && <img src={t.white.photo || DEFAULT_AVATAR} alt="" className="mb-1 h-10 w-10 rounded-lg border border-[var(--gt-gold)] object-cover" />}<span className="block font-medium">{t.white.name ?? "—"}</span></td>
            <td className="p-2"><button type="button" onClick={() => pick(t)} className="min-h-11 rounded-lg border-2 border-[var(--gt-gold)] bg-[var(--gt-cta)] px-2 font-bold text-white">{t.state === "verified" ? "ดูผล" : "ลงผล"}</button></td>
          </tr>)}</tbody>
        </table>
        {tables && !list.length && <p className="p-4 text-center">ไม่พบโต๊ะที่ค้นหา</p>}
      </div>}
      <Deco className="absolute -bottom-2 -left-6 w-[115%] max-w-none opacity-95" />
    </section>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.75rem] font-bold leading-tight text-[var(--gt-ink)] sm:text-[2.5rem]">
            <span className="sm:hidden">บันทึกผล</span><span className="hidden sm:inline">บันทึกผลการแข่งขัน</span>
          </h1>
          <p className="text-lg text-[var(--gt-cta)] sm:text-xl">{opened.tournament.title}</p>
          {division && <p className="text-base text-[var(--gt-cta)] sm:hidden">{divisionLabel(division.name)}</p>}
        </div>
        <span aria-hidden="true" className="mt-3 hidden sm:flex"><Stone colour="black" className="h-9 w-9 shadow-lg" /><Stone colour="white" className="-ml-3 mt-2 h-9 w-9 shadow-lg" /></span>
      </div>

      <div className={mobileDetail ? "hidden lg:block" : ""}>{filters}</div>

      {error && <p role="alert" className="rounded-xl border border-[var(--gt-bad)] bg-[var(--gt-surface)] px-4 py-3 text-sm text-[var(--gt-bad)]">{error}</p>}
      {tables === null && <p className="py-10 text-center text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>}
      {tables?.length === 0 && <p className="gt-card p-5 text-center">รุ่นนี้ยังไม่ประกาศคู่</p>}

      {tables && tables.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className={mobileDetail ? "hidden lg:block" : ""}>{tableList}</div>
          <div className={mobileDetail ? "" : "hidden lg:block"}>
            {selected && (
              <>
                <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 lg:hidden">
                  <button type="button" onClick={() => step(-1)} aria-label="โต๊ะก่อนหน้า" className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] text-xl">‹</button>
                  <span className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] font-medium">รอบ{selected.round}</span>
                  <label className="block">
                    <span className="sr-only">เลือกโต๊ะ</span>
                    <select value={selected.id} onChange={(e) => setSelectedId(e.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 font-medium">
                      {all.map((t) => <option key={t.id} value={t.id}>โต๊ะ{two(t.board)}{t.state === "verified" ? " ✓" : ""}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => step(1)} aria-label="โต๊ะถัดไป" className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] text-xl">›</button>
                </div>
                <Detail key={`${selected.id}:${selected.state}:${selected.result_code ?? ""}`} t={selected} call={call} onSaved={afterSave} />
                <button type="button" onClick={() => setMobileDetail(false)} className="mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-[var(--gt-cta)] lg:hidden">← กลับรายการโต๊ะ</button>
              </>
            )}
          </div>
        </div>
      )}

      <p className="pt-2 text-center text-xs text-[var(--gt-muted)]">มาสายเกิน 15 นาที เลือก “ชนะเพราะคู่ไม่มา” · ข้อมูลอัปเดตเองทุก 20 วินาที</p>
      {toast && createPortal(
        <p role="status" className="fixed inset-x-0 bottom-5 z-50 mx-auto w-fit rounded-full bg-[#0b2a5b] px-5 py-3 text-white shadow-xl">✓ {toast}</p>, portalTarget())}
    </div>
  );
}

/* ---------------------------------------------------------------- detail */

function Detail({ t, call, onSaved }: { t: Table; call: Call; onSaved: (t: Table) => void }) {
  const isDone = t.state === "verified";
  const init = formFromResult(t);
  const [editing, setEditing] = useState(!isDone);
  const [winner, setWinner] = useState<"black" | "white" | null>(init.winner as "black" | "white" | null);
  const [method, setMethod] = useState<string>(init.method);
  const [margin, setMargin] = useState(init.margin);
  const [note, setNote] = useState(t.note ?? "");
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<Side | null>(null);
  const names = { black: firstName(t.black.name), white: firstName(t.white.name) };
  const summary = summaryLine({ board: t.board, winner, method, margin, names: undefined });
  const winnerNeeded = needsWinner(method);

  const check = async (side: "black" | "white") => {
    setBusy(true);
    await call("gt_referee_checkin_v1", { p_match: t.id, p_side: side, p_present: !t[side].checked_in });
    setBusy(false);
  };
  const review = () => {
    const r = buildResult({ winner, method, margin });
    if (!r.ok) { setErr(r.error); return; }
    setErr(""); setConfirming(true);
  };
  const save = async () => {
    const r = buildResult({ winner, method, margin });
    if (!r.ok) return;
    setBusy(true);
    const ok = await call("gt_referee_record_result_v2", { p_match: t.id, p_result: r.code, p_margin: r.margin, p_note: note.trim() || null });
    setBusy(false);
    if (ok) { setConfirming(false); onSaved(t); }
  };

  const player = (side: "black" | "white") => {
    const p = t[side];
    return (
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-3 sm:p-4">
        <button type="button" onClick={() => setZoom(p)} aria-label={`ขยายรูป ${p.name ?? "นักกีฬา"}`} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--gt-cta)]"><img src={p.photo || DEFAULT_AVATAR} alt="" onError={(e) => { if (!e.currentTarget.src.endsWith(DEFAULT_AVATAR)) e.currentTarget.src = DEFAULT_AVATAR; }} className={`h-14 w-14 sm:h-20 sm:w-20 border-2 border-[var(--gt-gold)] ${p.photo ? "rounded-lg object-cover" : "object-contain"}`} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight text-[var(--gt-ink)] sm:text-xl">{p.name ?? "—"}</p>
          {p.rank && <p className="text-sm text-[var(--gt-cta)]">{p.rank}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 text-sm"><Stone colour={side} className="h-4 w-4" />หมาก{side === "black" ? "ดำ" : "ขาว"}</span>
            {(!isDone || p.checked_in) && (
              <button type="button" disabled={busy || isDone} onClick={() => check(side)} aria-pressed={p.checked_in}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${p.checked_in ? "border-[var(--gt-ok)] bg-[var(--gt-ok)] text-white" : "border-[var(--gt-line)] text-[var(--gt-muted)]"}`}>
                {p.checked_in ? "✓ มาแล้ว" : "เช็คชื่อ"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const choice = (side: "black" | "white") => {
    const on = winner === side && winnerNeeded;
    return (
      <button type="button" role="radio" aria-checked={on} disabled={!winnerNeeded} onClick={() => { setWinner(side); setErr(""); }}
        className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 text-left text-base font-medium transition disabled:opacity-45 ${on ? "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)]" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`}>
        <Stone colour={side} className="h-7 w-7" />
        <span className="min-w-0 flex-1 truncate">หมาก{side === "black" ? "ดำ" : "ขาว"} · {names[side]}</span>
        {on && <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--gt-cta)] text-sm text-white">✓</span>}
      </button>
    );
  };

  const match = { state: t.state, result_code: t.result_code, result_margin: t.result_margin, winner_athlete_id: t.winner, black_athlete_id: t.black.id, white_athlete_id: t.white.id };

  return (
    <section className="gt-card relative overflow-hidden p-4 sm:p-6" aria-label={`โต๊ะ ${t.board}`}>
      <span aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-40 w-56 bg-[linear-gradient(var(--gt-cta-soft)_1px,transparent_1px),linear-gradient(90deg,var(--gt-cta-soft)_1px,transparent_1px)] bg-[size:22px_22px] opacity-80 [mask-image:radial-gradient(circle_at_top_right,black,transparent_70%)]" />
      <div className="relative flex flex-wrap items-center gap-2">
        <span className="rounded-xl bg-[var(--gt-cta)] px-4 py-1.5 text-xl font-bold text-white">โต๊ะ{two(t.board)}</span>
        <span className="rounded-xl bg-[var(--gt-cta-soft)] px-3 py-1.5 font-medium text-[var(--gt-cta)]">รอบ{t.round}</span>
        {t.pool && <span className="rounded-xl bg-[var(--gt-cta-soft)] px-3 py-1.5 font-medium text-[var(--gt-cta)]">สาย {t.pool}</span>}
        {isDone && <span className="ml-auto rounded-xl bg-[var(--gt-win-bg)] px-3 py-1.5 text-sm font-medium text-[var(--gt-win-ink)]">บันทึกแล้ว · {resultLabel(match)}</span>}
      </div>

      <div className="relative mt-4 grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
        {player("black")}
        <span className="hidden text-center text-2xl font-bold text-[var(--gt-cta)] sm:block">VS</span>
        {player("white")}
      </div>

      {isDone && !editing ? (
        <div className="mt-5 space-y-3">
          {t.note && <p className="rounded-xl bg-[var(--gt-cta-soft)] px-4 py-3 text-sm">หมายเหตุ: {t.note}</p>}
          <button type="button" onClick={() => setEditing(true)} className="gt-outline-btn min-h-12 w-full">แก้ผลโต๊ะนี้</button>
          <p className="text-center text-xs text-[var(--gt-muted)]">แก้ได้จนกว่าผู้จัดจะออกคู่รอบถัดไป</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <ResultPicker winner={winner} method={method} disabled={busy} onChange={(w,m)=>{setWinner(w);setMethod(m);setMargin("");setErr("");}}/>
          {method === "count" && (
            <label className="grid items-center gap-1.5 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
              <span className="font-medium">ชนะกี่แต้ม</span>
              <input value={margin} onChange={(e) => { setMargin(e.target.value.replace(/[^\d.]/g, "").slice(0, 5)); setErr(""); }} inputMode="decimal" placeholder="เช่น 6.5"
                className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base" />
            </label>
          )}
          <label className="grid items-start gap-1.5 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
            <span className="font-medium sm:pt-3">หมายเหตุ (ถ้ามี)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={3} placeholder="ระบุหมายเหตุ (ถ้ามี)"
              className="w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 py-2.5 text-base" />
          </label>
          <p className="rounded-xl bg-[var(--gt-cta-soft)] px-4 py-3 text-lg font-medium text-[var(--gt-ink)]" aria-live="polite">{summary}</p>
          {err && <p role="alert" className="rounded-xl border border-[var(--gt-bad)] px-3 py-2 text-sm text-[var(--gt-bad)]">{err}</p>}
          <button type="button" onClick={review} disabled={busy} className="gt-cta-btn flex min-h-14 w-full items-center justify-center text-xl disabled:opacity-60">ตรวจสอบและยืนยันผล →</button>
          <p className="text-center text-sm text-[var(--gt-muted)]">จะมีหน้าตรวจสอบก่อนบันทึก</p>
          {isDone && <button type="button" onClick={() => setEditing(false)} className="w-full text-sm text-[var(--gt-muted)] underline">ไม่แก้ผล</button>}
        </div>
      )}

      {zoom && createPortal(
        <div role="dialog" aria-modal="true" aria-label={`รูปนักกีฬา ${zoom.name ?? ""}`} onClick={() => setZoom(null)} className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4">
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border-2 border-[var(--gt-gold)] bg-[var(--gt-surface)] p-4 text-center shadow-2xl">
            <button type="button" onClick={() => setZoom(null)} className="mb-3 ml-auto block min-h-11 rounded-lg border px-4">ปิด ✕</button>
            <img src={zoom.photo || DEFAULT_AVATAR} alt={zoom.name || "นักกีฬา"} className="mx-auto max-h-[65vh] max-w-full rounded-lg object-contain" />
            <p className="mt-3 text-lg font-bold">{zoom.name}</p>
            {zoom.rank && <p className="text-sm text-[var(--gt-muted)]">{zoom.rank}</p>}
          </div>
        </div>, portalTarget())}
      {confirming && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onClick={() => !busy && setConfirming(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl bg-[var(--gt-surface)] p-5 text-[var(--gt-ink)] shadow-2xl">
            <h2 id="confirm-title" className="text-2xl font-bold">ตรวจสอบก่อนบันทึก</h2>
            <dl className="space-y-2 rounded-xl bg-[var(--gt-cta-soft)] p-4">
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-[var(--gt-muted)]">โต๊ะ</dt><dd className="font-medium">โต๊ะ{two(t.board)} · รอบ{t.round}</dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-[var(--gt-muted)]">หมากดำ</dt><dd className="font-medium">{t.black.name}</dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-[var(--gt-muted)]">หมากขาว</dt><dd className="font-medium">{t.white.name}</dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-[var(--gt-muted)]">ผล</dt><dd className="text-lg font-bold text-[var(--gt-cta)]">{summaryLine({ board: t.board, winner, method, margin, names }).replace(/^โต๊ะ\d+ · /, "")}</dd></div>
              {note.trim() && <div className="flex gap-2"><dt className="w-20 shrink-0 text-[var(--gt-muted)]">หมายเหตุ</dt><dd>{note.trim()}</dd></div>}
            </dl>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="gt-outline-btn min-h-12">กลับไปแก้</button>
              <button type="button" disabled={busy} onClick={save} className="gt-cta-btn min-h-12 disabled:opacity-60">{busy ? "กำลังบันทึก…" : "ยืนยันบันทึกผล"}</button>
            </div>
          </div>
        </div>, portalTarget())}
    </section>
  );
}

/**
 * Referees with an account (chosen by the organiser for an event) never type a 6-digit code:
 * if this browser is signed in, show their events and open the console directly.
 */
function MineShortcut() {
  const [events, setEvents] = useState<{ access_id: string; title: string }[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const d = staffDb();
    if (!d) return;
    d.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setEvents([]); return; }
      const { data: access } = await d.rpc("gt_my_access_v1");
      setEvents((access?.referee ?? []) as { access_id: string; title: string }[]);
    });
  }, []);
  const go = async (id: string) => {
    setBusy(id); setError("");
    const { data, error: e } = await staffDb()!.rpc("gt_referee_open_mine_v1", { p_access: id });
    if (e || !data?.token) { setBusy(""); setError("เปิดไม่สำเร็จ กรุณาลองใหม่"); return; }
    saveCode(data.token, data.code);
    window.location.assign(`/referee/${encodeURIComponent(data.token)}`);
  };
  if (events === null) return null;
  if (!events.length) {
    return (
      <p className="rounded-xl bg-[var(--gt-cta-soft)] p-3 text-sm">
        กรรมการที่มีบัญชี: <a href="/login?next=/account" className="font-semibold text-[var(--gt-cta)] underline">เข้าสู่ระบบ</a> ด้วยเลขดั้ง / ชื่อ + รหัสผ่าน แล้วกด “เปิดหน้ากรรมการ” ในหน้าบัญชีของฉัน
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border-2 border-[var(--gt-cta)] p-3 text-left">
      <p className="text-sm font-semibold">คุณเป็นกรรมการของงาน (ไม่ต้องใส่รหัส):</p>
      {events.map((e) => (
        <button key={e.access_id} type="button" onClick={() => go(e.access_id)} disabled={!!busy} className="gt-cta-btn min-h-12 w-full disabled:opacity-60">
          {busy === e.access_id ? "กำลังเปิด…" : `เปิดหน้ากรรมการ · ${e.title}`}
        </button>
      ))}
      {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}
    </div>
  );
}
