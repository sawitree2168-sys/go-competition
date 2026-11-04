"use client";

import { use } from "react";
import Gate from "../../../_lib/Gate";
import { useDivision } from "../../../_lib/division/useDivision";
import { StandingsTable, groupStandings } from "../../../_lib/division/StandingsPanel";
import { nameOf, poolKey, schoolOf } from "../../../_lib/division/types";
import { divisionLabel } from "@/lib/division-display";
import { pointsFor, resultLabel } from "@/lib/competition-day.mjs";

type Search = { round?: string; pool?: string; view?: string };

export default function PrintView({ params, searchParams }: { params: Promise<{ divisionId: string }>; searchParams: Promise<Search> }) {
  const { divisionId } = use(params);
  const q = use(searchParams);
  return <Gate><Sheet divisionId={divisionId} q={q} /></Gate>;
}

function Sheet({ divisionId, q }: { divisionId: string; q: Search }) {
  const { data } = useDivision(divisionId);
  if (!data) return <p className="py-10 text-center text-[var(--gt-muted)]">กำลังโหลด…</p>;
  const pool = q.pool ?? "";
  const title = `${divisionLabel(data.division.name)}${pool ? ` · สาย ${pool}` : ""}`;

  const toolbar = (
    <div className="mb-4 flex gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="gt-gold-btn min-h-12 px-5">พิมพ์</button>
      <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="gt-outline-btn min-h-12 px-4">เต็มจอ (ฉายโปรเจกเตอร์)</button>
    </div>
  );

  if (q.view === "standings") {
    const rows = groupStandings(data.standings).find(([p]) => p === pool)?.[1] ?? [];
    return (
      <div>
        {toolbar}
        <h1 className="mb-3 text-3xl font-bold">ตารางคะแนน {title}</h1>
        <StandingsTable rows={rows} data={data} large />
      </div>
    );
  }

  const round = Number(q.round) || 1;
  const byId = new Map(data.regs.map((r) => [r.athlete_id, r]));
  const tables = data.matches.filter((m) => poolKey(m.pool_label) === pool && m.round_number === round).sort((a, b) => (a.board_number ?? 0) - (b.board_number ?? 0));
  const bye = data.byes.find((b) => poolKey(b.pool_label) === pool && b.round_number === round);
  const outcome = (black: boolean, m: (typeof tables)[number]) => {
    if (m.state !== "verified") return <span className="inline-block h-6 w-6 rounded border-2 border-[var(--gt-line)]" title="เช็คชื่อ" />;
    const p = pointsFor(m, black ? m.black_athlete_id : m.white_athlete_id);
    return <span className="gt-num font-bold">{p === 0.5 ? "½" : p}</span>;
  };

  return (
    <div>
      {toolbar}
      <h1 className="mb-3 text-3xl font-bold">คู่แข่งขันรอบที่ {round} · {title}</h1>
      <table className="w-full border-collapse text-xl">
        <thead>
          <tr className="border-b-2 border-[var(--gt-line)] text-left text-base text-[var(--gt-muted)]">
            <th className="px-2 py-2">โต๊ะ</th><th className="px-2 py-2">● ดำ</th><th className="px-2 py-2" /><th className="px-2 py-2">○ ขาว</th><th className="px-2 py-2" /><th className="px-2 py-2">ผล</th>
          </tr>
        </thead>
        <tbody>
          {tables.map((m) => (
            <tr key={m.id} className="break-inside-avoid border-b border-[var(--gt-line)]">
              <td className="gt-num px-2 py-3 text-2xl font-bold">{m.board_number}</td>
              <td className="px-2 py-3"><span className="font-semibold">{nameOf(byId.get(m.black_athlete_id))}</span><span className="block text-base text-[var(--gt-muted)]">{schoolOf(byId.get(m.black_athlete_id))}</span></td>
              <td className="px-2 py-3 text-base">{outcome(true, m)}</td>
              <td className="px-2 py-3"><span className="font-semibold">{nameOf(byId.get(m.white_athlete_id))}</span><span className="block text-base text-[var(--gt-muted)]">{schoolOf(byId.get(m.white_athlete_id))}</span></td>
              <td className="px-2 py-3 text-base">{outcome(false, m)}</td>
              <td className="px-2 py-3 text-base">{resultLabel(m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {bye && <p className="mt-4 text-xl">บาย: <strong>{nameOf(byId.get(bye.athlete_id))}</strong> <span className="text-[var(--gt-muted)]">{schoolOf(byId.get(bye.athlete_id))}</span></p>}
      {!tables.length && !bye && <p className="text-lg">ยังไม่มีคู่ของรอบนี้</p>}
      {tables.length > 0 && <p className="mt-4 text-base text-[var(--gt-muted)]">ช่องสี่เหลี่ยม = เช็คชื่อที่โต๊ะ · มาสายเกิน 15 นาที ถือว่าแพ้</p>}
    </div>
  );
}
