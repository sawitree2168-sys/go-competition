import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import MenuIcon from "@/components/MenuIcon";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { loadNews } from "@/lib/public-site";
import { thaiDate } from "@/lib/division-display";

export const revalidate = 60;
export const metadata: Metadata = { title: "ข่าวสาร" };

const KIND = { announcement: { icon: "news", label: "ประกาศ" }, registration: { icon: "register", label: "รับสมัคร" }, results: { icon: "results", label: "ผลการแข่งขัน" } } as const;

// ข่าวสาร: organisers' announcements, open registrations and new results.
export default async function NewsPage() {
  const items = await loadNews(publicDb());
  return (
    <PublicPage icon="news" title="ข่าวสาร" sub="ประกาศจากผู้จัด รายการที่เปิดรับสมัคร และผลการแข่งขันล่าสุด">
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.href} className="gt-card gt-row flex items-center gap-3 p-3">
                <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]"><MenuIcon name={KIND[n.kind].icon} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[var(--gt-cta)]">{KIND[n.kind].label}{n.date ? ` · ${thaiDate(n.date, "short")}` : ""}</span>
                  <span className="block font-semibold leading-snug">{n.title}</span>
                  {n.body && <span className="block text-sm text-[var(--gt-muted)]">{n.body}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="gt-card p-6 text-center text-[var(--gt-muted)]">ยังไม่มีข่าวสาร</p>}
    </PublicPage>
  );
}
