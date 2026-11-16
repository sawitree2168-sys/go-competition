"use client";

import { useMemo, useState } from "react";
import MatchCard, { Avatar } from "./MatchCard";
import { resultLabel, scoresFrom } from "@/lib/competition-day.mjs";
import type { Bye, Match, Person } from "./data";

/**
 * Public "จับคู่ & ผล" board: round tabs, search by name/institution/table, pool filter, one card per table.
 * Score on each card = points before that round (what the Swiss pairing was based on).
 */
export default function PairingsBoard({ matches, byes, people }: { matches: Match[]; byes: Bye[]; people: Record<string, Person> }) {
  const rounds = useMemo(() => [...new Set([...matches.map((m) => m.round_number), ...byes.map((b) => b.round_number)])].sort((a, b) => a - b), [matches, byes]);
  const pools = useMemo(() => [...new Set(matches.map((m) => m.pool_label ?? ""))].sort(), [matches]);
  const [round, setRound] = useState(rounds[rounds.length - 1] ?? 1);
  const [pool, setPool] = useState("all");
  const [q, setQ] = useState("");

  const before = useMemo(
    () => scoresFrom(Object.keys(people), matches.filter((m) => m.round_number < round), byes.filter((b) => b.round_number < round)).score,
    [matches, byes, round, people],
  );
  const seat = (id: string, won: boolean) => ({ id, name: people[id]?.name ?? "ผู้เข้าแข่งขัน", institution: people[id]?.institution, rank: people[id]?.rank, photo: people[id]?.photo, score: before.get(id) ?? 0, won });
  const term = q.trim().toLowerCase();
  const hit = (id: string) => [people[id]?.name, people[id]?.institution].some((x) => (x ?? "").toLowerCase().includes(term));
  const tables = matches
    .filter((m) => m.round_number === round && (pool === "all" || (m.pool_label ?? "") === pool))
    .filter((m) => !term || String(m.board_number) === term || hit(m.black_athlete_id) || hit(m.white_athlete_id))
    .sort((a, b) => (a.pool_label ?? "").localeCompare(b.pool_label ?? "") || (a.board_number ?? 0) - (b.board_number ?? 0));
  const roundByes = byes.filter((b) => b.round_number === round && (pool === "all" || (b.pool_label ?? "") === pool) && (!term || hit(b.athlete_id)));
  const done = matches.filter((m) => m.round_number === round).every((m) => m.state === "verified");

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">รอบ</span>
        {rounds.map((r) => (
          <button key={r} type="button" onClick={() => setRound(r)} aria-pressed={r === round}
            className={`gt-num min-h-11 min-w-11 rounded-xl border px-3 font-semibold ${r === round ? "border-[var(--gt-brand)] bg-[var(--gt-brand)] text-white" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`}>{r}</button>
        ))}
        <span className={`ml-auto rounded-full px-3 py-1 text-sm font-semibold ${done ? "bg-[var(--gt-surface-2)] text-[var(--gt-muted)]" : "bg-[var(--gt-gold-soft)] text-[var(--gt-ok)]"}`}>
          {done ? `รอบที่ ${round} • จบแล้ว` : `● รอบที่ ${round} • กำลังแข่งขัน`}
        </span>
      </div>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อนักกีฬา / สถาบัน / เลขโต๊ะ" aria-label="ค้นหานักกีฬา"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base" />
        {pools.length > 1 && (
          <select value={pool} onChange={(e) => setPool(e.target.value)} aria-label="เลือกสาย" className="min-h-12 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-2">
            <option value="all">ทุกสาย</option>
            {pools.map((p) => <option key={p} value={p}>สาย {p}</option>)}
          </select>
        )}
      </div>
      <ul className="space-y-3">
        {tables.map((m) => {
          const label = resultLabel(m);
          return (
            <MatchCard key={m.id} board={m.board_number} status={label || "รอผล"} statusTone={label ? "done" : "wait"}
              black={seat(m.black_athlete_id, m.winner_athlete_id === m.black_athlete_id)} white={seat(m.white_athlete_id, m.winner_athlete_id === m.white_athlete_id)} />
          );
        })}
        {roundByes.map((b) => (
          <li key={b.athlete_id} className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--gt-line)] px-3 py-3">
            <Avatar seat={seat(b.athlete_id, false)} />
            <span className="min-w-0 flex-1"><span className="block font-semibold">{people[b.athlete_id]?.name ?? "ผู้เข้าแข่งขัน"}</span><span className="block text-xs text-[var(--gt-muted)]">{people[b.athlete_id]?.institution}</span></span>
            <span className="shrink-0 text-sm font-semibold text-[var(--gt-ok)]">บาย +1 คะแนน</span>
          </li>
        ))}
        {!tables.length && !roundByes.length && <li className="gt-card p-4 text-center text-sm text-[var(--gt-muted)]">ไม่พบโต๊ะที่ค้นหา</li>}
      </ul>
    </div>
  );
}
