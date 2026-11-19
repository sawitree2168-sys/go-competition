"use client";
/* eslint-disable @next/next/no-img-element -- small thumbnails from the public avatar bucket */

import { useState } from "react";
import { staffDb } from "../_lib/staff";
import PhotoEditor from "@/components/PhotoEditor";
import { DEFAULT_ATHLETE_PHOTO } from "@/lib/athlete-photo.mjs";

type Change = { id: number; at: string; role: string; old_url: string | null; new_url: string | null; reason: string | null };
type Hit = { go_id: string; full_name: string; rank: string | null; dan: number | null; photo: string | null; claimed: boolean; history: Change[] };

const when = (iso: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(iso));

/** Owner/admin: find an athlete by name, GO ID or dan number, then replace, remove or restore their photo. */
export default function PhotoAdmin() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function search(e?: React.FormEvent, keepOpen?: string) {
    e?.preventDefault();
    const db = staffDb();
    if (!db || q.trim().length < 2) return;
    setBusy(true); setError("");
    const { data, error: err } = await db.rpc("gt_admin_photo_search_v1", { p_query: q.trim() });
    setBusy(false);
    if (err) { setError("ค้นหาไม่สำเร็จ: " + err.message); return; }
    const rows = (data ?? []) as Hit[];
    setHits(rows);
    setOpen(keepOpen && rows.some(row => row.go_id === keepOpen) ? keepOpen : rows.length === 1 ? rows[0].go_id : null);
  }

  async function revert(h: Hit, c: Change) {
    const reason = window.prompt("เหตุผลที่ย้อนกลับเป็นรูปก่อนหน้า (อย่างน้อย 4 ตัวอักษร)");
    if (!reason || reason.trim().length < 4) return;
    const { error: err } = await staffDb()!.rpc("gt_athlete_photo_revert_v1", { p_audit_id: c.id, p_reason: reason.trim() });
    if (err) setError("ย้อนกลับไม่สำเร็จ: " + err.message);
    else await search();
  }

  return (
    <section className="gt-card space-y-3 p-4" aria-labelledby="photo-h">
      <h2 id="photo-h" className="font-bold">รูปนักกีฬา</h2>
      <p className="text-sm text-[var(--gt-muted)]">นักกีฬาเปลี่ยนรูปเองได้ที่ “บัญชีของฉัน → เปลี่ยนรูปโปรไฟล์” ถ้ามีคนอัปโหลดผิดคนหรือรูปไม่เหมาะสม แก้ที่นี่ได้ การเปลี่ยนรูปหลักมีประวัติและย้อนกลับได้</p>
      <form onSubmit={search} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อ รหัส GO หรือเลขดั้ง" aria-label="ค้นหานักกีฬา"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base" />
        <button disabled={busy || q.trim().length < 2} className="gt-cta-btn min-h-11 px-5 disabled:opacity-50">ค้นหา</button>
      </form>
      {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}
      {hits && hits.length === 0 && <p className="text-sm text-[var(--gt-muted)]">ไม่พบนักกีฬา</p>}
      {hits && hits.length > 0 && (
        <ul className="divide-y divide-[var(--gt-line)] rounded-xl border border-[var(--gt-line)]">
          {hits.map((h) => (
            <li key={h.go_id} className="p-3">
              <button type="button" onClick={() => setOpen(open === h.go_id ? null : h.go_id)} aria-expanded={open === h.go_id}
                className="flex w-full items-center gap-3 text-left">
                <img src={h.photo || DEFAULT_ATHLETE_PHOTO} alt="" className={`h-10 w-10 shrink-0 rounded-lg bg-[var(--gt-cta-soft)] ${h.photo ? "object-cover" : "object-contain"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{h.full_name}</span>
                  <span className="block text-xs text-[var(--gt-muted)]">{h.go_id}{h.dan ? ` · เลขดั้ง ${h.dan}` : ""}{h.rank ? ` · ${h.rank}` : ""}{h.claimed ? " · มีบัญชีแล้ว" : ""}</span>
                </span>
                <span aria-hidden="true" className="text-[var(--gt-muted)]">{open === h.go_id ? "▴" : "▾"}</span>
              </button>
              {open === h.go_id && (
                <div className="mt-3 space-y-4 border-t border-[var(--gt-line)] pt-3">
                  <PhotoEditor mode="admin" goId={h.go_id} name={h.full_name} photo={h.photo} onSaved={() => void search(undefined, h.go_id)} />
                  {h.history.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold">ประวัติการเปลี่ยนรูป</h3>
                      <ul className="mt-2 space-y-2">
                        {h.history.map((c) => (
                          <li key={c.id} className="flex items-center gap-2 text-sm">
                            <img src={c.old_url || DEFAULT_ATHLETE_PHOTO} alt="รูปก่อนเปลี่ยน" className="h-8 w-8 rounded-lg object-cover" />
                            <span aria-hidden="true">→</span>
                            <img src={c.new_url || DEFAULT_ATHLETE_PHOTO} alt="รูปหลังเปลี่ยน" className="h-8 w-8 rounded-lg object-cover" />
                            <span className="min-w-0 flex-1 text-[var(--gt-muted)]">{when(c.at)} · {c.role === "owner" ? "เจ้าของบัญชี" : c.role === "association" ? "สมาคม" : "แอดมิน"}{c.reason && c.reason !== "consent" ? ` · ${c.reason}` : ""}</span>
                            <button type="button" onClick={() => revert(h, c)} className="min-h-9 rounded-lg px-2 font-semibold text-[var(--gt-cta)] hover:bg-[var(--gt-cta-soft)]">ใช้รูปก่อนหน้า</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
