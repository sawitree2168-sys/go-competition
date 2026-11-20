"use client";
import { useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";

export default function ChangeInstitutionPassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  async function update(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(""); setResult("");
    if (next.length < 10) return setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 10 ตัวอักษร");
    if (next === "123456" || /^\d{6}$/.test(next)) return setError("เพื่อความปลอดภัย โปรดตั้งรหัสที่คาดเดายากกว่าเลข 6 หลัก");
    if (next !== confirm) return setError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
    if (current === next) return setError("รหัสผ่านใหม่ต้องต่างจากรหัสผ่านเดิม");
    const db = staffDb();
    if (!db) return setError("ระบบไม่พร้อมใช้งาน");
    setBusy(true);
    try {
      const { data: user } = await db.auth.getUser();
      const email = user.user?.email;
      if (!email) throw Error("ไม่พบบัญชีที่ยืนยันแล้ว");
      const { error: verifyError } = await db.auth.signInWithPassword({email, password: current});
      if (verifyError) throw Error("รหัสผ่านปัจจุบันไม่ถูกต้อง");
      const { error: changeError } = await db.auth.updateUser({password: next});
      if (changeError) throw Error("เปลี่ยนรหัสผ่านไม่ได้ กรุณาลองอีกครั้ง");
      setCurrent(""); setNext(""); setConfirm("");
      setResult("เปลี่ยนรหัสผ่านสำเร็จแล้ว ครั้งถัดไปใช้ชื่อผู้ใช้เดิมกับรหัสผ่านใหม่ได้เลย");
    } catch(err) {
      setError(err instanceof Error ? err.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {setBusy(false);}
  }
  return <form onSubmit={update} className="space-y-3 rounded-xl border-2 border-[#b7cae6] bg-white p-4">
    <h3 className="text-lg font-bold text-[#12396c]">เปลี่ยนรหัสผ่าน</h3>
    <p className="text-sm text-[#4e6282]">แต่ละบัญชีตั้งรหัสผ่านของตัวเองได้ เพื่อป้องกันผู้อื่นเข้าดูข้อมูลนักกีฬา</p>
    <label className="block text-sm font-semibold">รหัสผ่านปัจจุบัน
      <input type="password" autoComplete="current-password" required value={current} onChange={e=>setCurrent(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-[#a9c3e5] px-3"/>
    </label>
    <label className="block text-sm font-semibold">รหัสผ่านใหม่ (อย่างน้อย 10 ตัว)
      <input type="password" autoComplete="new-password" required minLength={10} value={next} onChange={e=>setNext(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-[#a9c3e5] px-3"/>
    </label>
    <label className="block text-sm font-semibold">ยืนยันรหัสผ่านใหม่
      <input type="password" autoComplete="new-password" required minLength={10} value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-[#a9c3e5] px-3"/>
    </label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {result && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{result}</p>}
    <button type="submit" disabled={busy} className="gt-cta-btn min-h-12 w-full px-4 disabled:opacity-50">{busy?"กำลังบันทึก…":"ยืนยันเปลี่ยนรหัสผ่าน"}</button>
  </form>;
}
