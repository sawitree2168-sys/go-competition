"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { athleteGradeLabel, type AthleteRankFamily } from "@/lib/athlete-directory-ranks";
import { markInAppNav } from "./BackLink";
import CompetitionPanel from "./CompetitionPanel";
import AthleteAvatar from "./AthleteAvatar";

export type DirectoryAthlete = {
  go_id: string;
  full_name: string;
  photo: string | null;
  rank: string | null;
  rank_grade?: number | null;
  rank_total?: number;
  institution?: string | null;
  athlete_id?: string | null;
  events?: number;
  wins: number;
  losses: number;
  score?: number | null;
  dan_number?: number | null;
};

function AthleteCards({ rows }: { rows: DirectoryAthlete[] }) {
  return (
    <div className="portrait-athlete-grid">
      {rows.map(athlete => (
        <article className="portrait-athlete-card" key={athlete.go_id}>
          <div className="portrait-card-image">
            <AthleteAvatar src={athlete.photo} name={athlete.full_name} variant="portrait" zoom />
          </div>
          <div className="portrait-card-body">
            <span className="portrait-rank">{athlete.rank || "ยังไม่ระบุระดับ"}</span>
            <Link href={`/athletes/history/${athlete.go_id}`} onClick={markInAppNav} className="portrait-name">
              <h3>{athlete.full_name}</h3>
            </Link>
            <p className="portrait-go-id">{athlete.go_id}</p>
            {athlete.institution && <p className="portrait-school">{athlete.institution}</p>}
            <div className="portrait-record">
              {athlete.events ? (
                <>
                  <span>ชนะ <b>{athlete.wins}</b></span>
                  <span>แพ้ <b>{athlete.losses}</b></span>
                  <small>{athlete.events} รายการ</small>
                </>
              ) : <small>รอข้อมูลผลแข่งขันที่ตรวจสอบแล้ว</small>}
            </div>
            <div className="portrait-card-actions">
              <Link href={`/athletes/history/${athlete.go_id}`} onClick={markInAppNav} className="portrait-results-link">ดูผลงาน →</Link>
              <Link href={`/go-fan?search=${encodeURIComponent(athlete.full_name)}`} aria-label={`ติดตาม ${athlete.full_name}`} className="portrait-follow-link">☆</Link>
            </div>
            <Link href={`/head-to-head?a=${athlete.go_id}`} className="portrait-profile-link">สถิติการพบกัน →</Link>
            {athlete.athlete_id && <Link href={`/athletes/${athlete.athlete_id}`} className="portrait-profile-link">ดูโปรไฟล์นักกีฬา</Link>}
          </div>
        </article>
      ))}
    </div>
  );
}

function AthleteTable({ rows }: { rows: DirectoryAthlete[] }) {
  return (
    <div className="portrait-table-wrap">
      <table className="portrait-directory-table">
        <thead><tr><th>นักกีฬา / สถาบัน</th><th>ระดับ</th><th>ชนะ</th><th>แพ้</th><th>ผลงาน</th></tr></thead>
        <tbody>
          {rows.map(athlete => (
            <tr key={athlete.go_id}>
              <td>
                <div className="portrait-table-person">
                  <AthleteAvatar src={athlete.photo} name={athlete.full_name} variant="portrait" zoom />
                  <div>
                    <strong>{athlete.full_name}</strong>
                    <small className={athlete.institution ? undefined : "portrait-go-id"}>{athlete.institution || athlete.go_id}</small>
                  </div>
                </div>
              </td>
              <td>{athlete.rank || "–"}</td>
              <td>{athlete.wins}</td>
              <td>{athlete.losses}</td>
              <td>
                <Link href={`/athletes/history/${athlete.go_id}`} onClick={markInAppNav}>ดูผลงาน →</Link>
                <br />
                <Link href={`/head-to-head?a=${athlete.go_id}`}>สถิติการพบกัน →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AthleteDirectory({ rows, initialView = "cards", rankFamily, grouped }: {
  rows: DirectoryAthlete[];
  initialView?: string;
  rankFamily: AthleteRankFamily | null;
  grouped: boolean;
}) {
  const [view, setViewState] = useState(initialView === "table" ? "table" : "cards");
  const router = useRouter(), pathname = usePathname(), search = useSearchParams();
  const setView = (value: "cards" | "table") => {
    setViewState(value);
    const params = new URLSearchParams(search.toString());
    if (value === "table") params.set("view", "table");
    else params.delete("view");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const rankGroups = new Map<number | null, DirectoryAthlete[]>();
  if (rankFamily) {
    for (const athlete of rows) {
      const grade = athlete.rank_grade ?? null;
      const group = rankGroups.get(grade);
      if (group) group.push(athlete);
      else rankGroups.set(grade, [athlete]);
    }
  }
  const Results = view === "cards" ? AthleteCards : AthleteTable;

  return (
    <CompetitionPanel className="portrait-directory" title="รายชื่อนักกีฬา" context="GO TOURNAMENT · รายชื่อนักกีฬา (ตามตัวกรองที่เลือก)">
      <section>
        <div className="portrait-directory-toolbar">
          <div>
            <h2>รายชื่อนักกีฬา <span>{rows.length} คนในหน้านี้</span></h2>
            <p>กดรูปเพื่อขยาย · เลือกดูผลงานเพื่อดูประวัติการแข่งขัน</p>
          </div>
          <div className="portrait-view-switch" role="group" aria-label="รูปแบบรายชื่อนักกีฬา">
            <button aria-pressed={view === "cards"} onClick={() => setView("cards")}>การ์ด</button>
            <button aria-pressed={view === "table"} onClick={() => setView("table")}>ตาราง</button>
          </div>
        </div>
        {rankFamily ? (
          <div className="space-y-5">
            {Array.from(rankGroups, ([grade, athletes]) => {
              const label = athleteGradeLabel(rankFamily, grade);
              const params = new URLSearchParams(search.toString());
              params.set("level", grade === null ? rankFamily : `${rankFamily}${grade}`);
              params.delete("page");
              if (view === "table") params.set("view", "table");
              else params.delete("view");
              const total = athletes[0].rank_total ?? athletes.length;
              return (
                <section key={grade} aria-labelledby={`athlete-grade-${grade}`} className="space-y-2">
                  <header className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#eaf2fc] px-3 py-2 text-[#123f77]">
                    <h3 id={`athlete-grade-${grade}`} className="font-bold">{label} <span className="ml-1 text-xs font-medium">{total.toLocaleString("th-TH")} คน</span></h3>
                    {grouped && grade !== null && total > athletes.length && (
                      <Link href={`${pathname}?${params}`} className="inline-flex min-h-9 items-center text-xs font-semibold underline underline-offset-4">
                        ดูทั้งหมด {label} →
                      </Link>
                    )}
                  </header>
                  <Results rows={athletes} />
                </section>
              );
            })}
          </div>
        ) : <Results rows={rows} />}
      </section>
    </CompetitionPanel>
  );
}
