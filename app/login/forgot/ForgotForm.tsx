"use client";

import Link from "next/link";
import { useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { authErrorMessage, destinationFor, looksLikeEmail } from "@/lib/auth-routing.mjs";
import { callEasy, toIsoDate } from "@/lib/easy-auth.mjs";
import { Field, FormError, FormNote, PasswordField } from "../_ui/fields";
import { setRemember } from "@/app/organizer/_lib/staff";
import { callAthlete, identifierKind } from "@/lib/athlete-auth.mjs";

export default function ForgotForm() {
  const [kind, setKind] = useState<"easy" | "email" | "athlete">("easy");
  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">ลืมรหัสผ่าน</h1>
      <div role="tablist" aria-label="วิธีตั้งรหัสใหม่" className="mt-4 grid grid-cols-3 gap-1 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-1">
        {([["easy", "เบอร์โทร + วันเกิด"], ["email", "บัญชีอีเมล"], ["athlete", "รหัสจากแอดมิน"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={`min-h-11 rounded-xl px-1 text-[14px] font-semibold sm:text-[15px] ${kind === k ? "bg-[var(--gt-cta)] text-white" : "text-[var(--gt-ink)]"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-5">{kind === "easy" ? <EasyReset /> : kind === "athlete" ? <AthleteReset /> : <EmailReset />}</div>
    </div>
  );
}

/** Anyone signing in by name: prove phone + birth date (given when applying, or saved after first sign-in) and set a new password. */
function EasyReset() {
  const [who, setWho] = useState("");
  const [phone, setPhone] = useState("");
  const [birth, setBirth] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (who.trim().length < 2) return setError("กรุณากรอกชื่อ-นามสกุล หรือรหัส GO");
    const iso = toIsoDate(birth);
    if (!iso) return setError("กรุณากรอกวันเกิด เช่น 07/03/2558");
    if (phone.replace(/\D/g, "").length < 9) return setError("กรุณากรอกเบอร์โทร");
    if (pw.length < 6) return setError("รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร");
    const db = staffDb(); if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    setBusy(true);
    const r = await callEasy("forgot", { identifier: who, phone, birth_date: iso, new_password: pw });
    if (!r.ok || !r.data?.session) { setBusy(false); return setError(r.data?.message ?? "ตั้งรหัสใหม่ไม่สำเร็จ"); }
    setRemember(true);
    await db.auth.setSession(r.data.session);
    const { data } = await db.rpc("gt_my_access_v1");
    window.location.assign(destinationFor(data, null));
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormNote tone="info" text="ใช้เบอร์โทรและวันเกิดที่เคยกรอกตอนสมัครแข่ง หรือที่บันทึกไว้หลังเข้าระบบครั้งแรก แล้วตั้งรหัสใหม่ได้ทันที" />
      <Field label="ชื่อ-นามสกุล / รหัส GO / ชื่อที่ใช้เข้าระบบ" icon="person" value={who} onChange={(e) => setWho(e.target.value)} autoCapitalize="none" spellCheck={false} />
      <Field label="เบอร์โทร" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
      <Field label="วันเกิด" value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="วว/ดด/ปปปป เช่น 07/03/2558" />
      <PasswordField label="รหัสผ่านใหม่" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" hint="อย่างน้อย 6 ตัวอักษร" />
      <FormError text={error} />
      <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-12 w-full items-center justify-center text-lg disabled:opacity-60">{busy ? "กำลังตรวจสอบ…" : "ตั้งรหัสใหม่และเข้าสู่ระบบ"}</button>
      <div className="rounded-xl bg-[var(--gt-cta-soft)] p-3 text-sm text-[var(--gt-muted)]">
        <p className="font-semibold text-[var(--gt-ink)]">ไม่เคยให้เบอร์โทรไว้?</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>นักเรียน: ให้ครูหรือสถาบันกด “รีเซ็ตรหัส” ให้ แล้วเข้าด้วยรหัสเริ่มต้นของนักกีฬา</li>
          <li>ครูในสถาบัน: ให้เจ้าของสถาบันรีเซ็ตให้</li>
          <li>เจ้าของสถาบัน / ผู้จัดงาน: ติดต่อแอดมินระบบ</li>
        </ul>
      </div>
      <p className="text-center"><Link href="/login" className="font-semibold text-[var(--gt-cta)] hover:underline">← กลับไปหน้าเข้าสู่ระบบ</Link></p>
    </form>
  );
}

/** Athletes without e-mail: ask the site owner for a one-time code, then set a new password here. */
function AthleteReset() {
  const [who, setWho] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const k = identifierKind(who);
    if (k !== "go" && k !== "dan" && k !== "name") return setError("กรุณากรอกรหัส GO เลขดั้ง หรือชื่อ-นามสกุล");
    const c = code.trim().toLowerCase().replace(/\s+/g, "");
    if (!/^[a-f0-9]{24}$/.test(c)) return setError("รหัสชั่วคราวต้องเป็นตัวอักษร a–f และตัวเลข 24 ตัว ตามที่ผู้ดูแลระบบให้");
    if (pw.length < 8) return setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
    if (pw !== pw2) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    const db = staffDb(); if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    setBusy(true);
    const r = await callAthlete("set-password", { identifier: who, code: c, password: pw });
    if (!r.ok || !r.data?.session) { setBusy(false); return setError(r.data?.message ?? "ตั้งรหัสผ่านไม่สำเร็จ"); }
    setRemember(true);
    await db.auth.setSession(r.data.session);
    window.location.assign("/account");
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormNote tone="info" text="นักกีฬาที่ไม่ได้ใช้อีเมล: ติดต่อผู้ดูแลระบบ (ครูเล็ก) เพื่อขอ “รหัสชั่วคราว” ใช้ได้ครั้งเดียวภายใน 24 ชั่วโมง แล้วตั้งรหัสผ่านใหม่ที่นี่" />
      <Field label="รหัส GO / เลขดั้ง / ชื่อ-นามสกุล" icon="person" value={who} onChange={(e) => setWho(e.target.value)} autoCapitalize="none" spellCheck={false} />
      <Field label="รหัสชั่วคราวจากผู้ดูแลระบบ" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="none" spellCheck={false} autoComplete="one-time-code" placeholder="24 ตัวอักษร" />
      <PasswordField label="รหัสผ่านใหม่" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" hint="อย่างน้อย 8 ตัวอักษร" />
      <PasswordField label="ยืนยันรหัสผ่านใหม่" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
      <FormError text={error} />
      <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-12 w-full items-center justify-center text-lg disabled:opacity-60">{busy ? "กำลังตั้งรหัสผ่าน…" : "ตั้งรหัสผ่านใหม่"}</button>
      <p className="text-center"><Link href="/login" className="font-semibold text-[var(--gt-cta)] hover:underline">← กลับไปหน้าเข้าสู่ระบบ</Link></p>
    </form>
  );
}

function EmailReset() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [limited,setLimited]=useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(busy||sent||limited)return;
    setError("");
    if (!looksLikeEmail(email)) return setError("กรุณากรอกอีเมลที่ใช้สมัคร");
    const db = staffDb();
    if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    setBusy(true);
    const { error: err } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login/reset` });
    setBusy(false);
    // Same answer whether or not the address has an account, so nobody can probe who is registered.
    if(err && /rate.limit|too.many|over.email|429|security.purpose/i.test(err.message)){setLimited(true);return setError("ส่งคำขอหลายครั้งเกินกำหนด ระบบพักการส่งอีเมลชั่วคราว กรุณาใช้อีเมลล่าสุดที่เคยได้รับและรอให้ระบบอนุญาตส่งใหม่ ไม่ต้องกดซ้ำ");}
    if (err && !/not found|no user/i.test(err.message)) return setError(authErrorMessage(err.message));
    setSent(true);
  };

  return (
    <div>
      <p className="text-[var(--gt-muted)]">กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>
      {sent ? (
        <div className="mt-6 space-y-4">
          <FormNote text={`ถ้า ${email.trim()} มีบัญชีอยู่ จะได้รับอีเมลภายในไม่กี่นาที (ตรวจในโฟลเดอร์ Junk/Spam ด้วย) แล้วกดลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่`} />
          <Link href="/login" className="gt-cta-btn flex min-h-12 items-center justify-center">กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <Field label="อีเมล" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" />
          <FormError text={error} />
          <button type="submit" disabled={busy||limited} className="gt-cta-btn flex min-h-12 w-full items-center justify-center text-lg disabled:opacity-60">{busy ? "กำลังส่ง…" : limited ? "ส่งคำขอเกินกำหนด — กรุณารอก่อน" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}</button>
          {limited&&<p className="rounded-lg border border-[#e9c68a] bg-[#fff9eb] p-3 text-sm">หากได้รับอีเมลรีเซ็ตล่าสุดแล้ว ให้เปิดจากอีเมลนั้นได้เลย หากลิงก์เปิดหน้า Vercel Login แทนหน้าตั้งรหัสผ่านของ GO TOURNAMENT แสดงว่าเส้นทางกู้บัญชียังต้องแก้ที่ระบบ ไม่จำเป็นต้องลองส่งซ้ำ</p>}
          <p className="text-center"><Link href="/login" className="font-semibold text-[var(--gt-cta)] hover:underline">← กลับไปหน้าเข้าสู่ระบบ</Link></p>
        </form>
      )}
    </div>
  );
}
