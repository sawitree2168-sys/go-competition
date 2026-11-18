/** Public follow keys survive publication of pairings: no generated demo identities. */
export function fanName(name = "") {
  return name.normalize("NFC").replace(/^(?:ด\.?\s*ช\.?|ด\.?\s*ญ\.?|เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง)\s*/u, "").replace(/\s+/g, "").toLowerCase();
}
export function fanKey(eventId, divisionId, name) { return `${eventId}:${divisionId}:${fanName(name)}`; }
export function fanOutcome(match, athleteId) {
  if (!match || match.state !== "verified") return { kind: "waiting", label: "รอผลยืนยัน", detail: "" };
  if (match.result_code === "draw") return { kind: "draw", label: "เสมอ", detail: "½–½" };
  if (["double_loss", "double_forfeit"].includes(match.result_code)) return { kind: "loss", label: "แพ้", detail: match.result_code === "double_forfeit" ? "ไม่มาทั้งคู่" : "แพ้คู่" };
  if (!match.winner_athlete_id) return { kind: "waiting", label: "รอผลยืนยัน", detail: "" };
  const won = match.winner_athlete_id === athleteId;
  const side = match.winner_athlete_id === match.black_athlete_id ? "B" : "W";
  const forfeit = /forfeit/.test(match.result_code ?? "");
  return { kind: won ? "win" : "loss", label: won ? "ชนะ" : "แพ้", detail: forfeit ? "ชนะบาย / ไม่มาแข่งขัน" : `${side}+${match.result_margin || "ผลยืนยัน"}` };
}
export function readFanFollows(raw) {
  try {
    const rows=JSON.parse(raw ?? "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter(x => x && typeof x.key === "string" && typeof x.eventId === "string" && typeof x.name === "string" && typeof x.divisionName === "string").slice(0,100).map(x=>({key:x.key,eventId:x.eventId,name:x.name,divisionName:x.divisionName,institution:typeof x.institution === "string" ? x.institution : "",photo:typeof x.photo === "string" ? x.photo : null,notify:x.notify !== false}));
  } catch { return []; }
}
