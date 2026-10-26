// Isolated migration helper. Backend-backed athlete lookup only; never trust local/mock fallbacks.
// This is staging code, not deployed application wiring.
export type AthleteSearchRecord = {
  athleteId: string;
  displayName: string;
  nickname?: string;
  level?: string;
  institution?: string;
};
export type SearchOutcome =
  | { status: "found"; athletes: AthleteSearchRecord[] }
  | { status: "not_found"; athletes: [] }
  | { status: "error"; message: string };

export async function lookupExistingAthletes(
  name: string,
  request: (name: string) => Promise<AthleteSearchRecord[]>
): Promise<SearchOutcome> {
  const search = name.trim();
  if (search.length < 2) return { status: "error", message: "กรุณาระบุชื่ออย่างน้อย 2 ตัวอักษร" };
  try {
    const records = await request(search);
    if (!Array.isArray(records)) throw new Error("Invalid response");
    const clean = records.filter((record) =>
      typeof record?.athleteId === "string" &&
      typeof record?.displayName === "string"
    );
    return clean.length
      ? { status: "found", athletes: clean }
      : { status: "not_found", athletes: [] };
  } catch {
    return { status: "error", message: "ค้นหาข้อมูลไม่สำเร็จ กรุณาลองใหม่ ห้ามสมัครใหม่โดยอาศัยผลการค้นหาที่ขัดข้อง" };
  }
}
