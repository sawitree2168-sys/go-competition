import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { validateMatchImport } from "@/lib/imports/matches";

export const runtime = "nodejs";

function authorized(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("x-go-import-secret"), process.env.GO_IMPORT_SECRET)) {
    return Response.json({ ok: false, message: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const checked = validateMatchImport(body);
  const stats = { received: checked.payload?.rows.length ?? 0, valid: checked.rows.length, errors: checked.errors.length };
  if (checked.errors.length || !checked.payload) {
    return Response.json({ ok: false, stage: "validation", stats, errors: checked.errors }, { status: 422 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  if (dryRun) return Response.json({ ok: true, stage: "dry-run", stats });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    return Response.json({ ok: false, message: "ยังไม่ได้ตั้งค่า Supabase ฝั่งเซิร์ฟเวอร์" }, { status: 503 });
  }

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      source_type: "google_sheets",
      source_file_id: checked.payload.sourceFileId,
      source_sheet: checked.payload.sourceSheet,
      status: "validated",
      received_count: checked.rows.length,
      valid_count: checked.rows.length,
      error_count: 0,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return Response.json({ ok: false, message: "สร้างชุดนำเข้าไม่สำเร็จ", detail: batchError?.message }, { status: 500 });
  }

  const staging = checked.rows.map((row) => ({
    batch_id: batch.id,
    source_key: checked.payload!.sourceFileId + ":" + checked.payload!.sourceSheet + ":" + row.sourceMatchId,
    source_match_id: row.sourceMatchId,
    competition_year: row.competitionYear,
    event_code: row.eventCode || null,
    division_name: row.division,
    validation_status: "valid",
    validation_errors: [],
    payload: row,
  }));

  const { error: stagingError } = await supabase.from("match_import_staging").upsert(staging, { onConflict: "source_key" });
  if (stagingError) {
    await supabase.from("import_batches").update({ status: "failed", error_count: checked.rows.length }).eq("id", batch.id);
    return Response.json({ ok: false, message: "บันทึกตารางพักไม่สำเร็จ", detail: stagingError.message }, { status: 500 });
  }

  await supabase.from("import_batches").update({ status: "staged" }).eq("id", batch.id);
  return Response.json({ ok: true, stage: "staged", batchId: batch.id, stats });
}
