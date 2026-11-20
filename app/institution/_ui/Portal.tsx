"use client";

import {AcademyStaff} from "./AcademyPeople";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ThemeToggle from "../../tournaments/[id]/_ui/ThemeToggle";
import { staffDb } from "@/app/organizer/_lib/staff";
import { ROLE_LABEL, eventsOf, filterRecords, yearsOf } from "@/lib/institution-portal.mjs";
import { BoardLogo, Deco, ICONS, MENU, selectCls, type Application, type Overview, type View } from "./bits";
import Join from "./Join";
import { Home, Students, Tracking, Awards, Stats, Reports } from "./views";
import Apply from "./Apply";
import StaffUsername from "./StaffUsername";

type Mine = { id: string; name: string; role: "manager" | "teacher"; status: "active" | "pending" };
type State =
  | { s: "loading" } | { s: "out" } | { s: "none"; email: string; admin: boolean }
  | { s: "ready"; email: string; admin: boolean; mine: Mine[] };

const KEY = "gt-academy";
const VIEWS: View[] = ["home", "students", "tracking", "awards", "stats", "reports", "apply"];
const readView = (): View => {
  const v = new URLSearchParams(window.location.search).get("v") as View | null;
  return v && VIEWS.includes(v) ? v : "home";
};

export default function Portal() {
  const [st, setSt] = useState<State>({ s: "loading" });
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const loadMine = useCallback(async () => {
    const db = staffDb();
    if (!db) { setSt({ s: "out" }); return; }
    const { data: sess } = await db.auth.getSession();
    if (!sess.session) { setSt({ s: "out" }); return; }
    const email = sess.session.user.email ?? "";
    const [{ data: mine }, { data: access }] = await Promise.all([db.rpc("gt_my_academies_v1"), db.rpc("gt_my_access_v1")]);
    const admin = Boolean(access?.platform_role);
    const list = (mine ?? []) as Mine[];
    if (!list.length) { setSt({ s: "none", email, admin }); return; }
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* private mode */ }
    setAcademyId((cur) => (cur && list.some((m) => m.id === cur) ? cur : list.find((m) => m.id === saved)?.id ?? list[0].id));
    setSt({ s: "ready", email, admin, mine: list });
  }, []);

  useEffect(() => { queueMicrotask(loadMine); }, [loadMine]);

  const pick = (id: string) => { setAcademyId(id); setJoining(false); try { localStorage.setItem(KEY, id); } catch { /* ignore */ } };
  const signOut = async () => { await staffDb()?.auth.signOut(); window.location.assign("/"); };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[linear-gradient(180deg,var(--gt-cta-soft),transparent_480px)]">
      <TopBar email={st.s === "ready" || st.s === "none" ? st.email : null} onSignOut={signOut} />
      {st.s === "loading" && <p className="py-20 text-center text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>}
      {st.s === "out" && (
        <div className="mx-auto mt-10 max-w-md px-4">
          <div className="gt-card space-y-4 p-6 text-center">
            <BoardLogo className="mx-auto h-16 w-16" />
            <h1 className="text-2xl font-bold">หน้าสถาบัน</h1>
            <p className="text-[var(--gt-muted)]">สำหรับครูและผู้ดูแลสถาบัน ดูแลนักเรียน ติดตามผล และสมัครแข่งแบบกลุ่ม</p>
            <Link href="/login?next=/institution" className="gt-cta-btn flex min-h-12 items-center justify-center">เข้าสู่ระบบ</Link>
          </div>
        </div>
      )}
      {(st.s === "none" || (st.s === "ready" && joining)) && (
        <Join admin={st.admin} onCancel={st.s === "ready" ? () => setJoining(false) : undefined}
          onJoined={async (id) => { try { localStorage.setItem(KEY, id); } catch { /* ignore */ } setJoining(false); await loadMine(); setAcademyId(id); }} />
      )}
      {st.s === "ready" && !joining && academyId && (
        <Workspace key={academyId} academyId={academyId} mine={st.mine} onPick={pick} onJoin={() => setJoining(true)} />
      )}
    </div>
  );
}

