"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ErrorNote, staffDb, useAction } from "./staff";

/**
 * โหมดทดสอบการจับคู่: while on, the event's pairings, results and standings are seen only by the people who manage it
 * (and referees through their links). Public pages, athlete profiles and GO FAN show no rounds.
 * full = event page (switch + wipe test rounds) · compact = a reminder bar on the division page.
 */
export default function TestMode({ eventId, compact = false }: { eventId: string; compact?: boolean }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const action = useAction();

  const load = useCallback(async () => {
    const { data } = await staffDb()!.from("gt_tournaments").select("pairing_preview").eq("id", eventId).maybeSingle();
    setOn(Boolean((data as { pairing_preview?: boolean } | null)?.pairing_preview));
  }, [eventId]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const set = async (next: boolean) => {
    const msg = next
      ? "เปิดโหมดทดสอบ?\nการจับคู่และผลของงานนี้จะเห็นเฉพาะผู้จัดและกรรมการ คนทั่วไปจะไม่เห็น"
      : "เริ่มแข่งจริง?\nการจับคู่และผลที่มีอยู่ตอนนี้จะแสดงให้ทุกคนเห็นทันที ถ้ายังมีคู่ทดสอบอยู่ ให้กด “ล้างการจับคู่ทดสอบ” ก่อน";
    if (!window.confirm(msg)) return;
    setNote("");
    const res = await action.run(() => staffDb()!.rpc("gt_staff_set_pairing_preview_v1", { p_tournament: eventId, p_on: next }));
    if (res) { setOn(next); setNote(next ? "เปิดโหมดทดสอบแล้ว" : "เปิดให้ทุกคนเห็นแล้ว"); }
  };
  const clear = async () => {
    if (!window.confirm("ลบการจับคู่ ผล และบายของทุกรุ่นในงานนี้ทั้งหมด?\nรายชื่อนักกีฬาและสายยังอยู่ · ย้อนกลับไม่ได้")) return;
    setNote("");
    const res = await action.run<{ ok: boolean; matches?: number; byes?: number; error?: string }>(() =>
      staffDb()!.rpc("gt_staff_clear_test_pairings_v1", { p_tournament: eventId }));
    if (!res) return;
    if (!res.data?.ok) return action.setError("ล้างได้เฉพาะตอนอยู่ในโหมดทดสอบ");
    setNote(`ล้างแล้ว: ${res.data.matches ?? 0} โต๊ะ · บาย ${res.data.byes ?? 0} · พร้อมเริ่มจับคู่จริง`);
  };

  if (on === null) return null;
  if (compact) {
    if (!on) return null;
    return (
      <p role="status" className="rounded-xl border-2 border-[#e2b44e] bg-[#fff8df] px-3 py-2 text-sm font-semibold text-[#533e12]">
        🧪 โหมดทดสอบ · คนทั่วไปไม่เห็นการจับคู่และผลของงานนี้ <Link href={`/organizer/${eventId}#test-mode`} className="underline">จัดการ</Link>
      </p>
    );
  }
  return (
    <section id="test-mode" aria-label="โหมดทดสอบการจับคู่" className={`space-y-2 rounded-2xl border-2 p-3 ${on ? "border-[#e2b44e] bg-[#fff8df] text-[#533e12]" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`}>
      {on ? (
        <>
          <p className="font-bold">🧪 โหมดทดสอบเปิดอยู่</p>
          <p className="text-sm">การจับคู่ ผล และคะแนนของงานนี้เห็นเฉพาะผู้จัดและกรรมการ หน้าสาธารณะ โปรไฟล์นักกีฬา และ GO FAN จะยังไม่แสดงรอบใด ๆ</p>
          <div className="grid gap-2 sm:flex">
            <button type="button" onClick={clear} disabled={action.busy} className="min-h-12 rounded-xl border-2 border-[var(--gt-bad)] bg-white px-4 font-semibold text-[var(--gt-bad)] disabled:opacity-60">🗑 ล้างการจับคู่ทดสอบ</button>
            <button type="button" onClick={() => set(false)} disabled={action.busy} className="gt-cta-btn min-h-12 px-5 disabled:opacity-60">▶ เริ่มแข่งจริง (ทุกคนเห็น)</button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm text-[var(--gt-muted)]">อยากลองจับคู่ก่อนวันแข่ง โดยไม่ให้คนอื่นเห็น?</p>
          <button type="button" onClick={() => set(true)} disabled={action.busy} className="min-h-11 rounded-xl border-2 border-[#e2b44e] bg-[#fff8df] px-4 text-sm font-bold text-[#533e12] disabled:opacity-60">🧪 เปิดโหมดทดสอบ</button>
        </div>
      )}
      {note && <p role="status" className="text-sm font-semibold">{note}</p>}
      <ErrorNote text={action.error} />
    </section>
  );
}
