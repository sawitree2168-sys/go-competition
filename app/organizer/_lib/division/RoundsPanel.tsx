"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { proposeSwissRound } from "@/lib/swiss-round.mjs";
import { absentInRound, pairingPlayers, resultLabel, roundState, scoresFrom } from "@/lib/competition-day.mjs";
import { ErrorNote, staffDb, useAction } from "../staff";
import MatchCard, { type Seat } from "../../../tournaments/[id]/_ui/MatchCard";
import ResultControls from "../../../tournaments/[id]/_ui/ResultControls";
import { TOTAL_ROUNDS, isWithdrawn, nameOf, poolArg, poolKey, poolName, pts, schoolOf, type DivisionData, type Match, type Reg } from "./types";

type Table = { board: number; black: string; white: string };
const pairKey = (a: string, b: string) => [a, b].sort().join("|");
const sameSchool = (a?: Reg, b?: Reg) => {
  const x = schoolOf(a).trim().toLowerCase(), y = schoolOf(b).trim().toLowerCase();
  return Boolean(x) && x === y;
};

export default function RoundsPanel({ data, reload, eventId }: { data: DivisionData; reload: () => Promise<void>; eventId: string }) {
  const active = data.regs.filter((r) => !isWithdrawn(r));
  const pools = useMemo(() => [...new Set(data.regs.map((r) => poolKey(r.pool_label)))].sort(), [data.regs]);
  const [pool, setPool] = useState(pools[0] ?? "");
  const current = pools.includes(pool) ? pool : pools[0] ?? "";
  const mixed = pools.length > 1 && active.some((r) => !r.pool_label);

  if (!data.regs.length) return <p className="gt-card p-4 text-sm">ยังไม่มีผู้เล่นในรุ่นนี้ — นำเข้ารายชื่อก่อน</p>;
  if (mixed) return <p className="gt-card p-4 text-sm text-[var(--gt-warn)]">มีผู้เล่นบางคนยังไม่มีสาย กรุณาไปที่แท็บ “สาย” แล้วสุ่มสายใหม่ก่อนออกคู่</p>;

  return (
    <div className="space-y-4">
      {pools.length > 1 && (
        <div role="tablist" aria-label="เลือกสาย" className="gt-tabs flex gap-2">
          {pools.map((p) => (
            <button key={p} role="tab" type="button" aria-selected={p === current} onClick={() => setPool(p)}
              className="min-h-11 flex-1 rounded-xl border border-[var(--gt-line)] px-4 font-semibold">{poolName(p)}</button>
          ))}
        </div>
      )}
      <PoolRounds key={current} pool={current} data={data} reload={reload} eventId={eventId} />
    </div>
  );
}

