import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import AuthLink from "./AuthLink";

const NAV = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/tournaments", label: "รายการแข่งขัน" },
  { href: "/tournaments?status=finished", label: "ผลการแข่งขัน" },
];

/** Blue site bar of the newer pages (competition list, athlete profile). */
export default function SiteBar({ current }: { current?: string }) {
  return (
    <header className="bg-[linear-gradient(180deg,#0d3f8f,#0a2f6e)] text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <Link href="/" className="flex items-center gap-3" aria-label="GO TOURNAMENT หน้าหลัก">
          <span aria-hidden="true" className="flex">
            <span className="h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] shadow" />
            <span className="-ml-2 mt-1 h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)] shadow" />
          </span>
          <span aria-hidden="true" className="h-7 w-px bg-white/40" />
          <span className="whitespace-nowrap text-base font-bold tracking-wide sm:text-xl">GO TOURNAMENT</span>
        </Link>
        <nav aria-label="เมนูหลัก" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={n.href === current ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-[15px] font-semibold ${n.href === current ? "bg-[#1f6fe0]" : "hover:bg-white/10"}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 md:ml-2">
          <AuthLink />
          <span className="[&_button]:bg-white/10 [&_button]:text-white"><ThemeToggle /></span>
          <Link href="/menu" aria-label="เมนู" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10 md:hidden">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
