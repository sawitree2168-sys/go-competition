/**
 * Display helpers for divisions on public event pages.
 * The DB stores Thai names ("1–2 คิว", "เฟรนชิพ 9×9") while the Google Sheet import
 * uses English ("1-2 Kyu", "OPEN Friendship 9×9"); divisionKey maps both to one key.
 */
export function divisionKey(name: string): string {
  const v = name.toLowerCase().replace(/[–—−]/g, "-").replace(/\s+/g, "");
  if (v.includes("friendship") || v.includes("เฟรนชิพ")) {
    if (/13[x×*]13/.test(v)) return "friendship:13";
    if (/9[x×*]9/.test(v)) return "friendship:9";
  }
  if (/dan|ดั้ง/.test(v)) {
    const d = v.match(/(\d+)(-\d+)?/);
    return "dan:" + (d ? d[0] : "1");
  }
  const k = v.match(/(\d+-\d+|\d+)/);
  if (k && (v.includes("kyu") || v.includes("คิว"))) return "kyu:" + k[1];
  return "other:" + v;
}

/** Order: Dan first, then Kyu from strongest (1–2) to weakest, then Friendship 9×9, 13×13. */
export function divisionSortValue(name: string): number {
  const key = divisionKey(name);
  const n = Number((key.split(":")[1] || "").split("-")[0]) || 0;
  if (key.startsWith("dan:")) return 0 - n;
  if (key.startsWith("kyu:")) return 100 + n;
  if (key.startsWith("friendship:")) return 300 + n;
  return 900;
}

/** "1–2 คิว" -> "รุ่น 1-2 คิว", "เฟรนชิพ 9×9" -> "รุ่นเฟรนชิพ 9x9" (matches the approved mockups). */
export function divisionLabel(name: string): string {
  const clean = name.replace(/[–—−]/g, "-").replace(/×/g, "x").trim();
  if (/^รุ่น/.test(clean)) return clean;
  return /^เฟรนชิพ/.test(clean) ? "รุ่น" + clean : "รุ่น " + clean;
}

export function boardSize(name: string, friendshipBoardSize: number | null): number {
  if (friendshipBoardSize) return friendshipBoardSize;
  const key = divisionKey(name);
  if (key === "friendship:9") return 9;
  if (key === "friendship:13") return 13;
  return 19;
}

export const thaiDate = (iso: string | null, style: "long" | "short" = "long") =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("th-TH", { day: "numeric", month: style, year: "numeric" }) : null;
