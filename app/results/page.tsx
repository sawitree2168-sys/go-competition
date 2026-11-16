import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { loadResults } from "@/lib/public-site";
import { thaiDate } from "@/lib/division-display";

export const revalidate = 60;
export const metadata: Metadata = { title: "ผลการแข่งขัน" };

const medal = (p: number | null) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : null);

// ผลการแข่งขัน: recorded results of past events (from the organisers' result sheets), by event and division.
export default async function ResultsPage() {
  const events = await loadResults(publicDb());
  return (
    <PublicPage icon="results" title="ผลการแข่งขัน" sub="อันดับและผลชนะ–แพ้ของแต่ละรุ่น จากผลการแข่งขันที่บันทึกไว้" current="/tournaments?status=finished">
      <Link href="/tournaments?status=finished" className="gt-outline-btn inline-flex min-h-11 items-center px-4 font-semibold">ดูผลของรายการที่แข่งบนเว็บนี้ →</Link>
      {events.length ? (
        <div className="mt-5 space-y-6">
          {events.map((e) => (
            <section key={e.title} id={encodeURIComponent(e.title)} className="scroll-mt-4">
              <h2 className="text-xl font-bold">{e.title}</h2>
              <p className="text-sm text-[var(--gt-muted)]">{thaiDate(e.date) ?? "ไม่ระบุวันที่"} · {e.divisions.length} รุ่น</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {e.divisions.map((d) => (
                  <details key={d.division} className="gt-card overflow-hidden" open={e.divisions.length <= 2}>
                    <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 bg-[var(--gt-table-head)] px-4 py-2 font-semibold text-white">
                      <span>{d.division}</span><span className="text-sm font-normal opacity-80">{d.people.length} คน</span>
                    </summary>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-[var(--gt-muted)]"><th className="px-3 py-2 font-medium">อันดับ</th><th className="py-2 font-medium">ชื่อ</th><th className="px-3 py-2 text-right font-medium">ชนะ–แพ้</th></tr></thead>
                      <tbody>
                        {d.people.map((p) => (
                          <tr key={p.go_id} className="border-t border-[var(--gt-line)]">
                            <td className="gt-num px-3 py-2 font-semibold">{medal(p.placing) ?? p.placing ?? "–"}</td>
                            <td className="py-2">{p.athlete_id ? <Link href={`/athletes/${p.athlete_id}`} className="font-medium text-[var(--gt-cta)] underline">{p.full_name}</Link> : p.full_name}</td>
                            <td className="gt-num px-3 py-2 text-right">{p.wins}–{p.losses}{p.byes ? ` (บาย ${p.byes})` : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="gt-card mt-5 p-6 text-center text-[var(--gt-muted)]">ยังไม่มีผลการแข่งขันที่บันทึกไว้</p>
      )}
    </PublicPage>
  );
}
