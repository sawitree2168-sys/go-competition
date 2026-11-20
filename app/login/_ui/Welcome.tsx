"use client";

import { useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { callEasy, toIsoDate } from "@/lib/easy-auth.mjs";
import { Field, FormError, PasswordField } from "./fields";

type Who = { role_label: string | null; name: string | null; has_recovery?: boolean };

/**
 * Shown after signing in with a role's default password: change it now or skip.
 * Also asks (optional) for a phone + birth date so the person can reset a forgotten password alone, without an admin.
 */
export default function Welcome({ who, onDone, inline }: { who: Who; onDone: () => void; inline?: boolean }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [phone, setPhone] = useState("");
  const [birth, setBirth] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const save = async () => {
    setError(""); setSaved("");
    if (pw && pw.length < 6) return setError("รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร");
    if (pw !== pw2) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    const digits = phone.replace(/\D/g, "");
    if (phone && (digits.length < 9 || digits.length > 12)) return setError("เบอร์โทรไม่ถูกต้อง");
    const iso = birth ? toIsoDate(birth) : "";
    if (birth && !iso) return setError("วันเกิดไม่ถูกต้อง (เช่น 07/03/2558)");
    if (!pw && !digits && !iso) return onDone();
    setBusy(true);
    const { data } = await staffDb()!.auth.getSession();
    const r = await callEasy("profile", { new_password: pw || undefined, phone: digits || undefined, birth_date: iso || undefined }, { accessToken: data.session?.access_token });
    setBusy(false);
    if (!r.ok) return setError(r.data?.message ?? "บันทึกไม่สำเร็จ");
    if (pw) {
      // The old session stays valid; refresh it so later calls carry the new password state.
      await staffDb()!.auth.refreshSession();
    }
    if (inline) { setSaved("บันทึกแล้ว"); setPw(""); setPw2(""); return; }
    onDone();
  };

  return (
    <div className="space-y-4">
      {!inline && (
        <>
          <h1 className="text-[1.75rem] sm:text-[2.25rem]">ยินดีต้อนรับ{who.name ? ` ${who.name}` : ""}</h1>
          <p className="text-base">เข้าระบบเป็น <b>{who.role_label ?? "สมาชิก"}</b> ด้วยรหัสเริ่มต้นแล้ว · จะเปลี่ยนรหัสผ่านตอนนี้ หรือข้ามไปก่อนก็ได้</p>
        </>
      )}
      <PasswordField label="รหัสผ่านใหม่ (ไม่บังคับ)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" hint="อย่างน้อย 6 ตัวอักษร · เว้นว่าง = ใช้รหัสเดิม" />
      {pw && <PasswordField label="พิมพ์รหัสผ่านใหม่อีกครั้ง" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />}
      <div className="rounded-xl border border-[var(--gt-line)] p-3">
        <p className="text-sm font-semibold">ไว้ใช้ตอนลืมรหัสผ่าน (ไม่บังคับ แต่แนะนำ)</p>
        <p className="text-xs text-[var(--gt-muted)]">ลืมรหัสเมื่อไร กรอกเบอร์โทร + วันเกิดนี้ ตั้งรหัสใหม่ได้เองทันที ไม่ต้องรอแอดมิน · ไม่แสดงให้ใครเห็น</p>
        {who.has_recovery && <p className="mt-1 text-xs font-semibold text-[var(--gt-good,#1a7f37)]">บันทึกไว้แล้ว · กรอกใหม่เพื่อแก้ไข</p>}
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label="เบอร์โทร (ผู้ปกครองหรือตัวเอง)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
          <Field label="วันเกิด" value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="วว/ดด/ปปปป เช่น 07/03/2558" />
        </div>
      </div>
      <FormError text={error} />
      {saved && <p role="status" className="rounded-xl bg-[var(--gt-cta-soft)] px-3 py-2 text-sm font-semibold">{saved}</p>}
      <button type="button" onClick={save} disabled={busy} className="gt-cta-btn flex min-h-[3.25rem] w-full items-center justify-center text-[19px] disabled:opacity-60">
        {busy ? "กำลังบันทึก…" : inline ? "บันทึก" : "บันทึกแล้วไปต่อ"}
      </button>
      {!inline && <button type="button" onClick={onDone} className="gt-outline-btn min-h-12 w-full font-semibold">ข้ามไปก่อน</button>}
    </div>
  );
}
