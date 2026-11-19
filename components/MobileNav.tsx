"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MenuIcon, { type MenuIconName } from "./MenuIcon";

const tabs: { label: string; href: string; icon: MenuIconName }[] = [
  { label: "หน้าแรก", href: "/", icon: "home" },
  { label: "แข่งขัน", href: "/tournaments", icon: "trophy" },
  { label: "GO FAN", href: "/go-fan", icon: "fan" },
  { label: "นักกีฬา", href: "/athletes", icon: "athlete" },
  { label: "เมนู", href: "/menu", icon: "menu" },
];

const rankingTab = { label: "อันดับคะแนน", href: "/dan", icon: "stats" } as const;

/** A single persistent navigation bar, shared by every mobile page. */
export default function MobileNav() {
  const pathname = usePathname();
  if(/^\/(organizer|referee|institution)(\/|$)/.test(pathname))return null;
  const isRanking = pathname === "/dan";
  const visibleTabs = isRanking ? [...tabs.slice(0, -1), rankingTab] : tabs;
  const active = isRanking ? rankingTab.href : pathname === "/" ? "/"
    : pathname.startsWith("/go-fan") ? "/go-fan"
    : pathname.startsWith("/athletes") ? "/athletes"
    : /^\/(tournaments|results|register|competition)(\/|$)/.test(pathname) ? "/tournaments"
    : "/menu";
  return (
    <nav aria-label="เมนูหลักบนมือถือ" className="gt-global-mobile-nav">
      {visibleTabs.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={active === tab.href ? "page" : undefined}>
          <MenuIcon name={tab.icon} className="h-6 w-6" />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
