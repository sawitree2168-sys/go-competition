"use client";

import Link from "next/link";
import AthleteAvatar from "@/components/AthleteAvatar";

export type RankRow = {
  rank: number | null; dan: number; name: string; level: string | null; diamond: boolean; go_id: string | null; photo: string | null;
  profile_id: string | null; score: number | null; delta: number | null; max_score: number | null; last_played: string | null;
  active: boolean; status_source: "auto" | "admin"; next_level: boolean;
};
export type Ranking = { inactive_months: number; as_of: string | null; rows: RankRow[] };

const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
const lvl = (l: string | null) => Number(l ?? 1);

/** Score has reached the threshold for the next dan; the dan itself only changes after the exam is passed. */
export function NextLevelBadge({ level }: { level: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-[var(--gt-gold-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--gt-gold-ink)] sm:text-xs"
      title={`คะแนนถึงเกณฑ์ ${lvl(level) + 1} ดั้งแล้ว ระดับดั้งจะเปลี่ยนเมื่อสอบผ่าน`}>
      ★ คะแนนถึงเกณฑ์ {lvl(level) + 1} ดั้ง
    </span>
  );
}

function Status({ r }: { r: RankRow }) {
  return (
    <span title={r.status_source === "admin" ? "กำหนดโดยผู้ดูแล" : undefined}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold sm:text-xs ${r.active ? "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]" : "bg-[var(--gt-surface-2)] text-[var(--gt-muted)]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${r.active ? "bg-[var(--gt-win-ink)]" : "bg-[var(--gt-muted)]"}`} aria-hidden="true" />
      {r.active ? "Active" : "Inactive"}{r.status_source === "admin" && " ✎"}
    </span>
  );
}

function Delta({ d }: { d: number | null }) {
  if (d === null || d === 0) return <span className="text-[var(--gt-muted)]">–</span>;
  return <span className={d > 0 ? "text-[var(--gt-win-ink)]" : "text-[var(--gt-loss-ink)]"}>{d > 0 ? "▲" : "▼"} {num(Math.abs(d))}</span>;
}

const GRID = "lg:grid-cols-[64px_54px_minmax(0,1fr)_86px_84px_96px_96px]";

/** National ranking table in the approved directory table style. */
export default function RankTable({ rows, classRank }: { rows: RankRow[]; classRank: Map<number, number> | null }) {
  return (
    <div className="gt-athlete-table overflow-hidden rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)]">
      <div className={`hidden ${GRID} items-center gap-3 border-b border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 py-3 text-xs font-semibold text-[var(--gt-muted)] lg:grid`}>
        <span className="text-center">{classRank ? "อันดับรุ่น" : "อันดับ"}</span><span>รูป</span><span>ชื่อ–นามสกุล</span><span className="text-right">คะแนน</span>
        <span className="text-right">ล่าสุด</span><span>สถานะ</span><span>แข่งล่าสุด</span>
      </div>
      <ol className="divide-y divide-[var(--gt-line)]" aria-label="อันดับคะแนน">
        {rows.map((r) => (
          <li key={r.dan} className={`grid grid-cols-[44px_48px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 ${GRID} lg:gap-3 ${r.active ? "" : "opacity-70"}`}>
            {(() => {
              const main = classRank ? classRank.get(r.dan) ?? null : r.rank;
              return (
                <span className="gt-num text-center leading-tight">
                  <span className={`block font-bold ${main && main <= 3 ? "text-lg text-[var(--gt-gold-ink)]" : "text-sm text-[var(--gt-brand)]"}`}>{main ?? "–"}</span>
                  {classRank && r.rank && <span className="block text-[10px] text-[var(--gt-muted)]" >ประเทศ {r.rank}</span>}
                </span>
              );
            })()}
            <AthleteAvatar src={r.photo} name={r.name} zoom className="h-11 w-11 sm:h-12 sm:w-12" />
            <span className="min-w-0">
              <span className="block break-words text-sm font-semibold leading-snug sm:text-base">
                {r.profile_id ? <Link href={`/athletes/${r.profile_id}`} className="hover:underline">{r.name}</Link> : r.name}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="gt-num rounded-full bg-[var(--gt-surface-2)] px-2 py-0.5 text-xs font-bold text-[var(--gt-brand)]">{lvl(r.level)} Dan</span>
                <span className="gt-num text-xs text-[var(--gt-muted)]">เลขดั้ง {num(r.dan)}</span>
                {r.next_level && <NextLevelBadge level={r.level} />}
                <span className="lg:hidden"><Status r={r} /></span>
              </span>
              {r.last_played && <span className="gt-num mt-0.5 block text-[11px] text-[var(--gt-muted)] lg:hidden">แข่งล่าสุด {shortDate(r.last_played)}</span>}
            </span>
            <span className="gt-num text-right">
              <span className="block text-base font-bold sm:text-lg">{r.score === null ? "–" : num(r.score)}</span>
              <span className="block text-xs lg:hidden"><Delta d={r.delta} /></span>
            </span>
            <span className="gt-num hidden text-right text-sm lg:block"><Delta d={r.delta} /></span>
            <span className="hidden lg:block"><Status r={r} /></span>
            <span className="gt-num hidden text-sm text-[var(--gt-muted)] lg:block">{r.last_played ? shortDate(r.last_played) : "–"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
