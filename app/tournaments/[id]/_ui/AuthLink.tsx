"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";

/** Header link: "เข้าสู่ระบบ" or, when signed in on this browser, "บัญชีของฉัน". */
export default function AuthLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const db = staffDb();
    if (!db) return;
    db.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <Link href={signedIn ? "/account" : "/login"} aria-label={signedIn ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}
      className="inline-flex h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-white/40 px-2.5 text-sm font-semibold hover:bg-white/10 sm:px-4">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeLinecap="round" /></svg>
      <span className="hidden sm:inline">{signedIn ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}</span>
    </Link>
  );
}
