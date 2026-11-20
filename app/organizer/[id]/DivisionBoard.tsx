"use client";

import Link from "next/link";
import { useState } from "react";
import { staffDb } from "../_lib/staff";
import { divisionLabel, divisionSortValue } from "@/lib/division-display";
import { roundsOf } from "@/lib/competition-day.mjs";
import { clock, useLiveFingerprint } from "../../tournaments/[id]/_ui/live";

/**
 * โต๊ะกรรมการ · ทุกรุ่น: one screen for the whole event on competition day.
 * Every division (and every สาย) shows where it stands; divisions whose results are all in and are waiting
 * for the admin to pair the next round come first, with a button straight to that division's pairing.
 * Nothing is paired automatically — the admin checks results there and presses the pairing button.
 * Refreshes itself every 10 s.
 */
type Kind = "ready" | "playing" | "notStarted" | "done";
type PoolStatus = { pool: string; kind: Kind; last: number; tables: number; pending: number; checked: number; seats: number };
type DivisionStatus = { id: string; name: string; rounds: number; pools: PoolStatus[]; kind: Kind };
type MatchRow = { division_id: string; pool_label: string | null; round_number: number; state: string; black_checkin_at: string | null; white_checkin_at: string | null };
type ByeRow = { division_id: string; pool_label: string | null; round_number: number };

const ORDER: Record<Kind, number> = { ready: 0, playing: 1, notStarted: 2, done: 3 };
const poolKey = (p: string | null) => (p ?? "").trim().toUpperCase();

export function summarise(divisions: { id: string; name: string; total_rounds: number | null }[], matches: MatchRow[], byes: ByeRow[], players: Map<string, number>): DivisionStatus[] {
  return divisions.map((d) => {
    const rounds = roundsOf(d);
    const ms = matches.filter((m) => m.division_id === d.id), bs = byes.filter((b) => b.division_id === d.id);
    const pools = [...new Set([...ms.map((m) => poolKey(m.pool_label)), ...bs.map((b) => poolKey(b.pool_label))])].sort();
    const list: PoolStatus[] = (pools.length ? pools : [""]).map((pool) => {
      const pm = ms.filter((m) => poolKey(m.pool_label) === pool), pb = bs.filter((b) => poolKey(b.pool_label) === pool);
      const last = Math.max(0, ...pm.map((m) => m.round_number), ...pb.map((b) => b.round_number));
      const cur = pm.filter((m) => m.round_number === last);
      const pending = pm.filter((m) => m.state !== "verified").length;
      const checked = cur.reduce((n, m) => n + (m.black_checkin_at ? 1 : 0) + (m.white_checkin_at ? 1 : 0), 0);
      const kind: Kind = last === 0 ? "notStarted" : pending > 0 ? "playing" : last >= rounds ? "done" : "ready";
      return { pool, kind, last, tables: cur.length, pending, checked, seats: cur.length * 2 };
    });
    const kind = list.map((p) => p.kind).sort((a, b) => ORDER[a] - ORDER[b])[0];
    return { id: d.id, name: d.name, rounds, pools: list, kind: players.get(d.id) ? kind : "notStarted" };
  }).sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || divisionSortValue(a.name) - divisionSortValue(b.name));
}

