import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import AthleteAvatar from "@/components/AthleteAvatar";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { loadOverview, loadRankings } from "@/lib/public-site";

export const revalidate = 60;
export const metadata: Metadata = { title: "อันดับและสถิติ" };

// อันดับและสถิติ: athletes of the year by wins in recorded results, plus site totals.
export default async function StatsPage() {
  const db = publicDb();
  const [r, o] = await Promise.all([loadRankings(db, 50), loadOverview(db)]);
  const year = (r?.year ?? new Date().getFullYear()) + 543;
  const rows = r?.rows ?? [];
  return (
    <PublicPage icon="stats" title="อันดับและสถิติ" sub={`อันดับนักกีฬาปี ${year} · เรียงตามจำนวนชนะรวม (เท่ากันดูแพ้น้อยกว่า แล้วจำนวนรายการ)`}>
      <ul className="grid grid-cols-3 gap-2">
        {[["รายการแข่งขัน", o?.tournaments], ["นักกีฬา", o?.athletes], ["รายการที่มีผล", o?.results]].map(([l, n]) => (
          <li key={l as string} className="gt-card p-3 text-center"><span className="gt-num block text-2xl font-bold">{n == null ? "–" : Number(n).toLocaleString("th-TH")}</span><span className="text-sm text-[var(--gt-muted)]">{l}</span></li>
        ))}
      </ul>
      {rows.length ? (
        <ol className="gt-card mt-4 divide-y divide-[var(--gt-line)] overflow-hidden">
          {rows.map((x) => {
            const inner = (
              <>
                <span className="gt-num w-8 shrink-0 text-center text-lg font-bold">{x.pos}</span>
                <AthleteAvatar src={x.photo} name={x.full_name} className="h-11 w-11" />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{x.full_name}</span>
                  <span className="block text-xs text-[var(--gt-muted)]">{x.go_id}{x.rank ? ` · ${x.rank}` : ""} · {x.events} รายการ</span></span>
                <span className="gt-num shrink-0 text-right"><span className="block font-bold text-[var(--gt-ok)]">ชนะ {x.wins}</span><span className="block text-xs text-[var(--gt-muted)]">แพ้ {x.losses}</span></span>
              </>
            );
            return (
              <li key={x.go_id}>
                {x.athlete_id ? <Link href={`/athletes/${x.athlete_id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--gt-cta-soft)]">{inner}</Link>
                  : <div className="flex items-center gap-3 px-3 py-2.5">{inner}</div>}
              </li>
            );
          })}
        </ol>
      ) : <p className="gt-card mt-4 p-6 text-center text-[var(--gt-muted)]">ยังไม่มีผลการแข่งขันของปีนี้</p>}
      <p className="mt-3 text-xs text-[var(--gt-muted)]">นับจากผลการแข่งขันที่บันทึกในระบบ · อัปเดตเมื่อมีผลการแข่งขันใหม่ <Link href="/results" className="underline">ดูผลการแข่งขัน</Link></p>
    </PublicPage>
  );
}
