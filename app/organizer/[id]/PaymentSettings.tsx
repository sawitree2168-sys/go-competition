"use client";
/* eslint-disable @next/next/no-img-element -- storage URLs */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorNote, staffDb, useAction } from "../_lib/staff";

type Settings = { bank_name: string; account_name: string; account_number: string; qr_url: string | null; confirmed: boolean; updated_at: string };

const BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงเทพ", "กรุงไทย", "กรุงศรีอยุธยา", "ทหารไทยธนชาต (ttb)", "ออมสิน", "ธ.ก.ส.", "ยูโอบี", "ซีไอเอ็มบี ไทย", "เกียรตินาคินภัทร", "พร้อมเพย์"];
const MESSAGES: Record<string, string> = {
  BANK: "กรุณาระบุธนาคาร", ACCOUNT_NAME: "กรุณาระบุชื่อบัญชี", ACCOUNT_NUMBER: "เลขบัญชีต้องเป็นตัวเลข 6–30 หลัก", QR: "รูป QR ไม่ถูกต้อง กรุณาอัปโหลดใหม่",
};
const field = "mt-1 block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 font-normal";

/**
 * Bank account / QR for this event's web sign-ups. Applicants see it only after an organiser presses
 * "ยืนยันบัญชี"; any later change hides it again until confirmed.
 */
