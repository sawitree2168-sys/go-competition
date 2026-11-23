import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import AthleteAvatar from "@/components/AthleteAvatar";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { loadWinRankings, type WinRow } from "@/lib/public-site";
import { thaiDate } from "@/lib/division-display";

export const revalidate = 60;
export const metadata: Metadata = { title: "อันดับและสถิติ" };

const levelLabel = (grp: "dan" | "kyu", level: number) => level === -1 ? "ทั้งหมด" : level === 0 ? "ไม่ทราบระดับ" : `${level} ${grp === "dan" ? "ดั้ง" : "คิว"}`;
const chip = (on: boolean) =>
  `inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold ${on ? "border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] text-[var(--gt-brand)]" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`;
const n = (v: number) => v.toLocaleString("th-TH");
const shortDate = (iso: string | null, year: number | null) => iso ? thaiDate(iso, "short") : year ? `ปี ${year + 543}` : "ไม่ทราบวันที่";

function Player({ x, grp }: { x: WinRow; grp: "dan" | "kyu" }) {
  const extra = [x.wo_wins ? `ชนะผ่าน ${x.wo_wins}` : "", x.wo_losses ? `แพ้ผ่าน ${x.wo_losses}` : "", x.byes ? `บาย ${x.byes}` : ""].filter(Boolean).join(" · ");
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 hover:bg-[var(--gt-cta-soft)] [&::-webkit-details-marker]:hidden">
          <span className="gt-num w-8 shrink-0 text-center text-lg font-bold">{x.pos}</span>
          <AthleteAvatar src={x.photo} name={x.full_name} className="h-11 w-11" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{x.full_name}</span>
            <span className="block text-xs text-[var(--gt-muted)]">{x.level ? `${x.level} ${grp === "dan" ? "ดั้ง" : "คิว"} · ` : ""}{n(x.events)} รายการ <span className="text-[var(--gt-cta)] group-open:hidden">· ดูที่มา ▾</span><span className="hidden text-[var(--gt-cta)] group-open:inline">· ซ่อน ▴</span></span>
          </span>
          <span className="gt-num shrink-0 text-right">
            <span className="block font-bold text-[var(--gt-ok)]">ชนะ {n(x.wins)}</span>
            <span className="block text-xs text-[var(--gt-muted)]">แข่ง {n(x.played)} · แพ้ {n(x.losses)}</span>
          </span>
        </summary>
        <div className="space-y-1.5 bg-[var(--gt-surface-2)] px-3 pb-3 pt-2 text-sm">
          {extra && <p className="text-xs text-[var(--gt-muted)]">ไม่นับในชนะ/แพ้: {extra}</p>}
          <ul className="space-y-1.5">
            {x.list.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg bg-[var(--gt-surface)] px-3 py-2">
                <span className="min-w-0">
                  <Link href={`/results/history/${e.id}`} className="block font-semibold hover:underline">{e.title}</Link>
                  <span className="block text-xs text-[var(--gt-muted)]">{shortDate(e.date, e.year)}{e.division && e.division !== e.title ? ` · ${e.division}` : ""}</span>
                </span>
                <span className="gt-num shrink-0 text-right text-xs"><b className="text-[var(--gt-ok)]">ชนะ {e.wins}</b> · แพ้ {e.losses}{e.byes ? ` · บาย ${e.byes}` : ""}</span>
              </li>
            ))}
          </ul>
          {x.athlete_id && <Link href={`/athletes/${x.athlete_id}`} className="inline-block pt-1 text-sm font-semibold text-[var(--gt-cta)] underline">ดูโปรไฟล์นักกีฬา</Link>}
        </div>
      </details>
    </li>
  );
}

