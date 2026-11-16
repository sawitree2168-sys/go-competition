"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ThemeToggle from "../../tournaments/[id]/_ui/ThemeToggle";
import { resultLabel, staffErrorMessage } from "@/lib/competition-day.mjs";
import MatchCard, { type Seat } from "../../tournaments/[id]/_ui/MatchCard";
import ResultControls from "../../tournaments/[id]/_ui/ResultControls";
import { divisionLabel, divisionSortValue } from "@/lib/division-display";

type Side = { id: string; name: string | null; institution: string | null; rank?: string | null; photo?: string | null; score?: number; checked_in: boolean };
type Table = { id: string; pool: string | null; round: number; board: number; state: string; result_code: string | null; result_margin: string | null; winner: string | null; black: Side; white: Side };
type Division = { id: string; name: string; pending: number; last_round: number | null };
type Opened = { referee_name: string; expires_at: string; tournament: { title: string; event_date: string | null }; divisions: Division[] };

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
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <span aria-hidden="true" className="h-7 w-7 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#14171e_60%)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{opened?.tournament.title ?? "GO TOURNAMENT"}</p>
          <p className="truncate text-sm text-[var(--gt-muted)]">{opened ? `กรรมการ: ${opened.referee_name}` : "หน้ากรรมการ"}</p>
        </div>
        {opened && <button type="button" onClick={signOut} className="gt-outline-btn min-h-11 px-3 text-sm">ออก</button>}
        <ThemeToggle />
      </header>
      {!opened ? <CodeForm busy={busy} error={error} onSubmit={open} /> : <Console token={token} code={code} opened={opened} onExpired={expired} />}
    </div>
  );
}

function CodeForm({ busy, error, onSubmit }: { busy: boolean; error: string; onSubmit: (code: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (/^\d{6}$/.test(value)) onSubmit(value); }} className="gt-card mx-auto mt-6 max-w-sm space-y-4 p-6 text-center">
      <h1 className="text-xl font-bold">ใส่รหัส 6 หลัก</h1>
      <p className="text-sm text-[var(--gt-muted)]">รหัสอยู่ในข้อความที่ผู้จัดส่งมาพร้อมลิงก์</p>
      <input value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
        aria-label="รหัส 6 หลัก" placeholder="••••••" autoFocus
        className="gt-num min-h-16 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] text-center text-3xl tracking-[0.4em]" />
      {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}
      <button type="submit" disabled={busy || value.length !== 6} className="gt-gold-btn min-h-12 w-full disabled:opacity-60">{busy ? "กำลังตรวจสอบ…" : "เข้าใช้งาน"}</button>
    </form>
  );
}

