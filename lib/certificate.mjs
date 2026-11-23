// Athlete certificates: wording from gt_athlete_certificates_v1 rows, and a tiny one-page PDF around a JPEG.

const PLACE = { 1: "ชนะเลิศ", 2: "รองชนะเลิศอันดับ 1", 3: "รองชนะเลิศอันดับ 2" };
const MEDAL = { gold: "เหรียญทอง", silver: "เหรียญเงิน", bronze: "เหรียญทองแดง" };

/**
 * @param {{open: boolean, kind: string|null, pos: number|null, medal: string|null}} c
 * @returns {{ready: boolean, award: string, type: string, line: string, tone: "gold"|"silver"|"bronze"|"blue"|"none"}}
 */
export function awardOf(c) {
  if (!c.open || !c.kind) return { ready: false, award: "", type: "รอออกใบประกาศ", line: "", tone: "none" };
  if (c.kind === "placement" && PLACE[c.pos]) {
    return { ready: true, award: PLACE[c.pos], type: `รางวัล${PLACE[c.pos]}`, line: `ได้รับรางวัล ${PLACE[c.pos]}`, tone: c.pos === 1 ? "gold" : c.pos === 2 ? "silver" : "bronze" };
  }
  if (c.kind === "medal" && MEDAL[c.medal]) {
    return { ready: true, award: MEDAL[c.medal], type: `รางวัล${MEDAL[c.medal]}`, line: `ได้รับรางวัล ${MEDAL[c.medal]}`, tone: c.medal };
  }
  return { ready: true, award: "", type: "เข้าร่วมการแข่งขัน", line: "ได้เข้าร่วมการแข่งขัน", tone: "blue" };
}

/** "ใบประกาศ-ธนวัฒน์-ศรีสุข-GO-KYU-CUP2026" (safe for every OS). */
export function fileName(personName, title) {
  const clean = (s) => String(s ?? "").normalize("NFC").replace(/[\\/:*?"<>|#%{}~&]/g, "").trim().replace(/\s+/g, "-");
  return `ใบประกาศ-${clean(personName)}-${clean(title)}`.slice(0, 120);
}

/**
 * One A4 page (landscape, or portrait for a tall picture) showing a JPEG edge to edge.
 * @param {Uint8Array} jpeg  @param {number} w  @param {number} h  pixel size of the JPEG
 * @returns {Uint8Array}
 */
export function jpegToPdf(jpeg, w, h) {
  const [pw, ph] = h > w ? [595.28, 841.89] : [841.89, 595.28]; // A4 portrait / landscape, points
  const enc = new TextEncoder();
  const parts = []; const offsets = []; let len = 0;
  const push = (b) => { const u = typeof b === "string" ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); for (const b of body) push(b); push("\nendobj\n"); };
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
  obj(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`]);
  obj(4, [`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, "\nendstream"]);
  obj(5, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
  const xref = len;
  push(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len); let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
