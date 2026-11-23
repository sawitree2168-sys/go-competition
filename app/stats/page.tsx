import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import AthleteAvatar from "@/components/AthleteAvatar";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { loadOverview, loadRankings2, type Rankings2 } from "@/lib/public-site";
import { thaiDate } from "@/lib/division-display";

export const revalidate = 60;
export const metadata: Metadata = { title: "อันดับและสถิติ" };

/** Class of division → label. 3 = รุ่น 3-4 คิว … 13 = เฟรนชิพ 13×13, 15 = เฟรนชิพ 9×9. */
const CLASS: Record<number, string> = { 1: "รุ่น 1-2 คิว", 3: "รุ่น 3-4 คิว", 5: "รุ่น 5-6 คิว", 7: "รุ่น 7-8 คิว", 9: "รุ่น 9-12 คิว", 13: "เฟรนชิพ 13×13", 15: "เฟรนชิพ 9×9" };
const classLabel = (k: number) => CLASS[k] ?? `รุ่น ${k} คิว`;

const chip = (on: boolean) =>
  `inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-bold ${on ? "border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] text-[var(--gt-brand)]" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`;

function Row({ pos, href, photo, name, sub, right }: { pos: number; href: string | null; photo: string | null; name: string; sub: string; right: React.ReactNode }) {
  const inner = (
    <>
      <span className="gt-num w-8 shrink-0 text-center text-lg font-bold">{pos}</span>
      <AthleteAvatar src={photo} name={name} className="h-11 w-11" />
      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{name}</span><span className="block text-xs text-[var(--gt-muted)]">{sub}</span></span>
      <span className="gt-num shrink-0 text-right">{right}</span>
    </>
  );
  return <li>{href ? <Link href={href} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--gt-cta-soft)]">{inner}</Link> : <div className="flex items-center gap-3 px-3 py-2.5">{inner}</div>}</li>;
}

