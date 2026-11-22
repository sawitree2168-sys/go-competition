"use client";

import Link from "next/link";
import AthleteAvatar from "@/components/AthleteAvatar";

/** One kyu player. source: self = the athlete set it, division = latest kyu division entered, association = ทำเนียบคิวสมาคม. */
export type KyuRow = {
  go_id: string; name: string; kyu: number | null; source: "self" | "division" | "association" | null;
  event: string | null; division: string | null; date: string | null;
  assoc_kyu: number | null; assoc_source: string | null; self_kyu: number | null; last_played: string | null;
  photo: string | null; institution: string | null;
};
/** gt_kyu_board_v1: one page of rows plus head-counts per kyu (counts follow the scope, not the search). */
export type KyuData = { total: number; page: number; page_size: number; counts: Record<string, number>; unknown: number; all: number; rows: KyuRow[] };

export const KYUS = Array.from({ length: 15 }, (_, i) => i + 1);

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
/** "3-4 Kyu" → "รุ่น 3-4 คิว", "OPEN Friendship 9×9" → "รุ่นเฟรนชิพ 9×9". */
const divisionText = (d: string) => {
  const t = d.replace(/^รุ่น\s*/, "").replace(/\bkyu\b/gi, "คิว").replace(/friendship/gi, "เฟรนชิพ").replace(/^open\s+/i, "").trim();
  return `รุ่น${/^\d/.test(t) ? " " : ""}${t}`;
};

/** Where the level comes from, in one short line. */
export function KyuSource({ r }: { r: Pick<KyuRow, "kyu" | "source" | "event" | "division" | "date" | "assoc_kyu" | "assoc_source"> }) {
  if (r.kyu === null) return <span>ยังไม่ทราบระดับ</span>;
  if (r.source === "self") return <span>นักกีฬาระบุเอง</span>;
  if (r.source === "association") return <span>{r.assoc_source ?? "ทำเนียบคิวสมาคม"}</span>;
  return (
    <span>
      จาก{r.division ? divisionText(r.division) : "รุ่นที่แข่งล่าสุด"}{r.event ? ` · ${r.event}` : ""}{r.date ? ` · ${shortDate(r.date)}` : ""}
      {r.assoc_kyu !== null && r.assoc_kyu !== r.kyu && <> · ทำเนียบคิวสมาคม {r.assoc_kyu} คิว</>}
    </span>
  );
}

const Pill = ({ kyu }: { kyu: number | null }) => kyu !== null
  ? <span className="whitespace-nowrap rounded-full bg-[var(--gt-surface-2)] px-2.5 py-0.5 text-sm font-bold text-[var(--gt-brand)]">{kyu} คิว</span>
  : <span className="text-[var(--gt-muted)]" aria-label="ยังไม่ทราบระดับ">–</span>;

/** Kyu list in the same table layout as the dan directory. */
export function KyuTable({ rows }: { rows: KyuRow[] }) {
  return (
    <div className="gt-athlete-table overflow-hidden rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)]">
      <div className="hidden grid-cols-[54px_minmax(0,1fr)_92px_minmax(0,1.3fr)_96px] items-center gap-3 border-b border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 py-3 text-xs font-semibold text-[var(--gt-muted)] lg:grid">
        <span>รูป</span><span>ชื่อ–นามสกุล</span><span>ระดับ</span><span>ที่มาของระดับ</span><span>แข่งล่าสุด</span>
      </div>
      <ol className="divide-y divide-[var(--gt-line)]" aria-label="รายชื่อนักกีฬาระดับคิว">
        {rows.map((r) => (
          <li key={r.go_id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 lg:grid-cols-[54px_minmax(0,1fr)_92px_minmax(0,1.3fr)_96px] lg:gap-3">
            <AthleteAvatar src={r.photo} name={r.name} zoom className="h-11 w-11 sm:h-12 sm:w-12" />
            <span className="min-w-0">
              <Link href={`/athletes/history/${r.go_id}`} className="block break-words text-sm font-semibold leading-snug hover:underline sm:text-base">{r.name}</Link>
              <span className="gt-num mt-0.5 block text-xs text-[var(--gt-muted)]">{r.go_id}{r.institution ? ` · ${r.institution}` : ""}</span>
              <span className="mt-0.5 block text-xs text-[var(--gt-muted)] lg:hidden"><KyuSource r={r} /></span>
            </span>
            <span><Pill kyu={r.kyu} /></span>
            <span className="hidden text-sm text-[var(--gt-muted)] lg:block"><KyuSource r={r} /></span>
            <span className="gt-num hidden text-sm text-[var(--gt-muted)] lg:block">{r.last_played ? shortDate(r.last_played) : "-"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Kyu list in the same card layout as the dan directory. */
export function KyuCards({ rows }: { rows: KyuRow[] }) {
  return (
    <ul className="dan-directory-cards">
      {rows.map((r) => (
        <li className="gt-card dan-player-card" key={r.go_id}>
          <div className="dan-card-picture">
            <AthleteAvatar src={r.photo} name={r.name} zoom variant="portrait" />
          </div>
          <div className="dan-card-body">
            <Link href={`/athletes/history/${r.go_id}`} className="dan-card-name block font-bold hover:underline">{r.name}</Link>
            <p className="mt-1"><Pill kyu={r.kyu} /></p>
            <p className="mt-1 text-xs text-[var(--gt-muted)]"><KyuSource r={r} /></p>
          </div>
        </li>
      ))}
    </ul>
  );
}
