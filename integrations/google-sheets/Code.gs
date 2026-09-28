const GO_MATCH_SHEET = 'นำเข้าประวัติแมตช์';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GO TOURNAMENT')
    .addItem('1) ตรวจข้อมูล (ไม่บันทึก)', 'goDryRunMatches')
    .addItem('2) ส่งเข้าตารางพัก', 'goStageMatches')
    .addToUi();
}

function goDryRunMatches() {
  goSendMatches_(true);
}

function goStageMatches() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert('ส่งข้อมูลเข้าตารางพัก?', 'ระบบจะตรวจทุกแถวก่อน และยังไม่เผยแพร่ขึ้นหน้าเว็บ', ui.ButtonSet.OK_CANCEL);
  if (answer === ui.Button.OK) goSendMatches_(false);
}

function goSendMatches_(dryRun) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty('GO_IMPORT_ENDPOINT');
  const secret = props.getProperty('GO_IMPORT_SECRET');
  if (!endpoint || !secret) throw new Error('กรุณาตั้งค่า GO_IMPORT_ENDPOINT และ GO_IMPORT_SECRET ใน Script Properties');

  const file = SpreadsheetApp.getActive();
  const sheet = file.getSheetByName(GO_MATCH_SHEET);
  if (!sheet) throw new Error('ไม่พบชีต ' + GO_MATCH_SHEET);

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) throw new Error('ยังไม่มีข้อมูลสำหรับนำเข้า');

  const headers = values[0].map(String);
  const index = {};
  headers.forEach((header, i) => index[header.trim()] = i);
  const required = ['รหัสแมตช์', 'ปีข้อมูล', 'รายการ/ชีต', 'รุ่นแข่งขัน', 'รอบที่', 'รหัส/เลขผู้เล่น A', 'ชื่อผู้เล่น A', 'ผลผู้เล่น A', 'ตรวจสอบแล้ว'];
  const missing = required.filter((header) => index[header] === undefined);
  if (missing.length) throw new Error('หัวคอลัมน์ไม่ครบ: ' + missing.join(', '));

  const get = (row, header) => index[header] === undefined ? '' : row[index[header]];
  const rows = values.slice(1).filter((row) => row.some((cell) => String(cell).trim())).map((row) => ({
    sourceMatchId: get(row, 'รหัสแมตช์'),
    competitionYear: get(row, 'ปีข้อมูล'),
    playedOn: get(row, 'วันที่แข่งขัน'),
    eventCode: '',
    eventName: get(row, 'รายการ/ชีต'),
    division: get(row, 'รุ่นแข่งขัน'),
    round: get(row, 'รอบที่'),
    board: get(row, 'กระดานที่'),
    playerACode: get(row, 'รหัส/เลขผู้เล่น A'),
    playerAName: get(row, 'ชื่อผู้เล่น A'),
    playerAResult: get(row, 'ผลผู้เล่น A'),
    playerARatingChange: get(row, 'คะแนนเปลี่ยน A'),
    playerBCode: get(row, 'รหัส/เลขผู้เล่น B'),
    playerBName: get(row, 'ชื่อผู้เล่น B'),
    playerBResult: get(row, 'ผลผู้เล่น B'),
    playerBRatingChange: get(row, 'คะแนนเปลี่ยน B'),
    winnerCode: '',
    winnerName: get(row, 'ผู้ชนะ'),
    loserCode: '',
    loserName: get(row, 'ผู้แพ้'),
    sourceRef: get(row, 'แหล่งข้อมูล'),
    verified: get(row, 'ตรวจสอบแล้ว'),
    note: get(row, 'หมายเหตุ'),
  }));

  const response = UrlFetchApp.fetch(endpoint + (dryRun ? '?dryRun=1' : ''), {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-go-import-secret': secret },
    payload: JSON.stringify({ sourceFileId: file.getId(), sourceSheet: GO_MATCH_SHEET, rows }),
    muteHttpExceptions: true,
  });
  const result = JSON.parse(response.getContentText() || '{}');
  if (response.getResponseCode() >= 400) {
    const examples = (result.errors || []).slice(0, 10).map((e) => 'แถว ' + e.row + ' [' + e.field + '] ' + e.message).join('\n');
    SpreadsheetApp.getUi().alert('ตรวจไม่ผ่าน', examples || result.message || 'เกิดข้อผิดพลาด', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  SpreadsheetApp.getUi().alert(
    dryRun ? 'ตรวจข้อมูลผ่าน' : 'ส่งเข้าตารางพักแล้ว',
    'รับ ' + result.stats.received + ' แถว • ถูกต้อง ' + result.stats.valid + ' แถว\n' +
      (dryRun ? 'ยังไม่มีการบันทึกข้อมูล' : 'Batch ID: ' + result.batchId + '\nยังไม่เผยแพร่ขึ้นหน้าเว็บ'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
