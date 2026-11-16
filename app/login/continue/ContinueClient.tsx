"use client";

import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { destinationFor } from "@/lib/auth-routing.mjs";

/** After Google sign-in or the e-mail confirmation link: wait for the session, then route by role. */
export default function ContinueClient() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const db = staffDb();
    if (!db) return;
    let done = false;
    const go = async () => {
      const { data } = await db.auth.getSession();
      if (!data.session || done) return;
      done = true;
      const { data: access } = await db.rpc("gt_my_access_v1");
      window.location.replace(destinationFor(access, new URLSearchParams(window.location.search).get("next")));
    };
    const { data: sub } = db.auth.onAuthStateChange(() => { void go(); });
    void go();
    const t = setTimeout(() => { if (!done) setFailed(true); }, 8000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);
  return (
    <>
      {failed ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">ลิงก์หมดอายุหรือใช้ไปแล้ว</h1>
          <p className="text-[var(--gt-muted)]">กรุณาเข้าสู่ระบบอีกครั้ง</p>
          <a href="/login" className="gt-cta-btn flex min-h-12 items-center justify-center">ไปหน้าเข้าสู่ระบบ</a>
        </div>
      ) : <p className="py-16 text-center text-lg text-[var(--gt-muted)]" role="status">กำลังเข้าสู่ระบบ…</p>}
    </>
  );
}
