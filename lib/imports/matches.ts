export type MatchResult = "win" | "loss" | "draw" | "bye" | "cancelled";

export type MatchImportRow = {
  sourceMatchId: string;
  competitionYear: number;
  playedOn: string | null;
  eventCode: string;
  eventName: string;
  division: string;
  round: number;
  board: number | null;
  playerACode: string;
  playerAName: string;
  playerAResult: MatchResult;
  playerARatingChange: number | null;
  playerBCode: string | null;
  playerBName: string | null;
  playerBResult: MatchResult | null;
  playerBRatingChange: number | null;
  winnerCode: string | null;
  winnerName: string | null;
  loserCode: string | null;
  loserName: string | null;
  sourceRef: string;
  verified: boolean;
  note: string | null;
};

export type MatchImportPayload = {
  sourceFileId: string;
  sourceSheet: string;
  rows: unknown[];
};

export type RowError = { row: number; field: string; message: string };

const resultAliases: Record<string, MatchResult> = {
  win: "win", w: "win", "ชนะ": "win",
  loss: "loss", lose: "loss", l: "loss", "แพ้": "loss",
  draw: "draw", d: "draw", "เสมอ": "draw",
  bye: "bye", "บาย": "bye",
  cancelled: "cancelled", canceled: "cancelled", "ยกเลิก": "cancelled",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function optionalText(value: unknown): string | null {
  const valueText = text(value);
  return valueText || null;
}

function integer(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function result(value: unknown): MatchResult | null {
  return resultAliases[text(value).toLowerCase()] ?? null;
}

function bool(value: unknown): boolean {
  return value === true || ["true", "yes", "y", "1", "ตรวจสอบแล้ว"].includes(text(value).toLowerCase());
}

export function validateMatchImport(input: unknown): {
  payload: MatchImportPayload | null;
  rows: MatchImportRow[];
  errors: RowError[];
} {
  if (!input || typeof input !== "object") {
    return { payload: null, rows: [], errors: [{ row: 0, field: "payload", message: "รูปแบบข้อมูลไม่ถูกต้อง" }] };
  }

  const raw = input as Record<string, unknown>;
  const payload: MatchImportPayload = {
    sourceFileId: text(raw.sourceFileId),
    sourceSheet: text(raw.sourceSheet),
    rows: Array.isArray(raw.rows) ? raw.rows : [],
  };
  const errors: RowError[] = [];
  if (!payload.sourceFileId) errors.push({ row: 0, field: "sourceFileId", message: "ไม่พบรหัสไฟล์ต้นทาง" });
  if (!payload.sourceSheet) errors.push({ row: 0, field: "sourceSheet", message: "ไม่พบชื่อชีตต้นทาง" });
  if (!Array.isArray(raw.rows)) errors.push({ row: 0, field: "rows", message: "rows ต้องเป็นรายการ" });

  const seen = new Set<string>();
  const rows: MatchImportRow[] = [];

  payload.rows.forEach((value, index) => {
    const sheetRow = index + 2;
    const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const row: MatchImportRow = {
      sourceMatchId: text(source.sourceMatchId),
      competitionYear: integer(source.competitionYear) ?? 0,
      playedOn: optionalText(source.playedOn),
      eventCode: text(source.eventCode),
      eventName: text(source.eventName),
      division: text(source.division),
      round: integer(source.round) ?? 0,
      board: integer(source.board),
      playerACode: text(source.playerACode),
      playerAName: text(source.playerAName),
      playerAResult: result(source.playerAResult) ?? "cancelled",
      playerARatingChange: integer(source.playerARatingChange),
      playerBCode: optionalText(source.playerBCode),
      playerBName: optionalText(source.playerBName),
      playerBResult: result(source.playerBResult),
      playerBRatingChange: integer(source.playerBRatingChange),
      winnerCode: optionalText(source.winnerCode),
      winnerName: optionalText(source.winnerName),
      loserCode: optionalText(source.loserCode),
      loserName: optionalText(source.loserName),
      sourceRef: text(source.sourceRef),
      verified: bool(source.verified),
      note: optionalText(source.note),
    };

    const add = (field: string, message: string) => errors.push({ row: sheetRow, field, message });
    if (!row.sourceMatchId) add("sourceMatchId", "ต้องมีรหัสแมตช์");
    if (seen.has(row.sourceMatchId)) add("sourceMatchId", "รหัสแมตช์ซ้ำในชุดข้อมูล");
    seen.add(row.sourceMatchId);
    if (row.competitionYear < 2000 || row.competitionYear > 2200) add("competitionYear", "ปีข้อมูลไม่ถูกต้อง");
    if (!row.eventCode && !row.eventName) add("event", "ต้องมีรหัสงานหรือชื่องาน");
    if (!row.division) add("division", "ต้องมีรุ่นแข่งขัน");
    if (row.round < 1) add("round", "รอบต้องเป็นเลขตั้งแต่ 1");
    if (!row.playerACode) add("playerACode", "ต้องมี GO ID/รหัสผู้เล่น A");
    if (!row.playerAName) add("playerAName", "ต้องมีชื่อผู้เล่น A");
    if (row.playerAResult !== "bye") {
      if (!row.playerBCode) add("playerBCode", "ต้องมี GO ID/รหัสผู้เล่น B ยกเว้น BYE");
      if (!row.playerBName) add("playerBName", "ต้องมีชื่อผู้เล่น B ยกเว้น BYE");
      if (!row.playerBResult) add("playerBResult", "ต้องมีผลผู้เล่น B");
    }
    if (row.playerBCode && row.playerACode === row.playerBCode) add("playerBCode", "ผู้เล่น A และ B ต้องไม่ใช่คนเดียวกัน");
    if (row.playerAResult === "win" && row.playerBResult !== "loss") add("playerBResult", "ผล A ชนะ ต้องคู่กับ B แพ้");
    if (row.playerAResult === "loss" && row.playerBResult !== "win") add("playerBResult", "ผล A แพ้ ต้องคู่กับ B ชนะ");
    if (row.playerAResult === "draw" && row.playerBResult !== "draw") add("playerBResult", "ผลเสมอต้องตรงกันทั้งสองฝ่าย");
    if (row.playerAResult === "bye" && row.playerBCode) add("playerBCode", "BYE ต้องไม่มีผู้เล่น B");
    if (!row.verified) add("verified", "ต้องยืนยันตรวจสอบข้อมูลก่อนส่งเข้าตารางพัก");
    rows.push(row);
  });

  return { payload, rows, errors };
}
