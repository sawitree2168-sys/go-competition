// Draws one certificate on a canvas (A4 landscape, 2000 × 1414 at full size). Text uses the site font (Prompt).
import { awardOf, jpegToPdf, fileName } from "@/lib/certificate.mjs";
import { divisionLabel, thaiDate } from "@/lib/division-display";

export type Cert = {
  tournament_id: string; title: string; event_date: string | null; venue: string | null; organizer: string | null;
  division_id: string; division: string; open: boolean; kind: "placement" | "medal" | "participation" | null;
  pos: number | null; medal: "gold" | "silver" | "bronze" | null; number: string | null; signers: { name: string; title: string }[];
  template?: Template | null;
};
/** The event's own certificate picture; the site only writes the name and award on it. y values are fractions of the page height. */
export type Template = { bg: string; name_y: number; award_y: number; size: number; color: string; division: boolean; number: boolean };
export const DEFAULT_TEMPLATE: Omit<Template, "bg"> = { name_y: 0.45, award_y: 0.56, size: 104, color: "#0b2a5b", division: true, number: false };

export const W = 2000, H = 1414;
const NAVY = "#0b2a5b", BLUE = "#1f4ea3", SOFT = "#cfe0fb", MUTED = "#5a6e8f";
const TONE: Record<string, [string, string, string]> = {
  gold: ["#ffe29a", "#f0bf55", "#8a5a00"], silver: ["#f3f5f8", "#b9c2cf", "#4a5566"], bronze: ["#f6d2b0", "#cd8a52", "#6b3a12"],
};

let fontsReady: Promise<unknown> | null = null;
export function loadFonts() {
  fontsReady ??= Promise.all(["400", "500", "600"].map((w) => document.fonts.load(`${w} 40px Prompt`, "กขคABC"))).catch(() => null);
  return fontsReady;
}

function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, max: number) {
  let s = size;
  do { ctx.font = `${weight} ${s}px Prompt, "Noto Sans Thai", sans-serif`; s -= 2; } while (ctx.measureText(text).width > max && s > 20);
}
function center(ctx: CanvasRenderingContext2D, text: string, y: number, weight: number, size: number, color: string, max = 1500) {
  fit(ctx, text, weight, size, max); ctx.fillStyle = color; ctx.textAlign = "center"; ctx.fillText(text, W / 2, y);
}
function stone(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, black: boolean) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  if (black) { g.addColorStop(0, "#5b6170"); g.addColorStop(0.65, "#0b0d12"); } else { g.addColorStop(0, "#ffffff"); g.addColorStop(0.7, "#e2e6ec"); g.addColorStop(1, "#aab2bf"); }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  if (!black) { ctx.lineWidth = 2; ctx.strokeStyle = "#9aa3b2"; ctx.stroke(); }
}
function boardCorner(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number) {
  ctx.save(); ctx.strokeStyle = SOFT; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(x, y + dy * i * 44); ctx.lineTo(x + dx * 220, y + dy * i * 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + dx * i * 44, y); ctx.lineTo(x + dx * i * 44, y + dy * 220); ctx.stroke();
  }
  ctx.restore();
  stone(ctx, x + dx * 88, y + dy * 44, 15, true); stone(ctx, x + dx * 132, y + dy * 88, 15, false); stone(ctx, x + dx * 44, y + dy * 132, 15, true);
}

/** Trophy cup (gold / silver / bronze) with the place number on the cup. */
function trophy(ctx: CanvasRenderingContext2D, cx: number, cy: number, [light, mid, ink]: [string, string, string], place: number) {
  ctx.save();
  const metal = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
  metal.addColorStop(0, mid); metal.addColorStop(0.45, light); metal.addColorStop(1, mid);
  ctx.fillStyle = metal; ctx.strokeStyle = ink; ctx.lineWidth = 4;
  // handles
  ctx.lineWidth = 14; ctx.strokeStyle = mid;
  ctx.beginPath(); ctx.arc(cx - 80, cy - 76, 32, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 80, cy - 76, 32, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  // cup
  ctx.lineWidth = 4; ctx.strokeStyle = ink;
  ctx.beginPath(); ctx.moveTo(cx - 84, cy - 118); ctx.lineTo(cx + 84, cy - 118);
  ctx.bezierCurveTo(cx + 84, cy - 30, cx + 40, cy + 6, cx + 16, cy + 12); ctx.lineTo(cx - 16, cy + 12);
  ctx.bezierCurveTo(cx - 40, cy + 6, cx - 84, cy - 30, cx - 84, cy - 118); ctx.closePath(); ctx.fill(); ctx.stroke();
  // stem + base
  ctx.fillRect(cx - 14, cy + 12, 28, 40); ctx.strokeRect(cx - 14, cy + 12, 28, 40);
  ctx.beginPath(); ctx.moveTo(cx - 62, cy + 52); ctx.lineTo(cx + 62, cy + 52); ctx.lineTo(cx + 74, cy + 86); ctx.lineTo(cx - 74, cy + 86); ctx.closePath(); ctx.fill(); ctx.stroke();
  // number on the cup
  ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.font = `700 76px Prompt, sans-serif`; ctx.fillText(String(place), cx, cy - 38);
  ctx.restore();
}

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
  let p = images.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((ok, bad) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => ok(im); im.onerror = () => bad(new Error("image")); im.src = src; });
    p.catch(() => images.delete(src));
    images.set(src, p);
  }
  return p;
}

