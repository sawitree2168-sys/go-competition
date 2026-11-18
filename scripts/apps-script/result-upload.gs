/**
 * GO TOURNAMENT · รับไฟล์ผลการแข่งขันจากผู้ปกครอง แล้วเก็บใน Google Drive ของเจ้าของเว็บ
 *
 * ติดตั้งครั้งเดียว (ดูขั้นตอนใน scripts/apps-script/README.md):
 *   1. script.google.com → New project → วางโค้ดนี้ทั้งหมด → Save
 *   2. เลือกฟังก์ชัน setup → Run → อนุญาตสิทธิ์ Drive
 *   3. Deploy → New deployment → Web app · Execute as: Me · Who has access: Anyone → Deploy
 *   4. คัดลอก Web app URL (ลงท้ายด้วย /exec) ไปวางที่หน้าเจ้าของระบบ → "ผลแข่งจากผู้ปกครอง"
 *
 * The website asks the database for a one-time ticket (signed-in users only), then posts the file here.
 * This script checks the ticket, saves the file in one Drive folder and records the Drive file id.
 */
const SUPABASE_URL = 'https://bqyokjwuxyzyiripijbs.supabase.co';
// Public (anon) key: the same key the website already ships to every browser.
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxeW9rand1eHl6eWlyaXBpamJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODk1MDksImV4cCI6MjA5Mjk2NTUwOX0.rcn-EBVPtPo-Re7lxPFIVB-t4dtJ0hh3ScNezdL2GbQ';
const FOLDER_NAME = 'ผลแข่งจากผู้ปกครอง (GO TOURNAMENT)';
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel|text\/csv)$/;

function rpc_(name, args) {
  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
    payload: JSON.stringify(args),
    muteHttpExceptions: true,
  });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* folder deleted: make a new one */ }
  }
  const f = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!/^[0-9a-f-]{36}$/.test(d.ticket || '')) return json_({ ok: false, error: 'BAD_TICKET' });
    const check = rpc_('gt_result_ticket_ok_v1', { p_ticket: d.ticket });
    if (check.code !== 200 || check.body.trim() !== 'true') return json_({ ok: false, error: 'BAD_TICKET' });
    if (!ALLOWED.test(d.mime || '')) return json_({ ok: false, error: 'BAD_TYPE' });
    const bytes = Utilities.base64Decode(d.data || '');
    if (!bytes.length || bytes.length > MAX_BYTES) return json_({ ok: false, error: 'TOO_BIG' });
    const name = String(d.name || 'file').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
    const file = folder_().createFile(Utilities.newBlob(bytes, d.mime, d.ticket.slice(0, 8) + '_' + name));
    const attach = rpc_('gt_result_file_attach_v1', {
      p_ticket: d.ticket, p_drive_file_id: file.getId(), p_file_name: name, p_mime: d.mime, p_size: bytes.length,
    });
    if (attach.code !== 200) {
      file.setTrashed(true);
      return json_({ ok: false, error: 'ATTACH_FAILED' });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'SERVER' });
  }
}

function doGet() {
  return json_({ ok: true, service: 'GO TOURNAMENT result upload' });
}

/** Run once from the editor: asks for Drive permission and creates the folder. */
function setup() {
  const f = folder_();
  Logger.log('โฟลเดอร์พร้อมแล้ว: ' + f.getUrl());
}
