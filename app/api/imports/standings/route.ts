import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { convertStandingsToMatches, type StandingSourceRow } from "@/lib/imports/standings";

export const runtime = "nodejs";

function authorized(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function numberOrNull(value: unknown) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("x-go-import-secret"), process.env.GO_IMPORT_SECRET)) {
    return Response.json({ ok: false, message: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !Array.isArray(body.rows)) {
    return Response.json({ ok: false, message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const sourceFileId = String(body.sourceFileId ?? "").trim();
  const sourceSheet = String(body.sourceSheet ?? "").trim();
  const eventName = String(body.eventName ?? sourceSheet).trim();
  const competitionYear = Number(body.competitionYear);
  const rows: StandingSourceRow[] = body.rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      division: String(row.division ?? "").trim(),
      place: Number(row.place),
      sourcePlayerId: String(row.sourcePlayerId ?? "").trim(),
      playerName: String(row.playerName ?? "").trim(),
      wins: numberOrNull(row.wins),
      losses: numberOrNull(row.losses),
      byes: numberOrNull(row.byes),
      score: numberOrNull(row.score),
      sos: numberOrNull(row.sos),
      sosos: numberOrNull(row.sosos),
      roundResults: String(row.roundResults ?? "").trim(),
    };
  });

  const converted = convertStandingsToMatches(rows);
  const stats = { sourcePlayers: rows.length, matches: converted.matches.length, issues: converted.issues.length };
  if (!sourceFileId || !sourceSheet || !Number.isInteger(competitionYear) || converted.issues.length) {
    return Response.json({ ok: false, stage: "validation", stats, issues: converted.issues }, { status: 422 });
  }

  if (new URL(request.url).searchParams.get("dryRun") === "1") {
    return Response.json({ ok: true, stage: "dry-run", stats, preview: converted.matches.slice(0, 20) });
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return Response.json({ ok: false, message: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: batch, error: batchError } = await supabase.from("import_batches").insert({
    source_type: "google_sheets",
    source_file_id: sourceFileId,
    source_sheet: sourceSheet,
    status: "validated",
    received_count: rows.length,
    valid_count: converted.matches.length,
    error_count: 0,
  }).select("id").single();
  if (batchError || !batch) return Response.json({ ok: false, message: batchError?.message ?? "สร้างชุดนำเข้าไม่สำเร็จ" }, { status: 500 });

  const staging = converted.matches.map((match) => {
    const ids = [match.playerASourceId || match.playerAName, match.playerBSourceId || match.playerBName].sort();
    const sourceMatchId = [competitionYear, eventName, match.division, match.round, ...ids].join(":");
    return {
      batch_id: batch.id,
      source_key: [sourceFileId, sourceSheet, sourceMatchId].join(":"),
      source_match_id: sourceMatchId,
      competition_year: competitionYear,
      event_code: null,
      division_name: match.division,
      validation_status: "valid",
      validation_errors: [],
      payload: { ...match, eventName, sourceFileId, sourceSheet, identityStatus: "unresolved" },
    };
  });

  const { error } = await supabase.from("match_import_staging").upsert(staging, { onConflict: "source_key" });
  if (error) {
    await supabase.from("import_batches").update({ status: "failed", error_count: staging.length }).eq("id", batch.id);
    return Response.json({ ok: false, message: error.message }, { status: 500 });
  }
  await supabase.from("import_batches").update({ status: "staged" }).eq("id", batch.id);
  return Response.json({ ok: true, stage: "staged", batchId: batch.id, stats });
}