/** Award text on an event's own design: winners get their place, everyone else "เข้าร่วมการแข่งขัน". */
export function templateAward(c: Cert) {
  const a = awardOf(c);
  return a.award ? { lead: "ได้รับรางวัล ", award: a.award, tone: a.tone } : { lead: "", award: "เข้าร่วมการแข่งขัน", tone: "none" };
}

async function drawOnTemplate(canvas: HTMLCanvasElement, c: Cert, t: Template, personName: string, scale: number) {
  const img = await loadImage(t.bg);
  const portrait = img.naturalHeight > img.naturalWidth;
  const PW = portrait ? H : W, PH = portrait ? W : H;
  canvas.width = Math.round(PW * scale); canvas.height = Math.round(PH * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, PW, PH);
  // cover: fill the page, crop any overflow evenly
  const k = Math.max(PW / img.naturalWidth, PH / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
  ctx.drawImage(img, (PW - iw) / 2, (PH - ih) / 2, iw, ih);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "center";
  const max = PW * 0.8, cx = PW / 2, size = t.size;
  const text = (s: string, y: number, weight: number, px: number, color: string) => { fit(ctx, s, weight, px, max); ctx.fillStyle = color; ctx.textAlign = "center"; ctx.fillText(s, cx, y); };

  text(personName, t.name_y * PH, 600, size, t.color);
  const aw = templateAward(c), ay = t.award_y * PH, asz = Math.round(size * 0.6);
  if (aw.lead) {
    fit(ctx, aw.lead + aw.award, 600, asz, max);
    const px = parseInt(ctx.font.split(" ")[1]);
    ctx.font = `500 ${px}px Prompt, sans-serif`; const w1 = ctx.measureText(aw.lead).width;
    ctx.font = `600 ${px}px Prompt, sans-serif`; const w2 = ctx.measureText(aw.award).width;
    const x0 = cx - (w1 + w2) / 2; ctx.textAlign = "left";
    ctx.font = `500 ${px}px Prompt, sans-serif`; ctx.fillStyle = t.color; ctx.fillText(aw.lead, x0, ay);
    ctx.font = `600 ${px}px Prompt, sans-serif`; ctx.fillStyle = TONE[aw.tone]?.[2] ?? t.color; ctx.fillText(aw.award, x0 + w1, ay);
  } else {
    text(aw.award, ay, 500, asz, t.color);
  }
  if (t.division) text(divisionLabel(c.division), ay + asz * 1.35, 500, Math.round(size * 0.48), t.color);
  if (t.number && c.number) { ctx.font = `400 ${Math.round(PW * 0.013)}px Prompt, sans-serif`; ctx.fillStyle = t.color; ctx.textAlign = "left"; ctx.fillText(`เลขที่ ${c.number}`, PW * 0.055, PH * 0.955); }
}

export async function drawCertificate(canvas: HTMLCanvasElement, c: Cert, personName: string, verifyUrl: string, scale = 1) {
  await loadFonts();
  if (c.template?.bg) {
    try { return await drawOnTemplate(canvas, c, c.template, personName, scale); } catch { /* picture unavailable → built-in design */ }
  }
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textBaseline = "alphabetic";
  const a = awardOf(c);

  // paper + borders
  const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#ffffff"); bg.addColorStop(1, "#f1f6fe");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = BLUE; ctx.lineWidth = 14; ctx.strokeRect(46, 46, W - 92, H - 92);
  ctx.strokeStyle = "#8fb3ea"; ctx.lineWidth = 3; ctx.strokeRect(72, 72, W - 144, H - 144);
  boardCorner(ctx, 96, 96, 1, 1);
  ctx.save(); ctx.globalAlpha = 0.5; boardCorner(ctx, W - 96, 96, -1, 1); ctx.restore();

  // logo
  stone(ctx, W / 2 - 22, 168, 30, true); stone(ctx, W / 2 + 22, 168, 30, false);
  center(ctx, "GO TOURNAMENT", 238, 600, 34, NAVY);

  center(ctx, "ใบประกาศนียบัตร", 380, 600, 124, NAVY);
  center(ctx, "ขอมอบใบประกาศนียบัตรนี้เพื่อแสดงว่า", 470, 400, 46, MUTED);
  center(ctx, personName, 610, 600, 112, NAVY, 1400);
  // name underline
  ctx.strokeStyle = "#c8d6ee"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 - 520, 650); ctx.lineTo(W / 2 + 520, 650); ctx.stroke();

  if (a.award) {
    fit(ctx, "ได้รับรางวัล ", 500, 62, 1400);
    const lead = "ได้รับรางวัล ", w1 = ctx.measureText(lead).width;
    ctx.font = `600 66px Prompt, sans-serif`; const w2 = ctx.measureText(a.award).width;
    const x0 = W / 2 - (w1 + w2) / 2;
    ctx.textAlign = "left"; ctx.font = `500 62px Prompt, sans-serif`; ctx.fillStyle = NAVY; ctx.fillText(lead, x0, 760);
    ctx.font = `600 66px Prompt, sans-serif`; ctx.fillStyle = TONE[a.tone]?.[2] ?? "#8a5a00"; ctx.fillText(a.award, x0 + w1, 760);
  } else {
    center(ctx, a.line, 760, 500, 62, NAVY);
  }
  center(ctx, divisionLabel(c.division), 845, 500, 52, NAVY);
  center(ctx, `ในการแข่งขัน ${c.title}`, 925, 400, 46, NAVY, 1500);
  const when = [c.event_date ? `เมื่อวันที่ ${thaiDate(c.event_date)}` : "", c.venue ? `ณ ${c.venue}` : ""].filter(Boolean).join(" ");
  if (when) center(ctx, when, 990, 400, 38, MUTED, 1500);

  // ถ้วยสำหรับอันดับ 1–3 (ทอง/เงิน/ทองแดง พร้อมเลขอันดับ) · เหรียญสำหรับรุ่นเฟรนชิพ · ใบเข้าร่วมไม่มีสัญลักษณ์
  if (TONE[a.tone] && c.kind === "placement") trophy(ctx, W / 2, 1150, TONE[a.tone], c.pos ?? 1);
  else if (TONE[a.tone]) {
    const [l, m, ink] = TONE[a.tone]; const sx = W / 2, sy = 1140, r = 78;
    ctx.save();
    ctx.fillStyle = m; for (const dx of [-34, 34]) { ctx.beginPath(); ctx.moveTo(sx + dx - 22, sy + 40); ctx.lineTo(sx + dx + 22, sy + 40); ctx.lineTo(sx + dx + 30, sy + 150); ctx.lineTo(sx + dx, sy + 128); ctx.lineTo(sx + dx - 30, sy + 150); ctx.closePath(); ctx.fill(); }
    const g = ctx.createRadialGradient(sx - 25, sy - 30, 10, sx, sy, r); g.addColorStop(0, l); g.addColorStop(1, m);
    ctx.beginPath(); for (let i = 0; i < 48; i++) { const ang = (i / 48) * Math.PI * 2, rr = i % 2 ? r : r + 9; ctx.lineTo(sx + Math.cos(ang) * rr, sy + Math.sin(ang) * rr); } ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.beginPath(); ctx.arc(sx, sy, r - 14, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    center(ctx, a.award.replace("เหรียญ", ""), sy + 14, 600, 40, ink, 120);
  }

  // signers (typed by the organiser) — or the organiser's name
  const signers = c.signers.length ? c.signers : [{ name: c.organizer ?? "", title: "ผู้จัดการแข่งขัน" }];
  const xs = signers.length === 1 ? [W / 2 + (TONE[a.tone] ? 520 : 0)] : [W / 2 - 560, W / 2 + 560];
  signers.forEach((s, i) => {
    const x = xs[i];
    ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 220, 1170); ctx.lineTo(x + 220, 1170); ctx.stroke();
    ctx.textAlign = "center";
    if (s.name) { fit(ctx, `(${s.name})`, 500, 36, 460); ctx.fillStyle = NAVY; ctx.fillText(`(${s.name})`, x, 1220); }
    if (s.title) { fit(ctx, s.title, 400, 32, 460); ctx.fillStyle = MUTED; ctx.fillText(s.title, x, s.name ? 1266 : 1220); }
  });

  // number + verification
  ctx.font = `400 26px Prompt, sans-serif`; ctx.fillStyle = MUTED;
  ctx.textAlign = "left"; if (c.number) ctx.fillText(`เลขที่ ${c.number}`, 110, H - 108);
  ctx.textAlign = "right"; ctx.fillText(`ตรวจสอบผลได้ที่ ${verifyUrl.replace(/^https?:\/\//, "").split("/")[0]}`, W - 110, H - 108);
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const toBlob = (canvas: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((ok, bad) => canvas.toBlob((b) => (b ? ok(b) : bad(new Error("canvas"))), type, q));

export async function downloadCertificate(c: Cert, personName: string, verifyUrl: string, kind: "pdf" | "png") {
  const canvas = document.createElement("canvas");
  await drawCertificate(canvas, c, personName, verifyUrl, 1);
  const name = fileName(personName, c.title);
  if (kind === "png") return save(await toBlob(canvas, "image/png"), `${name}.png`);
  const jpeg = new Uint8Array(await (await toBlob(canvas, "image/jpeg", 0.92)).arrayBuffer());
  save(new Blob([jpegToPdf(jpeg, canvas.width, canvas.height) as BlobPart], { type: "application/pdf" }), `${name}.pdf`);
}
