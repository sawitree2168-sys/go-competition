"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import Gate from "../../_lib/Gate";
import { ErrorNote, staffDb, useAction, useStaff } from "../../_lib/staff";

type Referee = { id: string; referee_name: string; expires_at: string; revoked_at: string | null; last_used_at: string | null; created_at: string; locked: boolean };
type Created = { name: string; link: string; code: string; expires_at: string };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

/** End of the given day in Thailand (23:59 +07:00). */
const endOfDayBangkok = (date: string) => new Date(`${date}T23:59:00+07:00`).toISOString();
const todayBangkok = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

export default function RefereesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Gate><Referees id={id} /></Gate>;
}

function Referees({ id }: { id: string }) {
  const staff = useStaff();
  const [event, setEvent] = useState<{ title: string; event_date: string | null } | null>(null);
  const [rows, setRows] = useState<Referee[] | null>(null);
  const [name, setName] = useState("");
  const [until, setUntil] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);
  const action = useAction();
  const { setError } = action;

  const load = useCallback(async () => {
    const db = staffDb()!;
    const [ev, list] = await Promise.all([
      db.from("gt_tournaments").select("title,event_date").eq("id", id).maybeSingle(),
      db.rpc("gt_staff_list_referees_v1", { p_tournament: id }),
    ]);
    setEvent(ev.data);
    setRows((list.data ?? []) as Referee[]);
    if (list.error) setError("โหลดรายชื่อกรรมการไม่ได้: " + list.error.message);
  }, [id, setError]);

  useEffect(() => { if (staff.status === "staff") queueMicrotask(load); }, [staff.status, load]);

  const defaultUntil = () => {
    const d = event?.event_date && event.event_date >= todayBangkok() ? event.event_date : todayBangkok();
    return d;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreated(null); setCopied(false);
    const res = await action.run<{ id: string; token: string; code: string; expires_at: string }[]>(() =>
      staffDb()!.rpc("gt_staff_create_referee_v1", { p_tournament: id, p_name: name.trim(), p_expires_at: endOfDayBangkok(until || defaultUntil()) }));
    const row = res?.data?.[0];
    if (!row) return;
    setCreated({ name: name.trim(), link: `${window.location.origin}/referee/${row.token}`, code: row.code, expires_at: row.expires_at });
    setName("");
    await load();
  };

  const revoke = async (r: Referee) => {
    if (!window.confirm(`ยกเลิกลิงก์ของ ${r.referee_name}? ลิงก์นี้จะใช้ไม่ได้ทันที`)) return;
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_revoke_referee_v1", { p_id: r.id }));
    if (ok) await load();
  };

  const shareText = created
    ? `กรรมการ ${event?.title ?? ""}\nคุณ${created.name}\nเปิดลิงก์: ${created.link}\nรหัส 6 หลัก: ${created.code}\n(ใช้ได้ถึง ${when(created.expires_at)})`
    : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); } catch { setCopied(false); }
  };

  const statusOf = (r: Referee) => r.revoked_at ? ["ยกเลิกแล้ว", "text-[var(--gt-muted)]"]
    : new Date(r.expires_at) <= new Date() ? ["หมดอายุ", "text-[var(--gt-muted)]"]
    : r.locked ? ["ถูกล็อก (ใส่รหัสผิดหลายครั้ง)", "text-[var(--gt-bad)]"]
    : ["ใช้งานได้", "text-[var(--gt-ok)]"];

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/organizer/${id}`} className="text-sm text-[var(--gt-muted)] underline-offset-2 hover:underline">← {event?.title ?? "กลับ"}</Link>
        <h1 className="mt-1 text-xl font-bold">กรรมการ</h1>
        <p className="text-sm text-[var(--gt-muted)]">กรรมการทำได้เฉพาะ <strong>เช็คอินที่โต๊ะ</strong> และ <strong>ลงผล</strong> ของงานนี้ ไม่เห็นข้อมูลส่วนตัว ไม่จับคู่ และไม่ตัดชื่อ ทุกผลที่ลงจะบันทึกชื่อกรรมการไว้</p>
      </div>

      <form onSubmit={create} className="gt-card space-y-3 p-4">
        <h2 className="font-bold">เพิ่มกรรมการ</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block space-y-1">
            <span className="text-sm font-medium">ชื่อกรรมการ</span>
            <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ครูสมชาย"
              className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 text-base" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">ใช้ได้ถึงวันที่</span>
            <input type="date" value={until || (event ? defaultUntil() : "")} min={todayBangkok()} onChange={(e) => setUntil(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 text-base" />
          </label>
        </div>
        <ErrorNote text={action.error} />
        <button type="submit" disabled={action.busy || !name.trim()} className="gt-gold-btn min-h-12 w-full px-5 sm:w-auto disabled:opacity-60">
          {action.busy ? "กำลังสร้าง…" : "สร้างลิงก์ + รหัส"}
        </button>
      </form>

      {created && (
        <section className="gt-card space-y-3 border-[var(--gt-gold)] p-4" aria-live="polite">
          <h2 className="font-bold">ส่งให้คุณ{created.name}</h2>
          <p className="rounded-xl bg-[var(--gt-warn-soft)] px-3 py-2 text-sm"><strong>รหัสจะแสดงครั้งนี้ครั้งเดียว</strong> ถ้าลืม ให้ยกเลิกแล้วสร้างใหม่</p>
          <div className="space-y-1">
            <p className="text-sm text-[var(--gt-muted)]">ลิงก์</p>
            <p className="break-all rounded-xl bg-[var(--gt-surface-2)] px-3 py-2 font-mono text-sm">{created.link}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-[var(--gt-muted)]">รหัส 6 หลัก</p>
            <p className="gt-num text-4xl font-bold tracking-[0.3em]">{created.code}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`https://line.me/R/share?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center rounded-xl bg-[#06c755] px-5 font-semibold text-white">ส่งทาง LINE</a>
            <button type="button" onClick={copy} className="gt-outline-btn min-h-12 px-5">{copied ? "คัดลอกแล้ว ✓" : "คัดลอกข้อความ"}</button>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-bold">กรรมการของงานนี้</h2>
        {rows === null && <p className="text-[var(--gt-muted)]">กำลังโหลด…</p>}
        {rows?.length === 0 && <p className="gt-card p-4 text-sm text-[var(--gt-muted)]">ยังไม่มีกรรมการ</p>}
        <ul className="space-y-2">
          {rows?.map((r) => {
            const [label, cls] = statusOf(r);
            const usable = label === "ใช้งานได้" || r.locked;
            return (
              <li key={r.id} className="gt-card flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{r.referee_name}</span>
                  <span className="block text-xs text-[var(--gt-muted)]">ใช้ได้ถึง {when(r.expires_at)} · ใช้ล่าสุด {when(r.last_used_at)}</span>
                </span>
                <span className={`text-sm font-semibold ${cls}`}>{label}</span>
                {usable && !r.revoked_at && (
                  <button type="button" onClick={() => revoke(r)} disabled={action.busy} className="min-h-11 rounded-xl border border-[var(--gt-bad)] px-3 text-sm text-[var(--gt-bad)]">ยกเลิกลิงก์</button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
