import Link from "next/link";
import TournamentPoster from "@/components/TournamentPoster";
import { thaiDate } from "@/lib/division-display";
import type { ArchivePoster } from "@/lib/poster-archive";

export const POSTER_ARCHIVE_PAGE_SIZE = 20;

export default function PosterArchive({ events, home = false }: { events: ArchivePoster[]; home?: boolean }) {
  if (!events.length) return null;
  return (
    <section id="poster-archive" className="space-y-4" aria-label="คลังโปสเตอร์การแข่งขันย้อนหลัง">
      {home && (
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="site-section-title">คลังโปสเตอร์การแข่งขันย้อนหลัง</h2>
          <Link href="/results/history" className="gt-outline-btn inline-flex min-h-11 items-center px-4">ดูทั้งหมด {events.length} รายการ →</Link>
        </header>
      )}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(home ? events.slice(0, POSTER_ARCHIVE_PAGE_SIZE) : events).map(event => (
          <li key={event.id} className="min-w-0">
            <Link href={event.href} prefetch={false} className="gt-card flex h-full flex-col overflow-hidden rounded-2xl border-2 transition-colors hover:border-[#c28c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              <TournamentPoster choice={event.poster} title={event.title} year={event.event_year + 543} />
              <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                <h3 className="break-words text-base font-bold leading-snug">{event.title}</h3>
                <p className="text-sm text-[var(--gt-muted)]">{event.event_date ? thaiDate(event.event_date) : `ปี ${event.event_year + 543}`} · {event.divisions} รุ่น</p>
                <span className="mt-auto pt-2 text-sm font-semibold text-[var(--gt-cta)]">ดูวอลล์ลิสต์ →</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
