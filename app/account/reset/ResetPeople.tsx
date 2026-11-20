"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { KIND_LABEL, callEasy } from "@/lib/easy-auth.mjs";

type Person = { user_id: string; name: string; kind: string };

/**
 * Teachers reset their students, institution owners reset their teachers and students, the owner resets anyone.
 * The password goes back to the role's default; the person signs in with it and may set a new one.
 */
export default function ResetPeople() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Person[] | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { queueMicrotask(() => setList(null)); return; }
    const t = setTimeout(async () => {
      const { data, error: err } = await staffDb()!.rpc("gt_my_resettable_people_v1", { p_query: term });
      if (err) { setError("กรุณาเข้าสู่ระบบก่อน"); return; }
      setError(""); setList((data ?? []) as Person[]);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const reset = async (p: Person) => {
    if (!window.confirm(`รีเซ็ตรหัสผ่านของ ${p.name} กลับเป็นรหัสเริ่มต้นของ${(KIND_LABEL as Record<string, string>)[p.kind] ?? ""}?`)) return;
    setBusy(p.user_id); setError("");
    const { data } = await staffDb()!.auth.getSession();
    const r = await callEasy("reset", { target_user: p.user_id }, { accessToken: data.session?.access_token });
    setBusy("");
    if (!r.ok) { setError(r.data?.message ?? "รีเซ็ตไม่สำเร็จ"); return; }
    setDone((d) => ({ ...d, [p.user_id]: `รีเซ็ตแล้ว · แจ้ง ${p.name} ให้เข้าด้วยรหัสเริ่มต้นของ${r.data.role_label}` }));
  };

  return (
    <div className="space-y-4">
      <section className="gt-card p-5">
        <h1 className="text-2xl font-bold">รีเซ็ตรหัสผ่านให้นักเรียน / ครู</h1>
        <p className="mt-1 text-sm text-[var(--gt-muted)]">ค้นชื่อ แล้วกด “รีเซ็ต” รหัสจะกลับเป็นรหัสเริ่มต้นของตำแหน่งนั้น · ครูรีเซ็ตได้เฉพาะนักเรียนของตัวเอง · เจ้าของสถาบันรีเซ็ตครูและนักเรียนในสถาบันได้</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ชื่ออย่างน้อย 2 ตัวอักษร"
          className="mt-3 block min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3.5 text-[17px] outline-none focus:border-[var(--gt-cta)]" />
        {error && <p role="alert" className="mt-2 text-sm text-[var(--gt-bad)]">{error}</p>}
      </section>
      {list && list.length === 0 && <p className="text-center text-[var(--gt-muted)]">ไม่พบชื่อที่คุณรีเซ็ตได้ (ต้องเป็นนักเรียนหรือครูของคุณ และเคยเข้าระบบแล้ว)</p>}
      {list?.map((p) => (
        <div key={p.user_id} className="gt-card flex flex-wrap items-center justify-between gap-2 p-4">
          <span><b>{p.name}</b><span className="block text-sm text-[var(--gt-muted)]">{(KIND_LABEL as Record<string, string>)[p.kind] ?? p.kind}</span></span>
          {done[p.user_id]
            ? <span className="text-sm font-semibold text-[var(--gt-cta)]">{done[p.user_id]}</span>
            : <button type="button" onClick={() => reset(p)} disabled={!!busy} className="gt-outline-btn min-h-11 px-4 font-semibold disabled:opacity-60">{busy === p.user_id ? "กำลังรีเซ็ต…" : "รีเซ็ต"}</button>}
        </div>
      ))}
      <p className="text-center"><Link href="/account" className="font-semibold text-[var(--gt-cta)] hover:underline">← บัญชีของฉัน</Link></p>
    </div>
  );
}
