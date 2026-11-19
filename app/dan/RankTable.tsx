"use client";

import Link from "next/link";
import AthleteAvatar from "@/components/AthleteAvatar";
import MenuIcon from "@/components/MenuIcon";

export type RankRow = {
  rank: number | null; dan: number; name: string; level: string | null; diamond: boolean; go_id: string | null; photo: string | null;
  profile_id: string | null; score: number | null; delta: number | null; max_score: number | null; last_played: string | null;
  active: boolean; status_source: "auto" | "admin"; next_level: boolean;
};
export type Ranking = { inactive_months: number; as_of: string | null; rows: RankRow[] };

const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

function NextLevelBadge({ level }: { level: string | null }) {
  const next = Number(level ?? 1) + 1;
  return (
    <span className="dan-rank-tag dan-rank-threshold-badge" title={`คะแนนถึงเกณฑ์ ${next} ดั้งแล้ว ระดับดั้งจะเปลี่ยนเมื่อสอบผ่าน`}>
      <span aria-hidden="true">★</span> ถึงเกณฑ์ {next} ดั้ง
    </span>
  );
}

function Status({ row }: { row: RankRow }) {
  return (
    <span className="dan-rank-tag dan-rank-status-badge" data-active={row.active}
      title={row.status_source === "admin" ? "กำหนดโดยผู้ดูแล" : undefined}>
      <span className="dan-status-dot" aria-hidden="true" />
      {row.active ? "Active" : "Inactive"}{row.status_source === "admin" && " ✎"}
    </span>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null || value === 0) {
    return <span className="dan-rank-change"><span className="sr-only">การเปลี่ยนแปลง </span>–</span>;
  }
  return (
    <span className="dan-rank-tag dan-rank-change" data-direction={value > 0 ? "up" : "down"}>
      <span className="sr-only">{value > 0 ? "เพิ่มขึ้น" : "ลดลง"}</span>
      <span aria-hidden="true">{value > 0 ? "▲" : "▼"}</span> {num(Math.abs(value))}
    </span>
  );
}

function RankingRow({ row, classRank }: { row: RankRow; classRank: Map<number, number> | null }) {
  const position = classRank ? classRank.get(row.dan) ?? null : row.rank;
  const podium = position !== null && position <= 3 ? position : undefined;
  const nationalPosition = classRank ? row.rank : null;

  return (
    <li className="dan-rank-row" data-podium={podium} tabIndex={-1}>
      <div className="dan-rank-position gt-num">
        <span className="dan-rank-medal">
          <span className="sr-only">{classRank ? "อันดับรุ่น " : "อันดับ "}</span>{position ?? "–"}
        </span>
        {nationalPosition !== null && <span className="dan-national-position">ประเทศ {nationalPosition}</span>}
      </div>
      <div className="dan-rank-athlete">
        <div className="dan-rank-photo">
          <AthleteAvatar src={row.photo} name={row.name} zoom className="dan-rank-avatar" />
        </div>
        <div className="dan-rank-identity">
          <div className="dan-rank-name">
            {row.profile_id ? <Link href={`/athletes/${row.profile_id}`} className="hover:underline">{row.name}</Link> : row.name}
          </div>
          <span className="dan-rank-id gt-num">เลขดั้ง {num(row.dan)}</span>
          {row.last_played && <span className="dan-rank-date gt-num">แข่งล่าสุด {shortDate(row.last_played)}</span>}
        </div>
      </div>
      <div className="dan-rank-level">
        <span className="dan-rank-tag dan-rank-level-badge gt-num">{row.level ?? 1} Dan</span>
      </div>
      <div className="dan-rank-score gt-num">
        <span className="sr-only">คะแนนปัจจุบัน </span>
        <MenuIcon name="trophy" className="dan-rank-trophy" />
        {row.score === null ? "–" : num(row.score)}
      </div>
      <div className="dan-rank-delta gt-num"><Delta value={row.delta} /></div>
      <div className="dan-rank-threshold">
        {row.next_level ? <NextLevelBadge level={row.level} /> : <span className="dan-rank-no-threshold" aria-hidden="true">–</span>}
      </div>
      <div className="dan-rank-status"><Status row={row} /></div>
    </li>
  );
}

export default function RankTable({ rows, classRank, mobilePreview }: {
  rows: RankRow[];
  classRank: Map<number, number> | null;
  mobilePreview: boolean;
}) {
  return (
    <div className="dan-rank-table" data-mobile-preview={mobilePreview}>
      <div className="dan-rank-head" aria-hidden="true">
        <span>{classRank ? "อันดับรุ่น" : "อันดับ"}</span>
        <span>นักกีฬา</span>
        <span>ระดับฝีมือ</span>
        <span>คะแนนปัจจุบัน</span>
        <span>เปลี่ยนแปลง</span>
        <span>เกณฑ์เลื่อนดั้ง</span>
        <span>สถานะ</span>
      </div>
      <ol id="dan-rank-list" className="dan-rank-list" role="list" aria-label="อันดับคะแนน">
        {rows.map((row) => <RankingRow key={row.dan} row={row} classRank={classRank} />)}
      </ol>
    </div>
  );
}

export function RankCards({rows,classRank}: {rows:RankRow[];classRank:Map<number,number>|null}) {
 return <ul className="dan-directory-cards" aria-label="อันดับคะแนนแบบการ์ด">{rows.map(row=><li key={row.dan} className="gt-card dan-player-card">
 <div className="dan-card-picture"><AthleteAvatar src={row.photo} name={row.name} zoom variant="portrait"/><span className="dan-card-position">{classRank ? "รุ่น" : "ประเทศ"} {classRank ? classRank.get(row.dan) ?? "–" : row.rank ?? "–"}</span></div>
 <div className="p-3"><h2 className="font-bold">{row.go_id ? <Link href={`/athletes/history/${row.go_id}`}>{row.name}</Link> : row.name}</h2><p className="text-sm">{row.level} Dan · เลขดั้ง {row.dan}</p>{classRank && <p className="text-sm">อันดับประเทศ {row.rank ?? "–"}</p>}<div className="dan-card-score"><strong>{row.score === null ? "–" : num(row.score)}</strong><Delta value={row.delta}/></div><p className="mb-2 text-xs">คะแนนปัจจุบัน{row.last_played ? ` · แข่งล่าสุด ${shortDate(row.last_played)}` : ""}</p><Status row={row}/>{row.next_level && <div className="mt-2"><NextLevelBadge level={row.level}/></div>}</div>
 </li>)}</ul>;
}
