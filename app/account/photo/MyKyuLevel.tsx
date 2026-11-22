"use client";

import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { KyuSource } from "@/app/dan/KyuBoard";

type Level = {
  dan: boolean; dan_rank: string | null; kyu: number | null; source: "self" | "division" | "association" | null;
  event: string | null; division: string | null; date: string | null;
  assoc_kyu: number | null; assoc_source: string | null; division_kyu: number | null; self_kyu: number | null; self_kyu_at: string | null;
};

const KYUS = Array.from({ length: 15 }, (_, i) => i + 1);
const thaiDate = (iso: string) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(iso));

/** Signed-in athlete sets their own kyu (1–15). Dan levels come from the association and can't be edited here. */
export default function MyKyuLevel() {
  const [lv, setLv] = useState<Level | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    staffDb()?.rpc("gt_my_level_v1").then(({ data }) => {
      if (!data) return;
      const l = data as Level;
      setLv(l); setPick(l.self_kyu ? String(l.self_kyu) : "");
    });
  }, []);

  if (!lv) return null;

  if (lv.dan) {
    return (
      <section className="gt-card p-5">
        <h2 className="text-xl font-bold">ระดับฝีมือ</h2>
        <p className="mt-2"><span className="rounded-full bg-[var(--gt-surface-2)] px-3 py-1 font-bold text-[var(--gt-brand)]">{lv.dan_rank ?? "ระดับดั้ง"}</span></p>
        <p className="mt-2 text-sm text-[var(--gt-muted)]">ระดับดั้งมาจากทำเนียบดั้งของสมาคม เปลี่ยนเมื่อสอบผ่านเท่านั้น หากข้อมูลไม่ถูกต้องแจ้งแอดมิน</p>
      </section>
    );
  }

  const save = async (value: number | null) => {
    setBusy(true); setMsg(null);
    const { data, error } = await staffDb()!.rpc("gt_set_my_kyu_v1", { p_kyu: value });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message || "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" }); return; }
    const l = data as Level;
    setLv(l); setPick(l.self_kyu ? String(l.self_kyu) : "");
    setMsg({ ok: true, text: value === null ? "ล้างระดับที่ระบุเองแล้ว ระบบจะใช้ระดับจากผลแข่ง/ทำเนียบคิว" : "บันทึกแล้ว ระดับใหม่จะแสดงในทำเนียบคิวและหน้านักกีฬา" });
  };

  return (
    <section className="gt-card p-5">
      <h2 className="text-xl font-bold">ระดับฝีมือ (คิว)</h2>
      <div className="mt-3 rounded-xl bg-[var(--gt-surface-2)] p-3">
        <p className="text-sm text-[var(--gt-muted)]">ระดับที่แสดงบนเว็บตอนนี้</p>
        <p className="mt-1 text-2xl font-bold text-[var(--gt-brand)]">{lv.kyu !== null ? `${lv.kyu} คิว` : "ยังไม่ทราบระดับ"}</p>
        <p className="mt-1 text-sm text-[var(--gt-muted)]"><KyuSource r={lv} /></p>
        {lv.source === "division" && lv.self_kyu !== null && lv.kyu !== null && lv.kyu < lv.self_kyu && (
          <p className="mt-1 text-sm text-[var(--gt-muted)]">คุณระบุไว้ {lv.self_kyu} คิว แต่หลังจากนั้นลงแข่งรุ่นที่สูงกว่า ระบบจึงแสดงตามรุ่นที่แข่ง</p>
        )}
      </div>

      <label className="mt-4 block text-sm font-semibold" htmlFor="my-kyu">ระดับคิวปัจจุบันของฉัน</label>
      <div className="mt-1 flex flex-wrap gap-2">
        <select id="my-kyu" value={pick} onChange={(e) => setPick(e.target.value)} disabled={busy}
          className="min-h-12 flex-1 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base">
          <option value="">— เลือกระดับ —</option>
          {KYUS.map((k) => <option key={k} value={k}>{k} คิว</option>)}
        </select>
        <button type="button" onClick={() => save(Number(pick))} disabled={busy || !pick || Number(pick) === lv.self_kyu}
          className="gt-cta-btn min-h-12 px-6 disabled:opacity-50">{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
      </div>
      {lv.self_kyu !== null && (
        <p className="mt-2 text-sm text-[var(--gt-muted)]">
          ระบุเองไว้ {lv.self_kyu} คิว{lv.self_kyu_at ? ` เมื่อ ${thaiDate(lv.self_kyu_at)}` : ""} ·{" "}
          <button type="button" onClick={() => save(null)} disabled={busy} className="font-semibold text-[var(--gt-cta)] underline">ล้างค่า</button>
        </p>
      )}
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-[#15734a]" : "text-[#b42318]"}`}>{msg.text}</p>}
      <p className="mt-3 text-xs text-[var(--gt-muted)]">
        เลือกได้ 1–15 คิว · ถ้าลงแข่งรุ่นที่สูงกว่าหลังจากนี้ ระบบจะเลื่อนระดับตามรุ่นที่แข่งให้เอง · ระดับดั้งต้องสอบผ่านและขึ้นทำเนียบดั้งสมาคม
        {lv.assoc_kyu !== null && <> · {lv.assoc_source ?? "ทำเนียบคิวสมาคม"}: {lv.assoc_kyu} คิว</>}
      </p>
    </section>
  );
}
