import Link from "next/link";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import MenuIcon, { type MenuIconName } from "./MenuIcon";

/** Frame of the simple public pages (athletes, results, stats, news, FAQ…): site bar, title, content. */
export default function PublicPage({ icon, title, sub, children, current }: { icon: MenuIconName; title: string; sub?: string; children: React.ReactNode; current?: string }) {
  return (
    <Shell wide>
      <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar current={current} /></div>
      <main className="mx-auto max-w-4xl px-3 pb-10 pt-5 sm:px-4">
        <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]"><MenuIcon name={icon} className="h-6 w-6" /></span>
          {title}
        </h1>
        {sub && <p className="mt-2 text-[var(--gt-muted)]">{sub}</p>}
        <div className="mt-5">{children}</div>
      </main>
    </Shell>
  );
}

/** "Coming soon" body for menu items whose content does not exist yet. */
export function ComingSoon({ what }: { what: string }) {
  return (
    <div className="gt-card p-8 text-center">
      <p className="text-lg font-semibold">{what} กำลังจัดทำ</p>
      <p className="mt-2 text-[var(--gt-muted)]">ส่วนนี้จะเปิดให้ใช้งานเร็ว ๆ นี้</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/tournaments" className="gt-cta-btn inline-flex min-h-11 items-center px-5">ดูรายการแข่งขัน</Link>
        <Link href="/" className="gt-outline-btn inline-flex min-h-11 items-center px-5 font-semibold">กลับหน้าแรก</Link>
      </div>
    </div>
  );
}