function PoolRounds({ pool, data, reload, eventId }: { pool: string; data: DivisionData; reload: () => Promise<void>; eventId: string }) {
  const everyone = useMemo(() => data.regs.filter((r) => poolKey(r.pool_label) === pool), [data.regs, pool]);
  const regs = useMemo(() => everyone.filter((r) => !isWithdrawn(r)), [everyone]);
  const withdrawn = everyone.filter(isWithdrawn);
  const matches = useMemo(() => data.matches.filter((m) => poolKey(m.pool_label) === pool), [data.matches, pool]);
  const byes = useMemo(() => data.byes.filter((b) => poolKey(b.pool_label) === pool), [data.byes, pool]);
  const byId = useMemo(() => new Map(everyone.map((r) => [r.athlete_id, r])), [everyone]);
  const state = roundState(matches, byes, TOTAL_ROUNDS);
  const { score } = scoresFrom(everyone.map((r) => r.athlete_id), matches, byes);
  const [openRound, setOpenRound] = useState<number | null>(null);
  const shown = openRound ?? state.lastRound;
  const action = useAction();

  const withdraw = async (athleteId: string, value: boolean) => {
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_set_withdrawn_v1", { p_division: data.division.id, p_athlete: athleteId, p_withdrawn: value }));
    if (ok) await reload();
  };
  const cancelRound = async () => {
    if (!window.confirm(`ยกเลิกคู่รอบที่ ${state.lastRound}? (ทำได้เพราะยังไม่มีผล)`)) return;
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_cancel_round_v1", { p_division: data.division.id, p_pool: poolArg(pool), p_round: state.lastRound }));
    if (ok) { setOpenRound(null); await reload(); }
  };

  const roundMatches = matches.filter((m) => m.round_number === shown).sort((a, b) => (a.board_number ?? 0) - (b.board_number ?? 0));
  const roundBye = byes.find((b) => b.round_number === shown);
  const { score: scoreBefore } = scoresFrom(everyone.map((r) => r.athlete_id), matches.filter((x) => x.round_number < shown), byes.filter((x) => x.round_number < shown));
  const latest = shown === state.lastRound;
  const hasResults = roundMatches.some((m) => m.state === "verified");
  const seats = roundMatches.length * 2;
  const checkedIn = roundMatches.reduce((n, m) => n + (m.black_checkin_at ? 1 : 0) + (m.white_checkin_at ? 1 : 0), 0);
  const printHref = `/organizer/${eventId}/${data.division.id}/print?round=${shown}${pool ? `&pool=${pool}` : ""}`;
  // Players who did not come to the last round and are still in: offer to remove them before pairing the next one.
  const noShows = state.nextRound && state.lastRound ? absentInRound(matches, state.lastRound).filter((id: string) => regs.some((r) => r.athlete_id === id)) : [];

  return (
    <div className="space-y-4">
      <div className="gt-card flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
        <span>ผู้เล่น <strong className="gt-num">{regs.length}</strong> คน{withdrawn.length > 0 && <span className="text-[var(--gt-muted)]"> (ตัดชื่อแล้ว {withdrawn.length})</span>}</span>
        <span>ออกคู่แล้ว <strong className="gt-num">{state.lastRound}</strong> / {TOTAL_ROUNDS} รอบ</span>
        {state.pending > 0 && <span className="text-[var(--gt-warn)]">รอผล {state.pending} โต๊ะ</span>}
        {state.complete && <span className="font-semibold text-[var(--gt-ok)]">แข่งครบทุกรอบแล้ว</span>}
      </div>

      {noShows.length > 0 && (
        <section className="gt-card space-y-2 border-[var(--gt-warn)] p-4">
          <h3 className="font-bold">ไม่มาแข่งรอบที่ {state.lastRound}</h3>
          <p className="text-sm text-[var(--gt-muted)]">ถ้ายังไม่มา ให้ตัดชื่อออกก่อนออกคู่รอบถัดไป แต้มที่ได้ไปแล้วยังเก็บไว้</p>
          <ul className="space-y-2">
            {noShows.map((id: string) => (
              <li key={id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1"><strong>{nameOf(byId.get(id))}</strong> <span className="text-sm text-[var(--gt-muted)]">{schoolOf(byId.get(id))}</span></span>
                <button type="button" disabled={action.busy} onClick={() => withdraw(id, true)} className="min-h-11 rounded-xl border border-[var(--gt-bad)] px-3 text-sm font-semibold text-[var(--gt-bad)]">ตัดชื่อ</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.nextRound && <Proposal key={`${state.nextRound}-${matches.length}-${regs.length}`} round={state.nextRound} pool={pool} regs={regs} byId={byId} matches={matches} byes={byes} score={score} divisionId={data.division.id} reload={async () => { setOpenRound(null); await reload(); }} />}

      {state.lastRound > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-bold">รอบที่ {shown}</h3>
            <div className="flex gap-1" role="group" aria-label="เลือกรอบ">
              {Array.from({ length: state.lastRound }, (_, i) => i + 1).map((r) => (
                <button key={r} type="button" onClick={() => setOpenRound(r)} aria-pressed={r === shown}
                  className={`gt-num min-h-11 min-w-11 rounded-xl border ${r === shown ? "border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] font-bold" : "border-[var(--gt-line)]"}`}>{r}</button>
              ))}
            </div>
            <Link href={printHref} target="_blank" className="gt-outline-btn inline-flex min-h-11 items-center px-3 text-sm">พิมพ์ / ฉายจอ</Link>
          </div>
          {latest && seats > 0 && (
            <p className="flex flex-wrap gap-x-4 text-sm">
              <span>เช็คอินแล้ว <strong className="gt-num text-[var(--gt-ok)]">{checkedIn}</strong></span>
              <span>ยังไม่เช็คอิน <strong className={`gt-num ${checkedIn < seats ? "text-[var(--gt-warn)]" : ""}`}>{seats - checkedIn}</strong></span>
              <span className="text-[var(--gt-muted)]">มาสายเกิน 15 นาที ให้ลงผล “ชนะ เพราะคู่ไม่มา”</span>
            </p>
          )}
          {!latest && <p className="text-sm text-[var(--gt-muted)]">รอบเก่า: ดูได้อย่างเดียว (แก้ผลได้เฉพาะรอบล่าสุดก่อนออกคู่รอบถัดไป)</p>}
          <ul className="space-y-2">
            {roundMatches.map((m) => <TableCard key={m.id} m={m} byId={byId} score={scoreBefore} editable={latest} reload={reload} />)}
            {roundBye && (
              <li className="gt-card flex items-center gap-3 px-4 py-3 text-sm">
                <span className="w-14 shrink-0 font-semibold text-[var(--gt-muted)]">บาย</span>
                <span className="min-w-0 flex-1"><strong>{nameOf(byId.get(roundBye.athlete_id))}</strong> <span className="text-[var(--gt-muted)]">{schoolOf(byId.get(roundBye.athlete_id))}</span></span>
                <span className="text-[var(--gt-ok)]">ได้ 1 แต้ม</span>
              </li>
            )}
          </ul>
          {latest && !hasResults && (
            <button type="button" onClick={cancelRound} disabled={action.busy} className="min-h-11 rounded-xl border border-[var(--gt-bad)] px-4 text-sm text-[var(--gt-bad)]">ยกเลิกคู่รอบนี้</button>
          )}
        </section>
      )}

      {withdrawn.length > 0 && (
        <section className="gt-card space-y-2 p-4">
          <h3 className="font-bold">ตัดชื่อออกแล้ว</h3>
          <ul className="space-y-2">
            {withdrawn.map((r) => (
              <li key={r.athlete_id} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1"><strong>{nameOf(r)}</strong> <span className="text-[var(--gt-muted)]">{schoolOf(r)} · {pts(score.get(r.athlete_id))} แต้ม</span></span>
                <button type="button" disabled={action.busy} onClick={() => withdraw(r.athlete_id, false)} className="gt-outline-btn min-h-11 px-3 text-sm disabled:opacity-50">คืนชื่อ</button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--gt-muted)]">คืนชื่อแล้วจะได้เข้าคู่ตั้งแต่รอบถัดไป</p>
        </section>
      )}
      <ErrorNote text={action.error} />
    </div>
  );
}

function Player({ r, colour, score }: { r?: Reg; colour: "black" | "white"; score?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-label={colour === "black" ? "ดำ" : "ขาว"} className={`h-5 w-5 shrink-0 rounded-full border ${colour === "black" ? "border-black bg-[#14171e]" : "border-[#9aa3b2] bg-white"}`} />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{nameOf(r)}</span>
        <span className="block truncate text-xs text-[var(--gt-muted)]">{schoolOf(r) || "—"}{score !== undefined && <> · <span className="gt-num">{pts(score)}</span> แต้ม</>}</span>
      </span>
    </span>
  );
}

function TableCard({ m, byId, score, editable, reload }: { m: Match; byId: Map<string, Reg>; score: Map<string, number>; editable: boolean; reload: () => Promise<void> }) {
  const action = useAction();
  const [editing, setEditing] = useState(false);
  const done = m.state === "verified";

  const record = async (code: string, margin: string | null) => {
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_record_result_v1", { p_match: m.id, p_result: code, p_margin: margin }));
    if (ok) { setEditing(false); await reload(); }
  };
  const checkin = async (side: "black" | "white", present: boolean) => {
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_checkin_v1", { p_match: m.id, p_side: side, p_present: present }));
    if (ok) await reload();
  };
  const seat = (id: string): Seat => {
    const r = byId.get(id);
    return { id, name: nameOf(r), institution: schoolOf(r), rank: r?.gt_athletes?.current_rank ?? null, photo: r?.gt_athletes?.avatar_url ?? null, score: score.get(id) ?? 0, won: m.winner_athlete_id === id };
  };
  const checkButton = (side: "black" | "white") => {
    const here = side === "black" ? m.black_checkin_at : m.white_checkin_at;
    if (!editable || done) return here ? <span className="text-xs font-semibold text-[var(--gt-ok)]">✓ มาแล้ว</span> : null;
    return (
      <button type="button" disabled={action.busy} onClick={() => checkin(side, !here)} aria-pressed={Boolean(here)}
        className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${here ? "border-[var(--gt-ok)] bg-[var(--gt-ok)] text-white" : "border-[var(--gt-line)] bg-[var(--gt-surface)] text-[var(--gt-muted)]"}`}>
        {here ? "✓ มาแล้ว" : "เช็คอิน"}
      </button>
    );
  };
  const actions = !editable ? null : done && !editing
    ? <button type="button" onClick={() => setEditing(true)} className="min-h-11 text-sm text-[var(--gt-muted)] underline">แก้ผล</button>
    : <ResultControls busy={action.busy} onRecord={record} onCancel={done ? () => setEditing(false) : undefined} />;

  return (
    <>
      <MatchCard board={m.board_number} status={done ? resultLabel(m) : "รอผล"} statusTone={done ? "done" : "wait"} highlight={!done}
        black={seat(m.black_athlete_id)} white={seat(m.white_athlete_id)} blackExtra={checkButton("black")} whiteExtra={checkButton("white")}
        actions={actions && <>{actions}<ErrorNote text={action.error} /></>} />
    </>
  );
}

function Proposal({ round, pool, regs, byId, matches, byes, score, divisionId, reload }: {
  round: number; pool: string; regs: Reg[]; byId: Map<string, Reg>; matches: Match[]; byes: { athlete_id: string }[];
  score: Map<string, number>; divisionId: string; reload: () => Promise<void>;
}) {
  const [seed, setSeed] = useState(1);
  const [edited, setEdited] = useState<{ seed: number; tables: Table[] } | null>(null);
  const [pick, setPick] = useState<{ board: number; side: "black" | "white" } | null>(null);
  const action = useAction();

  const proposal = useMemo(() => {
    const players = pairingPlayers(regs.map((r) => ({ athlete_id: r.athlete_id, rank: r.competition_rank_reference ?? r.gt_athletes?.current_rank })), matches, byes, `${divisionId}-${pool}-${round}-${seed}`);
    return proposeSwissRound({ players, previousMatches: matches, previousByes: byes });
  }, [regs, matches, byes, divisionId, pool, round, seed]);

  const base: Table[] = proposal.tables.map((t: { board: number; blackAthleteId: string; whiteAthleteId: string }) => ({ board: t.board, black: t.blackAthleteId, white: t.whiteAthleteId }));
  const tables = edited && edited.seed === seed ? edited.tables : base;
  const played = useMemo(() => new Set(matches.map((m) => pairKey(m.black_athlete_id, m.white_athlete_id))), [matches]);
  const rematches = tables.filter((t) => played.has(pairKey(t.black, t.white))).map((t) => t.board);

  const swapColours = (board: number) => setEdited({ seed, tables: tables.map((t) => (t.board === board ? { ...t, black: t.white, white: t.black } : t)) });
  const tapPlayer = (board: number, side: "black" | "white") => {
    if (!pick) { setPick({ board, side }); return; }
    if (pick.board === board && pick.side === side) { setPick(null); return; }
    const next = tables.map((t) => ({ ...t }));
    const a = next.find((t) => t.board === pick.board)!, b = next.find((t) => t.board === board)!;
    const tmp = a[pick.side]; a[pick.side] = b[side]; b[side] = tmp;
    setEdited({ seed, tables: next }); setPick(null);
  };

  const publish = async () => {
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_publish_round_v1", {
      p_division: divisionId, p_pool: poolArg(pool), p_round: round, p_tables: tables, p_bye: proposal.byeAthleteId,
    }));
    if (ok) await reload();
  };

  if (regs.length < 2) return <p className="gt-card p-4 text-sm">ผู้เล่นไม่พอสำหรับออกคู่</p>;
  if (proposal.requiresManualReview)
    return <p className="gt-card p-4 text-sm text-[var(--gt-bad)]">จับคู่รอบที่ {round} อัตโนมัติไม่ได้โดยไม่ให้เจอคนเดิมซ้ำ กรุณาติดต่อผู้ดูแลระบบ</p>;

  return (
    <section className="gt-card space-y-3 border-[var(--gt-gold)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-bold">ร่างคู่รอบที่ {round} {pool && `· สาย ${pool}`}</h3>
        <button type="button" onClick={() => { setSeed((s) => s + 1); setEdited(null); setPick(null); }} className="gt-outline-btn min-h-11 px-3 text-sm">สุ่มใหม่</button>
      </div>
      <p className="text-sm text-[var(--gt-muted)]">
        โต๊ะ 1 = คะแนนสูงสุด · ยังไม่ประกาศจนกว่าจะกด “ประกาศคู่”{round === 1 ? " (ประกาศรอบ 1 ล่วงหน้าก่อนวันแข่งได้ ผู้ปกครองจะเห็นโต๊ะและคู่แข่งบนเว็บทันที)" : ""} · {pick ? <strong className="text-[var(--gt-ink)]">เลือกอีกคนเพื่อสลับตำแหน่ง</strong> : "แตะชื่อ 2 คนเพื่อสลับตำแหน่ง"}
      </p>
      <ul className="space-y-2">
        {tables.map((t) => {
          const warnSchool = sameSchool(byId.get(t.black), byId.get(t.white));
          const isRematch = rematches.includes(t.board);
          const sel = (side: "black" | "white") => pick?.board === t.board && pick.side === side;
          return (
            <li key={t.board} className={`rounded-xl border px-3 py-2 ${isRematch ? "border-[var(--gt-bad)]" : "border-[var(--gt-line)]"}`}>
              <div className="flex items-center gap-2">
                <span className="gt-num w-12 shrink-0 text-sm font-bold">โต๊ะ {t.board}</span>
                <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2">
                  {(["black", "white"] as const).map((side) => (
                    <button key={side} type="button" onClick={() => tapPlayer(t.board, side)} aria-pressed={sel(side)}
                      className={`min-h-11 rounded-lg px-1 text-left ${sel(side) ? "bg-[var(--gt-gold-soft)] ring-2 ring-[var(--gt-gold)]" : ""}`}>
                      <Player r={byId.get(t[side])} colour={side} score={score.get(t[side])} />
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => swapColours(t.board)} aria-label={`สลับสีโต๊ะ ${t.board}`} title="สลับสี" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--gt-line)]">⇄</button>
              </div>
              {(warnSchool || isRematch) && (
                <p className={`mt-1 text-xs ${isRematch ? "text-[var(--gt-bad)]" : "text-[var(--gt-warn)]"}`}>{isRematch ? "เคยเจอกันแล้ว — ต้องสลับก่อนประกาศ" : "สถาบันเดียวกัน"}</p>
              )}
            </li>
          );
        })}
      </ul>
      {proposal.byeAthleteId && (
        <p className="rounded-xl bg-[var(--gt-surface-2)] px-3 py-2 text-sm">บาย (ได้ 1 แต้ม): <strong>{nameOf(byId.get(proposal.byeAthleteId))}</strong></p>
      )}
      <ErrorNote text={action.error} />
      <button type="button" onClick={publish} disabled={action.busy || rematches.length > 0} className="gt-gold-btn min-h-12 w-full disabled:opacity-60">
        {action.busy ? "กำลังประกาศ…" : `ประกาศคู่รอบที่ ${round} (${tables.length} โต๊ะ)`}
      </button>
    </section>
  );
}
