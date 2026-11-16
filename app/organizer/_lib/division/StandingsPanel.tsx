"use client";

import Link from "next/link";
import { friendshipAward } from "@/lib/competition-day.mjs";
import { TOTAL_ROUNDS, poolKey, poolName, type DivisionData, type Standing } from "./types";
import CrossTable from "../../../tournaments/[id]/_ui/CrossTable";
import { divisionLabel } from "@/lib/division-display";

const MEDAL: Record<string, string> = { gold: "🥇 ทอง", silver: "🥈 เงิน", bronze: "🥉 ทองแดง" };

export function groupStandings(rows: Standing[]) {
  const g = new Map<string, Standing[]>();
  for (const r of rows) { const p = poolKey(r.pool_label); if (!g.has(p)) g.set(p, []); g.get(p)!.push(r); }
  return [...g].sort(([a], [b]) => a.localeCompare(b));
}

/** ตารางไขว้ of one pool: opponent rank + result per round, like the organisers' result sheet. */
/** ตารางอันดับ of one pool (approved blue–white design): rank, athlete, score, round pills, SOS, SOSOS. */
export function StandingsTable({ rows, data, large = false, title }: { rows: Standing[]; data: DivisionData; large?: boolean; title?: string }) {
  const friendship = data.division.award_scheme === "friendship_wins";
  const pool = poolKey(rows[0]?.pool_label);
  const medals: Record<string, string> = {};
  if (friendship) for (const s of rows) {
    const a = s.athlete_id && !s.withdrawn ? friendshipAward(s.wins + s.byes, data.division) : null;
    if (a && s.athlete_id) medals[s.athlete_id] = MEDAL[a];
  }
  const photos = Object.fromEntries(data.regs.map((r) => [r.athlete_id, r.gt_athletes?.avatar_url ?? null]));
  return (
    <CrossTable large={large} title={title ?? `ตารางอันดับ ${divisionLabel(data.division.name)}${pool ? ` · สาย ${pool}` : ""}`}
      rows={rows} rounds={TOTAL_ROUNDS} medals={medals} photos={photos}
      matches={data.matches.filter((m) => poolKey(m.pool_label) === pool)}
      byes={data.byes.filter((b) => poolKey(b.pool_label) === pool)} />
  );
}

export default function StandingsPanel({ data, eventId }: { data: DivisionData; eventId: string }) {
  const groups = groupStandings(data.standings);
  const friendship = data.division.award_scheme === "friendship_wins";
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--gt-muted)]">
        {friendship ? "เฟรนชิพ: เหรียญตามจำนวนชนะ (บายนับเป็นชนะ)" : "เรียงตาม แต้ม → SOS (ผลรวมแต้มคู่แข่งที่ได้เล่นจริง) → SOSOS · ชนะเพราะคู่ไม่มา และบาย ไม่นับใน SOS"} · นับเฉพาะโต๊ะที่กรอกผลแล้ว
      </p>
      {groups.map(([pool, rows]) => (
        <section key={pool || "all"} className="space-y-2">
          <div className="flex items-center">
            <h3 className="mr-auto font-bold">{poolName(pool)}</h3>
            <Link href={`/organizer/${eventId}/${data.division.id}/print?view=standings${pool ? `&pool=${pool}` : ""}`} target="_blank" className="gt-outline-btn inline-flex min-h-11 items-center px-3 text-sm">พิมพ์ / ฉายจอ</Link>
          </div>
          <StandingsTable rows={rows} data={data} />
        </section>
      ))}
      {!groups.length && <p className="gt-card p-4 text-sm">ยังไม่มีข้อมูล</p>}
    </div>
  );
}
