"use client";

import { useMemo, useState } from "react";
import { assignPools } from "@/lib/pool-assignment.mjs";
import { ErrorNote, staffDb, useAction } from "../staff";
import { isWithdrawn, nameOf, poolKey, schoolOf, type DivisionData } from "./types";

const LABELS = ["A", "B", "C", "D"];

export default function PoolsPanel({ data, reload }: { data: DivisionData; reload: () => Promise<void> }) {
  const { matches, byes, division } = data;
  const regs = useMemo(() => data.regs.filter((r) => !isWithdrawn(r)), [data.regs]);
  const locked = matches.length > 0 || byes.length > 0;
  const saved = useMemo(() => new Map(regs.map((r) => [r.athlete_id, poolKey(r.pool_label)])), [regs]);
  const savedPools = [...new Set(saved.values())].filter(Boolean).length;

  const [count, setCount] = useState(savedPools || (regs.length > 16 ? 2 : 1));
  const [draft, setDraft] = useState<Map<string, string> | null>(null);
  const action = useAction();
  const view = draft ?? saved;
  const unassigned = savedPools > 0 ? regs.filter((r) => !saved.get(r.athlete_id)).length : 0;

  const draw = () => {
    if (count === 1) { setDraft(new Map(regs.map((r) => [r.athlete_id, ""]))); return; }
    const m = assignPools(regs.map((r) => ({ id: r.athlete_id, institution: schoolOf(r) })), { pools: LABELS.slice(0, count), seed: `${division.id}-${Date.now()}` });
    setDraft(new Map([...m].map(([k, v]) => [k, v as string])));
  };

  const save = async () => {
    if (!draft) return;
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_set_pools_v1", {
      p_division: division.id,
      p_assignments: [...draft].map(([athlete_id, pool]) => ({ athlete_id, pool })),
    }));
    if (ok) { setDraft(null); await reload(); }
  };

  const groups = useMemo(() => {
    const g = new Map<string, typeof regs>();
    for (const r of regs) { const p = view.get(r.athlete_id) ?? ""; if (!g.has(p)) g.set(p, []); g.get(p)!.push(r); }
    return [...g].sort(([a], [b]) => (a || "~").localeCompare(b || "~"));
  }, [regs, view]);

  return (
    <div className="space-y-4">
      <div className="gt-card space-y-3 p-4">
        <p className="text-sm">ผู้เล่น <strong className="gt-num">{regs.length}</strong> คน · สุ่มสายโดยแยกคนสถาบันเดียวกันให้อยู่คนละสายเท่าที่ทำได้ ขนาดสายต่างกันไม่เกิน 1 คน</p>
        {locked ? (
          <p className="rounded-xl bg-[var(--gt-surface-2)] px-4 py-2 text-sm">ออกคู่ไปแล้ว สายถูกล็อก (ถ้าจำเป็นต้องเปลี่ยน ให้ยกเลิกรอบที่ 1 ก่อน)</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">จำนวนสาย</span>
              {[1, 2, 3, 4].map((n) => (
                <button key={n} type="button" onClick={() => { setCount(n); setDraft(null); }} aria-pressed={count === n}
                  className={`min-h-11 min-w-11 rounded-xl border px-3 ${count === n ? "border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] font-bold" : "border-[var(--gt-line)]"}`}>
                  {n === 1 ? "ไม่แบ่ง" : n}
                </button>
              ))}
            </div>
            {unassigned > 0 && !draft && <p className="text-sm text-[var(--gt-warn)]">มีผู้เล่นใหม่ {unassigned} คนที่ยังไม่มีสาย กรุณาสุ่มสายใหม่แล้วบันทึก</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={draw} className="gt-outline-btn min-h-12 px-4">{draft ? "สุ่มใหม่" : count === 1 ? "จัดเป็นกลุ่มเดียว" : "สุ่มสาย"}</button>
              {draft && <button type="button" onClick={save} disabled={action.busy} className="gt-gold-btn min-h-12 px-5 disabled:opacity-60">{action.busy ? "กำลังบันทึก…" : "บันทึกสายนี้"}</button>}
              {draft && <button type="button" onClick={() => setDraft(null)} className="min-h-12 px-3 text-sm text-[var(--gt-muted)] underline">ยกเลิก</button>}
            </div>
            {draft && <p className="text-sm text-[var(--gt-warn)]">ยังไม่ได้บันทึก — ตรวจดูแล้วกด “บันทึกสายนี้”</p>}
          </>
        )}
        <ErrorNote text={action.error} />
      </div>

      <div className={`grid gap-3 ${groups.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {groups.map(([pool, list]) => (
          <section key={pool || "none"} className="gt-card p-4">
            <h3 className="mb-2 font-bold">{pool ? `สาย ${pool}` : savedPools && !draft ? "ยังไม่มีสาย" : "ทั้งรุ่น"} <span className="font-normal text-[var(--gt-muted)]">({list.length} คน)</span></h3>
            <ol className="space-y-1 text-sm">
              {list.map((r, i) => (
                <li key={r.athlete_id} className="flex gap-2"><span className="gt-num w-6 shrink-0 text-right text-[var(--gt-muted)]">{i + 1}.</span>
                  <span className="min-w-0"><span className="font-medium">{nameOf(r)}</span> <span className="text-[var(--gt-muted)]">{schoolOf(r)}</span></span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
