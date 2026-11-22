import type { SupabaseClient } from "@supabase/supabase-js";
import type { PosterSetting } from "./tournament-posters";

export async function loadPosterSettings(db: SupabaseClient | null) {
  if (!db) return new Map<string, PosterSetting>();
  const { data } = await db.from("gt_tournament_posters_v1")
    .select("event_key,mode,style,original_url").order("event_key").range(0, 999);
  return new Map(((data ?? []) as PosterSetting[]).map((item) => [item.event_key, item]));
}
