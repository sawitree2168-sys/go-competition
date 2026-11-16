"use client";

import { useState } from "react";

/**
 * Result bar from the "จับคู่ & ผล" mockup: choose how the game ended, then tap who won.
 * Methods without a winner (เสมอ / แพ้คู่ / ไม่มาทั้งคู่) turn the two buttons into one "บันทึก" button.
 * onRecord(code, margin) maps to gt_*_record_result_v1.
 */
const METHODS = [
  { v: "normal", label: "ชนะปกติ" },
  { v: "R", label: "ยอมแพ้ (R)" },
  { v: "T", label: "หมดเวลา (T)" },
  { v: "forfeit", label: "คู่ไม่มา (สายเกิน 15 นาที)" },
  { v: "draw", label: "เสมอ (½–½)" },
  { v: "double_loss", label: "แพ้คู่ (0–0)" },
  { v: "double_forfeit", label: "ไม่มาทั้งคู่ (0–0)" },
] as const;
type Method = (typeof METHODS)[number]["v"];

export default function ResultControls({ busy, onRecord, onCancel }: {
  busy: boolean; onRecord: (code: string, margin: string | null) => void; onCancel?: () => void;
}) {
  const [method, setMethod] = useState<Method>("normal");
  const winnerless = method === "draw" || method === "double_loss" || method === "double_forfeit";
  const win = (side: "black" | "white") => {
    if (method === "forfeit") return onRecord(`${side}_win_forfeit`, null);
    onRecord(`${side}_win`, method === "R" || method === "T" ? method : null);
  };
  const btn = "min-h-12 rounded-xl text-base font-semibold disabled:opacity-50";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,14rem)_1fr_1fr] sm:items-center">
      <label className="col-span-2 block sm:col-span-1">
        <span className="sr-only">วิธีชนะ</span>
        <select value={method} onChange={(e) => setMethod(e.target.value as Method)}
          className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base">
          {METHODS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
        </select>
      </label>
      {winnerless ? (
        <button type="button" disabled={busy} onClick={() => onRecord(method, null)} className={`${btn} gt-gold-btn col-span-2`}>
          บันทึก: {METHODS.find((m) => m.v === method)?.label}
        </button>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={() => win("black")} className={`${btn} bg-[var(--gt-cta)] text-white shadow-sm`}>ดำชนะ</button>
          <button type="button" disabled={busy} onClick={() => win("white")} className={`${btn} border-2 border-[var(--gt-cta)] bg-[var(--gt-surface)] text-[var(--gt-ink)]`}>ขาวชนะ</button>
        </>
      )}
      {onCancel && <button type="button" onClick={onCancel} className="col-span-2 text-sm text-[var(--gt-muted)] underline sm:col-span-3">ไม่แก้</button>}
    </div>
  );
}
