"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorNote, staffDb, useAction } from "../_lib/staff";

type Match = {
  entrant_key: string; entrant_name: string; event_title: string; division: string; player_ref: string; result_name: string;
  institution: string | null; decision: "same" | "different" | null; decided_by: "organizer" | "applicant" | null; decided_at: string | null;
};
type Pair = { key: string; entrant_name: string; result_name: string; first: Match; rows: Match[]; decision: Match["decision"]; decided_by: Match["decided_by"] };

/** Group the same two names (one past-results name can appear in several events) into one question. */
function pairs(list: Match[]): Pair[] {
  const m = new Map<string, Pair>();
  for (const x of list) {
    const key = `${x.entrant_key}|${x.result_name}`;
    const p = m.get(key);
    if (p) p.rows.push(x);
    else m.set(key, { key, entrant_name: x.entrant_name, result_name: x.result_name, first: x, rows: [x], decision: x.decision, decided_by: x.decided_by });
  }
  return [...m.values()];
}

// ยืนยันตัวตน: an entrant whose surname matches someone in past results but whose name is spelt differently. A twin,
// a sibling or a typo — only the family knows, so nothing is starred on /results until someone answers.
export default function IdentityMatches({ id }: { id: string }) {
  const [list, setList] = useState<Match[] | null>(null);
  const action = useAction();
  const load = useCallback(async () => {
    const { data } = await staffDb()!.rpc("gt_staff_identity_matches_v1", { p_tournament: id });
    setList((data as Match[] | null) ?? []);
  }, [id]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const answer = async (m: Match, decision: "same" | "different" | null) => {
    const res = await action.run<{ ok: boolean; error?: string }>(() => staffDb()!.rpc("gt_staff_set_identity_match_v1", {
      p_tournament: id, p_entrant_key: m.entrant_key, p_event_title: m.event_title, p_player_ref: m.player_ref, p_decision: decision }));
    if (!res) return;
    if (!res.data?.ok) action.setError("บันทึกไม่สำเร็จ รายการนี้อาจเปลี่ยนไปแล้ว ลองโหลดหน้าใหม่");
    await load();
  };

  if (!list) return <p className="text-sm text-[var(--gt-muted)]">กำลังโหลดรายชื่อที่ต้องยืนยัน…</p>;
  const all = pairs(list);
  const open = all.filter((p) => !p.decision).length;
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--gt-line)] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-bold">ยืนยันตัวตนกับผลการแข่งขันเก่า</h3>
        {open > 0 && <span className="rounded-full bg-[var(--gt-chip-near-bg)] px-3 py-0.5 text-sm font-semibold text-[var(--gt-chip-near-ink)]">รอยืนยัน {open}</span>}
      </div>
      <p className="text-sm text-[var(--gt-muted)]">
        ผู้สมัครที่นามสกุลตรงกับคนในผลการแข่งขันเก่า แต่ชื่อสะกดต่างกัน อาจเป็นคนเดียวกันที่เขียนผิด หรือเป็นพี่น้อง/ฝาแฝด
        กรุณาถามผู้ปกครองก่อนกด · กด “ใช่ คนเดียวกัน” แล้วหน้าผลการแข่งขันจะขึ้น ★ ให้ · ผู้ที่สมัครผ่านเว็บตอบเองได้ในหน้าสถานะการสมัคร (คำตอบของผู้จัดเป็นคำตอบสุดท้าย)
      </p>
      <ErrorNote text={action.error} />
      {all.length === 0 ? (
        <p className="rounded-xl bg-[var(--gt-surface-2)] p-3 text-sm text-[var(--gt-muted)]">ไม่มีชื่อที่ต้องยืนยัน</p>
      ) : (
        <ul className="space-y-2">
          {all.map((p) => (
            <li key={p.key} className={`rounded-xl border p-3 ${p.decision ? "border-[var(--gt-line)]" : "border-[var(--gt-chip-near-line)] bg-[var(--gt-chip-near-bg)]"}`}>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[var(--gt-muted)]">ผู้สมัครงานนี้</p>
                  <p className="font-semibold">{p.entrant_name}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--gt-muted)]">ในผลการแข่งขันเก่า</p>
                  <p className="font-semibold">{p.result_name}</p>
                  <ul className="text-xs text-[var(--gt-muted)]">
                    {p.rows.map((r) => <li key={`${r.event_title}|${r.player_ref}`}>{r.event_title} · {r.division}{r.institution ? ` · ${r.institution}` : ""}</li>)}
                  </ul>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {p.decision ? (
                  <>
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${p.decision === "same" ? "bg-[var(--gt-close-bg)] text-[var(--gt-close-ink)]" : "bg-[var(--gt-chip-full-bg)] text-[var(--gt-chip-full-ink)]"}`}>
                      {p.decision === "same" ? "✓ คนเดียวกัน" : "✕ คนละคน"}
                    </span>
                    <span className="text-sm text-[var(--gt-muted)]">ยืนยันโดย{p.decided_by === "applicant" ? "ผู้สมัคร" : "ผู้จัด"}</span>
                    <button type="button" disabled={action.busy} onClick={() => answer(p.first, null)} className="gt-outline-btn ml-auto min-h-11 px-4 text-sm font-semibold">แก้คำตอบ</button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={action.busy} onClick={() => answer(p.first, "same")} className="gt-cta-btn min-h-11 rounded-xl px-4 font-semibold">ใช่ คนเดียวกัน</button>
                    <button type="button" disabled={action.busy} onClick={() => answer(p.first, "different")} className="gt-outline-btn min-h-11 px-4 font-semibold">ไม่ใช่ คนละคน</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
