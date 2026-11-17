import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import AuthLink from "./AuthLink";
import MenuIcon from "@/components/MenuIcon";

const NAV = [
  { href: "/", label: "หน้าหลัก", icon: "home" },
  { href: "/tournaments", label: "การแข่งขัน", icon: "trophy" },
  { href: "/athletes", label: "นักกีฬา", icon: "athlete" },
  { href: "/go-fan", label: "GO FAN", icon: "fan" },
] as const;

/** Blue site bar of the newer pages (competition list, athlete profile). */
export default function SiteBar({ current }: { current?: string }) {
  return (
    <header className="gt-sitebar bg-[linear-gradient(105deg,#0785ee_0%,#0866d9_48%,#054ebd_100%)] text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <Link href="/" className="gt-sitebar-logo flex items-center gap-3" aria-label="GO TOURNAMENT หน้าหลัก">
          <span aria-hidden="true" className="gt-sitebar-stones flex">
            <span className="h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] shadow" />
            <span className="-ml-2 mt-1 h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)] shadow" />
          </span>
          <span aria-hidden="true" className="h-7 w-px bg-white/40" />
          <span className="gt-sitebar-name whitespace-nowrap text-base font-bold tracking-wide sm:text-xl">GO TOURNAMENT</span>
        </Link>
        <nav aria-label="เมนูหลัก" className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={n.href === current ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[15px] font-semibold ${n.href === current ? "bg-[#1f6fe0]" : "hover:bg-white/10"}`}><MenuIcon name={n.icon} className="h-4 w-4" />{n.label}</Link>
          ))}
        </nav>
        <div className="gt-sitebar-actions ml-auto flex shrink-0 items-center gap-1.5 lg:ml-2">
          <AuthLink />
          <span className="[&_button]:bg-white/10 [&_button]:text-white"><ThemeToggle /></span>
          <Link href="/menu" aria-label="เมนู" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10 lg:hidden">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