// อันดับและสถิติ: ดั้ง = คะแนนทำเนียบสมาคม (เทียบกันได้ทุกระดับดั้ง) · คิว = จำนวนชนะปีนี้ แยกตามรุ่นที่ลงแข่ง (ไม่เอาคนต่างรุ่นมาเทียบกัน)
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ g?: string; k?: string }> }) {
  const params = await searchParams;
  const db = publicDb();
  const [r, o] = await Promise.all([loadRankings2(db, 50), loadOverview(db)]);
  const data: Rankings2 = r ?? { year: new Date().getFullYear(), dan: [], dan_total: 0, dan_as_of: null, kyu: [] };
  const group = params.g === "dan" ? "dan" : "kyu";
  const year = data.year + 543;
  const classes = data.kyu;
  const picked = classes.find((c) => String(c.kyu) === params.k) ?? classes[0];

  return (
    <PublicPage icon="stats" title="อันดับและสถิติ" sub={`ปี ${year} · แยกดั้งและคิว`}>
      <ul className="grid grid-cols-3 gap-2">
        {[["รายการแข่งขัน", o?.tournaments], ["นักกีฬา", o?.athletes], ["รายการที่มีผล", o?.results]].map(([l, n]) => (
          <li key={l as string} className="gt-card p-3 text-center"><span className="gt-num block text-2xl font-bold">{n == null ? "–" : Number(n).toLocaleString("th-TH")}</span><span className="text-sm text-[var(--gt-muted)]">{l}</span></li>
        ))}
      </ul>

      <div role="tablist" className="gt-tabs mt-4 grid grid-cols-2 gap-2 rounded-2xl border-2 border-[var(--gt-gold)] bg-[var(--gt-surface)] p-1.5">
        <Link role="tab" aria-selected={group === "dan"} href="/stats?g=dan" className={`flex min-h-12 items-center justify-center rounded-xl font-bold ${group === "dan" ? "bg-[var(--gt-gold-soft)]" : ""}`}>ดั้ง</Link>
        <Link role="tab" aria-selected={group === "kyu"} href="/stats?g=kyu" className={`flex min-h-12 items-center justify-center rounded-xl font-bold ${group === "kyu" ? "bg-[var(--gt-gold-soft)]" : ""}`}>คิว</Link>
      </div>

      {group === "dan" ? (
        <>
          <p className="mt-3 text-sm text-[var(--gt-muted)]">เรียงตามคะแนนในทำเนียบดั้งสมาคม (นักกีฬาที่ยังแข่งอยู่ {data.dan_total.toLocaleString("th-TH")} คน){data.dan_as_of ? ` · ข้อมูล ${thaiDate(data.dan_as_of)}` : ""}</p>
          {data.dan.length ? (
            <ol className="gt-card mt-2 divide-y divide-[var(--gt-line)] overflow-hidden">
              {data.dan.map((x) => (
                <Row key={`${x.dan}-${x.full_name}`} pos={x.pos} href={x.athlete_id ? `/athletes/${x.athlete_id}` : null} photo={x.photo} name={x.full_name}
                  sub={`${x.level ? `${x.level} ดั้ง` : "ดั้ง"}${x.diamond ? " · ดั้งเพชร" : ""}${x.dan ? ` · เลขดั้ง ${x.dan}` : ""}`}
                  right={<><span className="block font-bold text-[var(--gt-brand)]">{Math.round(x.score).toLocaleString("th-TH")}</span><span className="block text-xs text-[var(--gt-muted)]">คะแนน</span></>} />
              ))}
            </ol>
          ) : <p className="gt-card mt-2 p-6 text-center text-[var(--gt-muted)]">ยังไม่มีคะแนนดั้ง</p>}
          <p className="mt-3 text-xs text-[var(--gt-muted)]">ระดับดั้งเปลี่ยนเมื่อสอบผ่านเท่านั้น คะแนนใช้จัดอันดับ <Link href="/dan" className="underline">ดูทำเนียบนักกีฬาทั้งหมด</Link></p>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-[var(--gt-muted)]">เรียงตามจำนวนชนะในปีนี้ เทียบเฉพาะคนที่แข่งรุ่นเดียวกัน (เท่ากันดูแพ้น้อยกว่า แล้วจำนวนรายการ)</p>
          {classes.length ? (
            <>
              <nav className="mt-2 flex flex-wrap gap-2" aria-label="เลือกรุ่น">
                {classes.map((c) => (
                  <Link key={c.kyu} href={`/stats?g=kyu&k=${c.kyu}`} aria-current={c.kyu === picked?.kyu ? "true" : undefined} className={chip(c.kyu === picked?.kyu)}>
                    {classLabel(c.kyu)} <span className="ml-1.5 font-normal text-[var(--gt-muted)]">{c.total}</span>
                  </Link>
                ))}
              </nav>
              {picked && (
                <ol className="gt-card mt-3 divide-y divide-[var(--gt-line)] overflow-hidden">
                  {picked.rows.map((x) => (
                    <Row key={x.go_id} pos={x.pos} href={x.athlete_id ? `/athletes/${x.athlete_id}` : null} photo={x.photo} name={x.full_name}
                      sub={`${x.go_id} · ${x.events} รายการ`}
                      right={<><span className="block font-bold text-[var(--gt-ok)]">ชนะ {x.wins}</span><span className="block text-xs text-[var(--gt-muted)]">แพ้ {x.losses}</span></>} />
                  ))}
                </ol>
              )}
            </>
          ) : <p className="gt-card mt-2 p-6 text-center text-[var(--gt-muted)]">ยังไม่มีผลการแข่งขันรุ่นคิวของปีนี้</p>}
          <p className="mt-3 text-xs text-[var(--gt-muted)]">นับจากผลการแข่งขันที่บันทึกในระบบ · รุ่นตามอายุ (เช่น U10) ไม่นับ เพราะไม่ใช่ระดับฝีมือ <Link href="/results" className="underline">ดูผลการแข่งขัน</Link></p>
        </>
      )}
    </PublicPage>
  );
}
