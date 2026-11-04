import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { divisionSortValue } from "@/lib/division-display";

export type EventInfo = {
  id: string; title: string; event_date: string | null; poster_url: string | null;
  registration_open_date: string | null; registration_close_date: string | null;
};
export type Division = { id: string; name: string; seats_limit: number | null; entry_fee_thb: number | null; friendship_board_size: number | null };
export type Entrant = { source_row: number; title: string; full_name: string; institution: string; division_name: string; payment_status: string };

export function publicDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Published event + its divisions in display order. Returns event null when not published or unreachable. */
export async function loadEvent(db: SupabaseClient | null, id: string): Promise<{ event: EventInfo | null; divisions: Division[] }> {
  if (!db) return { event: null, divisions: [] };
  try {
    const { data: event, error } = await db
      .from("gt_tournaments")
      .select("id,title,event_date,poster_url,registration_open_date,registration_close_date")
      .eq("id", id).eq("published", true).maybeSingle();
    if (error || !event) return { event: null, divisions: [] };
    const { data } = await db.from("gt_divisions")
      .select("id,name,seats_limit,entry_fee_thb,friendship_board_size").eq("tournament_id", id);
    const divisions = ((data ?? []) as Division[]).sort((a, b) => divisionSortValue(a.name) - divisionSortValue(b.name));
    return { event: event as EventInfo, divisions };
  } catch {
    return { event: null, divisions: [] };
  }
}

/** Entrants the organiser approved for publication (synced from the Google Sheet). */
export async function loadEntrants(db: SupabaseClient | null, id: string): Promise<Entrant[]> {
  if (!db) return [];
  try {
    const { data } = await db.from("gt_public_entrants")
      .select("source_row,title,full_name,institution,division_name,payment_status")
      .eq("tournament_id", id).order("source_row", { ascending: true }).limit(1000);
    return (data ?? []) as Entrant[];
  } catch {
    return [];
  }
}
