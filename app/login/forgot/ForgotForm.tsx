"use client";

import Link from "next/link";
import { useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { authErrorMessage, looksLikeEmail } from "@/lib/auth-routing.mjs";
import { Field, FormError, FormNote } from "../_ui/fields";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!looksLikeEmail(email)) return setError("กรุณากรอกอีเมลที่ใช้สมัคร");
    const db = staffDb();
    if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    setBusy(true);
    const { error: err } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login/reset` });
    setBusy(false);
    // Same answer whether or not the address has an account, so nobody can probe who is registered.
    if (err && !/not found|no user/i.test(err.message)) return setError(authErrorMessage(err.message));
    setSent(true);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">ลืมรหัสผ่าน</h1>
      <p className="mt-1 text-[var(--gt-muted)]">กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>
      {sent ? (
        <div className="mt-6 space-y-4">
          <FormNote text={`ถ้า ${email.trim()} มีบัญชีอยู่ จะได้รับอีเมลภายในไม่กี่นาที (ตรวจในโฟลเดอร์ Junk/Spam ด้วย) แล้วกดลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่`} />
          <Link href="/login" className="gt-cta-btn flex min-h-12 items-center justify-center">กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <Field label="อีเมล" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" />
          <FormError text={error} />
          <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-12 w-full items-center justify-center text-lg disabled:opacity-60">{busy ? "กำลังส่ง…" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}</button>
          <p className="text-center"><Link href="/login" className="font-semibold text-[var(--gt-cta)] hover:underline">← กลับไปหน้าเข้าสู่ระบบ</Link></p>
        </form>
      )}
    </div>
  );
}
