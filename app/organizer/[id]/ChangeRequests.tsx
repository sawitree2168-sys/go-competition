"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorNote, staffDb, useAction } from "../_lib/staff";
import { divisionLabel } from "@/lib/division-display";
import { KIND_LABEL, refundLines } from "@/lib/application-changes.mjs";
import { PolicyText } from "@/app/my-applications/MyApplications";

type Tier = { until: string; percent: number | string };
type Policy = {
  allow_withdraw: boolean; withdraw_until: string | null; refund_tiers: Tier[]; refund_after_percent: number | string;
  allow_swap: boolean; swap_until: string | null; swap_fee: number | string; allow_division: boolean; division_until: string | null; division_fee: number | string; note: string | null;
};
const EMPTY: Policy = { allow_withdraw: true, withdraw_until: null, refund_tiers: [], refund_after_percent: 0, allow_swap: true, swap_until: null, swap_fee: 0,
  allow_division: true, division_until: null, division_fee: 0, note: null };
const field = "mt-1 block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 font-normal";
const MSG: Record<string, string> = { TIERS: "ช่วงคืนเงินไม่ถูกต้อง (ต้องมีวันที่ไม่ซ้ำกัน และเปอร์เซ็นต์ 0–100)", VALUE: "ค่าที่กรอกไม่ถูกต้อง ตรวจวันที่และค่าธรรมเนียม" };

