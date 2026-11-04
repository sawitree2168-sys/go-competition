"use client";

import { useState } from "react";
import { staffDb, useStaff, ErrorNote } from "./staff";

/** Shows the page only to signed-in owners/admins; everyone else gets the sign-in form. */
export default function Gate({ children }: { children: React.ReactNode }) {
  const staff = useStaff();
  if (staff.status === "loading") return <p className="py-16 text-center text-[var(--gt-muted)]">กำลังตรวจสอบสิทธิ์…</p>;
  if (staff.status === "signed_out") return <SignIn />;
  if (staff.status === "not_staff")
    return (
      <div className="gt-card mx-auto mt-10 max-w-md space-y-2 p-6 text-center">
        <h1 className="text-lg font-bold">บัญชีนี้ยังไม่มีสิทธิ์ผู้จัด</h1>
        <p className="text-sm text-[var(--gt-muted)]">{staff.email} — ติดต่อเจ้าของระบบเพื่อขอสิทธิ์</p>
      </div>
    );
  return <>{children}</>;
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = staffDb();
    if (!db) { setError("ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล"); return; }
    setBusy(true); setError("");
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(/invalid/i.test(error.message) ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : "เข้าสู่ระบบไม่สำเร็จ: " + error.message);
  };

  return (
    <form onSubmit={submit} className="gt-card mx-auto mt-10 max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold">เข้าสู่ระบบผู้จัด</h1>
      <label className="block space-y-1">
        <span className="text-sm font-medium">อีเมล</span>
        <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 text-base" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">รหัสผ่าน</span>
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 text-base" />
      </label>
      <ErrorNote text={error} />
      <button type="submit" disabled={busy} className="gt-gold-btn min-h-12 w-full text-base disabled:opacity-60">
        {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
