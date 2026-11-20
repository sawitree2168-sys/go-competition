"use client";

import { useCallback, useEffect, useState } from "react";
import { staffDb, useAction } from "../../_lib/staff";
import { KIND_LABEL } from "@/lib/easy-auth.mjs";

type Person = { user_id: string; name: string; kind?: string };

/**
 * People who already have an account (teachers, referees, organisers…): choose their job for THIS event.
 * One person keeps one name in the system; only the role changes from event to event.
 */
export default function EventPeople({ id, onChange }: { id: string; onChange: () => void }) {
  const [now, setNow] = useState<{ pairing: Person[]; referee: Person[] } | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const action = useAction();

  const load = useCallback(async () => {
    const { data } = await staffDb()!.rpc("gt_staff_event_people_v1", { p_tournament: id });
    setNow((data ?? { pairing: [], referee: [] }) as { pairing: Person[]; referee: Person[] });
  }, [id]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { queueMicrotask(() => setFound([])); return; }
    const t = setTimeout(async () => {
      const { data } = await staffDb()!.rpc("gt_staff_people_search_v1", { p_tournament: id, p_query: term });
      setFound((data ?? []) as Person[]);
    }, 300);
    return () => clearTimeout(t);
  }, [q, id]);

  const set = async (p: Person, role: "referee" | "pairing", on: boolean) => {
    const r = await action.run(() => staffDb()!.rpc("gt_staff_set_event_role_v1", { p_tournament: id, p_user: p.user_id, p_role: role, p_on: on }));
    if (r) { await load(); onChange(); }
  };
  const has = (role: "referee" | "pairing", uid: string) => (now?.[role] ?? []).some((x) => x.user_id === uid);

  return (
    <section className="gt-card space-y-3 p-4">
      <h2 className="font-bold">ตำแหน่งในงานนี้ (คนที่มีบัญชีแล้ว)</h2>
      <p className="text-sm text-[var(--gt-muted)]">ค้นชื่อครู กรรมการ หรือทีมงาน แล้วกดเลือกตำแหน่ง · <b>กรรมการ</b> = เช็คอินและลงผล (เปิดจากหน้า “บัญชีของฉัน” ไม่ต้องส่งลิงก์) · <b>แอดมินจับคู่</b> = จัดการงานนี้ได้เหมือนผู้จัด (จับคู่ ลงผล ตัดชื่อ)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["referee", "pairing"] as const).map((role) => (
          <div key={role} className="rounded-xl border border-[var(--gt-line)] p-3">
            <p className="text-sm font-semibold">{role === "referee" ? "กรรมการ" : "แอดมินจับคู่"} ({now?.[role].length ?? 0})</p>
            <ul className="mt-1 space-y-1">
              {(now?.[role] ?? []).map((p) => (
                <li key={p.user_id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{p.name}</span>
                  <button type="button" onClick={() => set(p, role, false)} disabled={action.busy} className="min-h-9 rounded-lg px-2 text-[var(--gt-bad)] underline">เอาออก</button>
                </li>
              ))}
              {now && now[role].length === 0 && <li className="text-sm text-[var(--gt-muted)]">ยังไม่มี</li>}
            </ul>
          </div>
        ))}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นชื่อ (อย่างน้อย 2 ตัวอักษร)"
        className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 text-base" />
      {q.trim().length >= 2 && found.length === 0 && <p className="text-sm text-[var(--gt-muted)]">ไม่พบชื่อ · ให้คนนั้นเข้าสู่ระบบครั้งแรกด้วยชื่อตัวเอง + รหัสเริ่มต้นของกรรมการก่อน แล้วค้นใหม่</p>}
      <ul className="space-y-2">
        {found.map((p) => (
          <li key={p.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--gt-line)] p-2">
            <span><b>{p.name}</b> <span className="text-sm text-[var(--gt-muted)]">{(KIND_LABEL as Record<string, string>)[p.kind ?? ""] ?? ""}</span></span>
            <span className="flex gap-2">
              {(["referee", "pairing"] as const).map((role) => has(role, p.user_id)
                ? <span key={role} className="rounded-lg bg-[var(--gt-cta-soft)] px-3 py-2 text-sm">✓ {role === "referee" ? "กรรมการ" : "แอดมินจับคู่"}</span>
                : <button key={role} type="button" onClick={() => set(p, role, true)} disabled={action.busy} className="gt-outline-btn min-h-10 px-3 text-sm font-semibold">+ {role === "referee" ? "กรรมการ" : "แอดมินจับคู่"}</button>)}
            </span>
          </li>
        ))}
      </ul>
      {action.error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{action.error}</p>}
    </section>
  );
}
