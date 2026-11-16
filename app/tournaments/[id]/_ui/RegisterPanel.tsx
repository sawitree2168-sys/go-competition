"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { RANK_OPTIONS, applyErrorMessage, registrationWindow, staffErrorMessage } from "@/lib/competition-day.mjs";
import { thaiDate } from "@/lib/division-display";

type Mode = "web" | "external" | "closed";
type Application = { id: string; division_id: string; division_name: string; full_name: string; rank_label: string; club: string | null; status: "pending" | "approved" | "rejected"; created_at: string };

const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const noop = () => () => {};

const STEPS = [
  { n: 1, title: "กรอกข้อมูล", body: "ชื่อ-นามสกุล ระดับฝีมือ และชมรม" },
  { n: 2, title: "ผู้จัดตรวจสอบ", body: "ผู้จัดตรวจสอบความถูกต้องของข้อมูล" },
  { n: 3, title: "อนุมัติเข้าแข่งขัน", body: "รายชื่อจะแสดงในแท็บนักกีฬา" },
];

const field = "mt-1.5 block min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3.5 text-base text-[var(--gt-ink)] outline-none focus:border-[var(--gt-brand)] focus:ring-2 focus:ring-[var(--gt-brand)]/25";

export default function RegisterPanel(props: {
  tournamentId: string; divisionId: string; divisionLabel: string;
  mode: Mode; url: string | null; openDate: string | null; closeDate: string | null;
}) {
  return (
    <div className="mt-4 space-y-4">
      <ApplyCard {...props} />
      <OrganizerQueue tournamentId={props.tournamentId} divisionId={props.divisionId} />
    </div>
  );
}

