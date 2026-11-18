"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";

type Division = { name: string; rounds: number };
type Slot = { division: string; round: number; files: number };
type Submission = {
  id: string; event_name: string; event_date: string; venue?: string | null; organizer?: string | null;
  status: "incomplete" | "pending" | "extracted" | "confirmed" | "rejected"; admin_note?: string | null;
  divisions: Division[]; checklist: Slot[];
};

const STATUS: Record<Submission["status"], { label: string; cls: string }> = {
  incomplete: { label: "ยังไม่ครบ", cls: "bg-[var(--gt-gold-soft)] text-[var(--gt-gold-ink)]" },
  pending: { label: "ครบแล้ว · รอตรวจ", cls: "bg-[var(--gt-cta-soft)] text-[var(--gt-brand)]" },
  extracted: { label: "อ่านไฟล์แล้ว · รอแอดมินยืนยัน", cls: "bg-[var(--gt-cta-soft)] text-[var(--gt-brand)]" },
  confirmed: { label: "ขึ้นเว็บแล้ว", cls: "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]" },
  rejected: { label: "ไม่ผ่านการตรวจ", cls: "bg-[var(--gt-loss-bg)] text-[var(--gt-loss-ink)]" },
};
const ERRORS: Record<string, string> = {
  SIGN_IN: "กรุณาเข้าสู่ระบบก่อน",
  UPLOAD_NOT_READY: "ระบบรับไฟล์ยังไม่เปิดใช้งาน กรุณาลองใหม่ภายหลัง",
  FUTURE_DATE: "วันที่แข่งต้องไม่เกินวันนี้",
  NO_DIVISIONS: "กรุณาใส่อย่างน้อย 1 รุ่น",
  BAD_TYPE: "รองรับเฉพาะรูปภาพ PDF Excel หรือ CSV",
  TOO_BIG: "ไฟล์ใหญ่เกิน 15 MB",
  BAD_TICKET: "หมดเวลาส่งไฟล์ กรุณาเลือกไฟล์ใหม่อีกครั้ง",
  TOO_MANY: "ส่งไฟล์เยอะเกินไปในชั่วโมงนี้ กรุณารอสักครู่",
};
const errText = (m: string) => Object.entries(ERRORS).find(([k]) => m.includes(k))?.[1] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่";
const SUGGEST = [...Array.from({ length: 30 }, (_, i) => `${30 - i} คิว`), "1 ดั้ง", "2 ดั้ง", "3 ดั้ง", "4 ดั้ง", "Friendship 9×9", "Friendship 13×13", "Open"];
const slotLabel = (r: number) => (r === 0 ? "อันดับรวม" : `รอบ ${r}`);
const thaiDate = (iso: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

/** Shrink photos (long side 2400 px, JPEG) so they upload fast on mobile data; other files go as they are. */
async function prepare(file: File): Promise<{ name: string; mime: string; data: string; size: number }> {
  let blob: Blob = file, mime = file.type || "application/octet-stream", name = file.name;
  if (/^image\/(jpeg|png|webp)$/.test(mime)) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      const out = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.86));
      if (out && out.size < file.size) { blob = out; mime = "image/jpeg"; name = name.replace(/\.\w+$/, "") + ".jpg"; }
    } catch { /* keep the original */ }
  }
  if (blob.size > 15 * 1024 * 1024) throw new Error("TOO_BIG");
  const data = await new Promise<string>((ok, bad) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = () => bad(r.error);
    r.readAsDataURL(blob);
  });
  return { name, mime, data, size: blob.size };
}

