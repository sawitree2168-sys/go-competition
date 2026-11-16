"use client";

import Link from "next/link";
import { useState } from "react";
import { setRemember, staffDb } from "@/app/organizer/_lib/staff";
import { authErrorMessage } from "@/lib/auth-routing.mjs";
import { callAthlete, identifierKind } from "@/lib/athlete-auth.mjs";
import { Field, FormError, FormNote, PasswordField } from "@/app/login/_ui/fields";

type Found = { go_id: string; full_name: string; rank: string | null; dan: boolean; has_password: boolean };

/**
 * Athlete sign-up without e-mail: find yourself in the site owner's register by full name (or GO ID),
 * dan players confirm their dan number, then set a password. Sign-in afterwards with GO ID / dan number / name.
 */
export default function AthleteSignup() {
  const [who, setWho] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [dan, setDan] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ go_id: string; full_name: string } | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setFound(null);
    const k = identifierKind(who);
    if (k !== "name" && k !== "go") return setError("กรุณากรอกชื่อและนามสกุล (เว้นวรรค) หรือรหัส GO");
    setBusy(true);
    const r = await callAthlete("search", k === "go" ? { identifier: who } : { name: who.replace(/\s+/g, " ").trim() });
    setBusy(false);
    if (!r.ok) return setError(r.data?.message ?? "ค้นหาไม่สำเร็จ");
    const list = (r.data?.athletes ?? []) as Found[];
    if (!list.length) return setError("ไม่พบชื่อนี้ในทะเบียนนักกีฬา ตรวจการสะกดชื่อ-นามสกุลให้ตรงกับที่ใช้สมัครแข่ง หรือติดต่อผู้ดูแลระบบ");
    if (list.length > 1) return setError("มีชื่อนี้มากกว่า 1 คน กรุณากรอกรหัส GO แทนชื่อ");
    setFound(list[0]);
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!found) return;
    setError("");
    if (found.dan && !dan.trim()) return setError("กรุณากรอกเลขทะเบียนดั้ง");
    if (pw.length < 8) return setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if (pw !== pw2) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    if (!agree) return setError("กรุณายืนยันว่าเป็นนักกีฬาคนนี้ (หรือผู้ปกครอง)");
    const db = staffDb();
    if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    setBusy(true);
    const r = await callAthlete("register", { identifier: found.go_id, dan_number: dan, password: pw, confirm_password: pw2, confirmed: true });
    if (!r.ok || !r.data?.session) { setBusy(false); return setError(r.data?.message ?? "สมัครไม่สำเร็จ"); }
    setRemember(true);
    const { error: err } = await db.auth.setSession(r.data.session);
    setBusy(false);
    if (err) return setError(authErrorMessage(err.message));
    setDone({ go_id: r.data.go_id, full_name: r.data.full_name ?? found.full_name });
  };

  if (done) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">สมัครสำเร็จ</h2>
        <FormNote text={`ยินดีต้อนรับ ${done.full_name}`} />
        <div className="rounded-2xl border-2 border-[var(--gt-cta)] bg-[var(--gt-cta-soft)] p-4 text-center">
          <p className="text-sm text-[var(--gt-muted)]">รหัส GO ของคุณ (ใช้เข้าสู่ระบบ)</p>
          <p className="gt-num mt-1 text-3xl font-bold tracking-wide text-[var(--gt-cta)]">{done.go_id}</p>
          <p className="mt-2 text-sm">ครั้งต่อไปเข้าสู่ระบบด้วย รหัส GO{found?.dan ? " หรือเลขดั้ง" : ""} หรือชื่อ-นามสกุล + รหัสผ่านที่เพิ่งตั้ง</p>
        </div>
        <Link href="/account" className="gt-cta-btn flex min-h-12 items-center justify-center">ไปหน้าบัญชีของฉัน</Link>
      </div>
    );
  }

  return (
    <div>
      {!found ? (
        <form onSubmit={search} noValidate className="space-y-4">
          <Field label="ชื่อ-นามสกุล หรือ รหัส GO" icon="person" value={who} onChange={(e) => setWho(e.target.value)} placeholder="เช่น ธนวัฒน์ ศรีสุข หรือ GO106260826"
            hint="ใช้ชื่อ-นามสกุลเดียวกับที่ใช้สมัครแข่งขัน" autoComplete="name" maxLength={120} />
          <FormError text={error} />
          <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-12 w-full items-center justify-center text-lg disabled:opacity-60">{busy ? "กำลังค้นหา…" : "ค้นหาชื่อในทะเบียน"}</button>
        </form>
      ) : (
        <form onSubmit={register} noValidate className="space-y-4">
          <div className="rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] p-4">
            <p className="text-sm text-[var(--gt-muted)]">พบในทะเบียน</p>
            <p className="text-xl font-bold">{found.full_name}</p>
            <p className="text-sm">รหัส GO <span className="gt-num font-semibold">{found.go_id}</span>{found.rank ? ` · ${found.rank}` : ""}</p>
            <button type="button" onClick={() => { setFound(null); setError(""); }} className="mt-1 text-sm text-[var(--gt-cta)] underline">ไม่ใช่ฉัน / ค้นหาใหม่</button>
          </div>
          {found.has_password ? (
            <>
              <FormNote tone="info" text="นักกีฬาคนนี้มีบัญชีแล้ว ให้เข้าสู่ระบบด้วยรหัส GO และรหัสผ่าน · ถ้าลืมรหัสผ่านหรือไม่ได้สมัครเอง กรุณาติดต่อผู้ดูแลระบบเพื่อขอรหัสตั้งรหัสผ่านใหม่" />
              <Link href="/login" className="gt-cta-btn flex min-h-12 items-center justify-center">ไปหน้าเข้าสู่ระบบ</Link>
            </>
          ) : (
            <>
              {found.dan && <Field label="เลขทะเบียนดั้ง" value={dan} onChange={(e) => setDan(e.target.value)} inputMode="numeric" placeholder="เลขทะเบียนดั้งของคุณ" hint="นักกีฬาระดับดั้งยืนยันตัวด้วยเลขทะเบียนดั้ง" />}
              <PasswordField label="ตั้งรหัสผ่าน" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" hint="อย่างน้อย 8 ตัวอักษร" />
              <PasswordField label="ยืนยันรหัสผ่าน" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
              <label className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gt-cta)]" />
                <span>ฉันคือนักกีฬาคนนี้ หรือผู้ปกครองของนักกีฬา (กรณีอายุต่ำกว่า 18 ปี) · การสมัครแทนผู้อื่นทำให้บัญชีถูกระงับ</span>
              </label>
              <FormError text={error} />
              <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-12 w-full items-center justify-center text-lg disabled:opacity-60">{busy ? "กำลังสร้างบัญชี…" : "สร้างบัญชีนักกีฬา"}</button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
