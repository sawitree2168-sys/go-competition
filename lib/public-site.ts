import type { SupabaseClient } from "@supabase/supabase-js";
import { thaiDate } from "@/lib/division-display";

/** Public (anon) data for the home page, /stats, /results and /news. Every loader returns an empty value on error. */

export type Overview = { tournaments: number; athletes: number; results: number };
export type RankRow = { pos: number; go_id: string; full_name: string; rank: string | null; athlete_id: string | null; photo: string | null; wins: number; losses: number; events: number };
export type Rankings = { year: number; rows: RankRow[] };
/** upcoming = titles of upcoming events this player is also entered in (matched by name), else null. */
export type ResultPerson = { placing: number | null; go_id: string; full_name: string; institution?: string | null; athlete_id: string | null;
  wins: number; losses: number; byes: number; points?: number | null; sos?: number | null; upcoming?: string[] | null;
  /** looks like an entrant of these upcoming events (same surname, spelt differently), not confirmed yet */
  pending?: string[] | null };
/** complete = every player of the event is listed (a whole standings sheet), not only the linked ones. */
export type ResultEvent = { title: string; date: string | null; complete?: boolean; divisions: { division: string; people: ResultPerson[] }[] };
export type NewsItem = { id: string; kind: "announcement" | "registration" | "results"; title: string; body: string | null; date: string | null; href: string };

/** Placeholder picture for athletes without a photo. */
export { DEFAULT_ATHLETE_PHOTO as AVATAR } from "@/lib/athlete-photo.mjs";

export async function loadOverview(db: SupabaseClient | null): Promise<Overview | null> {
  if (!db) return null;
  const { data, error } = await db.rpc("gt_public_overview_v1");
  return error || !data ? null : (data as Overview);
}

export async function loadRankings(db: SupabaseClient | null, limit = 5, year?: number): Promise<Rankings | null> {
  if (!db) return null;
  const { data, error } = await db.rpc("gt_public_rankings_v1", { p_year: year ?? null, p_limit: limit });
  return error || !data ? null : (data as Rankings);
}

export async function loadResults(db: SupabaseClient | null): Promise<ResultEvent[]> {
  if (!db) return [];
  const { data, error } = await db.rpc("gt_public_results_v1");
  return error ? [] : ((data ?? []) as ResultEvent[]);
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

/** News = organisers' announcements + events taking entries now + events whose results are on the site. Newest first. */
export async function loadNews(db: SupabaseClient | null, limit = 30): Promise<NewsItem[]> {
  if (!db) return [];
  const [ev, an, res] = await Promise.all([
    db.from("gt_tournaments").select("id,title,event_date,registration_mode,registration_open_date,registration_close_date,created_at").eq("published", true).limit(50),
    db.from("gt_announcements").select("id,tournament_id,title,body,created_at").order("created_at", { ascending: false }).limit(limit),
    loadResults(db),
  ]);
  const t = today();
  const events = (ev.data ?? []) as { id: string; title: string; event_date: string | null; registration_mode: string | null; registration_open_date: string | null; registration_close_date: string | null; created_at: string }[];
  const titles = new Map(events.map((e) => [e.id, e.title]));
  const items: NewsItem[] = [];
  for (const a of (an.error ? [] : an.data ?? []) as { id: string; tournament_id: string; title: string; body: string | null; created_at: string }[]) {
    if (!titles.has(a.tournament_id)) continue;
    items.push({ id: `a-${a.id}`, kind: "announcement", title: a.title, body: titles.get(a.tournament_id) ?? null, date: a.created_at.slice(0, 10), href: `/tournaments/${a.tournament_id}` });
  }
  for (const e of events) {
    const open = (e.registration_mode === "web" || e.registration_mode === "external")
      && (!e.registration_close_date || e.registration_close_date >= t) && (!e.event_date || e.event_date >= t);
    if (open) items.push({ id: `r-${e.id}`, kind: "registration", title: `เปิดรับสมัคร ${e.title}`, body: e.registration_close_date ? `ปิดรับสมัคร ${thaiDate(e.registration_close_date)}` : null,
      date: e.registration_open_date ?? e.created_at.slice(0, 10), href: `/tournaments/${e.id}` });
  }
  for (const r of res) {
    const n = r.divisions.reduce((s, d) => s + d.people.length, 0);
    items.push({ id: `s-${r.title}`, kind: "results", title: `สรุปผลการแข่งขัน ${r.title}`, body: `${r.divisions.length} รุ่น · ${n} คน`, date: r.date, href: `/results#${encodeURIComponent(r.title)}` });
  }
  return items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, limit);
}
