import Link from "next/link";
import { Shell, STONES_IMAGE } from "./[id]/_ui/chrome";
import ThemeToggle from "./[id]/_ui/ThemeToggle";
import { publicDb } from "./[id]/_ui/data";
import EventBrowser, { type EventCard } from "./EventBrowser";
import { divisionKey } from "@/lib/division-display";
import { divisionKinds } from "@/lib/event-list.mjs";

// Rebuilt from the database at most every 30 s, so new posters and events appear without a redeploy.
export const revalidate = 30;

type Row = {
  id: string; title: string; event_date: string | null; poster_url: string | null; venue?: string | null;
  registration_open_date: string | null; registration_close_date: string | null; registration_mode?: string | null;
};

async function loadEvents(): Promise<EventCard[]> {
  const db = publicDb();
  if (!db) return [];
  try {
    const ev = await db.from("gt_tournaments").select("id,title,event_date,poster_url,registration_open_date,registration_close_date,registration_mode,venue")
      .eq("published", true).order("event_date", { ascending: false, nullsFirst: true }).limit(300);
    const rows = (ev.data ?? []) as unknown as Row[];
    if (!rows.length) return [];
    const dv = await db.from("gt_divisions").select("tournament_id,name").in("tournament_id", rows.map((r) => r.id)).limit(3000);
    const keys = new Map<string, string[]>();
    for (const d of (dv.data ?? []) as { tournament_id: string; name: string }[]) keys.set(d.tournament_id, [...(keys.get(d.tournament_id) ?? []), divisionKey(d.name)]);
    return rows.map((r) => ({
      id: r.id, title: r.title, event_date: r.event_date, poster_url: r.poster_url, venue: r.venue ?? null,
      registration_open_date: r.registration_open_date, registration_close_date: r.registration_close_date,
      registration_mode: r.registration_mode ?? null, kinds: divisionKinds(keys.get(r.id) ?? []),
    }));
  } catch {
    return [];
  }
}

const NAV = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/tournaments", label: "รายการแข่งขัน", current: true },
  { href: "/tournaments?status=finished", label: "ผลการแข่งขัน" },
];

function SiteBar() {
  return (
    <header className="bg-[linear-gradient(180deg,#0d3f8f,#0a2f6e)] text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="GO TOURNAMENT หน้าหลัก">
          <span aria-hidden="true" className="flex">
            <span className="h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] shadow" />
            <span className="-ml-2 mt-1 h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)] shadow" />
          </span>
          <span aria-hidden="true" className="h-7 w-px bg-white/40" />
          <span className="text-lg font-bold tracking-wide sm:text-xl">GO TOURNAMENT</span>
        </Link>
        <nav aria-label="เมนูหลัก" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={n.current ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-[15px] font-semibold ${n.current ? "bg-[#1f6fe0]" : "hover:bg-white/10"}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <span className="[&_button]:bg-white/10 [&_button]:text-white"><ThemeToggle /></span>
          <Link href="/menu" aria-label="เมนู" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10 md:hidden">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default async function TournamentList() {
  const events = await loadEvents();
  return (
    <div className="min-h-screen">
      <Shell wide>
        <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar /></div>
        <section className="relative overflow-hidden px-4 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-12">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative site photo */}
          <img src={STONES_IMAGE} alt="" aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/3 object-cover opacity-35 [mask-image:linear-gradient(to_left,black,transparent)] sm:w-1/2" />
          <div className="relative border-l-4 border-[var(--gt-cta)] pl-4">
            <h1 className="text-3xl font-bold leading-tight sm:text-5xl">การแข่งขันทั้งหมด</h1>
            <p className="mt-1 text-[var(--gt-muted)] sm:text-lg">ค้นหารายการ ติดตามการแข่งขัน และดูผลย้อนหลัง</p>
          </div>
        </section>
        <div className="px-4 sm:px-8"><EventBrowser events={events} serverToday={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date())} /></div>
      </Shell>
    </div>
  );
}
