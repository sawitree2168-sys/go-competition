/**
 * ZEER GO KYU WAR 2026 — Google Sheets -> GO TOURNAMENT
 * Setup (once): Apps Script > Project Settings > Script properties:
 * GT_SYNC_URL = https://go-competition.vercel.app/api/sync/zeer-kyu-war
 * GT_SYNC_SECRET = same secret configured as GT_SHEETS_SYNC_SECRET in Vercel.
 * Run installSyncTrigger() once and grant Google authorization.
 */
const SOURCE_TAB = "การตอบแบบฟอร์ม 1";
const SOURCE_SPREADSHEET_ID = "1D35CRcyH-VkR6sNtZUdz8aGwaKoDd09R9uaqGYMoDfI";
function syncPublicEntrants() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty("GT_SYNC_URL");
  const secret = props.getProperty("GT_SYNC_SECRET");
  if (!url || !secret) throw new Error("Missing GT_SYNC_URL / GT_SYNC_SECRET");
  const sheet = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID).getSheetByName(SOURCE_TAB);
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
  const response=UrlFetchApp.fetch(url,{method:"post",contentType:"application/json",headers:{"x-sync-secret":secret},payload:JSON.stringify({rows}),muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw new Error("Sync failed: HTTP "+response.getResponseCode()+" "+response.getContentText());
  console.log(response.getContentText());
}
function installSyncTrigger(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==="syncPublicEntrants").forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncPublicEntrants").timeBased().everyMinutes(5).create();
  syncPublicEntrants();
}
