"use client";

import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { awardOf } from "@/lib/certificate.mjs";
import { divisionLabel } from "@/lib/division-display";
import { drawCertificate, downloadCertificate, type Cert } from "@/app/athletes/[id]/certificate-draw";

type Row = { athleteId: string; name: string; cert: Cert };

/**
 * Every student's certificate for one competition in one place: download one by one, or all of them as a single
 * PDF (one page each) to print. Uses the same certificates as each athlete's profile (released by the organiser).
 */
export default function EventCertificates({ tournamentId, students }: { tournamentId: string; students: { id: string; name: string }[] }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const ids = students.map((s) => s.id).join(",");

  useEffect(() => {
    let live = true;
    const db = staffDb();
    if (!db || !students.length) { queueMicrotask(() => setRows([])); return; }
    void Promise.all(students.map(async (s) => {
      const { data } = await db.rpc("gt_athlete_certificates_v1", { p_athlete: s.id });
      return ((data ?? []) as Cert[]).filter((c) => c.tournament_id === tournamentId && c.open).map((cert) => ({ athleteId: s.id, name: s.name, cert }));
    })).then((all) => { if (live) setRows(all.flat().sort((a, b) => (a.cert.pos ?? 99) - (b.cert.pos ?? 99) || a.name.localeCompare(b.name, "th"))); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the event or the set of students changes
  }, [tournamentId, ids]);

  const verify = (id: string) => `${window.location.origin}/athletes/${id}`;

  async function one(r: Row) {
    setBusy(r.athleteId + r.cert.division_id); setNote("");
    try { await downloadCertificate(r.cert, r.name, verify(r.athleteId), "png"); } catch { setNote("สร้างไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง"); }
    setBusy("");
  }

  async function all() {
    if (!rows?.length) return;
    setBusy("all"); setNote("");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < rows.length; i++) {
        const canvas = document.createElement("canvas");
        await drawCertificate(canvas, rows[i].cert, rows[i].name, verify(rows[i].athleteId), 0.75);
        const ratio = Math.min(pw / canvas.width, ph / canvas.height);
        const w = canvas.width * ratio, h = canvas.height * ratio;
        if (i) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", (pw - w) / 2, (ph - h) / 2, w, h);
        setNote(`กำลังสร้าง ${i + 1}/${rows.length}…`);
      }
      pdf.save(`ใบประกาศ ${rows[0].cert.title}.pdf`.replace(/[<>:"/\\|?*]/g, "-"));
      setNote(`บันทึกแล้ว ${rows.length} ใบ`);
    } catch { setNote("สร้างไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง"); }
    setBusy("");
  }

  return (
    <section className="gt-card space-y-3 p-4 sm:p-5" aria-labelledby="cert-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="cert-h" className="text-lg font-bold">📜 ใบประกาศของนักเรียนในงานนี้</h3>
        {!!rows?.length && <button type="button" disabled={!!busy} onClick={() => void all()} className="gt-cta-btn min-h-11 px-4 text-sm disabled:opacity-60">{busy === "all" ? "กำลังสร้าง…" : `↓ ดาวน์โหลดทั้งหมด (PDF ${rows.length} หน้า)`}</button>}
      </div>
      {rows === null ? <p role="status" className="text-sm text-[var(--gt-muted)]">กำลังโหลดใบประกาศ…</p>
        : !rows.length ? <p className="text-sm text-[var(--gt-muted)]">ยังไม่มีใบประกาศ · ผู้จัดเปิดให้ดาวน์โหลดหลังประกาศผล</p>
        : <ul className="divide-y divide-[var(--gt-line)]">
          {rows.map((r) => (
            <li key={r.athleteId + r.cert.division_id} className="flex items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1"><b className="block break-words">{r.name}</b><span className="text-xs text-[var(--gt-muted)]">{divisionLabel(r.cert.division)} · {awardOf(r.cert).type}</span></span>
              <button type="button" disabled={!!busy} onClick={() => void one(r)} className="gt-outline-btn min-h-10 shrink-0 px-3 text-xs disabled:opacity-60">{busy === r.athleteId + r.cert.division_id ? "…" : "↓ PNG"}</button>
            </li>
          ))}
        </ul>}
      {note && <p role="status" className="text-sm text-[var(--gt-muted)]">{note}</p>}
    </section>
  );
}