export default function PaymentSettings({ id }: { id: string }) {
  const [s, setS] = useState<Settings | null | undefined>(undefined);
  const [bank, setBank] = useState(""); const [name, setName] = useState(""); const [no, setNo] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const action = useAction();
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await staffDb()!.rpc("gt_staff_payment_settings_v1", { p_tournament: id });
    const x = (data as Settings | null) ?? null;
    setS(x); setBank(x?.bank_name ?? ""); setName(x?.account_name ?? ""); setNo(x?.account_number ?? ""); setQr(x?.qr_url ?? null); setChecked(false);
  }, [id]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const changed = !s || s.bank_name !== bank.trim() || s.account_name !== name.trim() || s.account_number !== no.replace(/[^0-9-]/g, "") || (s.qr_url ?? null) !== qr;

  const upload = async (f: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 6 * 1024 * 1024) return action.setError("รูป QR ต้องเป็น JPG / PNG / WEBP ไม่เกิน 6 MB");
    const db = staffDb()!;
    setUploading(true); action.setError("");
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `payment-qr/${id}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from("gt-site-assets").upload(path, f, { contentType: f.type, upsert: false });
    setUploading(false);
    if (up.error) return action.setError("อัปโหลดรูป QR ไม่สำเร็จ");
    setQr(db.storage.from("gt-site-assets").getPublicUrl(path).data.publicUrl);
    setNote("");
  };

  const save = async (confirm: boolean) => {
    setNote("");
    if (confirm && !checked) return action.setError("กรุณาติ๊กว่าตรวจเลขบัญชีและชื่อบัญชีแล้ว");
    const res = await action.run<{ ok: boolean; error?: string; confirmed?: boolean }>(() =>
      staffDb()!.rpc("gt_staff_set_payment_v1", { p_tournament: id, p_bank: bank, p_account_name: name, p_account_number: no, p_qr_url: qr, p_confirm: confirm }));
    if (!res) return;
    if (!res.data?.ok) return action.setError(MESSAGES[res.data?.error ?? ""] ?? "บันทึกไม่สำเร็จ");
    setNote(res.data.confirmed ? "ยืนยันแล้ว · ผู้สมัครเห็นบัญชีนี้และแนบสลิปได้ทันที" : "บันทึกแล้ว · ผู้สมัครยังไม่เห็นจนกว่าจะกดยืนยันบัญชี");
    await load();
  };
  const hide = async () => {
    const res = await action.run(() => staffDb()!.rpc("gt_staff_unconfirm_payment_v1", { p_tournament: id }));
    if (res) { setNote("ซ่อนบัญชีแล้ว · ผู้สมัครจะยังสมัครงานที่มีค่าสมัครไม่ได้"); await load(); }
  };

  if (s === undefined) return <p className="text-sm text-[var(--gt-muted)]">กำลังโหลดบัญชีรับเงิน…</p>;
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--gt-line)] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-bold">บัญชีรับค่าสมัคร (หน้าสมัครจากโปสเตอร์)</h3>
        {s?.confirmed && !changed
          ? <span className="rounded-full bg-[var(--gt-win-bg)] px-3 py-0.5 text-sm font-semibold text-[var(--gt-win-ink)]">ยืนยันแล้ว · ผู้สมัครเห็น</span>
          : <span className="rounded-full bg-[var(--gt-warn-soft)] px-3 py-0.5 text-sm font-semibold text-[var(--gt-warn)]">ยังไม่ยืนยัน · ผู้สมัครยังไม่เห็น</span>}
      </div>
      <p className="text-sm text-[var(--gt-muted)]">รุ่นที่มีค่าสมัครจะสมัครผ่านเว็บได้เมื่อยืนยันบัญชีแล้วเท่านั้น · แก้ไขข้อมูลเมื่อไร ต้องกดยืนยันใหม่</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-semibold">ธนาคาร
          <input value={bank} onChange={(e) => setBank(e.target.value)} list="gt-banks" maxLength={100} placeholder="เช่น กสิกรไทย" className={field} />
          <datalist id="gt-banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
        </label>
        <label className="block text-sm font-semibold">ชื่อบัญชี<input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="ชื่อตามสมุดบัญชี" className={field} /></label>
        <label className="block text-sm font-semibold">เลขบัญชี / พร้อมเพย์<input value={no} onChange={(e) => setNo(e.target.value)} inputMode="numeric" maxLength={30} placeholder="xxx-x-xxxxx-x" className={field} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {qr ? <img src={qr} alt="QR รับเงิน" className="h-28 w-28 rounded-xl border border-[var(--gt-line)] bg-white object-contain p-1" />
          : <span className="grid h-28 w-28 place-items-center rounded-xl border border-dashed border-[var(--gt-line)] text-center text-xs text-[var(--gt-muted)]">ยังไม่มี QR<br />(ไม่บังคับ)</span>}
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="gt-outline-btn min-h-11 px-4 text-sm font-semibold disabled:opacity-60">{uploading ? "กำลังอัปโหลด…" : qr ? "เปลี่ยนรูป QR" : "อัปโหลดรูป QR"}</button>
          {qr && <button type="button" onClick={() => setQr(null)} className="min-h-9 text-sm text-[var(--gt-bad)] underline">เอา QR ออก</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="เลือกรูป QR" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
        <span>ตรวจแล้วว่าธนาคาร ชื่อบัญชี เลขบัญชี และ QR ถูกต้อง เป็นบัญชีรับเงินของงานนี้</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => save(true)} disabled={action.busy} className="gt-gold-btn min-h-11 px-5 disabled:opacity-60">ยืนยันบัญชีและเปิดรับชำระ</button>
        <button type="button" onClick={() => save(false)} disabled={action.busy || !changed} className="gt-outline-btn min-h-11 px-4 disabled:opacity-60">บันทึก (ยังไม่แสดง)</button>
        {s?.confirmed && <button type="button" onClick={hide} disabled={action.busy} className="min-h-11 rounded-xl border border-[var(--gt-bad)] px-4 text-[var(--gt-bad)] disabled:opacity-60">ซ่อนบัญชี</button>}
        <Link href={`/tournaments/${id}/register`} target="_blank" className="ml-auto text-sm font-semibold text-[var(--gt-cta)] underline">เปิดหน้าสมัคร ↗</Link>
      </div>
      {note && <p className="text-sm text-[var(--gt-ok)]">{note}</p>}
      <ErrorNote text={action.error} />
    </div>
  );
}
