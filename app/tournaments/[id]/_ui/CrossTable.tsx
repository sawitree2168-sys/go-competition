import { crossTable } from "@/lib/competition-day.mjs";

/** Minimal shapes so the same table serves the public page, the organiser console and the print view. */
export type CrossRow = {
  athlete_id: string | null; display_name: string | null; institution?: string | null;
  score: number | string; sos: number | string; sosos: number | string; withdrawn?: boolean;
};
export type CrossMatch = {
  round_number: number; black_athlete_id: string; white_athlete_id: string;
  winner_athlete_id: string | null; result_code: string | null; state: string;
};
export type CrossBye = { round_number: number; athlete_id: string };

const fmt = (n: number | string) => { const v = Number(n ?? 0); return Number.isInteger(v) ? String(v) : v.toFixed(1); };

/**
 * ตารางไขว้: อันดับ | ชื่อ | คะแนน | รอบ 1..n (เลขอันดับคู่แข่ง + ผล) | SOS | SOSOS [| เหรียญ]
 * Rows must be in rank order (withdrawn players last). Horizontal scroll on phones, name column stays visible.
 */
export default function CrossTable({ title, rows, matches, byes, rounds = 5, large = false, award }: {
  title: string; rows: CrossRow[]; matches: CrossMatch[]; byes: CrossBye[]; rounds?: number; large?: boolean;
  award?: (row: CrossRow) => string | null;
}) {
  const table = crossTable(rows.filter((r) => r.athlete_id), matches, byes, rounds) as (CrossRow & { no: number; cells: { round: number; text: string; kind: string; forfeit: boolean }[] })[];
  const roundCount = table[0]?.cells.length ?? rounds;
  const cell = large ? "px-2 py-2.5 text-lg" : "px-1.5 py-2 text-sm";
  const anyForfeit = table.some((r) => r.cells.some((c) => c.forfeit));

  return (
    <section className="gt-card overflow-hidden">
      <h3 className={`border-b-2 border-[var(--gt-brand)] px-3 py-2.5 text-center font-bold ${large ? "text-2xl" : "text-base"}`}>{title}</h3>
      <div className="overflow-x-auto">
        <table className="gt-num w-full min-w-[640px] border-collapse text-center">
          <thead>
            <tr className="bg-[var(--gt-brand)] text-white [&>th]:font-semibold">
              <th className={`${cell} w-12`}>อันดับ</th>
              <th className={`${cell} sticky left-0 z-10 bg-[var(--gt-brand)] text-left`}>ชื่อผู้เข้าแข่งขัน</th>
              <th className={`${cell} w-14`}>คะแนน</th>
              {Array.from({ length: roundCount }, (_, i) => <th key={i} className={`${cell} w-12`}>{i + 1}</th>)}
              <th className={`${cell} w-12`}>SOS</th>
              <th className={`${cell} w-14`}>SOSOS</th>
              {award && <th className={`${cell} w-20`}>เหรียญ</th>}
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => {
              const zebra = i % 2 ? "bg-[var(--gt-surface-2)]" : "bg-[var(--gt-surface)]";
              return (
                <tr key={r.athlete_id} className={`${zebra} border-b border-[var(--gt-line)] last:border-0 ${r.withdrawn ? "text-[var(--gt-muted)]" : ""}`}>
                  <td className={`${cell} font-bold`}>{r.no}</td>
                  <td className={`${cell} sticky left-0 z-10 ${zebra} max-w-[11rem] text-left sm:max-w-none`}>
                    <span className="block truncate font-semibold">{r.display_name ?? "—"}{r.withdrawn && <span className="ml-1 text-xs font-normal text-[var(--gt-bad)]">ถอนตัว</span>}</span>
                    {r.institution && <span className={`block truncate text-[var(--gt-muted)] ${large ? "text-sm" : "text-[11px]"}`}>{r.institution}</span>}
                  </td>
                  <td className={`${cell} font-bold`}>{fmt(r.score)}</td>
                  {r.cells.map((c) => (
                    <td key={c.round} className={`${cell} whitespace-nowrap ${c.kind === "win" ? "font-semibold" : c.kind === "pending" ? "text-[var(--gt-muted)]" : ""}`}>
                      {c.text}{c.forfeit && <sup className="text-[var(--gt-muted)]">*</sup>}
                    </td>
                  ))}
                  <td className={cell}>{fmt(r.sos)}</td>
                  <td className={cell}>{fmt(r.sosos)}</td>
                  {award && <td className={cell}>{r.withdrawn ? "" : award(r) ?? ""}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={`border-t border-[var(--gt-line)] px-3 py-2 text-[var(--gt-muted)] ${large ? "text-sm" : "text-[11px]"}`}>
        ช่องรอบ = อันดับของคู่แข่ง · + ชนะ · - แพ้ · = เสมอ{anyForfeit ? " · * คู่ไม่มา (ไม่นับใน SOS)" : ""} · เลขไม่มีเครื่องหมาย = รอผล
      </p>
    </section>
  );
}
