import "./directory.css";
import Link from "next/link";
import { SiteFooter, SiteShortcuts } from "@/components/SiteDesign";
import { Shell } from "./[id]/_ui/chrome";
import SiteBar from "./[id]/_ui/SiteBar";
import { publicDb } from "./[id]/_ui/data";
import EventBrowser, { type EventCard } from "./EventBrowser";
import { loadResults } from "@/lib/public-site";
import { eventPoster } from "@/lib/event-organizers";
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
    const [ev, history] = await Promise.all([
      db.from("gt_tournaments").select("id,title,event_date,poster_url,registration_open_date,registration_close_date,registration_mode,venue")
        .eq("published", true).order("event_date", { ascending: false, nullsFirst: true }).limit(300),
      loadResults(db),
    ]);
    const rows = (ev.data ?? []) as unknown as Row[];
    const dv = rows.length
      ? await db.from("gt_divisions").select("tournament_id,name").in("tournament_id", rows.map((r) => r.id)).limit(3000)
      : { data: [] };
    const keys = new Map<string, string[]>();
    for (const d of (dv.data ?? []) as { tournament_id: string; name: string }[]) keys.set(d.tournament_id, [...(keys.get(d.tournament_id) ?? []), divisionKey(d.name)]);
    const current: EventCard[] = rows.map((r) => ({
      id: r.id, title: r.title, event_date: r.event_date, poster_url: r.poster_url ?? eventPoster(r.title), venue: r.venue ?? null,
      registration_open_date: r.registration_open_date, registration_close_date: r.registration_close_date,
      registration_mode: r.registration_mode ?? null, kinds: divisionKinds(keys.get(r.id) ?? []),
    }));
    const key = (title: string) => title.normalize("NFC").replace(/\s+/g, "").toLowerCase();
    const published = new Set(current.map((e) => key(e.title)));
    const archived: EventCard[] = history.filter((e) => !published.has(key(e.title))).map((e) => ({
      id: `history:${e.title}`, title: e.title, event_date: e.date, poster_url: eventPoster(e.title), venue: null,
      registration_open_date: null, registration_close_date: null, registration_mode: "closed",
      kinds: `${e.divisions.length} รุ่น • ${e.divisions.reduce((n, d) => n + d.people.length, 0)} คน`,
      href: `/results?event=${encodeURIComponent(e.title)}`, archived: true,
    }));
    return [...current, ...archived];
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
        <div className="gt-dash gt-directory relative left-1/2 -mb-10 min-h-screen w-screen -translate-x-1/2 overflow-hidden pb-12">
          <SiteBar current={current} />
          <section className={`gt-directory-hero ${current === "/" ? "gt-directory-hero-home" : ""}`} aria-label={current === "/" ? "GO TOURNAMENT — สมัครแข่งขันและติดตามผล" : "รายการแข่งขัน"}>
            {/* eslint-disable @next/next/no-img-element -- curated website artwork */}
            <picture aria-hidden="true" className="gt-directory-art">
              <img
                src={current === "/" ? "/banners/go-tournament-home.png" : "/design/site-banner.webp"}
                alt=""
                width={current === "/" ? 2048 : 2000}
                height={current === "/" ? 684 : 667}
                fetchPriority="high"
              />
            </picture>
            {current !== "/" && (
              <div className="gt-directory-hero-inner">
                <h1 id="directory-title">รายการแข่งขัน</h1>
                <p>สมัครแข่งขัน ติดตามผล และย้อนดูทุกความสำเร็จ</p>
                <span className="gt-directory-gold" aria-hidden="true" />
              </div>
            )}
          </section>
          <div className="gt-directory-content relative mx-auto max-w-6xl px-4 sm:px-8">{current === "/" && <SiteShortcuts/>}<EventBrowser events={events} serverToday={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date())} /></div>
          {current === "/" && <section className="site-main"><h2 className="site-section-title">ข่าวสารและประกาศ</h2><div className="site-shortcuts"><Link href="/news">ข่าวสารและผลล่าสุด →</Link><Link href="/results/submit">ส่งภาพผลการแข่งขัน →</Link></div></section>}
          <SiteFooter/>
        </div>
      </Shell>
    </div>
  );
}

