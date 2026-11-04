"use client";

import Link from "next/link";
import { friendshipAward } from "@/lib/competition-day.mjs";
import { poolKey, poolName, pts, type DivisionData, type Standing } from "./types";

const MEDAL: Record<string, string> = { gold: "🥇 ทอง", silver: "🥈 เงิน", bronze: "🥉 ทองแดง" };

export function groupStandings(rows: Standing[]) {
  const g = new Map<string, Standing[]>();
  for (const r of rows) { const p = poolKey(r.pool_label); if (!g.has(p)) g.set(p, []); g.get(p)!.push(r); }
  return [...g].sort(([a], [b]) => a.localeCompare(b));
}

export function StandingsTable({ rows, data, large = false }: { rows: Standing[]; data: DivisionData; large?: boolean }) {
  const friendship = data.division.award_scheme === "friendship_wins";
  const cell = large ? "px-3 py-2.5" : "px-1.5 py-2";
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse ${large ? "text-lg" : "text-sm"}`}>
        <thead>
          <tr className="border-b border-[var(--gt-line)] text-left text-[var(--gt-muted)]">
            <th className={cell}>{friendship ? "" : "อันดับ"}</th><th className={cell}>ชื่อ</th>
            <th className={`${cell} text-right`}>ชนะ</th><th className={`${cell} text-right`}>แพ้</th>
            <th className={`${cell} text-right`}>แต้ม</th>
            {friendship ? <th className={cell}>เหรียญ</th> : <><th className={`${cell} text-right`}>SOS</th><th className={`${cell} text-right`}>SOSOS</th></>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const award = friendship && !r.withdrawn ? friendshipAward(r.wins + r.byes, data.division) : null;
            return (
              <tr key={r.athlete_id ?? `${r.pos}-${r.display_name}`} className={`border-b border-[var(--gt-line)] last:border-0 ${r.withdrawn ? "opacity-60" : ""}`}>
                <td className={`${cell} gt-num font-bold`}>{friendship || r.withdrawn ? "" : r.pos}</td>
                <td className={`${cell} min-w-0`}><span className="block font-semibold leading-tight">{r.display_name ?? "—"}{r.withdrawn && <span className="ml-1 text-xs font-normal text-[var(--gt-bad)]">ตัดชื่อ</span>}</span><span className={`block truncate text-[var(--gt-muted)] ${large ? "text-base" : "max-w-[9rem] text-xs sm:max-w-none"}`}>{r.institution}</span></td>
                <td className={`${cell} gt-num whitespace-nowrap text-right`}>{r.wins}{r.byes ? <span className="block text-xs text-[var(--gt-muted)]">+บาย {r.byes}</span> : null}{r.draws ? <span className="block text-xs text-[var(--gt-muted)]">เสมอ {r.draws}</span> : null}</td>
                <td className={`${cell} gt-num text-right`}>{r.losses}</td>
                <td className={`${cell} gt-num text-right font-bold`}>{pts(r.score)}</td>
                {friendship ? <td className={cell}>{award ? MEDAL[award] : ""}</td> : <><td className={`${cell} gt-num text-right`}>{pts(r.sos)}</td><td className={`${cell} gt-num text-right`}>{pts(r.sosos)}</td></>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
        <section key={pool || "all"} className="gt-card p-3">
          <div className="mb-1 flex items-center px-1">
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
