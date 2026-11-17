/**
 * GO TOURNAMENT — ZEER GO KYU WAR 2026
 * Copy this file to the Apps Script project attached to the original Google Sheet.
 * In Project Settings > Script properties add:
 * GT_SYNC_URL = https://bqyokjwuxyzyiripijbs.supabase.co/functions/v1/zeer-kyu-war-public-entrants
 * GT_SYNC_SECRET = private sync secret supplied to the sheet owner.
 * Optional (web sign-ups → tab "สมัครผ่านเว็บ"):
 * GT_SUPABASE_URL = https://bqyokjwuxyzyiripijbs.supabase.co
 * GT_PUBLIC_KEY   = the site's public (anon / publishable) key — the same one the website uses; it only reads public fields.
 * Run installSyncTrigger() once and approve Google permissions.
 * NEVER write the secret into the worksheet or share it publicly.
 */
const SOURCE_TAB = "การตอบแบบฟอร์ม 1";
const STATUS_TAB = "WEB SYNC";
const SOURCE_SPREADSHEET_ID = "1D35CRcyH-VkR6sNtZUdz8aGwaKoDd09R9uaqGYMoDfI";
const WEB_TAB = "สมัครผ่านเว็บ";
const EVENT_ID = "ce1382d9-1e1f-4697-8fe4-6a1a347d91eb";

/** Both directions: Google Form rows → website, and website sign-ups → tab "สมัครผ่านเว็บ". */
function syncAll() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("GT_SYNC_SECRET")) syncPublicEntrants();
  if (props.getProperty("GT_PUBLIC_KEY")) pullWebEntrants();
}

/**
 * Writes the website's sign-ups (name, institution, division, payment state, time) into WEB_TAB.
 * Contact details and slips stay on the website (organiser page) and are never copied here.
 */
function pullWebEntrants() {
  const props = PropertiesService.getScriptProperties();
  const base = props.getProperty("GT_SUPABASE_URL") || "https://bqyokjwuxyzyiripijbs.supabase.co";
  const key = props.getProperty("GT_PUBLIC_KEY");
  if (!key) throw new Error("Missing GT_PUBLIC_KEY");
  const res = UrlFetchApp.fetch(base + "/rest/v1/rpc/gt_public_web_entrants_v1", {
    method: "post", contentType: "application/json", headers: { apikey: key, Authorization: "Bearer " + key },
    payload: JSON.stringify({ p_tournament: EVENT_ID }), muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error("Web entrants: HTTP " + res.getResponseCode() + " " + res.getContentText());
  const list = JSON.parse(res.getContentText()) || [];
  const book = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const tab = book.getSheetByName(WEB_TAB) || book.insertSheet(WEB_TAB);
  const rows = [["ลำดับ", "ชื่อ–นามสกุล", "สถาบัน", "รุ่นแข่งขัน", "สถานะ", "เวลาสมัคร"]].concat(
    list.map((x, i) => [i + 1, x.full_name, x.institution, x.division, x.payment_status, new Date(x.created_at)]));
  tab.clearContents();
  tab.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  if (rows.length > 1) tab.getRange(2, 6, rows.length - 1, 1).setNumberFormat("dd/MM/yyyy HH:mm");
  tab.setFrozenRows(1);
  console.log("Web sign-ups: " + list.length);
}

function syncPublicEntrants() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const url = props.getProperty("GT_SYNC_URL");
    const secret = props.getProperty("GT_SYNC_SECRET");
    if (!url || !secret) throw new Error("Missing GT_SYNC_URL / GT_SYNC_SECRET");
    const workbook = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
    const sheet = workbook.getSheetByName(SOURCE_TAB);
    if (!sheet) throw new Error("Source tab not found");
    const data = sheet.getDataRange().getDisplayValues();
    const allowed = new Set(["1-2 Kyu","3-4 Kyu","5-6 Kyu","7-8 Kyu","9-12 Kyu","OPEN Friendship 9×9","OPEN Friendship 13×13"]);
    const rows = data.slice(1).map((r,i)=>({
      source_row:i+2,
      title:(r[1]||"").trim(),
      full_name:(r[2]||"").trim(),
      institution:(r[4]||"").trim(),
      division_name:(r[7]||"").trim(),
      payment_status:(r[9]||"รออัปเดต").trim()
    })).filter(r=>r.full_name && allowed.has(r.division_name));
    if (!rows.length) throw new Error("No valid entrant rows: refusing to clear website data");
    const response = UrlFetchApp.fetch(url,{
      method:"post",contentType:"application/json",
      headers:{"x-sync-secret":secret},
      payload:JSON.stringify({rows}),muteHttpExceptions:true
    });
    if(response.getResponseCode()!==200)throw new Error("Sync failed: HTTP "+response.getResponseCode()+" "+response.getContentText());
    const status = workbook.getSheetByName(STATUS_TAB);
    if (status) {
      status.getRange("B2").setValue("ซิงก์สำเร็จ");
      status.getRange("B3").setValue(new Date()).setNumberFormat("dd/MM/yyyy HH:mm:ss");
      status.getRange("B4").setValue(rows.length);
    }
    console.log("Synced "+rows.length+" public entrants");
  } finally { lock.releaseLock(); }
}

function installSyncTrigger() {
  syncAll(); // Validate access and connectivity before enabling recurrence.
  ScriptApp.getProjectTriggers()
    .filter(t=>["syncPublicEntrants","syncAll"].includes(t.getHandlerFunction()))
    .forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncAll").timeBased().everyMinutes(5).create();
}
