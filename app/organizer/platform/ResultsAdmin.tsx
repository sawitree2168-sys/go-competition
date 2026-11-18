"use client";

import { useCallback, useEffect, useState } from "react";
import { staffDb } from "../_lib/staff";

type Slot = { division: string; round: number; files: number };
type FileRow = { id: number; division: string; round: number; drive_file_id: string; file_name: string | null; extracted: boolean };
type Item = {
  id: string; event_name: string; event_date: string; venue: string | null; organizer: string | null;
  status: "incomplete" | "pending" | "extracted" | "confirmed" | "rejected"; admin_note: string | null; created_at: string;
  submitter: string | null; checklist: Slot[]; files: FileRow[]; games: number; needs_check: number;
};
type Queue = { upload_url: string | null; items: Item[] };

const LABEL: Record<Item["status"], string> = {
  incomplete: "ยังไม่ครบ", pending: "ครบแล้ว · รออ่านไฟล์", extracted: "อ่านแล้ว · รอยืนยัน", confirmed: "ยืนยันแล้ว", rejected: "ไม่ผ่าน",
};
const day = (iso: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/** Owner/admin: results sent in by parents (files in the owner's Drive), the upload web-app URL and status changes. */
export default function ResultsAdmin() {
  const [q, setQ] = useState<Queue | null>(null);
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const db = staffDb();
    if (!db) return;
    const { data, error: err } = await db.rpc("gt_admin_result_queue_v1", { p_status: null });
    if (err) { setError("โหลดไม่สำเร็จ: " + err.message); return; }
    const d = data as Queue;
    setQ(d); setUrl(d.upload_url ?? "");
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  async function saveUrl() {
    setBusy(true); setError("");
    const { error: err } = await staffDb()!.rpc("gt_admin_result_settings_v1", { p_upload_url: url.trim() });
    setBusy(false);
    if (err) setError(err.message.includes("BAD_URL") ? "ลิงก์ต้องเป็น Web app URL ของ Apps Script ที่ลงท้ายด้วย /exec" : "บันทึกไม่สำเร็จ: " + err.message);
    else await load();
  }

  async function setStatus(it: Item, status: "pending" | "confirmed" | "rejected") {
    let note: string | null = null;
    if (status === "rejected") {
      note = window.prompt("เหตุผลที่ไม่ผ่าน (ผู้ส่งจะเห็นข้อความนี้)");
      if (!note || note.trim().length < 4) return;
    }
    setBusy(true); setError("");
    const { error: err } = await staffDb()!.rpc("gt_admin_result_set_status_v1", { p_id: it.id, p_status: status, p_note: note });
    setBusy(false);
    if (err) setError("บันทึกไม่สำเร็จ: " + err.message); else await load();
  }

  return (
    <section className="gt-card space-y-3 p-4" aria-labelledby="results-h">
      <h2 id="results-h" className="font-bold">ผลแข่งจากผู้ปกครอง</h2>
      <p className="text-sm text-[var(--gt-muted)]">ไฟล์ที่ส่งเข้ามาเก็บในโฟลเดอร์ “ผลแข่งจากผู้ปกครอง (GO TOURNAMENT)” ใน Google Drive ของเจ้าของระบบ ทุกเช้า Claude จะอ่านไฟล์ใหม่แล้วลงผลรายเกมให้ตรวจ</p>

      <div className="space-y-2 rounded-xl border border-[var(--gt-line)] p-3">
        <label className="block text-sm font-semibold">Web app URL สำหรับรับไฟล์ (Apps Script)
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec"
            className="mt-1 min-h-11 w-full rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base" />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={saveUrl} disabled={busy || url.trim() === (q?.upload_url ?? "")} className="gt-cta-btn min-h-11 px-5 disabled:opacity-50">บันทึก</button>
          <span className="text-sm">{q?.upload_url ? <span className="text-[var(--gt-ok)]">● เปิดรับไฟล์แล้ว</span> : <span className="text-[var(--gt-bad)]">● ยังไม่เปิดรับไฟล์ (ผู้ปกครองยังแนบไฟล์ไม่ได้)</span>}</span>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}
      {q && q.items.length === 0 && <p className="text-sm text-[var(--gt-muted)]">ยังไม่มีผลที่ส่งเข้ามา</p>}
      {q && q.items.length > 0 && (
        <ul className="divide-y divide-[var(--gt-line)] rounded-xl border border-[var(--gt-line)]">
          {q.items.map((it) => {
            const filled = it.checklist.filter((c) => c.files > 0).length;
            const missing = it.checklist.filter((c) => !c.files);
            return (
              <li key={it.id} className="p-3">
                <button type="button" onClick={() => setOpen(open === it.id ? null : it.id)} aria-expanded={open === it.id} className="flex w-full items-start gap-3 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{it.event_name}</span>
                    <span className="gt-num block text-xs text-[var(--gt-muted)]">{day(it.event_date)} · ส่งโดย {it.submitter ?? "-"} · แนบแล้ว {filled}/{it.checklist.length} ช่อง{it.games ? ` · อ่านได้ ${it.games} เกม` : ""}{it.needs_check ? ` · ต้องตรวจ ${it.needs_check}` : ""}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[var(--gt-surface-2)] px-2.5 py-0.5 text-xs font-bold">{LABEL[it.status]}</span>
                </button>
                {open === it.id && (
                  <div className="mt-3 space-y-3 border-t border-[var(--gt-line)] pt-3 text-sm">
                    {(it.venue || it.organizer) && <p className="text-[var(--gt-muted)]">{it.venue ?? ""}{it.organizer ? ` · ผู้จัด ${it.organizer}` : ""}</p>}
                    {missing.length > 0 && <p className="text-[var(--gt-gold-ink)]">ยังขาด: {missing.map((m) => `${m.division} ${m.round === 0 ? "อันดับรวม" : `รอบ ${m.round}`}`).join(", ")}</p>}
                    <ul className="space-y-1">
                      {it.files.map((f) => (
                        <li key={f.id} className="flex items-center gap-2">
                          <span className="w-36 shrink-0 text-[var(--gt-muted)]">{f.division} · {f.round === 0 ? "อันดับรวม" : `รอบ ${f.round}`}</span>
                          <a href={`https://drive.google.com/file/d/${f.drive_file_id}/view`} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-semibold text-[var(--gt-cta)] hover:underline">{f.file_name ?? "ไฟล์"}</a>
                          {f.extracted && <span className="text-xs text-[var(--gt-ok)]">อ่านแล้ว</span>}
                        </li>
                      ))}
                    </ul>
                    {it.admin_note && <p className="text-[var(--gt-muted)]">หมายเหตุ: {it.admin_note}</p>}
                    <div className="flex flex-wrap gap-2">
                      {it.status === "extracted" && <button type="button" disabled={busy} onClick={() => setStatus(it, "confirmed")} className="gt-cta-btn min-h-10 px-4 disabled:opacity-50">ยืนยันผล</button>}
                      {(it.status === "rejected" || it.status === "confirmed") && <button type="button" disabled={busy} onClick={() => setStatus(it, "pending")} className="gt-outline-btn min-h-10 px-4">กลับเป็นรอตรวจ</button>}
                      {it.status !== "rejected" && <button type="button" disabled={busy} onClick={() => setStatus(it, "rejected")} className="min-h-10 rounded-lg px-4 font-semibold text-[var(--gt-bad)] hover:bg-[var(--gt-loss-bg)]">ไม่ผ่าน…</button>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