function Steps() {
  return (
    <>
      {/* Mobile: one row stepper */}
      <ol className="flex items-start justify-between gap-1 lg:hidden" aria-label="ขั้นตอนการสมัคร">
        {STEPS.map((s, i) => (
          <li key={s.n} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
            {i > 0 && <span aria-hidden="true" className="absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 bg-[var(--gt-line)]" />}
            <span className={`relative grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${i === 0 ? "bg-[var(--gt-brand)] text-white" : "border-2 border-[var(--gt-line)] bg-[var(--gt-surface)] text-[var(--gt-muted)]"}`}>{s.n}</span>
            <span className="mt-1 text-xs font-semibold leading-tight">{s.title}</span>
          </li>
        ))}
      </ol>
      {/* Desktop: vertical list */}
      <ol className="hidden space-y-4 lg:block" aria-label="ขั้นตอนการสมัคร">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex gap-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold ${i === 0 ? "bg-[var(--gt-brand)] text-white" : "border-2 border-[var(--gt-line)] text-[var(--gt-muted)]"}`}>{s.n}</span>
            <span className="min-w-0"><span className="block font-semibold">{s.title}</span><span className="block text-sm text-[var(--gt-muted)]">{s.body}</span></span>
          </li>
        ))}
      </ol>
    </>
  );
}

function Tip() {
  return (
    <p className="flex gap-2 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 py-2.5 text-sm">
      <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--gt-brand)] text-xs font-bold text-white">i</span>
      ตรวจสอบชื่อและระดับฝีมือให้ถูกต้องก่อนส่งใบสมัคร
    </p>
  );
}

function ApplyCard({ divisionId, divisionLabel, mode, url, openDate, closeDate }: Parameters<typeof RegisterPanel>[0]) {
  const today = useSyncExternalStore(noop, bangkokToday, () => null);
  const [name, setName] = useState("");
  const [rank, setRank] = useState("");
  const [club, setClub] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ name: string; reference: string } | null>(null);

  const window_ = today ? registrationWindow(openDate, closeDate, today) : "open";
  const heading = (
    <div>
      <h2 className="text-xl font-bold">สมัครแข่งขัน</h2>
      <p className="text-sm text-[var(--gt-muted)]">กรอกข้อมูลนักกีฬา เพื่อส่งให้ผู้จัดตรวจสอบ · {divisionLabel}</p>
    </div>
  );

  if (mode !== "web" || window_ !== "open") {
    const msg = mode === "external"
      ? { title: "งานนี้รับสมัครผ่านช่องทางของผู้จัด", body: url ? "กดปุ่มด้านล่างเพื่อไปยังแบบฟอร์มสมัคร" : "ดูช่องทางสมัครได้ที่รายละเอียดงาน หรือติดต่อผู้จัด" }
      : mode === "closed" ? { title: "ปิดรับสมัครแล้ว", body: "ติดต่อผู้จัดหากมีข้อสงสัย" }
      : window_ === "not_yet" ? { title: "ยังไม่เปิดรับสมัคร", body: `เปิดรับสมัคร ${thaiDate(openDate) ?? openDate}` }
      : { title: "ปิดรับสมัครแล้ว", body: `ปิดรับสมัครเมื่อ ${thaiDate(closeDate) ?? closeDate}` };
    return (
      <section className="gt-card space-y-3 p-4">
        {heading}
        <div className="rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-4 py-3">
          <p className="font-semibold">{msg.title}</p>
          <p className="text-sm text-[var(--gt-muted)]">{msg.body}</p>
        </div>
        {mode === "external" && url && <a href={url} target="_blank" rel="noopener noreferrer" className="gt-gold-btn inline-flex min-h-12 items-center px-5">ไปที่แบบฟอร์มสมัคร →</a>}
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const n = name.replace(/\s+/g, " ").trim();
    if (n.length < 3 || !n.includes(" ")) return setError(applyErrorMessage("NAME"));
    if (!rank) return setError(applyErrorMessage("RANK"));
    const db = staffDb();
    if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    setBusy(true);
    try {
      const { data, error: err } = await db.rpc("gt_apply_v1", { p_division: divisionId, p_full_name: n, p_rank: rank, p_club: club.trim() });
      if (err) return setError(applyErrorMessage(""));
      if (!data?.ok) return setError(applyErrorMessage(data?.error));
      setSent({ name: n, reference: data.reference });
      setName(""); setRank(""); setClub("");
    } catch {
      setError(applyErrorMessage(""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="gt-card p-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-4">
          {heading}
          <div className="lg:hidden"><Steps /></div>
          {sent ? (
            <div role="status" className="space-y-3 rounded-xl border border-[var(--gt-ok)] px-4 py-4">
              <p className="text-lg font-bold text-[var(--gt-ok)]">ส่งใบสมัครแล้ว</p>
              <p>{sent.name} · เลขอ้างอิง <span className="gt-num font-bold">{sent.reference}</span></p>
              <p className="text-sm text-[var(--gt-muted)]">ผู้จัดจะตรวจสอบข้อมูลก่อนอนุมัติ เมื่ออนุมัติแล้วรายชื่อจะแสดงในแท็บนักกีฬา</p>
              <button type="button" onClick={() => setSent(null)} className="gt-outline-btn min-h-11 px-4 text-sm font-semibold">สมัครอีกคน</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <label className="block">
                <span className="font-semibold">ชื่อ-นามสกุล <span className="text-[var(--gt-bad)]">*</span></span>
                <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} maxLength={120} autoComplete="name" required placeholder="เช่น สมชาย ใจดี" className={field} />
              </label>
              <label className="block">
                <span className="font-semibold">ระดับฝีมือ <span className="text-[var(--gt-bad)]">*</span></span>
                <select value={rank} onChange={(e) => { setRank(e.target.value); setError(""); }} required className={field}>
                  <option value="">กรุณาระบุระดับฝีมือปัจจุบัน</option>
                  {RANK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="font-semibold">ชมรม/สังกัด</span>
                <input value={club} onChange={(e) => setClub(e.target.value)} maxLength={120} placeholder="ระบุชมรม หรืออิสระ" className={field} />
              </label>
              {error && <p role="alert" className="rounded-xl border border-[var(--gt-bad)] px-3 py-2 text-sm text-[var(--gt-bad)]">{error}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={busy} className="gt-gold-btn inline-flex min-h-12 items-center px-6 disabled:opacity-60">{busy ? "กำลังส่ง…" : "ส่งใบสมัคร →"}</button>
                <span className="text-sm text-[var(--gt-muted)]">ผู้จัดจะตรวจสอบข้อมูลก่อนอนุมัติ</span>
              </div>
              <div className="lg:hidden"><Tip /></div>
            </form>
          )}
        </div>
        <aside className="hidden space-y-4 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] p-4 lg:block">
          <p className="font-bold">ขั้นตอนการสมัคร</p>
          <Steps />
          <Tip />
        </aside>
      </div>
    </section>
  );
}

/** Shown only to an organiser of this event who is signed in on this browser. Without divisionId: every division of the event. */
export function OrganizerQueue({ tournamentId, divisionId, bare }: { tournamentId: string; divisionId?: string; bare?: boolean }) {
  const [rows, setRows] = useState<Application[] | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const db = staffDb();
    if (!db) return;
    const { data: s } = await db.auth.getSession();
    if (!s.session) return;
    const { data, error: err } = await db.rpc("gt_staff_list_applications_v1", { p_tournament: tournamentId, p_division: divisionId ?? null });
    if (!err) setRows((data ?? []) as Application[]);
  }, [tournamentId, divisionId]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  if (!rows) return null;
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  const decide = async (id: string, approve: boolean) => {
    const db = staffDb();
    if (!db) return;
    setBusyId(id); setError("");
    const { error: err } = await db.rpc("gt_staff_decide_application_v1", { p_id: id, p_approve: approve });
    setBusyId("");
    if (err) setError(staffErrorMessage(err.message));
    await load();
  };

  return (
    <section className={bare ? "" : "gt-card p-4"} aria-label="รายการรออนุมัติ">
      {!bare && <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">สำหรับผู้จัดการแข่งขัน</h2>
        <span className="rounded-full bg-[var(--gt-brand)] px-2.5 py-0.5 text-xs font-semibold text-white">เฉพาะผู้จัด</span>
      </div>}
      <div className="flex items-center gap-2">
        <p className="font-semibold">รายการรออนุมัติ</p>
        <span className="gt-pill-gold rounded-full px-2.5 py-0.5 text-xs font-semibold">{pending.length} รายการ</span>
      </div>
      {error && <p role="alert" className="mt-2 rounded-xl border border-[var(--gt-bad)] px-3 py-2 text-sm text-[var(--gt-bad)]">{error}</p>}
      {pending.length ? (
        <ul className="mt-3 divide-y divide-[var(--gt-line)] rounded-xl border border-[var(--gt-line)]">
          {pending.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <span className="truncate">{r.full_name}</span>
                  {!divisionId && <span className="text-xs font-normal text-[var(--gt-muted)]">{r.division_name}</span>}
                  <span className="rounded-md border border-[var(--gt-brand)] px-1.5 py-0.5 text-xs text-[var(--gt-brand)]">{r.rank_label}</span>
                </p>
                <p className="truncate text-sm text-[var(--gt-muted)]">{r.club ?? "อิสระ"}</p>
              </div>
              <span className="rounded-full border border-[var(--gt-gold)] px-2.5 py-0.5 text-xs font-semibold text-[var(--gt-gold-ink)]">รอตรวจสอบ</span>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                <button type="button" disabled={!!busyId} onClick={() => decide(r.id, false)} className="gt-outline-btn min-h-11 px-4 text-sm font-semibold text-[var(--gt-bad)] disabled:opacity-60">ปฏิเสธ</button>
                <button type="button" disabled={!!busyId} onClick={() => decide(r.id, true)} className="gt-gold-btn min-h-11 px-4 text-sm disabled:opacity-60">{busyId === r.id ? "กำลังบันทึก…" : "อนุมัติ"}</button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-[var(--gt-muted)]">ไม่มีใบสมัครรออนุมัติ</p>}
      {decided.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-[var(--gt-muted)]">ตัดสินแล้ว {decided.length} รายการ</summary>
          <ul className="mt-2 space-y-1">
            {decided.map((r) => (
              <li key={r.id} className="flex justify-between gap-2"><span className="truncate">{r.full_name} · {r.rank_label}</span><span className={r.status === "approved" ? "text-[var(--gt-ok)]" : "text-[var(--gt-bad)]"}>{r.status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธ"}</span></li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-3 text-xs text-[var(--gt-muted)]">อนุมัติแล้ว ระบบจะเพิ่มชื่อเข้ารุ่นนี้ (สถานะชำระเงิน: รอตรวจสอบ) รายชื่อหน้าสาธารณะอัปเดตภายใน 30 วินาที</p>
    </section>
  );
}
