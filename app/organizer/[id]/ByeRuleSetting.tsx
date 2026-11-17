"use client";

import { useState } from "react";
import { ErrorNote, staffDb, useAction } from "../_lib/staff";
import { BYE_RULES } from "@/lib/competition-day.mjs";

type Mode = keyof typeof BYE_RULES;

/**
 * กติกาบาย of the event (gt_tournaments.bye_sos_mode). A bye always gives 1 point; the choice is whether
 * the bye round counts in SOS / SOSOS. Thai events normally use "none"; the other has to be announced
 * before the event (ครูเล็ก, 17 Nov 2026), so it is set here and shown on every standings page.
 */
export default function ByeRuleSetting({ id, mode, onSaved }: { id: string; mode: string | null; onSaved: () => Promise<void> | void }) {
  const current: Mode = mode === "own_score" ? "own_score" : "none";
  const [value, setValue] = useState<Mode>(current);
  const action = useAction();
  const save = async () => {
    if (!window.confirm("เปลี่ยนกติกาบาย? SOS และอันดับของทุกรุ่นในงานนี้จะคิดใหม่ตามกติกาที่เลือก ควรประกาศให้ผู้เข้าแข่งขันทราบก่อนแข่ง")) return;
    const res = await action.run<{ ok: boolean }>(() => staffDb()!.rpc("gt_staff_set_bye_sos_mode_v1", { p_tournament: id, p_mode: value }));
    if (!res) return;
    if (!res.data?.ok) return action.setError("บันทึกไม่สำเร็จ");
    await onSaved();
  };
  return (
    <fieldset className="gt-card space-y-2 p-4 text-sm">
      <legend className="sr-only">กติกาบาย</legend>
      <p className="font-semibold">กติกาบาย (ใช้กับทุกรุ่นในงานนี้)</p>
      {(Object.keys(BYE_RULES) as Mode[]).map((k) => (
        <label key={k} className="flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border border-[var(--gt-line)] px-3 py-2">
          <input type="radio" name={`bye-${id}`} value={k} checked={value === k} onChange={() => setValue(k)} className="mt-1 h-5 w-5" />
          <span>
            <span className="block font-semibold">{k === "none" ? "แบบที่ 1 (ค่าเริ่มต้น)" : "แบบที่ 2"}</span>
            <span className="block">{BYE_RULES[k].label}</span>
            {k === "own_score" && <span className="block text-xs text-[var(--gt-muted)]">ตัวอย่าง: ได้บาย 1 ครั้ง จบที่ 4 แต้ม → SOS บวกเพิ่ม 4 · ต้องประกาศก่อนแข่ง</span>}
          </span>
        </label>
      ))}
      <ErrorNote text={action.error} />
      {value !== current && (
        <button type="button" onClick={save} disabled={action.busy} className="gt-cta-btn min-h-11 rounded-xl px-4 font-semibold">
          {action.busy ? "กำลังบันทึก…" : "บันทึกกติกาบาย"}
        </button>
      )}
    </fieldset>
  );
}
