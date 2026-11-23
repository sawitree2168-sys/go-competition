import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { ASSOCIATION_SHEET_ID, DIRECTORY_TAB, parseCompetitionTabs, parseDirectory, tabDate, type RegistryPerson, type Tab } from "@/lib/association-sync";

// อัปเดตข้อมูลสมาคมอัตโนมัติ: Vercel cron เรียกทุกวัน (vercel.json) หรือเรียกเองด้วยรหัส.
// อ่านชีท "ทำเนียบดั้งไทยปี69" (เปิดให้ทุกคนที่มีลิงก์ดู) → ทำเนียบดั้ง + คะแนน + แท็บรายการแข่งใหม่.
export const runtime = "nodejs";
export const maxDuration = 60;

// Anyone may ask for a refresh (it only re-reads the public sheet); runs closer than 30 minutes apart are skipped.
// Writing is allowed only with GT_ASSOC_SYNC_TOKEN, which the database checks itself.
const MIN_GAP_MS = 30 * 60 * 1000;

async function readSheet(): Promise<Tab[]> {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ASSOCIATION_SHEET_ID}/export?format=xlsx`, { cache: "no-store", redirect: "follow" });
  if (!res.ok) throw new Error(`โหลดชีทสมาคมไม่ได้ (HTTP ${res.status})`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  return wb.worksheets.map((ws) => {
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const out: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, c) => { out[c - 1] = (cell.text ?? "").toString(); });
      rows[n - 1] = Array.from(out, (v) => v ?? "");
    });
    return { tab: ws.name, gid: null, rows: Array.from(rows, (r) => r ?? []) };
  });
}

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, token = process.env.GT_ASSOC_SYNC_TOKEN;
  if (!url || !key || !token) return NextResponse.json({ error: "Sync service not configured" }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const reg = await db.rpc("gt_sync_association_registry_v1", { p_token: token });
    if (reg.error || !reg.data) throw new Error(reg.error?.message ?? "รหัสอัปเดตไม่ถูกต้อง");
    if (reg.data.last_run && Date.now() - new Date(reg.data.last_run).getTime() < MIN_GAP_MS)
      return NextResponse.json({ ok: true, skipped: "อัปเดตไปแล้วเมื่อไม่ถึง 30 นาทีก่อน", last_run: reg.data.last_run });
    const tabs = await readSheet();
    const dirTab = tabs.find((t) => t.tab.trim() === DIRECTORY_TAB);
    if (!dirTab) throw new Error("ไม่พบแท็บ รวม");
    const { directory, ratings } = parseDirectory(dirTab.rows);
    if (directory.length < 500) throw new Error(`แท็บรวมมีแค่ ${directory.length} คน — ไม่อัปเดต กันข้อมูลหาย`);

    const known = new Set<string>((reg.data?.events ?? []) as string[]);
    const fresh = tabs.filter((t) => tabDate(t.tab) && !known.has("association:" + t.tab.trim()));
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const history = parseCompetitionTabs(fresh, (reg.data?.people ?? []) as RegistryPerson[], `association-auto-${today}`);

    const r = await db.rpc("gt_sync_association_v1", { p_token: token, p: { batch: history.batch, source_file: ASSOCIATION_SHEET_ID, directory, ratings, history, tabs: fresh.map((t) => t.tab) } });
    if (r.error) throw new Error(r.error.message);
    return NextResponse.json({ ok: true, ...r.data, new_tabs: fresh.map((t) => t.tab) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.rpc("gt_sync_association_fail_v1", { p_token: token, p_error: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return run();
}
