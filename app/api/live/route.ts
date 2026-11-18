import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Marks a division's public pages for rebuilding on their next visit, so live viewers get fresh pairings
// and results right away instead of waiting for the 30-second cache. Harmless to call: it only expires
// a cache entry. The division's event is looked up in the database (unknown divisions are ignored), and
// calls are rate-limited per division on each server instance.

const ID = /^[0-9A-Za-z-]{1,64}$/; // division id (uuid); checked against the database below
const lastHit = new Map<string, number>();
const eventOf = new Map<string, string>();

async function lookupEvent(division: string): Promise<string | null> {
  const cached = eventOf.get(division);
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await db.from("gt_divisions").select("tournament_id").eq("id", division).maybeSingle();
  const id = (data as { tournament_id?: string } | null)?.tournament_id ?? null;
  if (id) { if (eventOf.size > 5000) eventOf.clear(); eventOf.set(division, id); }
  return id;
}

export async function POST(req: Request) {
  let body: { division?: unknown };
  try { body = await req.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const division = String(body.division ?? "");
  if (!ID.test(division)) return Response.json({ ok: false }, { status: 400 });
  const now = Date.now();
  if (now - (lastHit.get(division) ?? 0) < 2000) return Response.json({ ok: true, skipped: true });
  lastHit.set(division, now);
  if (lastHit.size > 5000) lastHit.clear();
  const event = await lookupEvent(division);
  if (!event) return Response.json({ ok: false }, { status: 404 });
  revalidatePath(`/tournaments/${event}/divisions/${division}`);
  revalidatePath(`/tournaments/${event}`);
  revalidatePath(`/tournaments/${event}/competition`);
  return Response.json({ ok: true });
}
