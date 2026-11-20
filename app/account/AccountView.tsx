"use client";

import ChooseAcademy from "@/components/ChooseAcademy";
import Link from "next/link";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { MEMBER_ROLES } from "@/lib/auth-routing.mjs";
import { KIND_LABEL } from "@/lib/easy-auth.mjs";
import Welcome from "@/app/login/_ui/Welcome";
import { RefereeEvents, type RefEvent } from "./RefereeEvents";

type Easy = { kind: string; name: string; using_default: boolean; has_recovery: boolean } | null;
type Me = { email: string; name: string; role: string; institution: string | null; staff: boolean; academies: number; easy: Easy; referee: RefEvent[]; events: { id: string; title: string }[]; athlete: { id: string; go_id: string; name: string; rank: string | null; has_profile: boolean } | null };

/** Signed-in member's page: role, GO ID for athletes, and where to go next. */
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
        email: u.email ?? "", name: access?.easy?.name || meta.display_name || meta.full_name || meta.name || (u.email ?? "").split("@")[0],
        easy: access?.easy ?? null, referee: access?.referee ?? [], events: access?.events ?? [],
        role: meta.member_role ?? "", institution: meta.institution ?? null,
        staff: Boolean(access?.platform_role) || ((access?.organizers ?? []) as { status: string }[]).some((o) => o.status === "active") || (access?.events ?? []).length > 0,
        academies: ((access?.academies ?? []) as unknown[]).length,
        athlete: access?.athlete ?? null,
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

  const roleLabel = (me.easy && (KIND_LABEL as Record<string, string>)[me.easy.kind]) || MEMBER_ROLES.find((r) => r.id === me.role)?.label || "สมาชิก";
  const canResetOthers = me.staff || me.academies > 0;
  const signOut = async () => { await staffDb()?.auth.signOut(); window.location.assign("/"); };
  const next: { title: string; body: string; href?: string; cta?: string }[] = [];
  if (me.athlete) next.push({ title: "รูปโปรไฟล์", body: "เปลี่ยนรูปและครอปรูปของคุณเอง รูปจะแสดงในผังคู่ ผลแข่ง โปรไฟล์ และทำเนียบนักกีฬา", href: "/account/photo", cta: "เปลี่ยนรูปโปรไฟล์ →" });
  if (me.athlete) next.push({ title: `รหัส GO ของคุณ: ${me.athlete.go_id}`, body: `ใช้รหัส GO (หรือเลขดั้ง / ชื่อ-นามสกุล) + รหัสผ่าน เพื่อเข้าสู่ระบบครั้งต่อไป · ${me.athlete.has_profile ? "ดูประวัติ สถิติ และใบประกาศได้ที่โปรไฟล์" : "โปรไฟล์ (ประวัติ สถิติ ใบประกาศ) จะเปิดเมื่อลงแข่งรายการแรกในระบบนี้"}`, href: me.athlete.has_profile ? `/athletes/${me.athlete.id}` : undefined, cta: "ดูโปรไฟล์ของฉัน →" });
  if (me.staff) next.push({ title: "หน้าผู้จัดการแข่งขัน", body: "จัดการรายการแข่งขัน จับคู่ ลงผล กรรมการ และใบสมัคร", href: "/organizer", cta: "ไปหน้าผู้จัด →" });
  else if (me.role === "organizer") next.push({ title: "รอเปิดสิทธิ์ผู้จัด", body: "แจ้งเจ้าของระบบ GO TOURNAMENT ให้เพิ่มอีเมลนี้เป็นผู้จัด แล้วเข้าสู่ระบบใหม่" });
  if (!me.athlete && (me.role === "athlete" || me.role === "parent")) next.push({ title: "ผูกบัญชีกับรหัสนักกีฬา", body: "เร็ว ๆ นี้: ดูประวัติ สถิติ และใบประกาศของนักกีฬาจากบัญชีนี้ และเข้าสู่ระบบด้วยรหัสนักกีฬาได้" });
  if (me.academies || me.role === "teacher") next.push({ title: "หน้าสถาบัน", body: "ดูแลนักเรียน ติดตามผล สถิติ และสมัครแข่งแบบกลุ่ม", href: "/institution", cta: me.academies ? "ไปหน้าสถาบัน →" : "เลือกสถาบันของคุณ →" });
  next.push({ title: "ส่งผลการแข่งขันรายการอื่น", body: "แนบใบจับคู่ทุกรอบและผลอันดับของทุกรุ่น ผลจะขึ้นในสถิติของนักกีฬาหลังแอดมินตรวจ", href: "/results/submit", cta: "ส่งผลการแข่งขัน →" });
  next.push({ title: "การแข่งขันทั้งหมด", body: "ดูรายการ สมัครแข่งขัน ติดตามผล", href: "/tournaments", cta: "ดูการแข่งขัน →" });

  return (
    <div className="space-y-4">
      <section className="gt-card p-5">
        <p className="text-sm text-[var(--gt-muted)]">บัญชีของฉัน</p>
        <h1 className="text-2xl font-bold">{me.name}</h1>
        <p className="mt-1 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-[var(--gt-cta)] px-3 py-0.5 font-semibold text-white">{me.easy ? roleLabel : me.staff ? "ผู้จัด / ผู้ดูแลระบบ" : roleLabel}</span>
          {me.referee.length > 0 && me.easy?.kind !== "referee" && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-0.5">กรรมการ</span>}
          {me.events.length > 0 && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-0.5">แอดมินจับคู่ประจำงาน</span>}
          {me.institution && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-0.5">{me.institution}</span>}
        </p>
        {!/@(athlete|easy)\.go-tournament\.invalid$/.test(me.email) && <p className="mt-2 text-sm text-[var(--gt-muted)]">{me.email}</p>}
      </section>
      {me.referee.length > 0 && <RefereeEvents events={me.referee} />}
      {me.easy?.using_default && (
        <p className="rounded-xl border border-[#e9c68a] bg-[#fff9eb] p-3 text-sm">ยังใช้รหัสเริ่มต้นอยู่ · เปลี่ยนรหัสได้ที่ “รหัสผ่านและการกู้บัญชี” ด้านล่าง (ไม่บังคับ)</p>
      )}
      {next.map((n) => (
        <section key={n.title} className="gt-card p-5">
          <h2 className="font-bold">{n.title}</h2>
          <p className="mt-1 text-sm text-[var(--gt-muted)]">{n.body}</p>
          {n.href && <Link href={n.href} className="gt-cta-btn mt-3 inline-flex min-h-11 items-center px-5">{n.cta}</Link>}
        </section>
      ))}
      <section className="gt-card p-5">
        <h2 className="font-bold">สถานะการสมัคร</h2>
        <p className="mt-1 text-sm text-[var(--gt-muted)]">ใบสมัครแข่งขันในบัญชีนี้ · ขอถอนตัว เปลี่ยนคน หรือเปลี่ยนรุ่นตามเงื่อนไขของผู้จัด</p>
        <Link href="/my-applications" className="gt-outline-btn mt-3 inline-flex min-h-11 items-center px-5 font-semibold">ดูสถานะการสมัคร</Link>
      </section>
      {me.easy && (
        <section className="gt-card p-5">
          <h2 className="font-bold">รหัสผ่านและการกู้บัญชี</h2>
          <p className="mt-1 text-sm text-[var(--gt-muted)]">เปลี่ยนรหัสผ่าน และบันทึกเบอร์โทร + วันเกิด ไว้ตั้งรหัสใหม่เองเมื่อลืม</p>
          <div className="mt-3"><Welcome inline who={{ role_label: roleLabel, name: me.name, has_recovery: me.easy.has_recovery }} onDone={() => {}} /></div>
        </section>
      )}
      {canResetOthers && (
        <section className="gt-card p-5">
          <h2 className="font-bold">รีเซ็ตรหัสให้นักเรียน / ครู</h2>
          <p className="mt-1 text-sm text-[var(--gt-muted)]">นักเรียนหรือครูในสถาบันลืมรหัส กดรีเซ็ตกลับเป็นรหัสเริ่มต้นได้ทันที ไม่ต้องรอแอดมิน</p>
          <Link href="/account/reset" className="gt-outline-btn mt-3 inline-flex min-h-11 items-center px-5 font-semibold">รีเซ็ตรหัสผ่าน →</Link>
        </section>
      )}
      <button type="button" onClick={signOut} className="gt-outline-btn min-h-12 w-full font-semibold">ออกจากระบบ</button>
      <ChooseAcademy/>
    </div>
  );
}
