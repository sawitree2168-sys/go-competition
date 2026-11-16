"use client";

import Link from "next/link";
import { staffDb, useStaff } from "./staff";
import LoginForm from "@/app/login/_ui/LoginForm";

/** Shows the page only to signed-in owners/admins; everyone else gets the sign-in form. */
export default function Gate({ children }: { children: React.ReactNode }) {
  const staff = useStaff();
  if (staff.status === "loading") return <p className="py-16 text-center text-[var(--gt-muted)]">กำลังตรวจสอบสิทธิ์…</p>;
  if (staff.status === "signed_out") return <SignIn />;
  if (staff.status === "not_staff")
    return (
      <div className="gt-card mx-auto mt-10 max-w-md space-y-2 p-6 text-center">
        <h1 className="text-lg font-bold">{staff.suspended ? "บัญชีผู้จัดนี้ถูกระงับชั่วคราว" : "บัญชีนี้ยังไม่มีสิทธิ์ผู้จัด"}</h1>
        <p className="text-sm text-[var(--gt-muted)]">{staff.email} — ติดต่อเจ้าของระบบ GO TOURNAMENT</p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link href="/account" className="gt-outline-btn flex min-h-11 items-center justify-center font-semibold">บัญชีของฉัน</Link>
          <button type="button" onClick={() => staffDb()?.auth.signOut()} className="gt-outline-btn min-h-11 font-semibold">ออกจากระบบ</button>
        </div>
      </div>
    );
  return <>{children}</>;
}

function SignIn() {
  return (
    <div className="gt-card mx-auto mt-8 max-w-md p-6">
      <LoginForm stay heading="เข้าสู่ระบบผู้จัด" />
    </div>
  );
}
