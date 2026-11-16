import { Shell } from "./[id]/_ui/chrome";
import SiteBar from "./[id]/_ui/SiteBar";
import { publicDb } from "./[id]/_ui/data";
import EventBrowser, { type EventCard } from "./EventBrowser";
import { divisionKey } from "@/lib/division-display";
import { divisionKinds } from "@/lib/event-list.mjs";

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

/** The competition list ("การแข่งขันทั้งหมด"); also the home page. */
export async function TournamentList({ current }: { current: string }) {
  const events = await loadEvents();
  return (
    <div className="min-h-screen">
      <Shell wide>
        <div className="gt-dash relative left-1/2 -mb-10 min-h-screen w-screen -translate-x-1/2 overflow-hidden pb-12">
          <SiteBar current={current} />
          {/* eslint-disable @next/next/no-img-element -- decorative illustrations in /public */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[300px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)] sm:h-[400px]"><img src="/home-glow.webp" alt="" className="gt-home-glow absolute -right-32 -top-24 w-[760px] max-w-none sm:w-[900px]" /></div>
          <section className="relative mx-auto grid max-w-6xl items-center gap-2 px-4 pb-5 pt-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] sm:px-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
            <img src="/home-board.webp" alt="" aria-hidden="true"
              className="pointer-events-none absolute -right-14 top-1 w-[56%] max-w-[260px] drop-shadow-[0_16px_24px_rgba(0,0,0,.35)] sm:static sm:order-2 sm:w-full sm:max-w-none" />
            <div className="relative z-[1]">
              <h1 className="max-w-[62%] text-[26px] font-extrabold leading-tight text-[var(--gt-dash-title)] sm:max-w-none sm:text-5xl">เลือกสนามแข่งขันของคุณ</h1>
              <p className="mt-2 max-w-[62%] text-sm text-[var(--gt-muted)] sm:max-w-none sm:text-xl">สมัครแข่งขัน ติดตามผล และย้อนดูทุกความสำเร็จ</p>
            </div>
          </section>
          {/* eslint-enable @next/next/no-img-element */}
          <div className="relative mx-auto max-w-6xl px-4 sm:px-8"><EventBrowser events={events} serverToday={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date())} /></div>
        </div>
      </Shell>
    </div>
  );
}

