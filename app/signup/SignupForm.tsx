"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { setRemember, staffDb } from "@/app/organizer/_lib/staff";
import { MEMBER_ROLES, authErrorMessage, destinationFor, looksLikeEmail } from "@/lib/auth-routing.mjs";
import { Field, FormError, FormNote, PasswordField, inputCls } from "@/app/login/_ui/fields";
import AthleteSignup from "./AthleteSignup";

/** Member sign-up: name, role, institution, e-mail, password. Organiser rights are granted separately by the site owner. */
export default function SignupForm() {
  const [kind, setKind] = useState<"athlete" | "email" | "institution">("athlete");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("type") === "institution") setKind("institution"); }, []);
  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">สมัครสมาชิก</h1>
      <p className="mt-1 text-[var(--gt-muted)]">สร้างบัญชี GO TOURNAMENT</p>
      <div role="tablist" aria-label="วิธีสมัคร" className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-1">
        {([["athlete", "นักกีฬา (ไม่ใช้อีเมล)"], ["email", "สมัครด้วยอีเมล"], ["institution", "ครู / สถาบัน"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={`min-h-11 rounded-xl px-2 text-[15px] font-semibold ${kind === k ? "bg-[var(--gt-cta)] text-white" : "text-[var(--gt-ink)]"}`}>{l}</button>
        ))}
      </div>
      <p className="mt-2 text-sm text-[var(--gt-muted)]">{kind === "athlete" ? "นักกีฬาที่มีชื่อในทะเบียน: ยืนยันด้วยชื่อ-นามสกุล แล้วตั้งรหัสผ่าน" : kind === "institution" ? "บัญชีครูหรือเจ้าของสถาบัน: ใช้ชื่อจริงของผู้ดูแล ไม่ใช้ชื่อสถาบันแทนชื่อ-นามสกุล · เลือก GO MASTER ในช่องสถาบัน" : "ผู้ปกครอง ครูสถาบัน ผู้จัดการแข่งขัน"}</p>
      <div className="mt-5">{kind === "athlete" ? <AthleteSignup /> : <EmailSignup key={kind} academy={kind === "institution"} />}</div>
      <p className="mt-6 text-center">มีบัญชีแล้ว? <Link href="/login" className="font-bold text-[var(--gt-cta)] hover:underline">เข้าสู่ระบบ</Link></p>
    </div>
  );
}

function EmailSignup({ academy = false }: { academy?: boolean }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState(academy ? "teacher" : "");
  const [inst, setInst] = useState(academy ? "GO MASTER" : "");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkMail, setCheckMail] = useState("");
  const [completed, setCompleted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const n = name.replace(/\s+/g, " ").trim();
    if (n.length < 3 || !n.includes(" ")) return setError("กรุณากรอกชื่อและนามสกุล (เว้นวรรคระหว่างชื่อกับนามสกุล)");
    if (!role) return setError("กรุณาเลือกประเภทผู้ใช้");
    if (!looksLikeEmail(email)) return setError("กรุณากรอกอีเมลให้ถูกต้อง");
    if (pw.length < 8) return setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if (pw !== pw2) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    if (!agree) return setError("กรุณายอมรับเงื่อนไขการใช้ข้อมูลก่อนสมัคร");
    const db = staffDb();
    if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    setBusy(true);
    try {
      setRemember(true);
      const { data, error: err } = await db.auth.signUp({
        email: email.trim(), password: pw,
        options: {
          emailRedirectTo: `${window.location.origin}/login/continue`,
          data: { display_name: n, member_role: role, institution: inst.trim() || null },
        },
      });
      if (err) return setError(authErrorMessage(err.message));
      if (!data.session) { setCheckMail(email.trim()); return; }   // e-mail confirmation is switched on
      setCompleted(true);
    } catch (x) {
      setError(authErrorMessage(x instanceof Error ? x.message : ""));
    } finally {
      setBusy(false);
    }
  };

  if (completed) return <div className="space-y-4 rounded-2xl border-2 border-[var(--gt-ok)] bg-[var(--gt-surface)] p-5" role="status"><h2 className="text-2xl font-bold text-[var(--gt-ok)]">✓ สมัครสมาชิกเรียบร้อยแล้ว</h2><p>สร้างบัญชีผู้ใช้งานสำเร็จแล้ว หากเป็นผู้ดูแลสถาบัน ให้เข้าสู่หน้าสถาบันเพื่อขอผูกสิทธิ์ GO MASTER ต่อไป</p><Link href="/institution" className="gt-cta-btn flex min-h-12 items-center justify-center">เข้าสู่หน้าสถาบัน</Link></div>;

  if (checkMail) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-[var(--gt-cta)]">✓ รับคำขอสมัครสมาชิกแล้ว</h2>
        <FormNote text={`หากเป็นอีเมลใหม่ ระบบจะส่งลิงก์ยืนยันไปที่ ${checkMail} · ตรวจกล่องจดหมายและ Junk/Spam ก่อนเข้าสู่ระบบ การสมัครบัญชียังไม่ใช่การอนุมัติสิทธิ์ GO MASTER`} />
        <Link href="/login?next=/institution" className="gt-cta-btn flex min-h-12 items-center justify-center">ยืนยันอีเมลแล้ว ไปหน้าเข้าสู่ระบบสถาบัน</Link>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={submit} noValidate className="space-y-4">
        {academy && <p className="rounded-xl border border-[var(--gt-line)] bg-[var(--gt-cta-soft)] p-3 text-sm">สมัครบัญชีผู้ดูแลสถาบัน GO MASTER: กรอกชื่อ–นามสกุลของผู้ใช้งานจริง และใช้อีเมลเพียงครั้งแรกสำหรับยืนยันและกู้คืนบัญชี หลังได้รับสิทธิ์จึงตั้งชื่อผู้ใช้ GOMASTER ได้</p>}
        <Field label="ชื่อ-นามสกุล" icon="person" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ นามสกุล" autoComplete="name" maxLength={120} />
        <label className="block">
          <span className="font-semibold">ประเภทผู้ใช้</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={`${inputCls} mt-1.5 px-3.5`}>
            <option value="">เลือกประเภทผู้ใช้</option>
            {MEMBER_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          {role === "organizer" && <span className="mt-1 block text-xs text-[var(--gt-muted)]">สิทธิ์ผู้จัดเปิดให้โดยเจ้าของระบบหลังสมัคร</span>}
        </label>
        <Field label="ชมรม / สถาบัน (ถ้ามี)" value={inst} onChange={(e) => setInst(e.target.value)} placeholder="ชื่อชมรม หรือสถาบันสอนหมากล้อม" maxLength={120} />
        <Field label="อีเมล" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" />
        <PasswordField label="รหัสผ่าน" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" hint="อย่างน้อย 8 ตัวอักษร" />
        <PasswordField label="ยืนยันรหัสผ่าน" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gt-cta)]" />
          <span>ยินยอมให้ GO TOURNAMENT เก็บชื่อ อีเมล และข้อมูลที่กรอกเพื่อใช้ในการแข่งขัน ข้อมูลติดต่อจะไม่แสดงต่อสาธารณะ · กรณีอายุต่ำกว่า 18 ปี ผู้ปกครองเป็นผู้สมัครแทน</span>
        </label>
        <FormError text={error} />
        <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-12 w-full items-center justify-center text-lg disabled:opacity-60">{busy ? "กำลังสมัคร…" : "สมัครสมาชิก"}</button>
      </form>
    </div>
  );
}
