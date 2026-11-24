"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ICONS, MENU, type View } from "./bits";
import { LogoDisplay, type Branding } from "./LogoEditor";

/**
 * Institution workspace frame (design approved 24 Nov 2026):
 * - computer (≥1024px): navy sidebar menu + breadcrumb bar;
 * - phone (390px): navy top bar with ☰ drawer + 5 bottom tabs (หน้าแรก นักเรียน แข่งขัน รายงาน ตั้งค่า).
 */

export const HomeIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9v11.5h13V9" /><path d="M10 20.5v-6h4v6" />
  </svg>
);
const SchoolIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12 2 2 7v2h20V7Z" /><path d="M4 10h2.5v8H4zm4.5 0H11v8H8.5zm4.5 0h2.5v8H13zm4.5 0H20v8h-2.5zM2 19.5h20V22H2z" />
  </svg>
);

export const viewTitle = (v: View) => (v === "home" ? "ภาพรวม" : MENU.find((m) => m.id === v)?.title ?? "");

/** "GO TOURNAMENT" wordmark in the brand's italic display style. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 whitespace-nowrap font-bold italic tracking-tight ${className}`}>
      <span className="text-[1.35em] leading-none">G<span className="text-[#f2c14e]">O</span></span>
      <span className="text-[0.95em] leading-none">TOURNAMENT</span>
    </span>
  );
}

type Academy = { id: string; name: string };

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold transition ${active ? "bg-[#dcebff] text-[#0a3a85] shadow-[inset_0_0_0_2px_#9cc4f5]" : "text-white/90 hover:bg-white/10"}`}>
      <span className={`h-[22px] w-[22px] shrink-0 ${active ? "text-[#0b5fc6]" : "text-[#cfe0ff]"}`}>{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

function MenuList({ view, go }: { view: View; go: (v: View) => void }) {
  return (
    <nav aria-label="เมนูสถาบัน" className="space-y-1">
      <NavItem active={view === "home"} icon={HomeIcon} label="ภาพรวม" onClick={() => go("home")} />
      {MENU.map((m) => <NavItem key={m.id} active={view === m.id} icon={ICONS[m.id]} label={m.title} onClick={() => go(m.id)} />)}
    </nav>
  );
}

function AcademyBlock({ mine, academyId, onJoin }: { mine: Academy[]; academyId: string; onJoin: () => void }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 px-3 text-[15px] font-bold text-[#f6d27a]"><span className="h-5 w-5">{SchoolIcon}</span>สถาบัน</p>
      {mine.length > 1 && (
        <select aria-label="สลับสถาบัน" value={academyId} onChange={(e) => location.assign(`/institution?academy=${encodeURIComponent(e.target.value)}`)}
          className="min-h-11 w-full rounded-xl border border-white/30 bg-[#0b2f6b] px-3 text-sm text-white">
          {mine.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}
      <button type="button" onClick={onJoin} className="min-h-10 w-full rounded-xl border border-[#e9bd55]/70 px-3 text-left text-[13px] font-semibold text-[#f6d27a] hover:bg-white/10">+ เพิ่มสถาบัน / พื้นที่ครูอิสระ</button>
    </div>
  );
}

const TABS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "หน้าแรก", icon: HomeIcon },
  { id: "students", label: "นักเรียน", icon: ICONS.students },
  { id: "tracking", label: "แข่งขัน", icon: ICONS.awards },
  { id: "reports", label: "รายงาน", icon: ICONS.reports },
  { id: "settings", label: "ตั้งค่า", icon: ICONS.settings },
];

export function Shell({ view, go, mine, academyId, academyName, userName, roleLabel, onJoin, onSignOut, children }: {
  view: View; go: (v: View) => void; mine: Academy[]; academyId: string; academyName: string; userName: string; roleLabel: string;
  onJoin: () => void; onSignOut: () => void; children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    if (!drawer) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [drawer]);
  const pick = (v: View) => { setDrawer(false); go(v); };
  const tabActive = (id: View) => id === view || (id === "tracking" && view === "live");

  return (
    <div className="min-h-screen bg-[#eef4fc] text-[#0d2a5c] lg:flex">
      {/* computer: sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto bg-[linear-gradient(180deg,#0a3a86,#082a62_70%,#0a3474)] px-3 pb-4 pt-5 text-white lg:flex">
        <Link href="/" className="mb-5 px-2 text-[19px] text-white" aria-label="GO TOURNAMENT หน้าแรกเว็บไซต์"><Wordmark /></Link>
        <AcademyBlock mine={mine} academyId={academyId} onJoin={onJoin} />
        <div className="my-3 border-t border-white/15" />
        <MenuList view={view} go={go} />
        <div className="mt-auto space-y-1 pt-6 text-sm">
          <Link href="/tournaments" className="block rounded-lg px-3 py-2 text-white/80 hover:bg-white/10">รายการแข่งขันทั้งหมด ↗</Link>
          <button type="button" onClick={onSignOut} className="w-full rounded-lg px-3 py-2 text-left text-white/80 hover:bg-white/10">ออกจากระบบ</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* phone: top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b-[3px] border-[#e9bd55] bg-[#082a62] px-2 py-1.5 text-white lg:hidden">
          <button type="button" onClick={() => setDrawer(true)} aria-label="เปิดเมนูสถาบัน" aria-expanded={drawer} className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <Link href="/" className="flex-1 text-center text-[17px]"><Wordmark /></Link>
          <Link href="/tournaments" aria-label="รายการแข่งขันทั้งหมด" className="grid h-11 w-11 place-items-center rounded-lg text-[#f2c14e] hover:bg-white/10"><span className="h-6 w-6">{ICONS.awards}</span></Link>
        </header>

        {/* computer: breadcrumb bar */}
        <div className="hidden items-center gap-3 border-b border-[#d3e2f5] bg-white px-6 py-3 lg:flex">
          <span className="h-5 w-5 text-[#3c5a86]">{SchoolIcon}</span>
          <p className="min-w-0 flex-1 truncate text-sm text-[#3c5a86]">
            <button type="button" onClick={() => go("home")} className="hover:underline">สถาบัน</button>
            <span className="mx-1.5">/</span><b className="text-[#0d2a5c]">{viewTitle(view)}</b>
          </p>
          <span className="truncate text-sm"><b>{userName}</b> <span className="text-[#5a7398]">· {roleLabel} · {academyName}</span></span>
        </div>

        <main className="mx-auto max-w-[1240px] px-3 pb-28 pt-3 sm:px-5 lg:px-6 lg:pb-10 lg:pt-5">{children}</main>
      </div>

      {/* phone: bottom tabs */}
      <nav aria-label="เมนูสถาบันบนมือถือ" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#c9dbf2] bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_14px_rgba(10,50,110,.08)] lg:hidden">
        {TABS.map((t) => {
          const on = tabActive(t.id);
          return (
            <button key={t.id} type="button" onClick={() => go(t.id)} aria-current={on ? "page" : undefined} className="flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[12px] font-semibold">
              <span className={`grid h-8 w-12 place-items-center rounded-xl ${on ? "bg-[#0b5fc6] text-white" : "text-[#2a4f80]"}`}><span className="h-[22px] w-[22px]">{t.icon}</span></span>
              <span className={on ? "text-[#0b5fc6]" : "text-[#2a4f80]"}>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* phone: drawer with the full menu */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="เมนูสถาบัน">
          <button type="button" aria-label="ปิดเมนู" onClick={() => setDrawer(false)} className="absolute inset-0 bg-[#04152f]/50" />
          <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-[320px] flex-col overflow-y-auto bg-[linear-gradient(180deg,#0a3a86,#082a62)] px-3 pb-6 pt-4 text-white">
            <div className="mb-4 flex items-center justify-between px-2"><Wordmark className="text-[17px]" /><button type="button" onClick={() => setDrawer(false)} aria-label="ปิดเมนู" className="grid h-11 w-11 place-items-center rounded-lg text-2xl hover:bg-white/10">×</button></div>
            <p className="mb-3 px-3 text-sm text-white/80">{userName} · {roleLabel}</p>
            <AcademyBlock mine={mine} academyId={academyId} onJoin={() => { setDrawer(false); onJoin(); }} />
            <div className="my-3 border-t border-white/15" />
            <MenuList view={view} go={pick} />
            <div className="mt-6 space-y-1 text-sm">
              <Link href="/tournaments" className="block rounded-lg px-3 py-2.5 text-white/85 hover:bg-white/10">รายการแข่งขันทั้งหมด ↗</Link>
              <Link href="/" className="block rounded-lg px-3 py-2.5 text-white/85 hover:bg-white/10">หน้าแรกเว็บไซต์ ↗</Link>
              <button type="button" onClick={onSignOut} className="w-full rounded-lg px-3 py-2.5 text-left text-white/85 hover:bg-white/10">ออกจากระบบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Navy-and-gold header of every institution page: logo, name, page title, and (overview) the info pills. */
export function Banner({ branding, name, subtitle, pills, actions, compact = false }: {
  branding: Branding | null; name: string; subtitle: string; pills?: React.ReactNode[]; actions?: React.ReactNode; compact?: boolean;
}) {
  return (
    <section className={`relative overflow-hidden rounded-[22px] border-b-[4px] border-[#e9bd55] bg-[linear-gradient(110deg,#0a3a86,#0b4aa6_55%,#0a3a86)] text-white shadow-[0_10px_24px_rgba(8,48,104,.16)] ${compact ? "px-4 py-4 sm:px-6" : "px-4 py-5 sm:px-7 sm:py-7"}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[55%] bg-[url(/institution-banner.svg)] bg-cover bg-right opacity-90 [mask-image:linear-gradient(90deg,transparent,#000_45%)]" />
      <div className="relative z-10 flex items-center gap-3 sm:gap-6">
        <LogoDisplay branding={branding} name={name} className={compact ? "h-16 w-16 sm:h-20 sm:w-20" : "h-20 w-20 sm:h-28 sm:w-28"} />
        <div className="min-w-0 flex-1">
          <h1 className={`break-words font-bold leading-tight drop-shadow ${compact ? "text-2xl sm:text-4xl" : "text-[26px] sm:text-5xl"}`}>{name}</h1>
          <p className="mt-1 text-[15px] text-white/90 sm:text-xl">{subtitle}</p>
        </div>
      </div>
      {(pills?.length || actions) ? (
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 sm:ml-[136px]">
          {pills?.length ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-[#123a74] shadow sm:text-sm">{pills.map((p, i) => <span key={i} className="flex items-center gap-3">{i > 0 && <span aria-hidden="true" className="h-4 w-px bg-[#c3d4ea]" />}{p}</span>)}</div> : null}
          {actions && <div className="flex flex-wrap gap-2 sm:ml-auto">{actions}</div>}
        </div>
      ) : null}
    </section>
  );
}
