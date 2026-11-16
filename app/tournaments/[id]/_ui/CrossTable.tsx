"use client";
/* eslint-disable @next/next/no-img-element -- athlete photos come from arbitrary storage URLs */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { crossTable } from "@/lib/competition-day.mjs";
import { DEFAULT_AVATAR } from "./MatchCard";

/**
 * ตารางอันดับ (approved design 16 Nov 2026, blue–white):
 * desktop/print = one table: rank (medals 1–3) | athlete (photo, institution, rank chip) | score | round 1..n pills | SOS | SOSOS;
 * phone = "สรุป" cards (default) or "ตาราง" (the same table, scrolls sideways). Tap a photo to see it large.
 * Round pill = opponent's row number + result: green "14+" won, pink "3-" lost, "5=" draw, grey number = waiting for the result.
 */
export type CrossRow = {
  athlete_id: string | null; display_name: string | null; institution?: string | null; current_rank?: string | null;
  score: number | string; sos: number | string; sosos: number | string; withdrawn?: boolean;
};
export type CrossMatch = {
  round_number: number; black_athlete_id: string; white_athlete_id: string;
  winner_athlete_id: string | null; result_code: string | null; state: string;
};
export type CrossBye = { round_number: number; athlete_id: string };
type Cell = { round: number; text: string; kind: string; forfeit: boolean };
type Row = CrossRow & { no: number; cells: Cell[] };

const fmt = (n: number | string) => { const v = Number(n ?? 0); return Number.isInteger(v) ? String(v) : v.toFixed(1); };

/** "4 Dan" -> "4d", "10 Kyu" / "10 คิว" -> "10k"; anything else unchanged. */
export function shortRank(label?: string | null) {
  if (!label) return null;
  const s = label.toLowerCase().replace(/\s+/g, "");
  const n = s.match(/\d+/)?.[0];
  if (n && /dan|ดั้ง|\dd$/.test(s)) return `${n}d`;
  if (n && /kyu|คิว|\dk$/.test(s)) return `${n}k`;
  return label;
}

const PILL: Record<string, string> = {
  win: "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]",
  loss: "bg-[var(--gt-loss-bg)] text-[var(--gt-loss-ink)]",
  draw: "bg-[var(--gt-gold-soft)] text-[var(--gt-gold-ink)]",
  bye: "bg-[var(--gt-surface-2)] text-[var(--gt-brand)]",
  pending: "border border-[var(--gt-line)] text-[var(--gt-muted)]",
  none: "",
};

function Pill({ c, large }: { c: Cell; large?: boolean }) {
  if (c.kind === "none") return <span className="text-[var(--gt-muted)]">·</span>;
  return (
    <span className={`gt-num inline-flex min-w-[2.6rem] items-center justify-center rounded-lg px-1.5 font-bold ${large ? "py-1.5 text-lg" : "py-1 text-sm"} ${PILL[c.kind]}`}>
      {c.text}{c.forfeit && <sup className="font-normal">*</sup>}
    </span>
  );
}

function Medal({ no, withdrawn }: { no: number; withdrawn?: boolean }) {
  if (withdrawn) return <span className="text-xs text-[var(--gt-bad)]">ถอนตัว</span>;
  if (no > 3) return <span className="gt-num font-bold">{no}</span>;
  const tone = no === 1 ? "from-[#ffe7a0] to-[#e9b23a] text-[#6e4a0c]" : no === 2 ? "from-[#f1f4f8] to-[#b9c2cf] text-[#3d4a5c]" : "from-[#f6d2b0] to-[#c9824a] text-[#5c3112]";
  return <span className={`gt-num inline-grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b font-bold shadow ring-2 ring-white ${tone}`}>{no}</span>;
}

