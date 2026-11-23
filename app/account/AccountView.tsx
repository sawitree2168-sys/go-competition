"use client";

import ChooseAcademy from "@/components/ChooseAcademy";
import AthleteAvatar from "@/components/AthleteAvatar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { MEMBER_ROLES } from "@/lib/auth-routing.mjs";
import { KIND_LABEL } from "@/lib/easy-auth.mjs";
import Welcome from "@/app/login/_ui/Welcome";
import { RefereeEvents, type RefEvent } from "./RefereeEvents";
import type { HistoryStats } from "@/lib/central-history";

type Easy = { kind: string; name: string; using_default: boolean; has_recovery: boolean } | null;
type Athlete = { id: string; go_id: string; name: string; rank: string | null; has_profile: boolean };
type Me = { email: string; name: string; role: string; institution: string | null; staff: boolean; academies: number; easy: Easy; referee: RefEvent[]; events: { id: string; title: string }[]; athlete: Athlete | null };
type AthleteDetails = { athleteId: string; photo: string | null; rank: string | null; history: HistoryStats | null };
type DisplayLevel = { dan: boolean; dan_rank: string | null; kyu: number | null };

/** Signed-in member's page: role, GO ID for athletes, and where to go next. */
export default function AccountView() {
  const [me, setMe] = useState<Me | null | "out">(null);
  const [details, setDetails] = useState<AthleteDetails | null>(null);

  useEffect(() => {
    const db = staffDb();
    if (!db) { queueMicrotask(() => setMe("out")); return; }
    let active = true;
    db.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const u = data.session?.user;
      if (!u) { setMe("out"); return; }
      const { data: access } = await db.rpc("gt_my_access_v1");
      if (!active) return;
      const meta = (u.user_metadata ?? {}) as Record<string, string | null>;
      const athlete: Athlete | null = access?.athlete ?? null;
      setMe({
        email: u.email ?? "", name: access?.easy?.name || meta.display_name || meta.full_name || meta.name || (u.email ?? "").split("@")[0],
        easy: access?.easy ?? null, referee: access?.referee ?? [], events: access?.events ?? [],
        role: meta.member_role ?? "", institution: meta.institution ?? null,
        staff: Boolean(access?.platform_role) || ((access?.organizers ?? []) as { status: string }[]).some((o) => o.status === "active") || (access?.events ?? []).length > 0,
        academies: ((access?.academies ?? []) as unknown[]).length,
        athlete,
      });
      if (!athlete) return;
      const [photo, level, history] = await Promise.all([
        db.rpc("gt_my_photo_v1"),
        db.rpc("gt_my_level_v1"),
        db.rpc("gt_history_stats_v1", { p_go_ids: [athlete.go_id], p_year: 2026 }),
      ]);
      const lv = level.data as DisplayLevel | null;
      if (active) setDetails({
        athleteId: athlete.id,
        photo: photo.data?.athlete_id === athlete.id ? photo.data.photo : null,
        rank: lv?.dan ? lv.dan_rank : lv?.kyu != null ? `${lv.kyu} คิว` : null,
        history: history.data?.[athlete.go_id] ?? null,
      });
    });
    return () => { active = false; };
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
  if (me.staff) next.push({ title: "หน้าผู้จัดการแข่งขัน", body: "จัดการรายการแข่งขัน จับคู่ ลงผล กรรมการ และใบสมัคร", href: "/organizer", cta: "ไปหน้าผู้จัด →" });
  else if (me.role === "organizer") next.push({ title: "รอเปิดสิทธิ์ผู้จัด", body: "แจ้งเจ้าของระบบ GO TOURNAMENT ให้เพิ่มอีเมลนี้เป็นผู้จัด แล้วเข้าสู่ระบบใหม่" });
  if (!me.athlete && (me.role === "athlete" || me.role === "parent")) next.push({ title: "ผูกบัญชีกับรหัสนักกีฬา", body: "เร็ว ๆ นี้: ดูประวัติ สถิติ และใบประกาศของนักกีฬาจากบัญชีนี้ และเข้าสู่ระบบด้วยรหัสนักกีฬาได้" });
  if (me.academies || me.role === "teacher") next.push({ title: "หน้าสถาบัน", body: "ดูแลนักเรียน ติดตามผล สถิติ และสมัครแข่งแบบกลุ่ม", href: "/institution", cta: me.academies ? "ไปหน้าสถาบัน →" : "เลือกสถาบันของคุณ →" });
  if (!me.athlete) {
    next.push({ title: "ส่งผลการแข่งขันรายการอื่น", body: "แนบใบจับคู่ทุกรอบและผลอันดับของทุกรุ่น ผลจะขึ้นในสถิติของนักกีฬาหลังแอดมินตรวจ", href: "/results/submit", cta: "ส่งผลการแข่งขัน →" });
    next.push({ title: "การแข่งขันทั้งหมด", body: "ดูรายการ สมัครแข่งขัน ติดตามผล", href: "/tournaments", cta: "ดูการแข่งขัน →" });
  }

  const recovery = me.easy && <Welcome inline who={{ role_label: roleLabel, name: me.name, has_recovery: me.easy.has_recovery }} onDone={() => {}} />;
  const displayEmail = /@(athlete|easy)\.go-tournament\.invalid$/.test(me.email) ? "" : me.email;

  return (
    <div className="space-y-4">
      {me.athlete ? (
        <MyAthleteProfile athlete={me.athlete} details={details?.athleteId === me.athlete.id ? details : null}>
          {me.referee.length > 0 && me.easy?.kind !== "referee" && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-1">กรรมการ</span>}
          {me.events.length > 0 && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-1">แอดมินจับคู่ประจำงาน</span>}
          {me.institution && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-1">{me.institution}</span>}
        </MyAthleteProfile>
      ) : <section className="gt-card p-5">
        <p className="text-sm text-[var(--gt-muted)]">บัญชีของฉัน</p>
        <h1 className="text-2xl font-bold">{me.name}</h1>
        <p className="mt-1 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-[var(--gt-cta)] px-3 py-0.5 font-semibold text-white">{me.easy ? roleLabel : me.staff ? "ผู้จัด / ผู้ดูแลระบบ" : roleLabel}</span>
          {me.referee.length > 0 && me.easy?.kind !== "referee" && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-0.5">กรรมการ</span>}
          {me.events.length > 0 && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-0.5">แอดมินจับคู่ประจำงาน</span>}
          {me.institution && <span className="rounded-full bg-[var(--gt-cta-soft)] px-3 py-0.5">{me.institution}</span>}
        </p>
        {displayEmail && <p className="mt-2 text-sm text-[var(--gt-muted)]">{displayEmail}</p>}
      </section>}
      {me.referee.length > 0 && <RefereeEvents events={me.referee} />}
      {!me.athlete && me.easy?.using_default && (
        <p className="rounded-xl border border-[#e9c68a] bg-[#fff9eb] p-3 text-sm">ยังใช้รหัสเริ่มต้นอยู่ · เปลี่ยนรหัสได้ที่ “รหัสผ่านและการกู้บัญชี” ด้านล่าง (ไม่บังคับ)</p>
      )}
      {next.map((n) => (
        <section key={n.title} className="gt-card p-5">
          <h2 className="font-bold">{n.title}</h2>
          <p className="mt-1 text-sm text-[var(--gt-muted)]">{n.body}</p>
          {n.href && <Link href={n.href} className="gt-cta-btn mt-3 inline-flex min-h-11 items-center px-5">{n.cta}</Link>}
        </section>
      ))}
      {!me.athlete && <section className="gt-card p-5">
        <h2 className="font-bold">สถานะการสมัคร</h2>
        <p className="mt-1 text-sm text-[var(--gt-muted)]">ใบสมัครแข่งขันในบัญชีนี้ · ขอถอนตัว เปลี่ยนคน หรือเปลี่ยนรุ่นตามเงื่อนไขของผู้จัด</p>
        <Link href="/my-applications" className="gt-outline-btn mt-3 inline-flex min-h-11 items-center px-5 font-semibold">ดูสถานะการสมัคร</Link>
      </section>}
      {me.athlete && (recovery || displayEmail) && (
        <details className="gt-card px-4 sm:px-5">
          <summary className="min-h-12 cursor-pointer py-3 font-bold">ตั้งค่าบัญชี{recovery && <span className="ml-1 text-sm font-normal text-[var(--gt-muted)]">รหัสผ่านและการกู้บัญชี</span>}</summary>
          {me.easy?.using_default && <p className="mt-2 text-sm text-[var(--gt-muted)]">บัญชีนี้ยังใช้รหัสเริ่มต้นอยู่</p>}
          {displayEmail && <p className="mt-2 break-words text-sm text-[var(--gt-muted)]">{displayEmail}</p>}
          <div className="mb-4 mt-3">{recovery}</div>
        </details>
      )}
      {!me.athlete && recovery && (
        <section className="gt-card p-5">
          <h2 className="font-bold">รหัสผ่านและการกู้บัญชี</h2>
          <p className="mt-1 text-sm text-[var(--gt-muted)]">เปลี่ยนรหัสผ่าน และบันทึกเบอร์โทร + วันเกิด ไว้ตั้งรหัสใหม่เองเมื่อลืม</p>
          <div className="mt-3">{recovery}</div>
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

function MyAthleteProfile({ athlete, details, children }: { athlete: Athlete; details: AthleteDetails | null; children: React.ReactNode }) {
  const rank = details?.rank || athlete.rank;
  const history = details?.history;
  const publicHistory = history && /^GO\d{6,20}$/.test(athlete.go_id) ? `/athletes/history/${athlete.go_id}` : null;
  const competitionProfile = athlete.has_profile ? `/athletes/${athlete.id}` : null;
  const historyHref = publicHistory ?? competitionProfile;
  const metrics = history && [
    { label: "แข่งจริง", value: history.games },
    { label: "ชนะ", value: history.wins },
    { label: "แพ้", value: history.losses },
    { label: "อัตราชนะ", value: history.win_percent == null ? "—" : `${history.win_percent.toLocaleString("th-TH")}%` },
  ];

  return (
    <div className="space-y-4">
      <section className="gt-card border-t-4 border-t-[var(--gt-cta)] p-4 sm:p-6" aria-labelledby="my-profile">
        <h1 id="my-profile" className="mb-4 text-xl font-bold sm:text-2xl">โปรไฟล์ของฉัน</h1>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
          <AthleteAvatar src={details?.photo} name={athlete.name} className="h-20 w-20 sm:h-28 sm:w-28" zoom />
          <div className="min-w-0">
            <p className="break-words text-xl font-bold leading-tight sm:text-2xl">{athlete.name}</p>
            <p className="mt-1 w-fit break-all rounded-md bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-950">{athlete.go_id}</p>
            <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-950">{rank || "ยังไม่ระบุระดับฝีมือ"}</p>
          </div>
        </div>
        <Link href="/account/photo" className="gt-cta-btn mt-4 inline-flex min-h-11 w-full items-center justify-center px-4 sm:w-auto">เปลี่ยนรูปโปรไฟล์</Link>
        <div className="mt-3 flex flex-wrap gap-2 text-sm empty:hidden">{children}</div>
      </section>
      {history && metrics && history.games > 0 && (
        <section className="gt-card space-y-3 p-4" aria-labelledby="my-competition-stats">
          <div>
            <h2 id="my-competition-stats" className="font-bold">สถิติการแข่งขัน</h2>
            <p className="text-sm text-[var(--gt-muted)]">ปี 2569 · จากผลที่ตรวจสอบแล้ว{history.draws > 0 ? ` · เสมอ ${history.draws} เกม` : ""}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metrics.map(({ label, value }) => <div key={label} className="rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] p-2 text-center">
              <dt className="text-sm text-[var(--gt-muted)]">{label}</dt>
              <dd className="text-xl font-bold tabular-nums">{value}</dd>
            </div>)}
          </dl>
        </section>
      )}
      <nav aria-label="เมนูนักกีฬา" className="grid gap-2 sm:grid-cols-3">
        {historyHref && <Link href={historyHref} className="gt-outline-btn flex min-h-12 items-center justify-center px-3 text-center font-semibold">ประวัติและสถิติ →</Link>}
        <Link href="/account/prizes" className="gt-outline-btn flex min-h-12 items-center justify-center px-3 text-center font-semibold">รางวัลของฉัน →</Link>
        <Link href="/my-applications" className="gt-outline-btn flex min-h-12 items-center justify-center px-3 text-center font-semibold">สถานะการสมัคร →</Link>
      </nav>
      {details && !historyHref && <p className="px-1 text-sm text-[var(--gt-muted)]">ยังไม่มีประวัติการแข่งขันให้แสดง</p>}
      <div className="flex flex-wrap gap-x-4 text-sm font-semibold text-[var(--gt-brand)]">
        {publicHistory && competitionProfile && <Link href={competitionProfile} className="inline-flex min-h-11 items-center underline">ผลแข่งและใบประกาศในระบบ</Link>}
        <Link href="/tournaments" className="inline-flex min-h-11 items-center underline">ดูการแข่งขัน</Link>
        <Link href="/results/submit" className="inline-flex min-h-11 items-center underline">ส่งผลการแข่งขัน</Link>
      </div>
    </div>
  );
}