function TopBar({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  return (
    <header className="bg-[linear-gradient(180deg,#0d3f8f,#0a2f6e)] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="GO TOURNAMENT หน้าหลัก">
          <span aria-hidden="true" className="flex shrink-0">
            <span className="h-8 w-8 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)] shadow sm:h-9 sm:w-9" />
            <span className="-ml-3 -mt-1 h-8 w-8 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] shadow sm:h-9 sm:w-9" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block whitespace-nowrap text-lg font-bold tracking-wide sm:text-2xl">GO TOURNAMENT</span>
            <span className="block truncate text-[10px] tracking-wide text-white/85 sm:text-[13px]">INSTITUTION MANAGEMENT PORTAL</span>
          </span>
        </Link>
        <details className="relative ml-auto">
          <summary aria-label="เมนูบัญชี" className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl hover:bg-white/10 [&::-webkit-details-marker]:hidden">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </summary>
          <div className="absolute right-0 z-40 mt-2 w-64 space-y-2 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-3 text-[var(--gt-ink)] shadow-xl">
            {email && <p className="truncate px-2 text-xs text-[var(--gt-muted)]">{email}</p>}
            <Link href="/" className="block rounded-lg px-2 py-2 hover:bg-[var(--gt-surface-2)]">หน้าหลัก</Link>
            <Link href="/tournaments" className="block rounded-lg px-2 py-2 hover:bg-[var(--gt-surface-2)]">รายการแข่งขัน</Link>
            <Link href="/account" className="block rounded-lg px-2 py-2 hover:bg-[var(--gt-surface-2)]">บัญชีของฉัน</Link>
            <div className="flex items-center justify-between px-2 text-sm">โหมดสี <ThemeToggle /></div>
            {email && <button type="button" onClick={onSignOut} className="gt-outline-btn min-h-11 w-full text-sm">ออกจากระบบ</button>}
          </div>
        </details>
      </div>
    </header>
  );
}

function Workspace({ academyId, mine, onPick, onJoin }: { academyId: string; mine: Mine[]; onPick: (id: string) => void; onJoin: () => void }) {
  const [ov, setOv] = useState<Overview | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [view, setViewState] = useState<View>("home");
  const [year, setYear] = useState<number | null>(new Date().getFullYear() + 543);
  const [event, setEvent] = useState("");

  const load = useCallback(async () => {
    const db = staffDb()!;
    const [o, a] = await Promise.all([db.rpc("gt_academy_overview_v1", { p_academy: academyId }), db.rpc("gt_academy_applications_v1", { p_academy: academyId })]);
    if (o.error || !o.data?.ok) { setError(o.error ? "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่" : "บัญชีนี้ไม่มีสิทธิ์ดูสถาบันนี้"); return; }
    setOv(o.data as Overview);
    setApps(((a.data?.items ?? []) as Application[]));
  }, [academyId]);

  useEffect(() => { queueMicrotask(load); }, [load]);
  useEffect(() => {
    if (view !== "tracking") return;
    const timer = window.setInterval(() => { void load(); }, 30000);
    return () => window.clearInterval(timer);
  }, [view, load]);

  useEffect(() => {
    queueMicrotask(() => setViewState(readView()));
    const back = () => setViewState(readView());
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);

  const go = (v: View) => {
    setViewState(v);
    const url = v === "home" ? window.location.pathname : `${window.location.pathname}?v=${v}`;
    window.history.pushState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const records = useMemo(() => ov?.records ?? [], [ov]);
  const years = useMemo(() => yearsOf(records), [records]);
  const events = useMemo(() => eventsOf(records, year), [records, year]);
  const filtered = useMemo(() => filterRecords(records, { year, event }), [records, year, event]);
  const track = useMemo(() => (ov?.tracking ?? []).filter((t) => (!year || Number(String(t.date ?? "").slice(0, 4)) + 543 === year) && (!event || t.tournament_id === event)), [ov, year, event]);

  const me = mine.find((m) => m.id === academyId);
  const roleLabel = ov?.access === "admin" && !me ? ROLE_LABEL.admin : ROLE_LABEL[me?.role ?? "teacher"];
  const canEdit = ov?.access === "active" || ov?.access === "admin";

  const filters = (
    <>
      <label className="sr-only" htmlFor="f-year">ปี</label>
      <select id="f-year" value={year ?? ""} onChange={(e) => { setYear(e.target.value ? Number(e.target.value) : null); setEvent(""); }} className={`${selectCls} min-w-[7.5rem]`}>
        {years.map((y) => <option key={y} value={y}>ปี {y}</option>)}
        <option value="">ทุกปี</option>
      </select>
      <label className="sr-only" htmlFor="f-event">รายการแข่งขัน</label>
      <select id="f-event" value={event} onChange={(e) => setEvent(e.target.value)} className={`${selectCls} min-w-[9rem] max-w-[14rem]`}>
        <option value="">ทุกรายการ</option>
        {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
      </select>
    </>
  );

  const name = ov?.academy.name ?? me?.name ?? "";
  const switcher = (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-2 text-[15px] font-semibold hover:bg-[var(--gt-surface-2)] [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-[var(--gt-cta)]" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7Z" /></svg>
        <span className="flex-1">{roleLabel}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div className="absolute left-0 right-0 z-30 mt-1 min-w-60 space-y-1 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-2 shadow-xl">
        <p className="px-2 pt-1 text-xs text-[var(--gt-muted)]">สถาบันของฉัน</p>
        {mine.map((m) => (
          <button key={m.id} type="button" onClick={(e) => { (e.currentTarget.closest("details") as HTMLDetailsElement).open = false; onPick(m.id); }}
            aria-current={m.id === academyId ? "true" : undefined}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--gt-surface-2)] aria-[current]:bg-[var(--gt-cta-soft)]">
            <span className="min-w-0 flex-1 truncate">{m.name}</span>
            {m.status === "pending" && <span className="rounded-full bg-[var(--gt-gold-soft)] px-2 text-xs text-[var(--gt-warn)]">รออนุมัติ</span>}
          </button>
        ))}
        <button type="button" onClick={onJoin} className="w-full rounded-lg px-2 py-2 text-left text-sm text-[var(--gt-cta)] hover:bg-[var(--gt-surface-2)]">+ เพิ่มสถาบันอื่น</button>
      </div>
    </details>
  );

  const body = !ov ? (
    error ? <p role="alert" className="gt-card p-6 text-center text-[var(--gt-bad)]">{error}</p>
      : <p className="py-16 text-center text-[var(--gt-muted)]" role="status">กำลังโหลดข้อมูลสถาบัน…</p>
  ) : view === "home" ? <Home ov={ov} records={filtered} track={track} apps={apps} filters={filters} go={go} />
    : view === "students" ? <Students ov={ov} canEdit={canEdit} reload={load} />
    : view === "tracking" ? <Tracking ov={ov} track={track} filters={filters} />
    : view === "awards" ? <Awards ov={ov} records={filtered} filters={filters} />
    : view === "stats" ? <Stats ov={ov} records={filtered} filters={filters} />
    : view === "reports" ? <Reports ov={ov} records={filtered} filters={filters} />
    : <Apply ov={ov} apps={apps} canEdit={canEdit} reload={load} />;

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-3 pb-10 pt-4 sm:px-6 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:pt-6">
      {/* Sidebar (computer) */}
      <aside className="hidden lg:block">
        <div className="gt-card sticky top-4 space-y-1 p-3">
          <button type="button" onClick={() => go("home")} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[var(--gt-surface-2)]">
            <BoardLogo className="h-[4.25rem] w-[4.25rem]" />
            <span className="text-xl font-bold leading-snug">{name}</span>
          </button>
          <div className="border-y border-[var(--gt-line)] py-1">{switcher}</div>
          <nav aria-label="เมนูสถาบัน" className="divide-y divide-[var(--gt-line)] pt-1">
            {MENU.map((m) => (
              <button key={m.id} type="button" onClick={() => go(m.id)} aria-current={view === m.id ? "page" : undefined}
                className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3.5 text-left hover:bg-[var(--gt-surface-2)] aria-[current=page]:bg-[var(--gt-cta-soft)]">
                <span className="h-8 w-8 shrink-0 text-[var(--gt-cta)]">{ICONS[m.id]}</span>
                <span className="min-w-0">
                  <span className="block text-lg font-semibold leading-tight">{m.title}</span>
                  <span className="block text-sm text-[var(--gt-muted)]">{m.sub}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="relative min-w-0 space-y-5">
        {/* Institution row (mobile) */}
        <div className="gt-card flex items-center gap-3 p-3 lg:hidden">
          <BoardLogo className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => go("home")} className="block max-w-full truncate text-left text-base font-bold">{name}</button>
            <div className="-ml-2 text-sm">{switcher}</div>
          </div>
        </div>

        <Hero compact={view !== "home"} name={name} />
        {view === "home" && <AcademyStaff academyId={academyId}/> }
        {view === "home" && canEdit && <StaffUsername role={me?.role ?? "teacher"} /> }

        {ov?.access === "pending" && (
          <p role="status" className="rounded-2xl border border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] px-4 py-3 text-sm text-[var(--gt-gold-ink)]">
            <span className="font-semibold">รอเจ้าของระบบอนุมัติสิทธิ์ครู</span> — ตอนนี้ดูข้อมูลนักเรียนและผลการแข่งขันได้แล้ว ส่วนการเพิ่มนักเรียนและสมัครแข่งจะใช้ได้เมื่ออนุมัติแล้ว
          </p>
        )}

        {/* Menu grid (mobile home) */}
        {view === "home" && (
          <nav aria-label="เมนูสถาบัน" className="grid grid-cols-2 gap-2.5 lg:hidden">
            {MENU.map((m) => (
              <button key={m.id} type="button" onClick={() => go(m.id)} className="gt-card flex min-h-[4.25rem] items-center gap-2.5 px-3 py-2.5 text-left active:bg-[var(--gt-surface-2)]">
                <span className="h-7 w-7 shrink-0 text-[var(--gt-cta)]">{ICONS[m.id]}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-tight">{m.title}</span>
                  <span className="block text-[11px] leading-snug text-[var(--gt-muted)]">{m.sub}</span>
                </span>
              </button>
            ))}
          </nav>
        )}
        {view !== "home" && (
          <button type="button" onClick={() => go("home")} className="inline-flex min-h-11 items-center gap-1 text-[15px] text-[var(--gt-cta)] hover:underline">‹ ภาพรวมสถาบัน</button>
        )}

        {body}

        {view === "home" && <div aria-hidden="true" className="h-20 sm:h-24 lg:h-16" />}
        {view === "home" && <Deco className="absolute -bottom-6 -right-3 w-[78%] max-w-[34rem] sm:-right-6 lg:-bottom-10 lg:w-[46%]" />}
      </div>
    </div>
  );
}

function Hero({ compact, name }: { compact: boolean; name: string }) {
  return (
    <section className={`relative overflow-hidden rounded-2xl border border-[var(--gt-line)] bg-[linear-gradient(110deg,var(--gt-surface)_35%,var(--gt-cta-soft))] ${compact ? "px-5 py-4" : "px-5 py-5 sm:px-10 sm:py-8"}`}>
      <svg aria-hidden="true" viewBox="0 0 200 120" className="absolute -right-2 top-0 h-full w-auto text-[var(--gt-cta)] opacity-70">
        <g stroke="currentColor" strokeWidth="1" opacity=".45">{[40, 70, 100, 130, 160, 190].map((x) => <path key={x} d={`M${x} 0v120`} />)}{[15, 45, 75, 105].map((y) => <path key={y} d={`M20 ${y}h180`} />)}</g>
        {[[100, 45], [130, 15], [160, 75], [190, 45], [130, 105]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="currentColor" />)}
      </svg>
      <div aria-hidden="true" className={`absolute flex items-end ${compact ? "bottom-2 right-8 scale-75" : "right-1 top-1 origin-top-right scale-[.6] sm:bottom-8 sm:right-24 sm:top-auto sm:scale-100"}`}>
        <span className="h-10 w-12 rounded-[50%] bg-[radial-gradient(circle_at_40%_30%,#fff,#e4e8ee_60%,#aab2bf)] shadow-[0_6px_10px_rgba(0,0,0,.25)] sm:h-14 sm:w-20" />
        <span className="-ml-3 h-10 w-12 rounded-[50%] bg-[radial-gradient(circle_at_40%_30%,#5b6170,#0b0d12_60%)] shadow-[0_6px_10px_rgba(0,0,0,.35)] sm:h-14 sm:w-20" />
      </div>
      <div className="relative">
        <p className={`inline-block -skew-x-[10deg] font-bold leading-none tracking-tight text-[var(--gt-ink)] ${compact ? "text-3xl" : "text-[2.6rem] sm:text-6xl"}`}>{name}</p>
        <p className={`mt-1.5 font-semibold text-[var(--gt-ink)] ${compact ? "text-sm" : "text-[15px] sm:text-2xl"}`}>พื้นที่ดูแลนักเรียนและจัดการการแข่งขัน</p>
      </div>
    </section>
  );
}
