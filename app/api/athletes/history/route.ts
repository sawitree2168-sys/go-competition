import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const GO_ID = /^GO[0-9A-Za-z-]+$/;

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const goId = params.get("goId")?.trim() ?? "";
  const opponentGoId = params.get("opponentGoId")?.trim() ?? "";
  if (!GO_ID.test(goId) || (opponentGoId && (!GO_ID.test(opponentGoId) || opponentGoId === goId))) {
    return NextResponse.json({ error: "Invalid athlete GO IDs" }, { status: 400 });
  }
  // Only use anon credentials; Supabase RLS enforces published tournaments
  // and opt-in public athlete profiles. Never use service-role credentials here.
  const db = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const ids = opponentGoId ? [goId, opponentGoId] : [goId];
  const { data: athletes, error: athleteError } = await db.from("gt_athletes")
    .select("id,go_id,full_name,current_rank").in("go_id", ids).eq("profile_public", true);
  if (athleteError) return NextResponse.json({ error: "Unable to read athletes" }, { status: 500 });
  const athlete = athletes?.find(x => x.go_id === goId);
  const opponent = opponentGoId ? athletes?.find(x => x.go_id === opponentGoId) : null;
  if (!athlete || (opponentGoId && !opponent)) return NextResponse.json({ error: "Public athlete not found" }, { status: 404 });
  const { data: matches, error: matchError } = await db.from("gt_matches")
    .select("id,tournament_id,division_id,round_number,black_athlete_id,white_athlete_id,winner_athlete_id,state,verified_at,result_code")
    .or(`black_athlete_id.eq.${athlete.id},white_athlete_id.eq.${athlete.id}`)
    .eq("state", "verified").not("verified_at", "is", null)
    .order("verified_at", { ascending: false }).limit(1000);
  if (matchError) return NextResponse.json({ error: "Unable to read match history" }, { status: 500 });
  const verified = (matches ?? []).filter(m => m.winner_athlete_id &&
    [m.black_athlete_id, m.white_athlete_id].includes(m.winner_athlete_id) &&
    m.black_athlete_id !== m.white_athlete_id);
  const games = verified.map(m => ({
    matchId:m.id,tournamentId:m.tournament_id,divisionId:m.division_id,round:m.round_number,
    playedAt:m.verified_at,opponentId:m.black_athlete_id === athlete.id ? m.white_athlete_id : m.black_athlete_id,
    result:m.winner_athlete_id === athlete.id ? "win" : "loss",resultCode:m.result_code
  })).filter(m => !opponent || m.opponentId === opponent.id);
  return NextResponse.json({
    athlete:{ goId:athlete.go_id,fullName:athlete.full_name,currentRank:athlete.current_rank },
    opponent:opponent ? { goId:opponent.go_id,fullName:opponent.full_name } : null,
    stats:{ played:games.length,wins:games.filter(g=>g.result==="win").length,losses:games.filter(g=>g.result==="loss").length },
    games,hasMore:(matches?.length ?? 0) === 1000
  }, { headers: { "Cache-Control":"no-store" } });
}
