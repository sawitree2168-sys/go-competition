"use client";

import { useEffect, useMemo, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";

type Academy = { id: string; name: string };
type Data = { ok: boolean; error?: string; mine: (Academy & { self: boolean })[]; choices: Academy[] };

/**
 * Signed-in athlete chooses the institutions they study at. Several are allowed (students learn with several
 * teachers) and each institution sees the student straight away. Links an institution made can only be removed by it.
 */
export default function MyAcademies() {
  const [data, setData] = useState<Data | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    staffDb()?.rpc("gt_my_student_academies_v1").then(({ data: d, error }) => {
      if (!error && d?.ok) setData(d as Data);
    });
  }, []);

  const left = useMemo(() => {
    const mine = new Set(data?.mine.map((m) => m.id));
    return (data?.choices ?? []).filter((c) => !mine.has(c.id));
  }, [data]);

  if (!data) return null;

  const change = async (id: string, on: boolean) => {
    setBusy(true); setMsg(null);
    const { data: d, error } = await staffDb()!.rpc("gt_set_my_student_academy_v1", { p_academy: id, p_on: on });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message || "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" }); return; }
    setData(d as Data); setPick("");
    setMsg({ ok: true, text: on ? "เพิ่มแล้ว สถาบันจะเห็นชื่อคุณในรายชื่อนักเรียนทันที" : "เอาออกแล้ว" });
  };

  return (
    <section className="gt-card p-5">
      <h2 className="text-xl font-bold">สถาบันที่เรียน</h2>
      <p className="mt-1 text-sm text-[var(--gt-muted)]">เลือกได้มากกว่า 1 แห่ง ถ้าเรียนกับครูหลายสถาบัน · สถาบันที่เลือกจะเห็นผลแข่งและสถิติของคุณ</p>
      {data.mine.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {data.mine.map((m) => (
            <li key={m.id} className="flex min-h-11 items-center gap-1 rounded-full border-2 border-[var(--gt-line)] bg-[var(--gt-surface-2)] pl-4 pr-1 font-semibold">
              <span>{m.name}</span>
              {m.self
                ? <button type="button" disabled={busy} onClick={() => change(m.id, false)} aria-label={`เอา ${m.name} ออก`} className="grid h-9 w-9 place-items-center rounded-full text-lg text-[var(--gt-muted)] hover:bg-white disabled:opacity-50">×</button>
                : <span className="px-3 text-xs font-normal text-[var(--gt-muted)]">สถาบันเพิ่มให้</span>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 rounded-xl bg-[var(--gt-surface-2)] p-3 text-sm">ยังไม่ได้เลือกสถาบัน</p>}
      <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (pick) void change(pick, true); }}>
        <select aria-label="เลือกสถาบันที่เรียน" value={pick} onChange={(e) => setPick(e.target.value)} disabled={busy}
          className="min-h-12 flex-1 rounded-xl border-2 border-[var(--gt-line)] bg-white px-3">
          <option value="">เลือกสถาบัน…</option>
          {left.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="submit" disabled={!pick || busy} className="gt-cta-btn min-h-12 px-5 disabled:opacity-50">{busy ? "กำลังบันทึก…" : "+ เพิ่มสถาบัน"}</button>
      </form>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-[var(--gt-win-ink)]" : "text-[var(--gt-loss-ink)]"}`}>{msg.text}</p>}
      <p className="mt-2 text-xs text-[var(--gt-muted)]">ไม่พบสถาบันของคุณ? ให้ครูของสถาบันเปิดหน้าสถาบันในเว็บก่อน</p>
    </section>
  );
}
