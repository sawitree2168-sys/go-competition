"use client";

import Link from "next/link";
import { useState } from "react";
import { setRemember, staffDb } from "@/app/organizer/_lib/staff";
import { authErrorMessage, destinationFor, looksLikeEmail } from "@/lib/auth-routing.mjs";
import { callAthlete, identifierProblem } from "@/lib/athlete-auth.mjs";
import { Field, FormError, GoogleLogo, PasswordField } from "./fields";

/** Google button appears once the provider is switched on in Supabase and this flag is set on Vercel. */
export const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1";

const nextParam = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("next"));

/**
 * The one sign-in form for every role. After signing in it sends organisers / the site owner to the organiser
 * pages and everyone else to their account page. With `stay`, the surrounding page (e.g. the organiser gate)
 * takes over instead of navigating.
 */
export default function LoginForm({ stay, heading = "เข้าสู่ระบบ" }: { stay?: boolean; heading?: string }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRem] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const db = staffDb();
    if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    const who = id.trim();
    if (!who || !password) return setError("กรุณากรอกอีเมล / รหัส GO / เลขดั้ง / ชื่อ และรหัสผ่าน");
    const staffName = /^go\s*master$/i.test(who) ? "GOMASTER" : who;
    const staffUsername = /^[a-z][a-z0-9_-]{3,31}$/i.test(staffName) && !looksLikeEmail(who);
    const problem = staffUsername ? "" : identifierProblem(who);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      setRemember(remember);
      if (staffUsername) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) { setError("ระบบเข้าสู่ระบบยังไม่พร้อม"); return; }
        const response = await fetch(`${url}/functions/v1/staff-username-login`, {
          method: "POST", headers: { "content-type": "application/json", apikey: key },
          body: JSON.stringify({ username: staffName, password })
        });
        const result = await response.json();
        if (!response.ok || !result.session) { setError(/^go\\s*master$/i.test(who) || /^gomaster$/i.test(who) ? "บัญชี GOMASTER ยังไม่ได้เปิดใช้งาน หรือรหัสผ่านไม่ถูกต้อง · ต้องเปิดบัญชีเจ้าของและตั้งชื่อผู้ใช้ก่อน" : (result.message ?? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")); return; }
        const { error: err } = await db.auth.setSession(result.session);
        if (err) { setError(authErrorMessage(err.message)); return; }
      } else if (looksLikeEmail(who)) {
        const { error: err } = await db.auth.signInWithPassword({ email: who, password });
        if (err) { setError(authErrorMessage(err.message)); return; }
      } else {
        // Athletes: GO ID, dan number or full name (accounts without e-mail).
        const r = await callAthlete("login", { identifier: who, password });
        if (!r.ok || !r.data?.session) { setError(r.data?.message ?? "เข้าสู่ระบบไม่สำเร็จ"); return; }
        const { error: err } = await db.auth.setSession(r.data.session);
        if (err) { setError(authErrorMessage(err.message)); return; }
      }
      if (stay) return;
      const { data } = await db.rpc("gt_my_access_v1");
      window.location.assign(destinationFor(data, nextParam()));
    } catch (x) {
      setError(authErrorMessage(x instanceof Error ? x.message : ""));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const db = staffDb();
    if (!db) return;
    setError("");
    setRemember(true);
    const back = new URL("/login/continue", window.location.origin);
    const n = nextParam();
    if (n) back.searchParams.set("next", n);
    const { error: err } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: back.toString() } });
    if (err) setError(authErrorMessage(err.message));
  };

  return (
    <div>
      <h1 className="text-[2rem] sm:text-[2.625rem]">{heading}</h1>
      <p className="mt-1 text-base text-[var(--gt-muted)] sm:text-lg">ยินดีต้อนรับสู่ GO TOURNAMENT</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-5">
        <Field label="ชื่อผู้ใช้ / อีเมล / รหัสนักกีฬา" icon="person" value={id} onChange={(e) => setId(e.target.value)} placeholder="GOMASTER / อีเมล / รหัส GO / ชื่อ"
          hint="สถาบัน: ใช้ชื่อผู้ใช้ที่เปิดใช้งานแล้ว (GO MASTER หรือ GOMASTER) · นักกีฬา: ใช้รหัส GO หรือชื่อ-นามสกุล" autoComplete="username" autoCapitalize="none" spellCheck={false} />
        <PasswordField label="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่าน" autoComplete="current-password" />
        <div className="flex items-center justify-between gap-3">
          <label className="flex min-h-11 items-center gap-2.5 text-base">
            <input type="checkbox" checked={remember} onChange={(e) => setRem(e.target.checked)} className="h-5 w-5 accent-[var(--gt-cta)]" />
            จดจำฉัน
          </label>
          <Link href="/login/forgot" className="font-semibold text-[var(--gt-cta)] underline underline-offset-2">ลืมรหัสผ่าน?</Link>
        </div>
        <FormError text={error} />
        <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-[3.25rem] w-full items-center justify-center text-[19px] disabled:opacity-60">
          {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>

      {GOOGLE_ENABLED && (
        <>
          <div className="my-5 flex items-center gap-4 text-sm text-[var(--gt-muted)]"><span className="h-px flex-1 bg-[var(--gt-line)]" />หรือ<span className="h-px flex-1 bg-[var(--gt-line)]" /></div>
          <button type="button" onClick={google} className="flex min-h-[3.25rem] w-full items-center justify-center gap-3 rounded-xl border-2 border-[var(--gt-cta)]/60 bg-[var(--gt-surface)] text-[17px] hover:bg-[var(--gt-cta-soft)]">
            <GoogleLogo />เข้าสู่ระบบด้วย Google
          </button>
        </>
      )}

      <p className="mt-4 rounded-xl bg-[var(--gt-cta-soft)] px-3 py-3 text-sm text-[var(--gt-muted)]">บัญชีสถาบัน GO MASTER: หากยังไม่เคยเปิดบัญชีเจ้าของ ต้องสมัครบัญชีส่วนตัวหนึ่งครั้ง ผูกสิทธิ์สถาบัน และตั้งชื่อผู้ใช้ก่อน จึงจะใช้ GOMASTER กับรหัสผ่านได้</p>
      <p className="mt-6 text-center text-base">ยังไม่มีบัญชี? <Link href="/signup" className="font-semibold text-[var(--gt-cta)] hover:underline">สมัครสมาชิก</Link></p>
      <p className="mt-3 text-center text-sm"><Link href="/signup?type=institution" className="font-semibold text-[var(--gt-cta)] underline underline-offset-2">ลงทะเบียนครู / ผู้ดูแลสถาบัน GO MASTER</Link></p>
      {!stay && <p className="mt-3 text-center text-base"><Link href="/tournaments" className="font-normal text-[var(--gt-cta)] underline underline-offset-2">ดูการแข่งขันโดยไม่เข้าสู่ระบบ</Link></p>}
      <p className="mt-6 rounded-xl bg-[var(--gt-cta-soft)] px-3 py-2.5 text-center text-sm text-[var(--gt-muted)]">
        กรรมการ: เปิดลิงก์ที่ได้รับจากผู้จัด แล้วกรอกรหัส 6 หลัก ไม่ต้องเข้าสู่ระบบที่หน้านี้
      </p>
    </div>
  );
}
