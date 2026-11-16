"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { MEMBER_ROLES } from "@/lib/auth-routing.mjs";

type Me = { email: string; name: string; role: string; institution: string | null; staff: boolean };

/** Signed-in member's page. Linking the account to athlete records comes in the next phase. */
export default function AccountView() {
  const [me, setMe] = useState<Me | null | "out">(null);

  useEffect(() => {
    const db = staffDb();
    if (!db) { queueMicrotask(() => setMe("out")); return; }
    db.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (!u) { setMe("out"); return; }
      const { data: access } = await db.rpc("gt_my_access_v1");
      const meta = (u.user_metadata ?? {}) as Record<string, string | null>;
      setMe({
        email: u.email ?? "", name: meta.display_name || meta.full_name || meta.name || (u.email ?? "").split("@")[0],
        role: meta.member_role ?? "", institution: meta.institution ?? null,
        staff: Boolean(access?.platform_role) || ((access?.organizers ?? []) as { status: string }[]).some((o) => o.status === "active"),
      });
    });
  }, []);

  if (me === null) return <p className="py-16 text-center text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>;
  if (me === "out") {
    return (
      <div className="gt-card space-y-4 p-6 text-center">
        <h1 className="text-2xl font-bold">ยังไม่ได้เข้าสู่ระบบ</h1>
        <Link href="/login?next=/account" className="gt-cta-btn flex min-h-12 items-center justify-center">เข้าสู่ระบบ</Link>
      </div>
    );
  }

  const roleLabel = MEMBER_ROLES.find((r) => r.id === me.role)?.label ?? "สมาชิก";
  const signOut = async () => { await staffDb()?.auth.signOut(); window.location.assign("/"); };
  const next: { title: string; body: string; href?: string; cta?: string }[] = [];
  if (me.staff) next.push({ title: "หน้าผู้จัดการแข่งขัน", body: "จัดการรายการแข่งขัน จับคู่ ลงผล กรรมการ และใบสมัคร", href: "/organizer", cta: "ไปหน้าผู้จัด →" });
  else if (me.role === "organizer") next.push({ title: "รอเปิดสิทธิ์ผู้จัด", body: "แจ้งเจ้าของระบบ GO TOURNAMENT ให้เพิ่มอีเมลนี้เป็นผู้จัด แล้วเข้าสู่ระบบใหม่" });
  if (me.role === "athlete" || me.role === "parent") next.push({ title: "ผูกบัญชีกับรหัสนักกีฬา", body: "เร็ว ๆ นี้: ดูประวัติ สถิติ และใบประกาศของนักกีฬาจากบัญชีนี้ และเข้าสู่ระบบด้วยรหัสนักกีฬาได้" });
  if (me.role === "teacher") next.push({ title: "นักกีฬาในสถาบัน", body: "เร็ว ๆ นี้: ดูรายชื่อและผลการแข่งขันของนักกีฬาในสถาบันของคุณ" });
  next.push({ title: "การแข่งขันทั้งหมด", body: "ดูรายการ สมัครแข่งขัน ติดตามผล", href: "/tournaments", cta: "ดูการแข่งขัน →" });

  return (
    <div className="space-y-4">
      <section className="gt-card p-5">
        <p className="text-sm text-[var(--gt-muted)]">บัญชีของฉัน</p>
        <h1 className="text-2xl font-bold">{me.name}</h1>
        <p className="mt-1 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-[var(--gt-cta)] px-3 py-0.5 font-semibold text-white">{me.staff ? "ผู้จัด / ผู้ดูแลระบบ" : roleLabel}</span>
          {me.institution && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-0.5">{me.institution}</span>}
        </p>
        <p className="mt-2 text-sm text-[var(--gt-muted)]">{me.email}</p>
      </section>
      {next.map((n) => (
        <section key={n.title} className="gt-card p-5">
          <h2 className="font-bold">{n.title}</h2>
          <p className="mt-1 text-sm text-[var(--gt-muted)]">{n.body}</p>
          {n.href && <Link href={n.href} className="gt-cta-btn mt-3 inline-flex min-h-11 items-center px-5">{n.cta}</Link>}
        </section>
      ))}
      <button type="button" onClick={signOut} className="gt-outline-btn min-h-12 w-full font-semibold">ออกจากระบบ</button>
    </div>
  );
}
