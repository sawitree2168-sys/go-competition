import {loadCurrentResults} from "./current-results";
import {loadCrowdGames,crowdEvents} from "./crowd-results";
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

/** gt_public_rankings_v2: who won most, ดั้ง / คิว, from the central history. level -1 = all, 0 = unknown. */
export type WinEvent = { id: string; title: string; date: string | null; year: number | null; division: string; wins: number; losses: number; byes: number; wo_wins: number; wo_losses: number };
export type WinRow = { pos: number; go_id: string; full_name: string; athlete_id: string | null; photo: string | null; level: number | null; dan_number: number | null;
  wins: number; losses: number; played: number; wo_wins: number; wo_losses: number; byes: number; events: number; list: WinEvent[] };
export type WinRankings = { year: number | null; from: string | null; to: string | null; games: number;
  events: { id: string; title: string; date: string | null; year: number | null }[];
  groups: { grp: "dan" | "kyu"; level: number; total: number }[]; rows: WinRow[] };

export async function loadWinRankings(db: SupabaseClient | null, grp: "dan" | "kyu", level: number, limit = 30): Promise<WinRankings | null> {
  if (!db) return null;
  const { data, error } = await db.rpc("gt_public_rankings_v2", { p_grp: grp, p_level: level, p_year: null, p_limit: limit });
  return error || !data ? null : (data as WinRankings);
}

export async function loadResults(db: SupabaseClient | null): Promise<ResultEvent[]> {
  if (!db) return [];
  const { data, error } = await db.rpc("gt_public_results_v1");
  const official=error?[]:((data??[]) as ResultEvent[]);
  for(const current of await loadCurrentResults(db)){
    const old=official.find(e=>e.title===current.title&&e.date===current.date);
    if(!old)official.push(current);else for(const d of current.divisions)if(!old.divisions.some(x=>x.division===d.division))old.divisions.push(d);
  }
  const contributed=crowdEvents(await loadCrowdGames(db));
  for(const event of contributed){
    const same=official.find(e=>e.title===event.title&&e.date===event.date);
    if(!same){official.push(event);continue;}
    for(const div of event.divisions){const existing=same.divisions.find(d=>d.division===div.division);if(!existing)same.divisions.push(div);else if(!same.complete)for(const person of div.people)if(!existing.people.some(p=>p.athlete_id===person.athlete_id||p.full_name===person.full_name))existing.people.push(person);}
  }
  return official;
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