/** The organiser's own conditions for withdraw / swap / change division (each event is different). */
export function ChangePolicy({ id }: { id: string }) {
  const [p, setP] = useState<Policy | null>(null);
  const [saved, setSaved] = useState(false);
  const [exists, setExists] = useState(false);
  const action = useAction();
  const load = useCallback(async () => {
    const { data } = await staffDb()!.rpc("gt_staff_change_policy_v1", { p_tournament: id });
    setExists(Boolean(data)); setP((data as Policy | null) ?? EMPTY);
  }, [id]);
  useEffect(() => { queueMicrotask(load); }, [load]);
  if (!p) return <p className="text-sm text-[var(--gt-muted)]">กำลังโหลดเงื่อนไข…</p>;
  const set = (patch: Partial<Policy>) => { setSaved(false); setP({ ...p, ...patch }); };
  const tiers = p.refund_tiers;
  const save = async () => {
    const res = await action.run<{ ok: boolean; error?: string }>(() => staffDb()!.rpc("gt_staff_set_change_policy_v1", { p_tournament: id, p: {
      ...p, refund_tiers: tiers.filter((t) => t.until).map((t) => ({ until: t.until, percent: Number(t.percent) })),
      withdraw_until: p.withdraw_until || null, swap_until: p.swap_until || null, division_until: p.division_until || null } }));
    if (!res) return;
    if (!res.data?.ok) return action.setError(MSG[res.data?.error ?? ""] ?? "บันทึกไม่สำเร็จ");
    setSaved(true); setExists(true); await load();
  };
  const row = (k: "withdraw" | "swap" | "division", label: string, fee?: "swap_fee" | "division_fee") => {
    const allow = `allow_${k}` as const, until = `${k}_until` as const;
    return (
      <div className="grid items-end gap-2 rounded-xl border border-[var(--gt-line)] p-3 sm:grid-cols-[1.2fr_1fr_1fr]">
        <label className="flex min-h-11 items-center gap-2 font-semibold"><input type="checkbox" checked={p[allow]} onChange={(e) => set({ [allow]: e.target.checked } as Partial<Policy>)} className="h-5 w-5" />เปิดให้{label}</label>
        <label className="block text-sm">ได้ถึงวันที่ (เว้นว่าง = ถึงวันแข่ง)<input type="date" value={p[until] ?? ""} onChange={(e) => set({ [until]: e.target.value || null } as Partial<Policy>)} disabled={!p[allow]} className={field} /></label>
        {fee ? <label className="block text-sm">ค่าธรรมเนียม (บาท)<input type="number" min={0} step={10} value={p[fee]} onChange={(e) => set({ [fee]: e.target.value } as Partial<Policy>)} disabled={!p[allow]} className={field} /></label> : <span />}
      </div>
    );
  };
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--gt-line)] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-bold">เงื่อนไขถอนตัว / เปลี่ยนคน / เปลี่ยนรุ่น</h3>
        {!exists && <span className="rounded-full bg-[var(--gt-warn-soft)] px-3 py-0.5 text-sm font-semibold text-[var(--gt-warn)]">ยังไม่ตั้ง · ผู้สมัครขอไม่ได้</span>}
      </div>
      <p className="text-sm text-[var(--gt-muted)]">ผู้สมัครขอได้ที่หน้า “สถานะการสมัคร” ตามเงื่อนไขนี้ ทุกคำขอต้องให้ผู้จัดอนุมัติ</p>
      {row("withdraw", "ถอนตัว")}
      {p.allow_withdraw && (
        <div className="space-y-2 rounded-xl bg-[var(--gt-surface-2)] p-3">
          <p className="font-semibold">การคืนเงินเมื่อถอนตัว</p>
          {tiers.map((t, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <label className="block text-sm">ถ้าขอถึงวันที่<input type="date" value={t.until} onChange={(e) => set({ refund_tiers: tiers.map((x, j) => (j === i ? { ...x, until: e.target.value } : x)) })} className={field} /></label>
              <label className="block w-28 text-sm">คืน (%)<input type="number" min={0} max={100} value={t.percent} onChange={(e) => set({ refund_tiers: tiers.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)) })} className={field} /></label>
              <button type="button" onClick={() => set({ refund_tiers: tiers.filter((_, j) => j !== i) })} className="min-h-11 px-2 text-sm text-[var(--gt-bad)] underline">ลบ</button>
            </div>
          ))}
          {tiers.length < 6 && <button type="button" onClick={() => set({ refund_tiers: [...tiers, { until: "", percent: tiers.length ? 50 : 100 }] })} className="gt-outline-btn min-h-10 px-3 text-sm font-semibold">+ เพิ่มช่วงคืนเงิน</button>}
          <label className="block w-60 text-sm">หลังจากนั้นคืน (%)<input type="number" min={0} max={100} value={p.refund_after_percent} onChange={(e) => set({ refund_after_percent: e.target.value })} className={field} /></label>
          <p className="text-sm">ผู้สมัครจะเห็น: {refundLines({ ...p, refund_tiers: tiers.filter((t) => t.until) }).join(" · ")}</p>
        </div>
      )}
      {row("swap", "เปลี่ยนคน", "swap_fee")}
      {row("division", "เปลี่ยนรุ่น", "division_fee")}
      <label className="block text-sm font-semibold">หมายเหตุถึงผู้สมัคร (ไม่บังคับ)
        <textarea value={p.note ?? ""} onChange={(e) => set({ note: e.target.value })} maxLength={1000} rows={2} placeholder="เช่น คืนเงินภายใน 7 วันหลังอนุมัติ" className={`${field} py-2`} />
      </label>
      <details className="text-sm"><summary className="cursor-pointer text-[var(--gt-muted)]">ดูตัวอย่างที่ผู้สมัครเห็น</summary>
        <PolicyText policy={{ ...p, refund_tiers: tiers.filter((t) => t.until).map((t) => ({ until: t.until, percent: Number(t.percent) })), refund_after_percent: Number(p.refund_after_percent), swap_fee: Number(p.swap_fee), division_fee: Number(p.division_fee) }} />
      </details>
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={action.busy} className="gt-gold-btn min-h-11 px-5 disabled:opacity-60">บันทึกเงื่อนไข</button>
        {saved && <span className="text-sm text-[var(--gt-ok)]">บันทึกแล้ว · ผู้สมัครเห็นทันที</span>}
      </div>
      <ErrorNote text={action.error} />
    </div>
  );
}

