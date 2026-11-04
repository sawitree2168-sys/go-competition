import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Event = { id: string; title: string; event_date: string | null };
type Division = { id: string; name: string };
type Row = {
  pos: number; athlete_id: string | null; display_name: string | null; current_rank: string | null;
  wins: number; losses: number; byes: number; score: number; sos: number; sosos: number;
};
type DivisionStandings = { division: Division; rows: Row[]; failed: boolean };

// Standings come from gt_division_standings_v1: verified results + byes only, tie-break SOS then SOSOS.
// Names of athletes without a public profile are withheld by the database function itself.
async function load(id: string): Promise<{ event: Event | null; standings: DivisionStandings[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { event: null, standings: [] };
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: event, error } = await db.from("gt_tournaments").select("id,title,event_date").eq("id", id).eq("published", true).maybeSingle();
    if (error || !event) return { event: null, standings: [] };
    const { data: divisions } = await db.from("gt_divisions").select("id,name").eq("tournament_id", id).order("name");
    const standings = await Promise.all((divisions ?? []).map(async (division: Division) => {
      const { data, error } = await db.rpc("gt_division_standings_v1", { p_division: division.id });
      return { division, rows: (data ?? []) as Row[], failed: Boolean(error) };
    }));
    return { event, standings };
  } catch {
    return { event: null, standings: [] };
  }
}

const medal = (pos: number) =>
  pos === 1 ? "bg-[#e9c67c] text-[#102c55]" : pos === 2 ? "bg-slate-200 text-slate-800" : pos === 3 ? "bg-[#e7c3a0] text-[#5a3414]" : "bg-[#edf3fb] text-slate-600";

export default async function Standings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event, standings } = await load(id);
  const anyResults = standings.some((s) => s.rows.some((r) => r.wins + r.losses + r.byes > 0));

  return (
    <main className="min-h-screen bg-[#edf3fa] pb-20 text-[#09244e]">
      <header className="bg-[#041b3c] text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href={`/tournaments/${id}`} className="text-sm font-bold">‹ รายละเอียดการแข่งขัน</Link>
          <Link href="/" className="text-sm font-extrabold text-[#f2d087]">GO TOURNAMENT</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-xl bg-gradient-to-r from-[#071b3e] to-[#16447f] px-5 py-7 text-white shadow">
          <p className="text-xs font-bold tracking-widest text-[#eccc7c]">SWISS STANDINGS</p>
          <h1 className="mt-2 text-2xl font-extrabold">ตารางอันดับ</h1>
          <p className="mt-2 text-sm text-blue-100">{event?.title ?? "รายการแข่งขันยังไม่เผยแพร่"}</p>
        </div>

        {!event ? (
          <div className="mt-5 rounded-xl bg-white p-7 text-center shadow">
            <h2 className="font-bold">ยังไม่มีข้อมูลการแข่งขันที่เผยแพร่</h2>
            <p className="mt-2 text-sm text-slate-600">โปรดกลับไปเลือกรายการแข่งขันที่เปิดให้เข้าชม</p>
            <Link href="/tournaments" className="mt-4 inline-block rounded-lg bg-[#0754bf] px-5 py-3 text-sm font-bold text-white">ดูรายการแข่งขัน</Link>
          </div>
        ) : (
          <>
            <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-extrabold text-amber-900">วิธีจัดอันดับ</h2>
              <p className="mt-1 text-sm text-amber-800">
                คะแนน = จำนวนเกมที่ชนะ + บาย (บายได้ 1 คะแนน) ถ้าคะแนนเท่ากัน ตัดสินด้วย SOS (ผลรวมคะแนนของคู่แข่งทุกคน) แล้วจึง SOSOS
                นับเฉพาะผลที่ผู้ตัดสินยืนยันแล้ว ผู้เข้าแข่งขันที่ไม่ได้เปิดโปรไฟล์สาธารณะจะแสดงเฉพาะคะแนนโดยไม่แสดงชื่อ
              </p>
            </section>

            {!anyResults && (
              <div className="mt-5 rounded-xl border border-[#dbe4f0] bg-white p-7 text-center">
                <p className="font-bold">ยังไม่มีผลการแข่งขันที่ยืนยันแล้ว</p>
                <p className="mt-2 text-sm text-slate-600">ตารางอันดับจะปรากฏเมื่อผู้ตัดสินยืนยันผลรอบแรก</p>
              </div>
            )}

            <div className="mt-5 grid gap-5">
              {standings.filter((s) => s.rows.length || s.failed).map(({ division, rows, failed }) => (
                <section key={division.id} className="overflow-hidden rounded-xl border border-[#dbe4f0] bg-white shadow-sm">
                  <div className="flex items-center justify-between bg-[#0c326a] px-4 py-3 text-white">
                    <h2 className="font-extrabold">{division.name}</h2>
                    <span className="text-xs text-blue-100">{rows.length} คน</span>
                  </div>
                  {failed ? (
                    <p className="p-5 text-sm text-slate-600">โหลดตารางอันดับของรุ่นนี้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm tabular-nums">
                        <thead className="bg-[#edf3fb] text-xs font-bold text-slate-600">
                          <tr>
                            <th className="px-3 py-3 text-left">อันดับ</th>
                            <th className="px-3 py-3 text-left">ชื่อ</th>
                            <th className="px-3 py-3 text-center">ชนะ–แพ้</th>
                            <th className="px-3 py-3 text-center">บาย</th>
                            <th className="px-3 py-3 text-right">คะแนน</th>
                            <th className="px-3 py-3 text-right">SOS</th>
                            <th className="px-3 py-3 text-right">SOSOS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={r.athlete_id ?? `hidden-${i}`} className="border-t border-slate-100">
                              <td className="px-3 py-3">
                                <span className={`inline-grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${medal(r.pos)}`}>{r.pos}</span>
                              </td>
                              <td className="px-3 py-3">
                                <span className={r.display_name ? "font-bold" : "text-slate-500"}>{r.display_name ?? "ผู้เข้าแข่งขัน (ไม่เปิดเผยชื่อ)"}</span>
                                {r.current_rank && <span className="ml-2 rounded bg-[#f6ead0] px-1.5 py-0.5 text-[11px] font-bold text-[#6b4a12]">{r.current_rank}</span>}
                              </td>
                              <td className="px-3 py-3 text-center">{r.wins}–{r.losses}</td>
                              <td className="px-3 py-3 text-center">{r.byes || "–"}</td>
                              <td className="px-3 py-3 text-right text-base font-extrabold">{r.score}</td>
                              <td className="px-3 py-3 text-right">{r.sos}</td>
                              <td className="px-3 py-3 text-right">{r.sosos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/tournaments/${id}`} className="rounded-lg bg-[#0754bf] px-5 py-3 text-sm font-bold text-white">กลับรายละเอียดการแข่งขัน</Link>
              <Link href={`/tournaments/${id}/entrants`} className="rounded-lg border border-[#0c326a] px-5 py-3 text-sm font-bold">รายชื่อผู้สมัคร</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
