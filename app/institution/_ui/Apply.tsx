"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { APPLICATION_STATUS, PAYMENT_STATUS, SKIP_REASON, amountDue, baht, portalError } from "@/lib/institution-portal.mjs";
import { Avatar, Chip, Empty, SectionTitle, inputCls, selectCls, type Application, type Overview } from "./bits";
import { Steps } from "./views";

type Division = { id: string; name: string; fee: number | null; seats: number | null };
type OpenEvent = { id: string; title: string; date: string | null; close: string | null; divisions: Division[] };
type Done = { added: number; skipped: { name: string; why: string }[]; fee: number; title: string; division: string };

const thDate = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "");

/** Group entry: event → students → division → payment summary. Each entry still goes to the organiser for approval. */
export default function Apply({ ov, apps, canEdit, reload }: { ov: Overview; apps: Application[]; canEdit: boolean; reload: () => Promise<void> }) {
  const [events, setEvents] = useState<OpenEvent[] | null>(null);
  const [eventId, setEventId] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [divisionId, setDivisionId] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    staffDb()!.rpc("gt_open_events_v1").then(({ data }) => setEvents((data ?? []) as OpenEvent[]));
  }, []);

  const ev = events?.find((e) => e.id === eventId) ?? null;
  const div = ev?.divisions.find((d) => d.id === divisionId) ?? null;
  const entered = useMemo(() => new Set(apps.filter((a) => a.status !== "rejected" && a.tournament_id === eventId).map((a) => a.athlete_id)), [apps, eventId]);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return ov.students.filter((s) => !k || `${s.name} ${s.nickname ?? ""}`.toLowerCase().includes(k));
  }, [ov.students, q]);
  const step = done ? 4 : !eventId ? 1 : !picked.size ? 2 : !divisionId ? 3 : 4;
  const total = (Number(div?.fee) || 0) * picked.size;

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const reset = () => { setDone(null); setPicked(new Set()); setDivisionId(""); setEventId(""); setError(""); };

  const submit = async () => {
    if (!ev || !div) return;
    setBusy(true); setError("");
    const { data, error: e } = await staffDb()!.rpc("gt_academy_group_apply_v1", { p_academy: ov.academy.id, p_division: div.id, p_athletes: [...picked] });
    setBusy(false);
    if (e || !data?.ok) { setError(portalError(data?.error)); return; }
    setDone({ added: data.added, skipped: data.skipped ?? [], fee: (Number(div.fee) || 0) * data.added, title: ev.title, division: div.name });
    await reload();
    document.getElementById("apply-top")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <div id="apply-top"><SectionTitle>สมัครและชำระเงิน</SectionTitle></div>
      <div className="gt-card space-y-5 p-4 sm:p-6">
        <Steps at={step} />
        {!canEdit && <div role="status" className="rounded-xl border-2 border-[#e6ba59] bg-[#fff8e9] p-4 text-sm text-[#725113]"><p className="font-bold">รออนุมัติสิทธิ์จากผู้จัดการสถาบัน</p><p className="mt-1">ดูรายการแข่งขันและข้อมูลเบื้องต้นได้ แต่ยังส่งใบสมัครหรือชำระเงินแทนสถาบันไม่ได้ จนกว่าผู้จัดการ GO MASTER จะอนุมัติบัญชีครูในเมนู “ครูในสถาบัน”</p><Link href="/institution?v=teachers" className="mt-2 inline-flex min-h-11 items-center font-bold underline">ไปหน้าจัดการสิทธิ์ครู →</Link></div>}

        {done ? (
          <div className="space-y-3 text-center" role="status">
            <p className="text-4xl" aria-hidden="true">✅</p>
            <h3 className="text-xl font-bold">ส่งใบสมัคร {done.added} คนแล้ว</h3>
            <p className="text-[var(--gt-muted)]">{done.title} · {done.division}</p>
            {done.skipped.length > 0 && (
              <ul className="mx-auto max-w-md rounded-xl bg-[var(--gt-surface-2)] p-3 text-left text-sm">
                {done.skipped.map((s) => <li key={s.name}>• {s.name} — {SKIP_REASON[s.why as keyof typeof SKIP_REASON] ?? s.why}</li>)}
              </ul>
            )}
            {done.fee > 0 && <p className="text-lg">ยอดค่าสมัคร <b className="gt-num">{baht(done.fee)}</b></p>}
            <PayNote />
            <button type="button" onClick={reset} className="gt-outline-btn min-h-12 px-6">สมัครรายการอื่น</button>
          </div>
        ) : (
          <>
            {/* 1 event */}
            <fieldset className="space-y-2" disabled={!canEdit}>
              <legend className="mb-2 text-lg font-semibold">1. เลือกงานแข่งขัน</legend>
              {events === null ? <p className="text-sm text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>
                : events.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {events.map((e) => (
                      <label key={e.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${eventId === e.id ? "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)]" : "border-[var(--gt-line)]"}`}>
                        <input type="radio" name="event" value={e.id} checked={eventId === e.id} onChange={() => { setEventId(e.id); setDivisionId(""); }} className="mt-1 h-5 w-5 accent-[var(--gt-cta)]" />
                        <span className="min-w-0">
                          <span className="block font-semibold">{e.title}</span>
                          <span className="block text-sm text-[var(--gt-muted)]">{thDate(e.date)}{e.close ? ` · ปิดรับ ${thDate(e.close)}` : ""}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : <Empty>ตอนนี้ยังไม่มีรายการที่เปิดรับสมัครผ่านเว็บ · ดูรายการทั้งหมดได้ที่ <Link href="/tournaments" className="text-[var(--gt-cta)] underline">รายการแข่งขัน</Link></Empty>}
            </fieldset>

            {/* 2 students */}
            {ev && (
              <fieldset className="space-y-2" disabled={!canEdit}>
                <legend className="mb-2 text-lg font-semibold">2. ติ๊กชื่อนักเรียน <span className="text-sm font-normal text-[var(--gt-muted)]">เลือกแล้ว {picked.size} คน</span></legend>
                <div className="flex flex-wrap gap-2">
                  <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ" aria-label="ค้นหานักเรียน" className={`${inputCls} min-w-0 flex-1`} />
                  <button type="button" onClick={() => setPicked(new Set(list.filter((s) => s.rank && !entered.has(s.id)).map((s) => s.id)))} className="gt-outline-btn min-h-12 px-4 text-sm">เลือกทั้งหมด</button>
                  {picked.size > 0 && <button type="button" onClick={() => setPicked(new Set())} className="min-h-12 px-3 text-sm text-[var(--gt-muted)] underline">ล้าง</button>}
                </div>
                {list.length ? (
                  <ul className="grid max-h-[26rem] gap-1.5 overflow-y-auto rounded-xl border border-[var(--gt-line)] p-1.5 sm:grid-cols-2">
                    {list.map((s) => {
                      const already = entered.has(s.id);
                      return (
                        <li key={s.id}>
                          <label className={`flex min-h-14 items-center gap-3 rounded-lg px-2 py-1.5 ${already || !s.rank ? "opacity-60" : "cursor-pointer hover:bg-[var(--gt-surface-2)]"} ${picked.has(s.id) ? "bg-[var(--gt-cta-soft)]" : ""}`}>
                            <input type="checkbox" checked={picked.has(s.id)} disabled={already || !s.rank} onChange={() => toggle(s.id)} className="h-5 w-5 shrink-0 accent-[var(--gt-cta)]" />
                            <Avatar src={s.photo} className="h-9 w-9" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{s.name}</span>
                              <span className="block text-xs text-[var(--gt-muted)]">{already ? "สมัครงานนี้แล้ว" : s.rank ?? "ยังไม่มีระดับฝีมือ"}</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : <div className="rounded-xl border-2 border-[#bcd1eb] bg-[#f3f8ff] p-4 text-sm"><p className="font-bold">ยังไม่มีรายชื่อนักเรียนสำหรับสมัคร</p><p className="mt-1">ค้นหาและเชื่อม GO ID เดิมจากเมนูนักเรียนก่อน โดยไม่ต้องสร้างไอดีใหม่</p><Link href="/institution?v=students" className="mt-2 inline-flex min-h-11 items-center font-bold text-[#0b5fbd] underline">ไปหน้าเพิ่มนักเรียน →</Link></div>}
              </fieldset>
            )}

            {/* 3 division */}
            {ev && picked.size > 0 && (
              <fieldset className="space-y-2" disabled={!canEdit}>
                <legend className="mb-2 text-lg font-semibold">3. เลือกรุ่น</legend>
                <label className="sr-only" htmlFor="ap-div">รุ่นที่สมัคร</label>
                <select id="ap-div" value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className={`${selectCls} min-h-12 w-full sm:max-w-md`}>
                  <option value="">เลือกรุ่น</option>
                  {ev.divisions.map((d) => <option key={d.id} value={d.id}>{d.name}{d.fee != null ? ` · ${baht(d.fee)}` : ""}</option>)}
                </select>
                <p className="text-xs text-[var(--gt-muted)]">นักเรียนที่เลือกทั้งหมดจะลงรุ่นเดียวกัน ถ้าต่างรุ่น ให้สมัครทีละกลุ่ม</p>
              </fieldset>
            )}

            {/* 4 confirm */}
            {ev && div && picked.size > 0 && (
              <div className="space-y-3 rounded-2xl border border-[var(--gt-cta)] bg-[var(--gt-cta-soft)] p-4">
                <p className="text-lg font-semibold">4. ตรวจสอบและส่งใบสมัคร</p>
                <p>{ev.title} · {div.name} · <b>{picked.size} คน</b></p>
                <p>ค่าสมัครรวม <b className="gt-num text-xl">{div.fee != null ? baht(total) : "ผู้จัดยังไม่ระบุ"}</b>{div.fee != null && <span className="text-sm text-[var(--gt-muted)]"> ({baht(div.fee)} × {picked.size})</span>}</p>
                {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}
                <button type="button" onClick={submit} disabled={busy || !canEdit} className="gt-cta-btn flex min-h-12 w-full items-center justify-center gap-2 disabled:opacity-50 sm:w-auto sm:px-8">
                  {busy ? "กำลังส่ง…" : <>ส่งใบสมัคร {picked.size} คน <span aria-hidden="true">→</span></>}
                </button>
                <p className="text-xs text-[var(--gt-muted)]">ผู้จัดจะตรวจใบสมัครก่อนรับเข้ารายชื่อ ดูสถานะได้ในรายการด้านล่าง</p>
              </div>
            )}
          </>
        )}
      </div>

      <PayList apps={apps} />
    </div>
  );
}

function PayNote() {
  return (
    <p className="mx-auto max-w-md rounded-xl bg-[var(--gt-gold-soft)] px-4 py-3 text-sm text-[var(--gt-gold-ink)]">
      ช่องทางโอนเงินและแนบสลิปจะแสดงเมื่อผู้จัดยืนยันบัญชีธนาคารของงานแล้ว · ตอนนี้ยังไม่ต้องโอนเงิน
    </p>
  );
}

function PayList({ apps }: { apps: Application[] }) {
  const due = amountDue(apps);
  const m = new Map<string, { title: string; date: string | null; items: Application[] }>();
  for (const a of apps) {
    if (!m.has(a.tournament_id)) m.set(a.tournament_id, { title: a.title, date: a.date, items: [] });
    m.get(a.tournament_id)!.items.push(a);
  }
  const groups = [...m.entries()];
  return (
    <section id="pay-list" className="gt-card space-y-4 p-4 sm:p-6" aria-labelledby="pay-h">
      <div className="flex flex-wrap items-end gap-3">
        <h3 id="pay-h" className="text-xl font-bold">รายการสมัครและชำระเงิน</h3>
        {due > 0 && <p className="ml-auto">ค้างชำระ <b className="gt-num text-xl text-[var(--gt-warn)]">{baht(due)}</b></p>}
      </div>
      {groups.length ? groups.map(([id, g]) => {
        const sum = g.items.filter((i) => i.status !== "rejected").reduce((s, i) => s + (Number(i.fee) || 0), 0);
        return (
          <div key={id} className="overflow-hidden rounded-xl border border-[var(--gt-line)]">
            <div className="flex flex-wrap items-center gap-2 bg-[var(--gt-cta-soft)] px-4 py-2.5">
              <Link href={`/tournaments/${id}`} className="font-semibold hover:underline">{g.title}</Link>
              <span className="text-sm text-[var(--gt-muted)]">{thDate(g.date)}</span>
              <span className="ml-auto text-sm">{g.items.length} คน · {baht(sum)}</span>
            </div>
            <ul className="divide-y divide-[var(--gt-line)]">
              {g.items.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 basis-40"><span className="font-medium">{a.name}</span> <span className="text-[var(--gt-muted)]">· {a.division}</span></span>
                  <span className="gt-num text-[var(--gt-muted)]">#{a.reference}</span>
                  <Chip tone={a.status === "approved" ? "win" : a.status === "rejected" ? "loss" : "wait"}>{APPLICATION_STATUS[a.status]}</Chip>
                  {a.status === "approved" && <Chip tone={a.payment === "verified" || a.payment === "waived" ? "win" : "info"}>{PAYMENT_STATUS[(a.payment ?? "pending") as keyof typeof PAYMENT_STATUS]}</Chip>}
                </li>
              ))}
            </ul>
          </div>
        );
      }) : <Empty>ยังไม่มีใบสมัครจากสถาบันนี้</Empty>}
      {due > 0 && <PayNote />}
    </section>
  );
}