type Req = {
  id: string; kind: "withdraw" | "swap" | "division"; status: "pending" | "approved" | "rejected"; created_at: string; reason: string | null;
  reference: string; full_name: string; division: string; new_division: string | null;
  new_person: { full_name?: string; birth_date?: string; rank?: string; phone?: string; mode?: string; go_id?: string } | null;
  fee_paid: number; refund_percent: number | null; refund_amount: number; charge_amount: number; pay_slip_path: string | null; pay_slip_mime: string | null;
  refund_bank: { bank_name: string; account_name: string; account_number: string } | null; refund_done: boolean; refund_slip_path: string | null;
  phone: string | null; decision_note: string | null;
};
const baht = (n: number) => `${Number(n).toLocaleString("th-TH")} บาท`;

/** Requests from applicants: approve / reject, then mark refunds as transferred. */
export function ChangeRequests({ id }: { id: string }) {
  const [rows, setRows] = useState<Req[] | null>(null);
  const action = useAction();
  const fileRef = useRef<HTMLInputElement>(null);
  const [refundFor, setRefundFor] = useState<Req | null>(null);
  const load = useCallback(async () => {
    const { data } = await staffDb()!.rpc("gt_staff_list_requests_v1", { p_tournament: id });
    setRows((data ?? []) as Req[]);
  }, [id]);
  useEffect(() => { queueMicrotask(load); }, [load]);
  if (!rows) return null;
  const decide = async (r: Req, approve: boolean) => {
    const note = approve ? "" : window.prompt("เหตุผลที่ไม่อนุมัติ (ผู้สมัครจะเห็น)", "") ?? null;
    if (note === null) return;
    if (approve && !window.confirm(`อนุมัติคำขอ${KIND_LABEL[r.kind]}ของ ${r.full_name}?`)) return;
    const res = await action.run(() => staffDb()!.rpc("gt_staff_decide_request_v1", { p_id: r.id, p_approve: approve, p_note: note || null }));
    if (res) await load();
  };
  const viewSlip = async (path: string, mime: string | null) => {
    const { data } = await staffDb()!.storage.from("gt-payment-slips").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else action.setError(mime ? "เปิดสลิปไม่สำเร็จ" : "เปิดไฟล์ไม่สำเร็จ");
  };
  const refundDone = async (r: Req, file: File | null) => {
    let path: string | null = null;
    if (file) {
      const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      path = `refund/${crypto.randomUUID()}.${ext}`;
      const up = await staffDb()!.storage.from("gt-payment-slips").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) return action.setError("อัปโหลดสลิปโอนคืนไม่สำเร็จ");
    }
    const res = await action.run(() => staffDb()!.rpc("gt_staff_refund_done_v1", { p_id: r.id, p_slip: path }));
    if (res) await load();
  };
  const pending = rows.filter((r) => r.status === "pending");
  const toRefund = rows.filter((r) => r.status === "approved" && r.refund_amount > 0 && !r.refund_done);
  const rest = rows.filter((r) => !pending.includes(r) && !toRefund.includes(r));
  const card = (r: Req) => (
    <li key={r.id} className="space-y-1.5 rounded-xl border border-[var(--gt-line)] p-3 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.kind === "withdraw" ? "bg-[var(--gt-loss-bg)] text-[var(--gt-loss-ink)]" : "bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]"}`}>{KIND_LABEL[r.kind]}</span>
        <b className="text-base">{r.full_name}</b><span className="text-[var(--gt-muted)]">{divisionLabel(r.division)} · อ้างอิง {r.reference}</span>
      </p>
      {r.kind === "division" && <p>ขอย้ายไป <b>{divisionLabel(r.new_division ?? "")}</b></p>}
      {r.kind === "swap" && r.new_person && <p>คนใหม่: <b>{r.new_person.full_name}</b> · {r.new_person.rank}{r.new_person.birth_date ? ` · เกิด ${r.new_person.birth_date}` : ""}{r.new_person.phone ? ` · ${r.new_person.phone}` : ""}{r.new_person.go_id ? ` · ${r.new_person.go_id}` : ""}</p>}
      {r.reason && <p className="text-[var(--gt-muted)]">เหตุผล: {r.reason}</p>}
      {r.kind === "withdraw" && <p>จ่ายแล้ว {baht(r.fee_paid)} · คืน {r.refund_percent ?? 0}% = <b>{baht(r.refund_amount)}</b></p>}
      {r.refund_bank && <p>บัญชีรับเงินคืน: {r.refund_bank.bank_name} · {r.refund_bank.account_name} · <span className="gt-num font-semibold">{r.refund_bank.account_number}</span></p>}
      {r.charge_amount > 0 && <p>ค่าธรรมเนียม <b>{baht(r.charge_amount)}</b>{r.pay_slip_path && <> · <button type="button" onClick={() => viewSlip(r.pay_slip_path!, r.pay_slip_mime)} className="font-semibold text-[var(--gt-cta)] underline">ดูสลิป</button></>}</p>}
      {r.phone && <p>ติดต่อผู้สมัคร: <a href={`tel:${r.phone}`} className="font-semibold text-[var(--gt-cta)] underline">{r.phone}</a></p>}
      {r.status === "pending" ? (
        <div className="grid grid-cols-2 gap-2 pt-1 sm:flex">
          <button type="button" onClick={() => decide(r, false)} disabled={action.busy} className="gt-outline-btn min-h-11 px-4 font-semibold disabled:opacity-60">ไม่อนุมัติ</button>
          <button type="button" onClick={() => decide(r, true)} disabled={action.busy} className="gt-cta-btn min-h-11 px-5 disabled:opacity-60">อนุมัติ</button>
        </div>
      ) : r.status === "approved" && r.refund_amount > 0 && !r.refund_done ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => refundDone(r, null)} disabled={action.busy} className="gt-gold-btn min-h-11 px-4 disabled:opacity-60">โอนคืนแล้ว</button>
          <button type="button" onClick={() => { setRefundFor(r); fileRef.current?.click(); }} disabled={action.busy} className="gt-outline-btn min-h-11 px-4 font-semibold disabled:opacity-60">โอนคืนแล้ว + แนบสลิป</button>
        </div>
      ) : (
        <p className={r.status === "approved" ? "text-[var(--gt-ok)]" : "text-[var(--gt-bad)]"}>
          {r.status === "approved" ? `อนุมัติแล้ว${r.refund_amount > 0 ? " · โอนเงินคืนแล้ว" : ""}` : "ไม่อนุมัติ"}{r.decision_note ? ` · ${r.decision_note}` : ""}
          {r.refund_slip_path && <> · <button type="button" onClick={() => viewSlip(r.refund_slip_path!, null)} className="underline">สลิปโอนคืน</button></>}
        </p>
      )}
    </li>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">คำขอถอนตัว / เปลี่ยนคน / เปลี่ยนรุ่น</p>
        <span className="gt-pill-gold px-2.5 py-0.5 text-xs font-semibold">รอตรวจ {pending.length}</span>
        {toRefund.length > 0 && <span className="rounded-full bg-[var(--gt-warn-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--gt-warn)]">รอโอนคืน {toRefund.length}</span>}
      </div>
      <ErrorNote text={action.error} />
      {rows.length === 0 ? <p className="text-sm text-[var(--gt-muted)]">ยังไม่มีคำขอ</p> : (
        <ul className="space-y-2">{[...pending, ...toRefund].map(card)}</ul>
      )}
      {rest.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-[var(--gt-muted)]">คำขอที่ตัดสินแล้ว {rest.length} รายการ</summary><ul className="mt-2 space-y-2">{rest.map(card)}</ul></details>}
      <p className="text-xs text-[var(--gt-muted)]">อนุมัติถอนตัว = ตัดชื่อออกจากรุ่น · เปลี่ยนรุ่น/เปลี่ยนคนทำได้เฉพาะก่อนออกคู่ให้นักกีฬาคนนั้น · โอนเงินคืนนอกระบบ แล้วกด “โอนคืนแล้ว” ผู้สมัครจะเห็นสถานะ</p>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" aria-label="เลือกสลิปโอนคืน"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && refundFor) refundDone(refundFor, f); setRefundFor(null); }} />
    </div>
  );
}
