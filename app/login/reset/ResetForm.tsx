"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { authErrorMessage, destinationFor } from "@/lib/auth-routing.mjs";
import { FormError, FormNote, PasswordField } from "../_ui/fields";

/** Opened from the reset e-mail: the link signs the browser in, then the person chooses a new password. */
export default function ResetForm() {
  const [ready, setReady] = useState<"wait" | "yes" | "no">("wait");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const db = staffDb();
    if (!db) return;
    const { data: sub } = db.auth.onAuthStateChange((event, session) => { if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) setReady("yes"); });
    db.auth.getSession().then(({ data }) => { if (data.session) setReady("yes"); });
    const t = setTimeout(() => setReady((r) => (r === "wait" ? "no" : r)), 6000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pw.length < 8) return setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if (pw !== pw2) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    const db = staffDb();
    if (!db) return;
    setBusy(true);
    const { error: err } = await db.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(authErrorMessage(err.message));
    setDone(true);
  };

  const goOn = async () => {
    const db = staffDb();
    const { data } = (await db?.rpc("gt_my_access_v1")) ?? { data: null };
    window.location.assign(destinationFor(data, null));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">ตั้งรหัสผ่านใหม่</h1>
      {done ? (
        <div className="mt-6 space-y-4">
          <FormNote text="เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" />
          <button type="button" onClick={goOn} className="gt-cta-btn flex min-h-12 w-full items-center justify-center">ไปต่อ →</button>
        </div>
      ) : ready === "no" ? (
        <div className="mt-6 space-y-4">
          <FormError text="ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่" />
          <Link href="/login/forgot" className="gt-cta-btn flex min-h-12 items-center justify-center">ขอลิงก์ใหม่</Link>
        </div>
      ) : ready === "wait" ? (
        <p className="py-10 text-center text-[var(--gt-muted)]" role="status">กำลังตรวจสอบลิงก์…</p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <PasswordField label="รหัสผ่านใหม่" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" hint="อย่างน้อย 8 ตัวอักษร" />
          <PasswordField label="ยืนยันรหัสผ่านใหม่" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          <FormError text={error} />
          <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-12 w-full items-center justify-center text-lg disabled:opacity-60">{busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}</button>
        </form>
      )}
    </div>
  );
}
