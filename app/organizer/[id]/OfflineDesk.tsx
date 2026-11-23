"use client";

import { useRef, useState } from "react";
import { ErrorNote, staffDb, useAction } from "../_lib/staff";
import { offlineDeskHtml } from "@/offline/shell.mjs";

type Report = { division?: string; pool?: string | null; text: string; ok?: boolean };
type ImportResult = { ok: boolean; error?: string; applied: boolean; rounds: number; results: number; registrations: number; conflicts: number; report: Report[] };
type Backup = { kind?: string; tournament_id: string; title: string; saved_at?: string; snapshot_at: string; divisions: OfflineDivision[] };
type OfflineDivision = {
  id: string; name: string; total_rounds: number;
  regs: { athlete_id: string; name: string; status: string; base_status: string; present_for_round: number | null; base_present: number | null }[];
  matches: Record<string, unknown>[]; byes: Record<string, unknown>[];
};

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");
const save = (blob: Blob, name: string) => {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

/** Everything the offline desk needs for one event, as the website has it now. */
async function snapshot(id: string) {
  const db = staffDb()!;
  const [ev, dv, rg, mt, by] = await Promise.all([
    db.from("gt_tournaments").select("title,event_date,bye_sos_mode").eq("id", id).maybeSingle(),
    db.from("gt_divisions").select("id,name,total_rounds,award_scheme").eq("tournament_id", id),
    db.from("gt_registrations").select("athlete_id,division_id,pool_label,registration_status,present_for_round,competition_rank_reference,display_institution,gt_athletes(full_name,school_name,current_rank)")
      .eq("tournament_id", id).in("registration_status", ["confirmed", "withdrawn"]).limit(5000),
    db.from("gt_matches").select("id,division_id,round_number,board_number,black_athlete_id,white_athlete_id,winner_athlete_id,result_code,result_margin,state,pool_label")
      .eq("tournament_id", id).neq("state", "void").limit(20000),
    db.from("gt_byes").select("id,division_id,round_number,athlete_id,pool_label").eq("tournament_id", id).limit(5000),
  ]);
  const err = ev.error || dv.error || rg.error || mt.error || by.error;
  if (err || !ev.data) throw new Error(err?.message ?? "no event");
  type R = { athlete_id: string; division_id: string; pool_label: string | null; registration_status: string; present_for_round: number | null; competition_rank_reference: string | null; display_institution: string | null; gt_athletes: { full_name: string; school_name: string | null; current_rank: string | null } | null };
  const regs = (rg.data ?? []) as unknown as R[];
  const matches = (mt.data ?? []) as Record<string, unknown>[];
  const byes = (by.data ?? []) as Record<string, unknown>[];
  return {
    kind: "gt-offline-desk", version: 1, tournament_id: id, title: ev.data.title, event_date: ev.data.event_date, bye_sos_mode: ev.data.bye_sos_mode,
    snapshot_at: new Date().toISOString(), saved_at: new Date().toISOString(),
    divisions: ((dv.data ?? []) as { id: string; name: string; total_rounds: number | null }[])
      .sort((a, b) => a.name.localeCompare(b.name, "th"))
      .map((d) => ({
        id: d.id, name: d.name, total_rounds: d.total_rounds ?? 5,
        regs: regs.filter((r) => r.division_id === d.id).map((r) => ({
          athlete_id: r.athlete_id, name: r.gt_athletes?.full_name ?? "ไม่ทราบชื่อ", institution: r.display_institution || r.gt_athletes?.school_name || "",
          rank: r.competition_rank_reference ?? r.gt_athletes?.current_rank ?? null, pool_label: r.pool_label,
          status: r.registration_status, base_status: r.registration_status, present_for_round: r.present_for_round, base_present: r.present_for_round,
        })).sort((a, b) => a.name.localeCompare(b.name, "th")),
        matches: matches.filter((m) => m.division_id === d.id).map((m) => ({ ...m, division_id: undefined, base_state: m.state, base_result_code: m.result_code, base_result_margin: m.result_margin })),
        byes: byes.filter((b) => b.division_id === d.id).map((b) => ({ ...b, division_id: undefined })),
      })),
  };
}

/** Upload only what the merge needs (no names of the whole field twice). */
const payloadOf = (b: Backup) => ({
  snapshot_at: b.snapshot_at,
  divisions: b.divisions.map((d) => ({
    id: d.id, name: d.name, total_rounds: d.total_rounds,
    regs: d.regs.filter((r) => r.status !== r.base_status || r.present_for_round !== r.base_present),
    matches: d.matches.filter((m) => String(m.id).startsWith("off-") || m.state !== m.base_state || m.result_code !== m.base_result_code || m.result_margin !== m.base_result_margin),
    byes: d.byes.filter((x) => String(x.id).startsWith("off-")),
  })),
});

export default function OfflineDesk({ id, title }: { id: string; title: string }) {
  const [busy, setBusy] = useState("");
  const [file, setFile] = useState<Backup | null>(null);
  const [check, setCheck] = useState<ImportResult | null>(null);
  const [done, setDone] = useState<ImportResult | null>(null);
  const action = useAction();
  const fileRef = useRef<HTMLInputElement>(null);

  const download = async () => {
    setBusy("download"); action.setError("");
    try {
      const [data, js] = await Promise.all([snapshot(id), fetch("/offline/desk.js", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("desk"); return r.text(); })]);
      const name = `โต๊ะจับคู่สำรอง-${title.replace(/[\\/:*?"<>|]/g, "").slice(0, 40)}.html`;
      save(new Blob([offlineDeskHtml(data, js)], { type: "text/html;charset=utf-8" }), name);
    } catch { action.setError("ดาวน์โหลดไม่สำเร็จ ลองใหม่อีกครั้ง"); }
    setBusy("");
  };

  const pick = async (f: File) => {
    setCheck(null); setDone(null); setFile(null); action.setError("");
    let b: Backup;
    try { b = JSON.parse(await f.text()); } catch { return action.setError("อ่านไฟล์ไม่ได้ — เลือกไฟล์ .json ที่ได้จากปุ่ม 💾 บันทึกไฟล์สำรอง"); }
    if (b?.tournament_id !== id || !Array.isArray(b.divisions)) return action.setError("ไฟล์นี้ไม่ใช่ไฟล์สำรองของงานนี้");
    setBusy("check");
    const res = await action.run<ImportResult>(() => staffDb()!.rpc("gt_staff_import_offline_v1", { p_tournament: id, p_payload: payloadOf(b), p_apply: false }));
    setBusy("");
    if (res?.data?.ok) { setFile(b); setCheck(res.data); } else if (res) action.setError("ไฟล์ไม่ถูกต้อง");
  };
  const apply = async () => {
    if (!file) return;
    setBusy("apply");
    const res = await action.run<ImportResult>(() => staffDb()!.rpc("gt_staff_import_offline_v1", { p_tournament: id, p_payload: payloadOf(file), p_apply: true }));
    setBusy("");
    if (res?.data?.ok) { setDone(res.data); setCheck(null); setFile(null); }
  };

  const summary = (r: ImportResult) => (
    <>
      <p className="text-sm">รอบใหม่ <b>{r.rounds}</b> · ผล <b>{r.results}</b> โต๊ะ · รายชื่อ (ตัดชื่อ/คืนชื่อ) <b>{r.registrations}</b>{r.conflicts > 0 && <> · <b className="text-[var(--gt-bad)]">ไม่ตรงกัน {r.conflicts}</b></>}</p>
      {r.report.length > 0 && (
        <ul className="max-h-60 space-y-1 overflow-auto text-sm">
          {r.report.map((x, i) => <li key={i} className={x.ok ? "text-[var(--gt-ok)]" : "text-[var(--gt-bad)]"}>{x.ok ? "✓" : "⚠"} {x.division}{x.pool ? ` · สาย ${x.pool}` : ""}: {x.text}</li>)}
        </ul>
      )}
    </>
  );

  return (
    <section id="offline-desk" aria-label="โต๊ะจับคู่สำรอง" className="space-y-3 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-3 sm:p-4">
      <h2 className="font-bold">📴 โต๊ะจับคู่สำรอง (ไม่ใช้อินเทอร์เน็ต)</h2>
      <p className="text-sm text-[var(--gt-muted)]">ดาวน์โหลดเก็บไว้ในคอมก่อนเริ่มแข่ง และ<b>โหลดใหม่หลังจับคู่ทุกรอบ</b> ถ้าเน็ตล่ม เปิดไฟล์ด้วย Chrome/Edge แล้วจับคู่ ลงผล พิมพ์ต่อได้เลย · กรรมการใช้ใบผลกระดาษ แอดมินกรอกที่คอม</p>
      <div className="grid gap-2 sm:flex">
        <button type="button" onClick={download} disabled={Boolean(busy)} className="gt-cta-btn min-h-12 px-5 disabled:opacity-60">{busy === "download" ? "กำลังเตรียมไฟล์…" : "⬇ ดาวน์โหลดโต๊ะสำรอง (ข้อมูลล่าสุด)"}</button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)} className="gt-outline-btn min-h-12 px-5 disabled:opacity-60">{busy === "check" ? "กำลังตรวจ…" : "⬆ นำข้อมูลจากโต๊ะสำรองขึ้นระบบ"}</button>
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
      </div>
      {check && file && (
        <div className="space-y-2 rounded-xl border-2 border-[var(--gt-gold)] p-3">
          <p className="font-semibold">ตรวจไฟล์แล้ว (บันทึก {when(file.saved_at)}) — ยังไม่ได้เขียนลงระบบ</p>
          {summary(check)}
          {check.rounds + check.results + check.registrations > 0
            ? <button type="button" onClick={apply} disabled={Boolean(busy)} className="gt-gold-btn min-h-12 w-full px-5 disabled:opacity-60">{busy === "apply" ? "กำลังบันทึก…" : "ยืนยัน นำขึ้นระบบ"}</button>
            : <p className="text-sm">ไม่มีอะไรใหม่ — ข้อมูลบนเว็บครบแล้ว</p>}
          {check.conflicts > 0 && <p className="text-xs text-[var(--gt-muted)]">ส่วนที่ไม่ตรงกันจะใช้ข้อมูลบนเว็บ ตรวจและแก้เองที่หน้ารุ่นนั้น</p>}
        </div>
      )}
      {done && <div role="status" className="space-y-1 rounded-xl border-2 border-[var(--gt-ok)] p-3"><p className="font-semibold text-[var(--gt-ok)]">นำขึ้นระบบแล้ว ✓</p>{summary(done)}</div>}
      <ErrorNote text={action.error} />
    </section>
  );
}