function Console({ token, code, opened, onExpired }: { token: string; code: string; opened: Opened; onExpired: (msg: string) => void }) {
  const divisions = useMemo(() => [...opened.divisions].sort((a, b) => divisionSortValue(a.name) - divisionSortValue(b.name)), [opened.divisions]);
  const [divisionId, setDivisionId] = useState(() => divisions.find((d) => d.last_round)?.id ?? divisions[0]?.id ?? "");
  const [tables, setTables] = useState<Table[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

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
    const t = window.setInterval(load, 20000); // other referees' check-ins and results appear without reloading
    return () => window.clearInterval(t);
  }, [load]);

  const call = async (fn: string, args: Record<string, unknown>) => {
    const { data, error: e } = await db()!.rpc(fn, { p_token: token, p_code: code, ...args });
    if (e) { setError(staffErrorMessage(e.message)); return false; }
    if (!data?.ok) { setError(ERRORS[data?.error] ?? "ทำรายการไม่สำเร็จ"); return false; }
    await load();
    return true;
  };

  const q = query.trim().toLowerCase();
  const shown = (tables ?? []).filter((t) => !q || String(t.board) === q || [t.black.name, t.white.name, t.black.institution, t.white.institution].some((x) => (x ?? "").toLowerCase().includes(q)));
  const seats = (tables ?? []).length * 2;
  const checked = (tables ?? []).reduce((n, t) => n + (t.black.checked_in ? 1 : 0) + (t.white.checked_in ? 1 : 0), 0);
  const pending = (tables ?? []).filter((t) => t.state !== "verified").length;
  const pools = [...new Set(shown.map((t) => t.pool ?? ""))];

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">เลือกรุ่น</span>
        <select value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setTables(null); }}
          className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base font-semibold">
          {divisions.map((d) => <option key={d.id} value={d.id}>{divisionLabel(d.name)}{d.last_round ? ` · รอบ ${d.last_round}` : " · ยังไม่ออกคู่"}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อ / สถาบัน / เลขโต๊ะ" aria-label="ค้นหา"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base" />
        <button type="button" onClick={load} className="gt-outline-btn min-h-12 px-4">รีเฟรช</button>
      </div>
      {tables && tables.length > 0 && (
        <p className="flex flex-wrap gap-x-4 text-sm">
          <span>รอบ {tables[0].round}</span>
          <span>เช็คอินแล้ว <strong className="gt-num text-[var(--gt-ok)]">{checked}</strong></span>
          <span>ยังไม่เช็คอิน <strong className={`gt-num ${checked < seats ? "text-[var(--gt-warn)]" : ""}`}>{seats - checked}</strong></span>
          <span>รอผล <strong className="gt-num">{pending}</strong></span>
        </p>
      )}
      {error && <p role="alert" className="rounded-xl border border-[var(--gt-bad)] px-4 py-3 text-sm text-[var(--gt-bad)]">{error}</p>}
      {tables === null && <p className="py-6 text-center text-[var(--gt-muted)]">กำลังโหลด…</p>}
      {tables?.length === 0 && <p className="gt-card p-4 text-sm">รุ่นนี้ยังไม่ประกาศคู่</p>}
      {pools.map((pool) => (
        <section key={pool || "all"} className="space-y-2">
          {pools.length > 1 && <h2 className="font-bold">สาย {pool}</h2>}
          <ul className="space-y-3">
            {shown.filter((t) => (t.pool ?? "") === pool).map((t) => <RefTable key={t.id} t={t} call={call} />)}
          </ul>
        </section>
      ))}
      <p className="pt-2 text-center text-xs text-[var(--gt-muted)]">มาสายเกิน 15 นาที ให้ลงผล “ชนะ เพราะคู่ไม่มา” · ลิงก์ใช้ได้ถึง {new Date(opened.expires_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
    </div>
  );
}

function RefTable({ t, call }: { t: Table; call: (fn: string, args: Record<string, unknown>) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const done = t.state === "verified";
  const run = async (fn: string, args: Record<string, unknown>) => { setBusy(true); const ok = await call(fn, args); setBusy(false); if (ok) setEditing(false); };
  const record = (codeName: string, margin: string | null) => run("gt_referee_record_result_v1", { p_match: t.id, p_result: codeName, p_margin: margin });
  const match = { state: t.state, result_code: t.result_code, result_margin: t.result_margin, winner_athlete_id: t.winner, black_athlete_id: t.black.id, white_athlete_id: t.white.id };
  const seat = (p: Side): Seat => ({ id: p.id, name: p.name, institution: p.institution, rank: p.rank, photo: p.photo, score: p.score ?? 0, won: t.winner === p.id });
  const checkButton = (side: "black" | "white") => {
    const here = t[side].checked_in;
    if (done) return here ? <span className="text-xs font-semibold text-[var(--gt-ok)]">✓ มาแล้ว</span> : null;
    return (
      <button type="button" disabled={busy} onClick={() => run("gt_referee_checkin_v1", { p_match: t.id, p_side: side, p_present: !here })} aria-pressed={here}
        className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${here ? "border-[var(--gt-ok)] bg-[var(--gt-ok)] text-white" : "border-[var(--gt-line)] bg-[var(--gt-surface)] text-[var(--gt-muted)]"}`}>
        {here ? "✓ มาแล้ว" : "เช็คอิน"}
      </button>
    );
  };
  return (
    <MatchCard board={t.board} status={done ? resultLabel(match) : "รอผล"} statusTone={done ? "done" : "wait"} highlight={!done}
      black={seat(t.black)} white={seat(t.white)} blackExtra={checkButton("black")} whiteExtra={checkButton("white")}
      actions={done && !editing
        ? <button type="button" onClick={() => setEditing(true)} className="min-h-11 text-sm text-[var(--gt-muted)] underline">แก้ผล</button>
        : <ResultControls busy={busy} onRecord={record} onCancel={done ? () => setEditing(false) : undefined} />} />
  );
}
