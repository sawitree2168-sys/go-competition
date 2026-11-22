import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import PosterArchive, { POSTER_ARCHIVE_PAGE_SIZE } from "@/components/PosterArchive";
import { loadPosterArchive } from "@/lib/poster-archive";

export const revalidate = 60;
export const metadata: Metadata = { title: "คลังโปสเตอร์และวอลล์ลิสต์ย้อนหลัง" };

export default async function HistoryEventsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [events, { page }] = await Promise.all([loadPosterArchive(), searchParams]);
  const count = Math.ceil(events.length / POSTER_ARCHIVE_PAGE_SIZE);
  const requested = Number(page);
  const current = Math.max(1, Math.min(count, Number.isInteger(requested) ? requested : 1));
  return (
    <PublicPage icon="results" title="คลังการแข่งขันย้อนหลัง" sub={`วอลล์ลิสต์ ${events.length} รายการ`} current="/results">
      <div className="space-y-4">
        <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/results">← ผลการแข่งขัน</Link>
        <PosterArchive events={events.slice((current - 1) * POSTER_ARCHIVE_PAGE_SIZE, current * POSTER_ARCHIVE_PAGE_SIZE)} />
        {count > 1 && (
          <nav aria-label="หน้าโปสเตอร์ย้อนหลัง" className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: count }, (_, index) => index + 1).map(number => (
              <Link key={number} href={number === 1 ? "/results/history" : `/results/history?page=${number}`}
                aria-current={number === current ? "page" : undefined}
                className={`${number === current ? "gt-cta-btn" : "gt-outline-btn"} inline-flex min-h-11 min-w-11 items-center justify-center`}>{number}</Link>
            ))}
          </nav>
        )}
        {!events.length && <p>ยังไม่มีรายการย้อนหลังให้แสดง</p>}
      </div>
    </PublicPage>
  );
}
