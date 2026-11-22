import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import PosterArchive from "@/components/PosterArchive";
import { POSTER_ARCHIVE_PAGE_SIZE } from "@/lib/poster-archive-shared";
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
        <PosterArchive events={events} archivePage={current} />
        {!events.length && <p>ยังไม่มีรายการย้อนหลังให้แสดง</p>}
      </div>
    </PublicPage>
  );
}