export default function CrossTable({ title, rows, matches, byes, rounds = 5, large = false, medals, photos }: {
  title: string; rows: CrossRow[]; matches: CrossMatch[]; byes: CrossBye[]; rounds?: number; large?: boolean;
  /** athlete id -> medal label (Friendship), shown as an extra column */
  medals?: Record<string, string>;
  /** athlete id -> photo URL; players without one get the default avatar */
  photos?: Record<string, string | null | undefined>;
}) {
  const table = crossTable(rows.filter((r) => r.athlete_id), matches, byes, rounds) as Row[];
  const roundCount = table[0]?.cells.length ?? rounds;
  const [view, setView] = useState<"cards" | "table">("cards");
  const [q, setQ] = useState("");
  const [zoom, setZoom] = useState<Row | null>(null);
  const term = q.trim().toLowerCase();
  const shown = term ? table.filter((r) => [r.display_name, r.institution].some((x) => (x ?? "").toLowerCase().includes(term))) : table;
  const photo = (r: Row) => (r.athlete_id && photos?.[r.athlete_id]) || DEFAULT_AVATAR;
  const hasMedals = Boolean(medals && Object.keys(medals).length);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const Face = ({ r, size }: { r: Row; size: string }) => (
    <button type="button" onClick={() => setZoom(r)} aria-label={`ดูรูป ${r.display_name ?? ""}`} className={`${size} shrink-0 overflow-hidden rounded-full print:pointer-events-none`}>
      <img src={photo(r)} alt="" loading="lazy" className={`h-full w-full ${photo(r) === DEFAULT_AVATAR ? "object-contain" : "object-cover"}`} />
    </button>
  );
  const RankChip = ({ r }: { r: Row }) => {
    const k = shortRank(r.current_rank);
    return k ? <span className="shrink-0 rounded-md bg-[var(--gt-surface-2)] px-1.5 py-0.5 text-xs font-bold text-[var(--gt-brand)]">{k}</span> : null;
  };

  const tableView = (
    <div className="overflow-x-auto">
      <table className="gt-num w-full min-w-[760px] border-collapse text-center">
        <thead>
          <tr className="bg-[var(--gt-table-head)] text-white [&>th]:font-semibold">
            <th className={`px-2 ${large ? "py-3 text-base" : "py-2.5 text-sm"} w-14`}>อันดับ</th>
            <th className={`sticky left-0 z-10 bg-[var(--gt-table-head)] px-2 text-left ${large ? "text-base" : "text-sm"}`}>นักกีฬา</th>
            <th className={`px-2 ${large ? "text-base" : "text-sm"} w-16`}>คะแนน</th>
            {Array.from({ length: roundCount }, (_, i) => <th key={i} className={`px-1 ${large ? "text-base" : "text-sm"}`}>รอบ {i + 1}</th>)}
            <th className={`px-2 ${large ? "text-base" : "text-sm"} w-14`}>SOS</th>
            <th className={`px-2 ${large ? "text-base" : "text-sm"} w-16`}>SOSOS</th>
            {hasMedals && <th className={`px-2 ${large ? "text-base" : "text-sm"}`}>เหรียญ</th>}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => {
            const zebra = i % 2 ? "bg-[var(--gt-surface-2)]" : "bg-[var(--gt-surface)]";
            return (
              <tr key={r.athlete_id} className={`${zebra} border-b border-[var(--gt-line)] last:border-0 ${r.withdrawn ? "opacity-60" : ""}`}>
                <td className="px-2 py-2"><Medal no={r.no} withdrawn={r.withdrawn} /></td>
                <td className={`sticky left-0 z-10 ${zebra} px-2 py-2 text-left`}>
                  <div className="flex min-w-[12rem] items-center gap-2.5">
                    <Face r={r} size={large ? "h-12 w-12" : "h-10 w-10"} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-bold ${large ? "text-lg" : ""}`}>{r.display_name ?? "—"}</span>
                      {r.institution && <span className={`block truncate text-[var(--gt-muted)] ${large ? "text-sm" : "text-xs"}`}>{r.institution}</span>}
                    </span>
                    <RankChip r={r} />
                  </div>
                </td>
                <td className={`px-2 font-bold text-[var(--gt-brand)] ${large ? "text-2xl" : "text-xl"}`}>{fmt(r.score)}</td>
                {r.cells.map((c) => <td key={c.round} className="px-1 py-2"><Pill c={c} large={large} /></td>)}
                <td className={`px-2 ${large ? "text-lg" : ""}`}>{fmt(r.sos)}</td>
                <td className={`px-2 ${large ? "text-lg" : ""}`}>{fmt(r.sosos)}</td>
                {hasMedals && <td className="px-2 text-sm">{(r.athlete_id && medals?.[r.athlete_id]) || ""}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const cardsView = (
    <ul className="space-y-2.5 p-2.5">
      {shown.map((r) => (
        <li key={r.athlete_id} className={`rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-3 ${r.withdrawn ? "opacity-60" : ""}`}>
          <div className="flex items-center gap-2.5">
            <Medal no={r.no} withdrawn={r.withdrawn} />
            <Face r={r} size="h-11 w-11" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5"><span className="truncate font-bold">{r.display_name ?? "—"}</span><RankChip r={r} /></span>
              {r.institution && <span className="block truncate text-xs text-[var(--gt-muted)]">{r.institution}</span>}
            </span>
            <span className="border-l border-[var(--gt-line)] pl-3 text-center">
              <span className="block text-[11px] text-[var(--gt-muted)]">คะแนน</span>
              <span className="gt-num block text-2xl font-bold leading-none text-[var(--gt-brand)]">{fmt(r.score)}</span>
            </span>
          </div>
          <div className="mt-2.5 grid gap-1 text-center" style={{ gridTemplateColumns: `repeat(${roundCount}, minmax(0, 1fr))` }}>
            {r.cells.map((c) => (
              <div key={c.round} className="space-y-1">
                <span className="block text-[11px] text-[var(--gt-muted)]">รอบ {c.round}</span>
                <Pill c={c} />
              </div>
            ))}
          </div>
          <p className="gt-num mt-2.5 flex justify-center gap-3 border-t border-[var(--gt-line)] pt-2 text-sm">
            <span>SOS: <strong>{fmt(r.sos)}</strong></span><span className="text-[var(--gt-line)]">|</span><span>SOSOS: <strong>{fmt(r.sosos)}</strong></span>
            {r.athlete_id && medals?.[r.athlete_id] && <><span className="text-[var(--gt-line)]">|</span><span>{medals[r.athlete_id]}</span></>}
          </p>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="gt-card overflow-hidden">
      <div className="space-y-2.5 border-b border-[var(--gt-line)] px-3 py-3">
        <h3 className={`flex items-center gap-2 font-bold ${large ? "text-2xl" : "text-lg"}`}><span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-[var(--gt-brand)]" />{title}</h3>
        {!large && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <div role="tablist" aria-label="รูปแบบการแสดง" className="flex flex-1 rounded-xl border border-[var(--gt-line)] p-0.5 sm:hidden">
              {(["cards", "table"] as const).map((v) => (
                <button key={v} role="tab" type="button" aria-selected={view === v} onClick={() => setView(v)}
                  className={`min-h-10 flex-1 rounded-[10px] text-sm font-semibold ${view === v ? "bg-[var(--gt-brand)] text-white" : ""}`}>{v === "cards" ? "สรุป" : "ตาราง"}</button>
              ))}
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหานักกีฬา…" aria-label="ค้นหานักกีฬา"
              className="min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base sm:max-w-xs" />
          </div>
        )}
      </div>
      {large ? tableView : (
        <>
          <div className={view === "cards" ? "sm:hidden" : "hidden"}>{cardsView}</div>
          <div className={view === "cards" ? "hidden sm:block" : ""}>{tableView}</div>
        </>
      )}
      {!shown.length && <p className="p-4 text-center text-sm text-[var(--gt-muted)]">ไม่พบนักกีฬาที่ค้นหา</p>}
      <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--gt-line)] px-3 py-2.5 text-[var(--gt-muted)] ${large ? "text-sm" : "text-xs"}`}>
        <span className="inline-flex items-center gap-1"><span className={`rounded px-1.5 font-bold ${PILL.win}`}>+</span>ชนะ</span>
        <span className="inline-flex items-center gap-1"><span className={`rounded px-1.5 font-bold ${PILL.loss}`}>-</span>แพ้</span>
        <span>ตัวเลข = อันดับของคู่แข่ง · = เสมอ · * คู่ไม่มา (ไม่นับใน SOS) · เลขสีเทา = รอผล</span>
      </p>

      {zoom && createPortal(
        <div role="dialog" aria-modal="true" aria-label={`รูป ${zoom.display_name ?? ""}`} onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 print:hidden">
          <figure className="w-full max-w-sm rounded-2xl bg-[var(--gt-surface)] p-5 text-center shadow-2xl">
            <img src={photo(zoom)} alt={zoom.display_name ?? ""} className={`mx-auto aspect-square w-full max-w-[18rem] rounded-full ${photo(zoom) === DEFAULT_AVATAR ? "object-contain" : "object-cover"}`} />
            <figcaption className="mt-4 space-y-1">
              <p className="text-xl font-bold">{zoom.display_name}</p>
              {zoom.institution && <p className="text-sm text-[var(--gt-muted)]">{zoom.institution}</p>}
              <p className="gt-num text-sm">อันดับ {zoom.no} · {fmt(zoom.score)} คะแนน{zoom.current_rank ? ` · ${zoom.current_rank}` : ""}</p>
            </figcaption>
            <button type="button" className="mt-4 min-h-11 w-full rounded-xl border border-[var(--gt-line)] text-sm">ปิด</button>
          </figure>
        </div>,
        // Portal to the themed page wrapper (not inside the shifted table) so the overlay covers the whole screen.
        (document.querySelector(".gt") as HTMLElement | null) ?? document.body,
      )}
    </section>
  );
}