function Checklist({ sub, onChange }: { sub: Submission; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ key: string; text: string; bad?: boolean } | null>(null);

  async function upload(slot: Slot, files: FileList | null) {
    if (!files?.length) return;
    const key = `${slot.division}|${slot.round}`;
    const db = staffDb()!;
    setBusy(key); setMsg(null);
    let done = 0;
    try {
      for (const f of Array.from(files)) {
        setMsg({ key, text: `กำลังส่งไฟล์ ${done + 1}/${files.length}…` });
        const p = await prepare(f);
        const { data: t, error } = await db.rpc("gt_result_upload_ticket_v1", { p_submission: sub.id, p_division: slot.division, p_round: slot.round });
        if (error) throw new Error(error.message);
        const res = await fetch((t as { upload_url: string }).upload_url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ ticket: (t as { ticket: string }).ticket, name: p.name, mime: p.mime, data: p.data }),
        });
        const j = (await res.json()) as { ok: boolean; error?: string };
        if (!j.ok) throw new Error(j.error ?? "SERVER");
        done++;
      }
      setMsg({ key, text: `ส่งแล้ว ${done} ไฟล์ ✓` });
    } catch (e) {
      setMsg({ key, text: (done ? `ส่งได้ ${done} ไฟล์ · ` : "") + errText(String((e as Error).message)), bad: true });
    } finally {
      setBusy(null);
      await onChange();
    }
  }

  const byDiv = useMemo(() => sub.divisions.map((d) => ({ d, slots: sub.checklist.filter((s) => s.division === d.name) })), [sub]);
  const filled = sub.checklist.filter((s) => s.files > 0).length;

  return (
    <div className="space-y-4">
      <div className="gt-card space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{sub.event_name}</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[sub.status].cls}`}>{STATUS[sub.status].label}</span>
        </div>
        <p className="text-sm text-[var(--gt-muted)]">{thaiDate(sub.event_date)}{sub.venue ? ` · ${sub.venue}` : ""}{sub.organizer ? ` · ผู้จัด ${sub.organizer}` : ""}</p>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--gt-surface-2)]" role="progressbar" aria-valuemin={0} aria-valuemax={sub.checklist.length} aria-valuenow={filled}>
          <div className="h-full rounded-full bg-[var(--gt-cta)]" style={{ width: `${(filled / Math.max(1, sub.checklist.length)) * 100}%` }} />
        </div>
        <p className="gt-num text-sm">{filled === sub.checklist.length
          ? "ครบทุกรุ่นทุกรอบแล้ว ✓ แอดมินจะตรวจและนำผลขึ้นเว็บ"
          : `แนบแล้ว ${filled} จาก ${sub.checklist.length} ช่อง · ยังขาด ${sub.checklist.length - filled} ช่อง`}</p>
      </div>

      {byDiv.map(({ d, slots }) => (
        <section key={d.name} className="gt-card p-4" aria-label={`รุ่น ${d.name}`}>
          <h3 className="mb-2 font-bold">รุ่น {d.name} <span className="text-sm font-normal text-[var(--gt-muted)]">· {d.rounds} รอบ</span></h3>
          <ul className="divide-y divide-[var(--gt-line)]">
            {slots.map((s) => {
              const key = `${s.division}|${s.round}`;
              const id = `f-${encodeURIComponent(key)}`;
              return (
                <li key={key} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${s.files ? "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]" : "border border-dashed border-[var(--gt-line)] text-[var(--gt-muted)]"}`} aria-hidden="true">{s.files ? "✓" : ""}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{slotLabel(s.round)}</span>
                    <span className="block text-xs text-[var(--gt-muted)]">{s.round === 0 ? "ตารางอันดับสุดท้ายของรุ่น" : "ใบจับคู่พร้อมผลแพ้ชนะของรอบนี้"}{s.files ? ` · มี ${s.files} ไฟล์` : ""}</span>
                    {msg?.key === key && <span role="status" className={`block text-xs ${msg.bad ? "text-[var(--gt-bad)]" : "text-[var(--gt-ok)]"}`}>{msg.text}</span>}
                  </span>
                  <label htmlFor={id} className={`gt-outline-btn inline-flex min-h-10 cursor-pointer items-center px-4 text-sm font-semibold ${busy ? "pointer-events-none opacity-50" : ""}`}>
                    {busy === key ? "กำลังส่ง…" : s.files ? "+ เพิ่มไฟล์" : "แนบไฟล์"}
                  </label>
                  <input id={id} type="file" multiple className="sr-only" disabled={!!busy}
                    accept="image/*,application/pdf,.xlsx,.xls,.csv"
                    onChange={(e) => { void upload(s, e.target.files); e.target.value = ""; }} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DivisionEditor({ rows, set }: { rows: Division[]; set: (r: Division[]) => void }) {
  return (
    <div className="space-y-2">
      <datalist id="gt-division-names">{SUGGEST.map((s) => <option key={s} value={s} />)}</datalist>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input list="gt-division-names" value={r.name} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            placeholder="ชื่อรุ่น เช่น 15 คิว" aria-label={`ชื่อรุ่นที่ ${i + 1}`}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base" />
          <select value={r.rounds} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, rounds: Number(e.target.value) } : x)))}
            aria-label={`จำนวนรอบของรุ่นที่ ${i + 1}`} className="min-h-11 rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-2 text-base">
            {Array.from({ length: 12 }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n} รอบ</option>)}
          </select>
          <button type="button" onClick={() => set(rows.filter((_, j) => j !== i))} disabled={rows.length === 1}
            aria-label={`ลบรุ่นที่ ${i + 1}`} className="grid min-h-11 min-w-11 place-items-center rounded-lg text-[var(--gt-muted)] hover:bg-[var(--gt-surface-2)] disabled:opacity-30">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => set([...rows, { name: "", rounds: rows.at(-1)?.rounds ?? 4 }])}
        className="min-h-10 rounded-lg px-2 text-sm font-semibold text-[var(--gt-cta)] hover:bg-[var(--gt-cta-soft)]">+ เพิ่มรุ่น</button>
    </div>
  );
}

/** Parents and athletes send in results of outside events: pairing sheet of every round + final standings, for every division. */
export default function ResultSubmit() {
  const [me, setMe] = useState<"loading" | "out" | "in">("loading");
  const [mine, setMine] = useState<Submission[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", date: "", venue: "", organizer: "" });
  const [divs, setDivs] = useState<Division[]>([{ name: "", rounds: 4 }]);
  const [matches, setMatches] = useState<Submission[] | null>(null);
  const [addDivs, setAddDivs] = useState<Division[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadMine = useCallback(async () => {
    const { data } = await staffDb()!.rpc("gt_my_result_submissions_v1");
    setMine((data ?? []) as Submission[]);
  }, []);
  const [extra, setExtra] = useState<Submission | null>(null);   // a found event I have not sent files to yet
  const active = mine.find((s) => s.id === activeId) ?? (extra?.id === activeId ? extra : null);

  useEffect(() => {
    const db = staffDb();
    if (!db) { queueMicrotask(() => setMe("out")); return; }
    db.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setMe("out"); return; }
      setMe("in");
      await loadMine();
    });
  }, [loadMine]);

  async function refreshActive() {
    await loadMine();
    if (extra) {
      const { data } = await staffDb()!.rpc("gt_result_find_events_v1", { p_query: extra.event_name, p_date: extra.event_date });
      const hit = ((data ?? []) as Submission[]).find((s) => s.id === extra.id);
      if (hit) setExtra(hit);
    }
  }

  async function findExisting() {
    if (form.name.trim().length < 3 || !form.date) { setMatches(null); return; }
    const { data } = await staffDb()!.rpc("gt_result_find_events_v1", { p_query: form.name.trim(), p_date: form.date });
    setMatches((data ?? []) as Submission[]);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const clean = divs.filter((d) => d.name.trim());
    if (form.name.trim().length < 3) { setError("กรุณาใส่ชื่อรายการ"); return; }
    if (!form.date) { setError("กรุณาเลือกวันที่แข่ง"); return; }
    if (!clean.length) { setError(ERRORS.NO_DIVISIONS); return; }
    setBusy(true); setError("");
    const { data, error: err } = await staffDb()!.rpc("gt_result_submit_v1", {
      p_event_name: form.name, p_event_date: form.date, p_venue: form.venue, p_organizer: form.organizer, p_divisions: clean, p_existing: null,
    });
    setBusy(false);
    if (err) { setError(errText(err.message)); return; }
    await loadMine();
    setActiveId((data as { id: string }).id);
    setForm({ name: "", date: "", venue: "", organizer: "" }); setDivs([{ name: "", rounds: 4 }]); setMatches(null);
  }

  async function addMissing() {
    if (!active || !addDivs) return;
    const clean = addDivs.filter((d) => d.name.trim());
    if (!clean.length) return;
    setBusy(true); setError("");
    const { error: err } = await staffDb()!.rpc("gt_result_submit_v1", {
      p_event_name: active.event_name, p_event_date: active.event_date, p_venue: null, p_organizer: null, p_divisions: clean, p_existing: active.id,
    });
    setBusy(false);
    if (err) { setError(errText(err.message)); return; }
    setAddDivs(null);
    await refreshActive();
  }

  if (me === "loading") return <p className="py-16 text-center text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>;
  if (me === "out") {
    return (
      <div className="gt-card space-y-4 p-6 text-center">
        <h1 className="text-2xl font-bold">ส่งผลการแข่งขัน</h1>
        <p className="text-[var(--gt-muted)]">ผู้ปกครองและนักกีฬาส่งผลรายการอื่นได้ เพื่อเก็บสถิติและพัฒนาการของนักกีฬา กรุณาเข้าสู่ระบบก่อนส่ง</p>
        <Link href="/login?next=/results/submit" className="gt-cta-btn flex min-h-12 items-center justify-center">เข้าสู่ระบบ</Link>
        <Link href="/signup" className="block text-sm font-semibold text-[var(--gt-cta)] hover:underline">ยังไม่มีบัญชี? สมัครสมาชิก</Link>
      </div>
    );
  }

  const field = "min-h-11 w-full rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base";

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">ส่งผลการแข่งขัน</h1>
        <p className="text-sm text-[var(--gt-muted)]">ส่งผลรายการที่ไม่ได้จัดในเว็บนี้ เพื่อเก็บสถิติ คะแนน และพัฒนาการของนักกีฬาทุกคนในรายการ</p>
        <ul className="gt-card space-y-1 p-4 text-sm">
          <li>✓ ส่ง<b>ทุกรุ่น</b>ของรายการ ไม่ใช่เฉพาะรุ่นของลูก เพื่อไม่ให้ผลตกหล่น</li>
          <li>✓ แต่ละรุ่นแนบ<b>ใบจับคู่ทุกรอบ</b> (เห็นคู่แข่งและผลแพ้ชนะ) และ<b>ตารางอันดับรวม</b></li>
          <li>✓ ใช้รูปแคปหน้าจอ รูปถ่าย PDF หรือ Excel ก็ได้ ขอให้อ่านชื่อได้ชัด</li>
          <li>✓ ถ้ามีคนส่งรายการนี้แล้ว ช่วยเติมเฉพาะส่วนที่ยังขาดได้</li>
          <li className="text-[var(--gt-muted)]">ผลจะขึ้นเว็บหลังแอดมินตรวจแล้วเท่านั้น ไฟล์ที่แนบเห็นได้เฉพาะแอดมิน</li>
        </ul>
      </header>

      {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}

      {active ? (
        <>
          <button type="button" onClick={() => { setActiveId(null); setAddDivs(null); }} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--gt-brand)]">← ส่งรายการอื่น</button>
          <Checklist sub={active} onChange={refreshActive} />
          {active.status !== "confirmed" && active.status !== "rejected" && (
            <div className="gt-card space-y-3 p-4">
              <h3 className="font-bold">รายการนี้มีรุ่นอื่นอีกไหม?</h3>
              {addDivs ? (
                <>
                  <DivisionEditor rows={addDivs} set={setAddDivs} />
                  <div className="flex gap-2">
                    <button type="button" onClick={addMissing} disabled={busy} className="gt-cta-btn min-h-11 px-5 disabled:opacity-50">เพิ่มรุ่น</button>
                    <button type="button" onClick={() => setAddDivs(null)} className="gt-outline-btn min-h-11 px-5">ยกเลิก</button>
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => setAddDivs([{ name: "", rounds: active.divisions.at(-1)?.rounds ?? 4 }])} className="gt-outline-btn min-h-11 px-5 text-sm font-semibold">+ เพิ่มรุ่นที่ยังไม่มีในรายการ</button>
              )}
            </div>
          )}
        </>
      ) : (
        <form onSubmit={create} className="gt-card space-y-4 p-4">
          <h2 className="text-lg font-bold">ข้อมูลรายการแข่งขัน</h2>
          <label className="block text-sm font-semibold">ชื่อรายการ
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onBlur={findExisting} required className={`${field} mt-1`} placeholder="เช่น ศึกหมากล้อมเยาวชน ครั้งที่ 5" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">วันที่แข่ง
              <input type="date" max={today()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} onBlur={findExisting} required className={`${field} mt-1`} />
            </label>
            <label className="block text-sm font-semibold">ผู้จัด
              <input value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} className={`${field} mt-1`} placeholder="ชื่อสถาบันหรือผู้จัด" />
            </label>
          </div>
          <label className="block text-sm font-semibold">สถานที่
            <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={`${field} mt-1`} placeholder="เช่น ห้างเซียร์ รังสิต" />
          </label>

          {matches && matches.length > 0 && (
            <div className="space-y-2 rounded-xl border border-[var(--gt-gold-soft)] bg-[var(--gt-gold-soft)]/40 p-3">
              <p className="text-sm font-semibold">มีคนส่งรายการที่ใกล้เคียงไว้แล้ว ช่วยเติมส่วนที่ขาดแทนการส่งซ้ำได้</p>
              {matches.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--gt-surface)] p-2.5">
                  <span className="min-w-0 flex-1 text-sm">
                    <b>{m.event_name}</b> · {thaiDate(m.event_date)}
                    <span className="block text-xs text-[var(--gt-muted)]">{m.divisions.map((d) => d.name).join(", ")} · แนบแล้ว {m.checklist.filter((c) => c.files).length}/{m.checklist.length} ช่อง</span>
                  </span>
                  <button type="button" onClick={() => { setExtra(m); setActiveId(m.id); }} className="gt-cta-btn min-h-10 px-4 text-sm">เติมรายการนี้</button>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="mb-1 text-sm font-semibold">รุ่นทั้งหมดในรายการ และจำนวนรอบ</h3>
            <p className="mb-2 text-xs text-[var(--gt-muted)]">ใส่ให้ครบทุกรุ่น ระบบจะทำช่องให้แนบใบจับคู่ทุกรอบและอันดับรวมของแต่ละรุ่น</p>
            <DivisionEditor rows={divs} set={setDivs} />
          </div>
          <button disabled={busy} className="gt-cta-btn min-h-12 w-full disabled:opacity-50">{busy ? "กำลังบันทึก…" : "บันทึก แล้วไปแนบไฟล์ →"}</button>
        </form>
      )}

      {mine.length > 0 && (
        <section className="gt-card p-4" aria-labelledby="mine-h">
          <h2 id="mine-h" className="mb-2 font-bold">ผลที่ฉันส่ง</h2>
          <ul className="divide-y divide-[var(--gt-line)]">
            {mine.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{s.event_name}</span>
                  <span className="gt-num block text-xs text-[var(--gt-muted)]">{thaiDate(s.event_date)} · แนบแล้ว {s.checklist.filter((c) => c.files).length}/{s.checklist.length} ช่อง</span>
                  {s.status === "rejected" && s.admin_note && <span className="block text-xs text-[var(--gt-loss-ink)]">เหตุผล: {s.admin_note}</span>}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[s.status].cls}`}>{STATUS[s.status].label}</span>
                {(s.status === "incomplete" || s.status === "pending") && (
                  <button type="button" onClick={() => { setActiveId(s.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[var(--gt-cta)] hover:bg-[var(--gt-cta-soft)]">แนบต่อ</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
