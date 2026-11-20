"use client";

import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { destinationFor } from "@/lib/auth-routing.mjs";
import LoginForm from "./LoginForm";
import { shownName } from "@/lib/easy-auth.mjs";

/** Login page: the form, or — when this browser is already signed in — a shortcut onward. */
export default function LoginPage() {
  const [signedIn, setSignedIn] = useState<{ email: string; to: string } | null>(null);

  useEffect(() => {
    const db = staffDb();
    if (!db) return;
    let live = true;
    db.auth.getSession().then(async ({ data }) => {
      if (!live || !data.session) return;
      const { data: access } = await db.rpc("gt_my_access_v1");
      if (live) setSignedIn({ email: shownName(data.session.user), to: destinationFor(access, new URLSearchParams(window.location.search).get("next")) });
    });
    return () => { live = false; };
  }, []);

  if (signedIn) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">เข้าสู่ระบบแล้ว</h1>
        <p className="text-[var(--gt-muted)]">บัญชี {signedIn.email}</p>
        <a href={signedIn.to} className="gt-cta-btn flex min-h-12 items-center justify-center text-lg">ไปต่อ →</a>
        <button type="button" onClick={async () => { await staffDb()?.auth.signOut(); setSignedIn(null); }}
          className="gt-outline-btn min-h-12 w-full font-semibold">ออกจากระบบ แล้วเข้าด้วยบัญชีอื่น</button>
      </div>
    );
  }
  return <LoginForm />;
}
