import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { divisionSortValue } from "@/lib/division-display";

/** Seconds a public read may be served from cache. Results and entrant syncs appear within this window. */
export const PUBLIC_CACHE_SECONDS = 30;

export type EventInfo = {
  id: string; title: string; event_date: string | null; poster_url: string | null;
  registration_open_date: string | null; registration_close_date: string | null;
};
export type Division = { id: string; name: string; seats_limit: number | null; entry_fee_thb: number | null; friendship_board_size: number | null };
export type Entrant = { source_row: number; title: string; full_name: string; institution: string; division_name: string; payment_status: string };
export type Match = {
  id: string; round_number: number; board_number: number | null; black_athlete_id: string; white_athlete_id: string;
  winner_athlete_id: string | null; result_code: string | null; result_margin: string | null; state: string; pool_label?: string | null;
};
/** One row of gt_division_board_v1: a table (kind "match") or a bye, with real names and registered institution. */
export type BoardRow = {
  kind: "match" | "bye"; match_id: string | null; pool_label: string | null; round_number: number; board_number: number | null;
  black_id: string; black_name: string | null; black_institution: string | null;
  white_id: string | null; white_name: string | null; white_institution: string | null;
  winner_id: string | null; result_code: string | null; result_margin: string | null; state: string | null;
};
export type Person = { name: string; institution: string };
export type Bye = { round_number: number; athlete_id: string; pool_label?: string | null };
export type Standing = {
  pool_label?: string | null; pos: number; athlete_id: string | null; display_name: string | null; current_rank: string | null;
  wins: number; losses: number; draws?: number; byes: number; score: number; sos: number; sosos: number;
  institution?: string | null; withdrawn?: boolean;
};

/**
 * Public (anon-key) client whose requests go through Next's data cache, so repeat page views
 * don't wait on a round trip to the database. Only public, RLS-filtered data is read this way.
 */
export function publicDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: PUBLIC_CACHE_SECONDS } }) },
  });
}

const sortDivisions = (rows: Division[]) => [...rows].sort((a, b) => divisionSortValue(a.name) - divisionSortValue(b.name));

/** Event, divisions and entrants in one parallel round trip. Event is null when not published. */
export async function loadEventPage(db: SupabaseClient | null, id: string) {
  const empty = { event: null as EventInfo | null, divisions: [] as Division[], entrants: [] as Entrant[] };
  if (!db) return empty;
  try {
    const [ev, dv, en] = await Promise.all([
      db.from("gt_tournaments").select("id,title,event_date,poster_url,registration_open_date,registration_close_date")
        .eq("id", id).eq("published", true).maybeSingle(),
      db.from("gt_divisions").select("id,name,seats_limit,entry_fee_thb,friendship_board_size").eq("tournament_id", id),
      db.from("gt_public_entrants").select("source_row,title,full_name,institution,division_name,payment_status")
        .eq("tournament_id", id).order("source_row", { ascending: true }).limit(1000),
    ]);
    if (ev.error || !ev.data) return empty;
    return { event: ev.data as EventInfo, divisions: sortDivisions((dv.data ?? []) as Division[]), entrants: (en.data ?? []) as Entrant[] };
  } catch {
    return empty;
  }
}

/** Everything the division page needs, fetched in a single parallel round trip. */
export async function loadDivisionPage(db: SupabaseClient | null, id: string, divisionId: string) {
  const empty = { event: null as EventInfo | null, divisions: [] as Division[], entrants: [] as Entrant[], matches: [] as Match[], byes: [] as Bye[], standings: [] as Standing[], people: new Map<string, Person>() };
  if (!db) return empty;
  try {
    const [page, board, s] = await Promise.all([
      loadEventPage(db, id),
      db.rpc("gt_division_board_v1", { p_division: divisionId }),
      db.rpc("gt_division_standings_v3", { p_division: divisionId, p_pool: null }),
    ]);
    const rows = (board.data ?? []) as BoardRow[];
    const people = new Map<string, Person>();
    const add = (id: string | null, name: string | null, inst: string | null) => { if (id && name) people.set(id, { name, institution: inst ?? "" }); };
    for (const r of rows) { add(r.black_id, r.black_name, r.black_institution); add(r.white_id, r.white_name, r.white_institution); }
    const matches: Match[] = rows.filter((r) => r.kind === "match" && r.match_id && r.white_id).map((r) => ({
      id: r.match_id!, round_number: r.round_number, board_number: r.board_number, black_athlete_id: r.black_id, white_athlete_id: r.white_id!,
      winner_athlete_id: r.winner_id, result_code: r.result_code, result_margin: r.result_margin, state: r.state ?? "pending", pool_label: r.pool_label,
    }));
    const byes: Bye[] = rows.filter((r) => r.kind === "bye").map((r) => ({ round_number: r.round_number, athlete_id: r.black_id, pool_label: r.pool_label }));
    return { ...page, matches, byes, standings: (s.data ?? []) as Standing[], people };
  } catch {
    return empty;
  }
}