export default function DivisionBoard({ eventId, players, sheet }: { eventId: string; players: Map<string, number>; sheet: Map<string, number> }) {
  const [rows, setRows] = useState<DivisionStatus[] | null>(null);

  const { status: live } = useLiveFingerprint(async () => {
    const db = staffDb()!;
    const dv = await db.from("gt_divisions").select("id,name,total_rounds").eq("tournament_id", eventId);
    const ids = ((dv.data ?? []) as { id: string }[]).map((x) => x.id);
    const [mt, by] = ids.length ? await Promise.all([
      db.from("gt_matches").select("division_id,pool_label,round_number,state,black_checkin_at,white_checkin_at").in("division_id", ids).neq("state", "void").limit(10000),
      db.from("gt_byes").select("division_id,pool_label,round_number").in("division_id", ids).limit(5000),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    if (dv.error || mt.error) throw new Error("load failed");
    const next = summarise(dv.data ?? [], (mt.data ?? []) as MatchRow[], (by.data ?? []) as ByeRow[], players);
    setRows(next);
    return JSON.stringify(next);
  }, () => {}, { interval: 10000 });

  if (!rows) return <p className="gt-card p-4 text-sm text-[var(--gt-muted)]">กำลังโหลดสถานะทุกรุ่น…</p>;
  return <BoardView rows={rows} live={live} eventId={eventId} players={players} sheet={sheet} />;
}

export function BoardView({ rows, live, eventId, players, sheet }: { rows: DivisionStatus[]; live: { checkedAt: Date | null; offline: boolean }; eventId: string; players: Map<string, number>; sheet: Map<string, number> }) {
  const [filter, setFilter] = useState<Kind | "all">("all");
  if (!rows) return <p className="gt-card p-4 text-sm text-[var(--gt-muted)]">กำลังโหลดสถานะทุกรุ่น…</p>;
  const count = (k: Kind) => rows.filter((r) => r.kind === k).length;
  const shown = filter === "all" ? rows : rows.filter((r) => r.kind === filter);
  const chips: [Kind | "all", string, number][] = [
    ["all", "ทั้งหมด", rows.length], ["ready", "รอจับคู่", count("ready")], ["playing", "กำลังแข่ง", count("playing")],
    ["notStarted", "ยังไม่เริ่ม", count("notStarted")], ["done", "จบแล้ว", count("done")],
  ];

  return (
    <div className="gt-board space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${live.offline ? "bg-[var(--gt-warn-soft)] text-[var(--gt-warn)]" : "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]"}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${live.offline ? "bg-[var(--gt-warn)]" : "animate-pulse bg-[var(--gt-ok)]"}`} />
          {live.offline ? "ขาดการเชื่อมต่อ" : `อัปเดตเอง · ล่าสุด ${clock(live.checkedAt)}`}
        </span>
      </div>
      {count("ready") > 0 && (
        <p role="status" className="gt-board-alert">🔔 มี <strong>{count("ready")} รุ่น</strong> ลงผลครบแล้ว รอแอดมินตรวจผลและกดจับคู่รอบถัดไป</p>
      )}
      <div className="gt-board-chips" role="group" aria-label="กรองสถานะ">
        {chips.map(([k, label, n]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`kind-${k}`}>{label} <b>{n}</b></button>
        ))}
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((d) => {
          const inDb = players.get(d.id) ?? 0, inSheet = sheet.get(d.id) ?? 0;
          const href = (tab: string) => `/organizer/${eventId}/${d.id}?tab=${tab}`;
          const multi = d.pools.length > 1;
          return (
            <li key={d.id} className={`gt-board-card kind-${d.kind}`}>
              <div className="gt-board-band">{{ ready: "✓ ลงผลครบ · รอจับคู่", playing: "⏳ กำลังแข่ง", notStarted: "○ ยังไม่เริ่ม", done: "🏁 แข่งครบทุกรอบแล้ว" }[d.kind]}</div>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={href("monitor")} className="text-lg font-bold leading-tight underline-offset-2 hover:underline">{divisionLabel(d.name)}</Link>
                  <span className="gt-num shrink-0 text-right text-xs text-[var(--gt-muted)]">{inDb} คน{inSheet > 0 && inSheet !== inDb && <span className="block text-[var(--gt-warn)]">ใบสมัคร {inSheet}</span>}</span>
                </div>
                {d.pools.map((p) => (
                  <div key={p.pool} className="text-sm">
                    {multi && <b className="mr-1">สาย {p.pool || "—"}:</b>}
                    {p.kind === "notStarted" && <span className="text-[var(--gt-muted)]">ยังไม่ออกคู่</span>}
                    {p.kind === "ready" && <span>รอบ {p.last} ผลครบ {p.tables} โต๊ะ → <strong>รอจับคู่รอบ {p.last + 1}</strong> / {d.rounds}</span>}
                    {p.kind === "done" && <span>ครบ {p.last} / {d.rounds} รอบ</span>}
                    {p.kind === "playing" && (
                      <span className="block">
                        รอบ {p.last} / {d.rounds} · ลงผลแล้ว <strong className="gt-num">{p.tables - p.pending}/{p.tables}</strong> โต๊ะ · เช็คอิน {p.checked}/{p.seats}
                        <span className="gt-board-progress" aria-hidden="true"><span style={{ width: `${p.tables ? ((p.tables - p.pending) / p.tables) * 100 : 0}%` }} /></span>
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-1">
                  {d.kind === "ready" && <Link href={href("rounds")} className="gt-gold-btn inline-flex min-h-12 flex-1 items-center justify-center px-3 text-center">ตรวจผล แล้วจับคู่รอบถัดไป ›</Link>}
                  {d.kind === "playing" && <Link href={href("rounds")} className="gt-cta-btn inline-flex min-h-11 flex-1 items-center justify-center px-3">ลงผล / เช็คอิน</Link>}
                  {d.kind === "notStarted" && <Link href={href(inDb ? "rounds" : "pools")} className="gt-outline-btn inline-flex min-h-11 flex-1 items-center justify-center px-3">{inDb ? "จับคู่รอบ 1" : "เตรียมรายชื่อ"}</Link>}
                  {d.kind === "done" && <Link href={href("standings")} className="gt-outline-btn inline-flex min-h-11 flex-1 items-center justify-center px-3">ตารางคะแนน</Link>}
                  <Link href={href("monitor")} className="gt-outline-btn inline-flex min-h-11 items-center justify-center px-3 text-sm">มอนิเตอร์</Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!shown.length && <p className="gt-card p-4 text-center text-sm text-[var(--gt-muted)]">ไม่มีรุ่นในสถานะนี้</p>}
    </div>
  );
}
