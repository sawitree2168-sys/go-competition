export const POSTER_STYLES = [
  "น้ำเงิน–ทอง", "เครื่องลายคราม", "ซากุระ", "กระดาษปิดทอง", "ผ้าไหมไทย",
  "หมึกดำซูมิเอะ", "ไผ่สีหยก", "เมเปิลฤดูใบไม้ร่วง", "คลื่นญี่ปุ่น", "ศาลากลางภูเขา",
  "ชิบิ", "กระดาษตัด", "สีน้ำดอกไม้", "ท้องฟ้าดวงดาว", "ดินปั้น",
  "สนามแข่งขัน", "กระจกสีฟ้า", "เส้นแผนที่", "ภาพถ่ายกระดานไม้", "สปอร์ตแชมเปญโกลด์",
] as const;

export type PosterChoice =
  | { mode: "pending" }
  | { mode: "original"; url: string }
  | { mode: "stock"; style: number };

export type PosterSetting = {
  event_key: string;
  mode: PosterChoice["mode"];
  style: number | null;
  original_url: string | null;
};

export const tournamentPosterKey = (id: string) => `tournament:${id}`;

export function stockPosterUrl(style: number, size: "desktop" | "mobile") {
  return `/posters/stock/${String(style).padStart(2, "0")}-${size}.webp`;
}

export function resolvePoster(setting: PosterSetting | undefined, original: string | null): PosterChoice {
  if (setting?.mode === "stock" && setting.style !== null) return { mode: "stock", style: setting.style };
  if (setting?.mode === "original" && setting.original_url) return { mode: "original", url: setting.original_url };
  if (setting?.mode !== "pending" && original) return { mode: "original", url: original };
  return { mode: "pending" };
}

export function eventEditionKey(title: string, date: string | null) {
  return `${title.normalize("NFC").replace(/[‘’]/g, "'").replace(/\s+/g, "").toLowerCase()}|${date ?? ""}`;
}
