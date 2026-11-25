"use client";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";

export default function StaffUsername({ academyName }: { role: "manager" | "teacher" | "admin"; academyName?: string }) {
  const [username, setUsername] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void (async () => {
    const { data } = await staffDb()?.rpc("gt_my_staff_username_v1") ?? { data: null };
    if (typeof data === "string" && data) { setCurrent(data); setUsername(data); }
  })(); }, []);
  const [message, setMessage] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const db = staffDb(); if (!db) return;
    setBusy(true); setMessage("");
    const { data, error } = await db.rpc("gt_set_staff_username_v1", { p_username: username.trim().toLowerCase() });
    setBusy(false);
    if (error || !data?.ok) {
      setMessage(data?.error === "USERNAME_TAKEN" ? "ชื่อผู้ใช้นี้มีผู้ใช้แล้ว" :
        data?.error === "RESERVED" ? "ชื่อ GOMASTER ใช้ได้เฉพาะเจ้าของสถาบัน GO MASTER" :
        data?.error === "NO_ACCESS" ? "บัญชีนี้ยังรออนุมัติสิทธิ์สถาบัน จึงยังตั้งชื่อผู้ใช้ไม่ได้" :
        data?.error === "USERNAME_FORMAT" ? "ใช้ภาษาอังกฤษ 4–32 ตัว เริ่มด้วยตัวอักษรและใช้ตัวเลขได้" :
        "บันทึกไม่ได้ กรุณาตรวจสอบสิทธิ์บัญชี"); return;
    }
    setCurrent(data.username);
    setMessage(`ตั้งชื่อผู้ใช้ ${data.username} สำเร็จ · ครั้งถัดไปเข้าเว็บด้วยชื่อนี้และรหัสผ่านเดิมได้เลย`);
  }
  return (
    <form onSubmit={save} className="gt-card space-y-3 border-2 border-[var(--gt-line)] p-4 sm:p-5">
      <h2 className="text-lg font-bold">ตั้งชื่อผู้ใช้เพิ่มเติม (ไม่บังคับ)</h2>
      <p className="text-sm text-[var(--gt-muted)]">เข้าสู่ระบบด้วยชื่อสถาบันและรหัสผ่านได้อยู่แล้ว หากต้องการชื่อเรียกสั้น ๆ ส่วนตัวจึงค่อยตั้งที่นี่</p>
      <p className="text-sm font-semibold">{current ? <>ชื่อผู้ใช้ปัจจุบันของบัญชีนี้: <span className="text-[#0b4f9e]">{current}</span></> : "บัญชีนี้ยังไม่ได้ตั้งชื่อผู้ใช้"}{academyName ? ` · ${academyName}` : ""}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="staff-username">ชื่อผู้ใช้ภาษาอังกฤษ</label>
        <input id="staff-username" className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3"
          value={username} onChange={e=>setUsername(e.target.value)} maxLength={32} placeholder="เช่น GM-CHAN" required pattern="[a-zA-Z][a-zA-Z0-9_-]{3,31}" autoComplete="off"/>
        <button type="submit" className="gt-cta-btn min-h-12 px-5 disabled:opacity-50" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึกชื่อผู้ใช้"}</button>
      </div>
      {message && <p role="status" className="text-sm">{message}</p>}
      <p className="text-xs text-[var(--gt-muted)]">ชื่อผู้ใช้ไม่ใช่รหัสผ่าน โปรดตั้งรหัสผ่านส่วนตัวที่ปลอดภัย และเก็บอีเมลที่ยืนยันแล้วไว้สำหรับกู้คืนบัญชี</p>
    </form>
  );
}