// อันดับและสถิติ: ใครชนะมากที่สุดในปีนี้ แยกดั้ง / คิว และระดับ · ทุกแถวกดดูได้ว่ามาจากรายการไหน (ที่มาของสถิติ)
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ g?: string; lv?: string }> }) {
  const params = await searchParams;
  const grp: "dan" | "kyu" = params.g === "kyu" ? "kyu" : "dan";
  const level = Number.isInteger(Number(params.lv)) && params.lv !== undefined ? Number(params.lv) : -1;
  const data = await loadWinRankings(publicDb(), grp, level, 30);
  const year = data?.year ? data.year + 543 : new Date().getFullYear() + 543;
  const range = data?.from && data.to ? `${thaiDate(data.from, "short")} – ${thaiDate(data.to, "short")}` : "";
  const groups = (data?.groups ?? []).filter((g) => g.grp === grp);
  const count = (g: "dan" | "kyu") => data?.groups.find((x) => x.grp === g && x.level === -1)?.total ?? 0;
  const current = groups.find((g) => g.level === level);

  return (
    <PublicPage icon="stats" title="อันดับและสถิติ" sub={`ใครชนะมากที่สุด ปี ${year}${range ? ` · ${range}` : ""}`}>
      <ul className="grid grid-cols-3 gap-2">
        {[["รายการแข่งขัน", data?.events.length], ["เกมที่มีผล", data?.games], ["นักกีฬา", count("dan") + count("kyu")]].map(([l, v]) => (
          <li key={l as string} className="gt-card p-3 text-center"><span className="gt-num block text-2xl font-bold">{v == null ? "–" : n(Number(v))}</span><span className="text-sm text-[var(--gt-muted)]">{l}</span></li>
        ))}
      </ul>

      <div role="tablist" className="gt-tabs mt-4 grid grid-cols-2 gap-2 rounded-2xl border-2 border-[var(--gt-gold)] bg-[var(--gt-surface)] p-1.5">
        {(["dan", "kyu"] as const).map((g) => (
          <Link key={g} role="tab" aria-selected={grp === g} href={`/stats?g=${g}`} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl font-bold ${grp === g ? "bg-[var(--gt-gold-soft)]" : ""}`}>
            {g === "dan" ? "ดั้ง" : "คิว"} <span className="text-sm font-normal text-[var(--gt-muted)]">{n(count(g))} คน</span>
          </Link>
        ))}
      </div>

      <nav className="mt-3 flex flex-wrap gap-2" aria-label="เลือกระดับ">
        {groups.map((g) => (
          <Link key={g.level} href={`/stats?g=${grp}&lv=${g.level}`} aria-current={g.level === level ? "true" : undefined} className={chip(g.level === level)}>
            {levelLabel(grp, g.level)} <span className="font-normal text-[var(--gt-muted)]">{n(g.total)}</span>
          </Link>
        ))}
      </nav>

      <p className="mt-3 text-sm text-[var(--gt-muted)]">{grp === "dan" ? "ดั้ง" : "คิว"} · {levelLabel(grp, level)}{current ? ` ${n(current.total)} คน` : ""} · เรียงตามจำนวนชนะ (เท่ากันดูแพ้น้อยกว่า แล้วจำนวนรายการ) · แตะชื่อเพื่อดูว่ามาจากรายการไหน</p>
      {data?.rows.length ? (
        <ol className="gt-card mt-2 divide-y divide-[var(--gt-line)] overflow-hidden">
          {data.rows.map((x) => <Player key={x.go_id} x={x} grp={grp} />)}
        </ol>
      ) : <p className="gt-card mt-2 p-6 text-center text-[var(--gt-muted)]">ยังไม่มีผลการแข่งขันในกลุ่มนี้</p>}

      <details className="gt-card mt-4 p-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">ที่มาของสถิติ: {n(data?.events.length ?? 0)} รายการ{range ? ` (${range})` : ""} ▾</summary>
        <ul className="mt-1 space-y-1">
          {(data?.events ?? []).map((e) => (
            <li key={e.id} className="flex justify-between gap-3"><Link href={`/results/history/${e.id}`} className="min-w-0 hover:underline">{e.title}</Link><span className="shrink-0 text-xs text-[var(--gt-muted)]">{shortDate(e.date, e.year)}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[var(--gt-muted)]">ชนะ/แพ้ นับเฉพาะเกมที่แข่งจริง · ชนะผ่าน/แพ้ผ่าน และบาย แยกไว้ ไม่นับรวม · ระดับดั้งจากทำเนียบดั้งสมาคม ระดับคิวจากทำเนียบนักกีฬา</p>
      </details>
    </PublicPage>
  );
}
