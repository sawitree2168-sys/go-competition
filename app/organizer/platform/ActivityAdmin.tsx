"use client";
/* eslint-disable @next/next/no-img-element -- small thumbnails from the public avatar bucket */

import { useEffect, useState } from "react";
import { staffDb } from "../_lib/staff";
import { DEFAULT_ATHLETE_PHOTO } from "@/lib/athlete-photo.mjs";

type Hit = {
  go_id: string; dan: number; name: string; level: string | null; photo: string | null; score: number | null;
  last_played: string | null; auto_active: boolean; active: boolean; status_source: "auto" | "admin"; reason: string | null; set_at: string | null;
};
type Settings = { inactive_months: number; updated_at: string | null; active_count: number; total: number };
type Choice = "auto" | "active" | "inactive";

const day = (iso: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(iso));
const CHOICES: { id: Choice; label: string }[] = [
  { id: "auto", label: "อัตโนมัติ" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

/** Owner/admin: Active / Inactive status for the national ranking, per athlete, plus the inactivity threshold. */
export default function ActivityAdmin() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [months, setMonths] = useState("6");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [draft, setDraft] = useState<Record<string, { choice: Choice; reason: string }>>({});
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSettings(p: number | null = null) {
    const db = staffDb();
    if (!db) return;
    const { data, error: err } = await db.rpc("gt_admin_ranking_settings_v1", { p_inactive_months: p });
    if (err) { setError("โหลดการตั้งค่าไม่สำเร็จ: " + err.message); return; }
    const s = data as Settings;
    setSettings(s); setMonths(String(s.inactive_months));
  }
  useEffect(() => { queueMicrotask(() => void loadSettings()); }, []);

  async function saveMonths() {
    const m = Number(months);
    if (!Number.isInteger(m) || m < 1 || m > 36) { setError("ใส่จำนวนเดือน 1–36"); return; }
    setBusy(true); setError(""); await loadSettings(m); setBusy(false);
    setNote(`บันทึกแล้ว: ไม่มีผลแข่งเกิน ${m} เดือน = Inactive`);
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const db = staffDb();
    if (!db || q.trim().length < 2) return;
    setBusy(true); setError(""); setNote("");
    const { data, error: err } = await db.rpc("gt_admin_activity_search_v1", { p_query: q.trim() });
    setBusy(false);
    if (err) { setError("ค้นหาไม่สำเร็จ: " + err.message); return; }
    const rows = (data ?? []) as Hit[];
    setHits(rows);
    setDraft(Object.fromEntries(rows.map((h) => [h.go_id, { choice: h.status_source === "admin" ? (h.active ? "active" : "inactive") : "auto", reason: "" }])));
  }

  async function apply(h: Hit) {
    const d = draft[h.go_id];
    if (!d || d.reason.trim().length < 4) { setError("กรุณาใส่เหตุผลอย่างน้อย 4 ตัวอักษร"); return; }
    setBusy(true); setError("");
    const { error: err } = await staffDb()!.rpc("gt_admin_set_activity_v1", { p_go_id: h.go_id, p_status: d.choice === "auto" ? null : d.choice, p_reason: d.reason.trim() });
    setBusy(false);
    if (err) { setError("บันทึกไม่สำเร็จ: " + err.message); return; }
    setNote(`บันทึกสถานะของ ${h.name} แล้ว (หน้าเว็บอัปเดตภายใน 10 นาที)`);
    await Promise.all([search(), loadSettings()]);
  }

  const seg = (on: boolean) => `min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold ${on ? "bg-[var(--gt-cta)] text-white" : "border border-[var(--gt-line)] bg-[var(--gt-surface)]"}`;

  return (
    <section className="gt-card space-y-3 p-4" aria-labelledby="activity-h">
      <h2 id="activity-h" className="font-bold">สถานะ Active / Inactive (อันดับคะแนน)</h2>
      <p className="text-sm text-[var(--gt-muted)]">
        ระบบตั้งสถานะให้อัตโนมัติจากวันที่แข่งล่าสุด ถ้าข้อมูลสมาคมไม่ตรงกับความจริง เลือก Active หรือ Inactive เองได้ (ต้องใส่เหตุผล) หรือกลับเป็นอัตโนมัติ
      </p>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--gt-line)] p-3">
        <label className="text-sm">
          <span className="block font-semibold">ไม่มีผลแข่งเกินกี่เดือน = Inactive</span>
          <input type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)}
            className="mt-1 min-h-11 w-24 rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base" />
        </label>
        <button type="button" onClick={saveMonths} disabled={busy || months === String(settings?.inactive_months)} className="gt-cta-btn min-h-11 px-5 disabled:opacity-50">บันทึก</button>
        {settings && <p className="gt-num text-sm text-[var(--gt-muted)]">Active {settings.active_count.toLocaleString("en-US")} จาก {settings.total.toLocaleString("en-US")} คน</p>}
      </div>

      <form onSubmit={search} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อ รหัส GO หรือเลขดั้ง" aria-label="ค้นหานักกีฬาเพื่อตั้งสถานะ"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base" />
        <button disabled={busy || q.trim().length < 2} className="gt-cta-btn min-h-11 px-5 disabled:opacity-50">ค้นหา</button>
      </form>
      {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}
      {note && <p role="status" className="text-sm text-[var(--gt-ok)]">{note}</p>}
      {hits && hits.length === 0 && <p className="text-sm text-[var(--gt-muted)]">ไม่พบนักกีฬาในทำเนียบดั้ง</p>}
      {hits && hits.length > 0 && (
        <ul className="divide-y divide-[var(--gt-line)] rounded-xl border border-[var(--gt-line)]">
          {hits.map((h) => {
            const d = draft[h.go_id] ?? { choice: "auto" as Choice, reason: "" };
            const set = (p: Partial<typeof d>) => setDraft((x) => ({ ...x, [h.go_id]: { ...d, ...p } }));
            return (
              <li key={h.go_id} className="space-y-2 p-3">
                <div className="flex items-center gap-3">
                  <img src={h.photo || DEFAULT_ATHLETE_PHOTO} alt="" className={`h-10 w-10 shrink-0 rounded-lg bg-[var(--gt-cta-soft)] ${h.photo ? "object-cover" : "object-contain"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{h.name}</span>
                    <span className="gt-num block text-xs text-[var(--gt-muted)]">
                      {h.go_id} · {h.level ?? 1} Dan · เลขดั้ง {h.dan} · คะแนน {h.score ?? "–"} · แข่งล่าสุด {h.last_played ? day(h.last_played) : "ไม่มีข้อมูล"}
                    </span>
                    <span className="block text-xs">
                      ตอนนี้: <b className={h.active ? "text-[var(--gt-ok)]" : "text-[var(--gt-muted)]"}>{h.active ? "Active" : "Inactive"}</b>
                      {h.status_source === "admin"
                        ? <> · กำหนดโดยแอดมิน{h.set_at ? ` ${day(h.set_at)}` : ""}{h.reason ? ` · ${h.reason}` : ""} (อัตโนมัติจะเป็น {h.auto_active ? "Active" : "Inactive"})</>
                        : " · อัตโนมัติ"}
                    </span>
                  </span>
                </div>
                <div role="group" aria-label={`สถานะของ ${h.name}`} className="flex gap-2">
                  {CHOICES.map((c) => <button key={c.id} type="button" aria-pressed={d.choice === c.id} onClick={() => set({ choice: c.id })} className={seg(d.choice === c.id)}>{c.label}</button>)}
                </div>
                <div className="flex gap-2">
                  <input value={d.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="เหตุผล เช่น เลิกเล่นแล้ว / ยังแข่งในต่างประเทศ"
                    aria-label={`เหตุผลสำหรับ ${h.name}`} className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base" />
                  <button type="button" onClick={() => apply(h)} disabled={busy || d.reason.trim().length < 4} className="gt-cta-btn min-h-11 px-4 disabled:opacity-50">บันทึก</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
