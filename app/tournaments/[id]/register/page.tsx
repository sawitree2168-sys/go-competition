import Link from "next/link";
import type { Metadata } from "next";
import { Shell } from "../_ui/chrome";
import SiteBar from "../_ui/SiteBar";
import { loadEventPage, publicDb } from "../_ui/data";
import RegisterFlow from "./RegisterFlow";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { event } = await loadEventPage(publicDb(), id);
  return { title: event ? `สมัครแข่งขัน · ${event.title}` : "สมัครแข่งขัน" };
}

// สมัครแข่งขัน (design 16 Nov 2026): poster → new athlete / existing athlete → division → pay + slip → confirm.
export default async function RegisterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ division?: string }> }) {
  const { id } = await params;
  const { division } = await searchParams;
  const { event, divisions } = await loadEventPage(publicDb(), id);

  return (
    <Shell wide>
      <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar current="/tournaments" /></div>
      {/* Light mode: soft board picture behind the top of the page (hidden in dark mode). */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 h-56 w-screen -translate-x-1/2 bg-[url(/profile-hero-m.png)] bg-[length:auto_100%] bg-[position:right_top] bg-no-repeat opacity-[var(--gt-page-deco)] [mask-image:linear-gradient(#000_60%,transparent)] sm:h-72 sm:bg-[url(/profile-hero.webp)] sm:bg-cover" />
      <main className="relative mx-auto max-w-3xl px-3 pt-4 sm:px-4">
        {event ? (
          <RegisterFlow
            event={{ id: event.id, title: event.title, event_date: event.event_date, poster_url: event.poster_url, venue: event.venue ?? null,
              mode: event.registration_mode ?? "web", url: event.registration_url ?? null,
              open: event.registration_open_date, close: event.registration_close_date }}
            initialDivision={divisions.some((d) => d.id === division) ? division : undefined}
            divisions={divisions.map((d) => ({ id: d.id, name: d.name, fee: d.entry_fee_thb === null ? null : Number(d.entry_fee_thb), seats: d.seats_limit }))}
          />
        ) : (
          <div className="gt-card mt-6 p-8 text-center">
            <h1 className="text-xl font-bold">ไม่พบรายการแข่งขันนี้</h1>
            <p className="mt-2 text-sm text-[var(--gt-muted)]">รายการนี้อาจยังไม่เผยแพร่ หรือลิงก์ไม่ถูกต้อง</p>
            <Link href="/register" className="gt-cta-btn mt-5 inline-flex min-h-12 items-center px-5">ดูรายการที่เปิดรับสมัคร</Link>
          </div>
        )}
      </main>
    </Shell>
  );
}
