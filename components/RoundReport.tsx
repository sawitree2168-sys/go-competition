"use client";

import { useState } from "react";
import CompetitionPanel from "./CompetitionPanel";
import AthletePhotoViewer from "./AthletePhotoViewer";
import { resultLabel, scoresFrom } from "@/lib/competition-day.mjs";

export type ReportMatch = {
  id: string; round_number: number; board_number: number | null; black_athlete_id: string; white_athlete_id: string;
  winner_athlete_id: string | null; result_code: string | null; result_margin: string | null; state: string; pool_label?: string | null;
};
export type ReportBye = { round_number: number; athlete_id: string; pool_label?: string | null };
export type ReportPerson = { name: string; institution?: string | null; rank?: string | null; photo?: string | null };
type Kind = "pairings" | "results";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function Who({ p, colour, extra, won }: { p?: ReportPerson; colour?: "black" | "white"; extra?: string; won?: boolean }) {
  return (
    <div className={`cd-player ${won ? "gt-report-won" : ""}`}>
      <span className="cd-avatar-wrap"><span data-athlete-photo="true"><AthletePhotoViewer src={p?.photo} name={p?.name ?? "นักกีฬา"} /></span>
        {colour && <span className={`cd-stone ${colour}`} aria-label={colour === "black" ? "หมากดำ" : "หมากขาว"} />}</span>
      <span><strong>{p?.name ?? "ผู้เข้าแข่งขัน"}{won && <b className="gt-report-win"> ชนะ</b>}</strong>
        <small>{[p?.institution, p?.rank, extra].filter(Boolean).join(" · ") || "—"}</small></span>
    </div>
  );
}

/**
 * One round as a table: every board (no paging), byes at the end. `pairings` shows points before the round,
 * `results` shows the result and marks the winner. Big enough to read on a phone in full screen.
 */
export function RoundTable({ kind, round, pool, matches, byes, people }: {
  kind: Kind; round: number; pool?: string | null; matches: ReportMatch[]; byes: ReportBye[]; people: Record<string, ReportPerson>;
}) {
  const inPool = (x: { pool_label?: string | null }) => pool == null || pool === "*" || (x.pool_label ?? "") === pool;
  const rows = matches.filter((m) => m.round_number === round && m.state !== "void" && inPool(m))
    .sort((a, b) => (a.pool_label ?? "").localeCompare(b.pool_label ?? "") || (a.board_number ?? 0) - (b.board_number ?? 0));
  const roundByes = byes.filter((b) => b.round_number === round && inPool(b));
  const before = scoresFrom(Object.keys(people), matches.filter((m) => m.round_number < round && inPool(m)), byes.filter((b) => b.round_number < round && inPool(b))).score;
  const multi = new Set(rows.map((m) => m.pool_label ?? "")).size > 1;
  const pts = (id: string) => kind === "pairings" ? `${fmt(before.get(id) ?? 0)} คะแนน` : undefined;
  return (
    <div className="cd-table-scroll">
      <table className="cd-match-table gt-report-table">
        <thead><tr><th scope="col">โต๊ะ</th><th scope="col">ฝ่ายดำ ●</th><th scope="col">ฝ่ายขาว ○</th><th scope="col">{kind === "results" ? "ผลการแข่งขัน" : "สถานะ"}</th></tr></thead>
        <tbody>
          {rows.map((m) => {
            const done = m.state === "verified";
            return (
              <tr key={m.id}>
                <td className="cd-board"><strong>โต๊ะ {m.board_number ?? "–"}</strong><small>รอบ {round}{multi && m.pool_label ? ` · สาย ${m.pool_label}` : ""}</small></td>
                <td><Who p={people[m.black_athlete_id]} colour="black" extra={pts(m.black_athlete_id)} won={kind === "results" && done && m.winner_athlete_id === m.black_athlete_id} /></td>
                <td><Who p={people[m.white_athlete_id]} colour="white" extra={pts(m.white_athlete_id)} won={kind === "results" && done && m.winner_athlete_id === m.white_athlete_id} /></td>
                <td className="cd-match-status"><span className={`cd-pill ${done ? "done" : "waiting"}`}>{done ? resultLabel(m) || "บันทึกผลแล้ว" : kind === "results" ? "รอผล" : "รอแข่ง"}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {roundByes.map((b) => (
        <div className="cd-bye" key={`${b.pool_label}-${b.athlete_id}`}><Who p={people[b.athlete_id]} /><span className="cd-pill done">ได้บาย +1 คะแนน{b.pool_label && multi ? ` · สาย ${b.pool_label}` : ""}</span></div>
      ))}
      {!rows.length && !roundByes.length && <p className="cd-message">ยังไม่มีคู่แข่งขันในรอบนี้</p>}
    </div>
  );
}

/**
 * Two buttons: "ใบจับคู่รอบ N" and "ผลการแข่งขันรอบ N". Each opens the round in full screen with
 * show/hide photos and download as PNG or PDF.
 */
export default function RoundReportButtons({ eventTitle, divisionName, round, pool, matches, byes, people, className = "" }: {
  eventTitle: string; divisionName: string; round: number; pool?: string | null;
  matches: ReportMatch[]; byes: ReportBye[]; people: Record<string, ReportPerson>; className?: string;
}) {
  const [open, setOpen] = useState<Kind | null>(null);
  if (!round) return null;
  const poolText = pool && pool !== "*" ? ` · สาย ${pool}` : "";
  const title = open === "results" ? `ผลการแข่งขัน รอบที่ ${round}` : `ใบจับคู่ รอบที่ ${round}`;
  return (
    <>
      <div className={`gt-report-buttons ${className}`} role="group" aria-label="ดูเต็มจอและดาวน์โหลด">
        <button type="button" onClick={() => setOpen("pairings")}>⛶ ใบจับคู่รอบ {round}</button>
        <button type="button" onClick={() => setOpen("results")}>⛶ ผลการแข่งขันรอบ {round}</button>
      </div>
      {open && (
        <CompetitionPanel title={title} context={`${eventTitle} · ${divisionName}${poolText} · ${title}`} onClose={() => setOpen(null)} className="gt-round-report">
          <div className="cd-panel-heading"><h2><span className="cd-heading-stones" aria-hidden="true">●○</span>{divisionName}{poolText} · {title}</h2></div>
          <RoundTable kind={open} round={round} pool={pool} matches={matches} byes={byes} people={people} />
        </CompetitionPanel>
      )}
    </>
  );
}
