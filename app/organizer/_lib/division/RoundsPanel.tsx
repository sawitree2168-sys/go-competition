"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { floatedAthletes, institutionKeys, proposeSwissRound, surnameKey } from "@/lib/swiss-round.mjs";
import { absentInRound, pairingPlayers, recommendedRounds, resultLabel, roundState, roundsOf, roundsWarning, scoresFrom } from "@/lib/competition-day.mjs";
import { ErrorNote, staffDb, useAction } from "../staff";
import MatchCard, { type Seat } from "../../../tournaments/[id]/_ui/MatchCard";
import ResultControls from "../../../tournaments/[id]/_ui/ResultControls";
import { isWithdrawn, nameOf, poolArg, poolKey, poolName, pts, schoolOf, type DivisionData, type Match, type Reg } from "./types";

type Table = { board: number; black: string; white: string };
const pairKey = (a: string, b: string) => [a, b].sort().join("|");
// Same rules as the pairing engine: one club under different spellings, brothers and sisters by surname.
const sameSchool = (a?: Reg, b?: Reg) => {
  const x = institutionKeys(schoolOf(a)), y = institutionKeys(schoolOf(b));
  return x.some((k: string) => y.includes(k));
};
const sameSurname = (a?: Reg, b?: Reg) => {
  const x = surnameKey(nameOf(a)), y = surnameKey(nameOf(b));
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
  const totalRounds = roundsOf(data.division);
  const state = roundState(matches, byes, totalRounds);
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
        <span>ออกคู่แล้ว <strong className="gt-num">{state.lastRound}</strong> / {totalRounds} รอบ</span>
        {state.pending > 0 && <span className="text-[var(--gt-warn)]">รอผล {state.pending} โต๊ะ</span>}
        {state.complete && <span className="font-semibold text-[var(--gt-ok)]">แข่งครบทุกรอบแล้ว</span>}
      </div>

      <RoundsSetting divisionId={data.division.id} saved={data.division.total_rounds} rounds={totalRounds} players={regs.length} played={state.lastRound} reload={reload} />

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
            <Link href={printHref} target="_blank" className="gt-outline-btn inline-flex min-h-11 items-center px-3 text-sm">พิมพ์</Link>
            <Link href={`/organizer/${eventId}/${data.division.id}/print?round=latest${pool ? `&pool=${pool}` : ""}`} target="_blank" className="gt-outline-btn inline-flex min-h-11 items-center px-3 text-sm" title="อัปเดตผลและรอบใหม่เองอัตโนมัติ">ฉายจอสด</Link>
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

type Slot = { board: number; side: "black" | "white" } | { board: 0; side: "bye" };

function Proposal({ round, pool, regs, byId, matches, byes, score, divisionId, reload }: {
  round: number; pool: string; regs: Reg[]; byId: Map<string, Reg>; matches: Match[]; byes: { athlete_id: string }[];
  score: Map<string, number>; divisionId: string; reload: () => Promise<void>;
}) {
  const [seed, setSeed] = useState(1);
  const [edited, setEdited] = useState<{ seed: number; tables: Table[]; bye: string | null } | null>(null);
  const [pick, setPick] = useState<Slot | null>(null);
  const action = useAction();

  const { proposal, players } = useMemo(() => {
    const players = pairingPlayers(regs.map((r) => ({ athlete_id: r.athlete_id, rank: r.competition_rank_reference ?? r.gt_athletes?.current_rank, institution: schoolOf(r), full_name: nameOf(r) })), matches, byes, `${divisionId}-${pool}-${round}-${seed}`);
    return { players, proposal: proposeSwissRound({ players, previousMatches: matches, previousByes: byes }) };
  }, [regs, matches, byes, divisionId, pool, round, seed]);

  // Automatic search gave up (very large or tangled field): start from score order and let the organiser fix it by hand.
  const manual = proposal.requiresManualReview && proposal.reason === "search_limit_reached";
  const base = useMemo((): { tables: Table[]; bye: string | null } => {
    if (!proposal.requiresManualReview) {
      return { tables: proposal.tables.map((t: { board: number; blackAthleteId: string; whiteAthleteId: string }) => ({ board: t.board, black: t.blackAthleteId, white: t.whiteAthleteId })), bye: proposal.byeAthleteId };
    }
    const order = [...players].sort((a: { score: number; strength: number }, b: { score: number; strength: number }) => b.score - a.score || b.strength - a.strength).map((p: { id: string }) => p.id);
    const bye = order.length % 2 ? order.pop()! : null;
    const tables: Table[] = [];
    for (let i = 0; i < order.length; i += 2) tables.push({ board: i / 2 + 1, black: order[i + 1], white: order[i] });
    return { tables, bye };
  }, [proposal, players]);
  const tables = edited && edited.seed === seed ? edited.tables : base.tables;
  const bye = edited && edited.seed === seed ? edited.bye : base.bye;
  const played = useMemo(() => new Set(matches.map((m) => pairKey(m.black_athlete_id, m.white_athlete_id))), [matches]);
  const hadBye = useMemo(() => new Set(byes.map((b) => b.athlete_id)), [byes]);
  const rematches = tables.filter((t) => played.has(pairKey(t.black, t.white))).map((t) => t.board);
  const movedBefore = useMemo(() => floatedAthletes(matches, byes), [matches, byes]);

  const at = (tbl: Table[], b: string | null, s: Slot) => (s.side === "bye" ? b : tbl.find((t) => t.board === s.board)![s.side]);
  const put = (tbl: Table[], s: Slot, id: string): string | null | void => {
    if (s.side === "bye") return id;
    tbl.find((t) => t.board === s.board)![s.side] = id;
  };
  const swapColours = (board: number) => setEdited({ seed, bye, tables: tables.map((t) => (t.board === board ? { ...t, black: t.white, white: t.black } : t)) });
  const tap = (s: Slot) => {
    if (!pick) { setPick(s); return; }
    if (pick.board === s.board && pick.side === s.side) { setPick(null); return; }
    const next = tables.map((t) => ({ ...t }));
    let nextBye = bye;
    const a = at(next, nextBye, pick)!, b = at(next, nextBye, s)!;
    const r1 = put(next, pick, b); if (r1 !== undefined) nextBye = r1;
    const r2 = put(next, s, a); if (r2 !== undefined) nextBye = r2;
    setEdited({ seed, tables: next, bye: nextBye }); setPick(null);
  };

  const publish = async () => {
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_publish_round_v1", {
      p_division: divisionId, p_pool: poolArg(pool), p_round: round, p_tables: tables, p_bye: bye,
    }));
    if (ok) await reload();
  };

  if (regs.length < 2) return <p className="gt-card p-4 text-sm">ผู้เล่นไม่พอสำหรับออกคู่</p>;
  if (proposal.requiresManualReview && !manual) {
    return (
      <section className="gt-card space-y-2 border-[var(--gt-warn)] p-4 text-sm">
        <h3 className="font-bold">จับคู่รอบที่ {round} ไม่ได้</h3>
        <p>ผู้เล่น{pool ? `สาย ${pool}` : "ในรุ่นนี้"}เจอกันครบทุกคู่ที่เป็นไปได้แล้ว ระบบไม่อนุญาตให้เจอคนเดิมซ้ำ จึงถือว่าแข่งจบที่รอบ {round - 1}</p>
        <p className="text-[var(--gt-muted)]">อันดับสุดท้ายดูได้ที่แท็บ “ตารางคะแนน” · ถ้ามีผู้เล่นถูกตัดชื่อโดยไม่ตั้งใจ ให้คืนชื่อแล้วลองใหม่</p>
      </section>
    );
  }

  const slotBtn = (s: Slot, id: string, colour: "black" | "white" | null) => {
    const sel = pick?.board === s.board && pick.side === s.side;
    return (
      <button type="button" onClick={() => tap(s)} aria-pressed={sel}
        className={`min-h-11 w-full rounded-lg px-1 text-left ${sel ? "bg-[var(--gt-gold-soft)] ring-2 ring-[var(--gt-gold)]" : ""}`}>
        {colour ? <Player r={byId.get(id)} colour={colour} score={score.get(id)} />
          : <span className="block"><strong>{nameOf(byId.get(id))}</strong> <span className="text-xs text-[var(--gt-muted)]">{schoolOf(byId.get(id))} · <span className="gt-num">{pts(score.get(id))}</span> แต้ม</span></span>}
      </button>
    );
  };

  return (
    <section className="gt-card space-y-3 border-[var(--gt-gold)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-bold">ร่างคู่รอบที่ {round} {pool && `· สาย ${pool}`}</h3>
        {edited && edited.seed === seed && <button type="button" onClick={() => { setEdited(null); setPick(null); }} className="min-h-11 px-2 text-sm text-[var(--gt-muted)] underline">กลับเป็นร่างอัตโนมัติ</button>}
        {!manual && <button type="button" onClick={() => { setSeed((x) => x + 1); setEdited(null); setPick(null); }} className="gt-outline-btn min-h-11 px-3 text-sm">สุ่มใหม่</button>}
      </div>
      {manual && <p className="rounded-xl bg-[var(--gt-warn-soft)] px-3 py-2 text-sm text-[var(--gt-warn)]">ระบบหาคู่อัตโนมัติไม่ทัน (ผู้เล่นมาก) — เรียงตามคะแนนให้แล้ว แตะชื่อเพื่อสลับจนไม่มีคู่ที่เคยเจอกัน แล้วกดประกาศ</p>}
      <p className="text-sm text-[var(--gt-muted)]">
        โต๊ะ 1 = คะแนนสูงสุด · ยังไม่ประกาศจนกว่าจะกด “ประกาศคู่”{round === 1 ? " (ประกาศรอบ 1 ล่วงหน้าก่อนวันแข่งได้ ผู้ปกครองจะเห็นโต๊ะและคู่แข่งบนเว็บทันที)" : ""} · {pick ? <strong className="text-[var(--gt-ink)]">เลือกอีกคนเพื่อสลับตำแหน่ง</strong> : `แตะชื่อ 2 คนเพื่อสลับตำแหน่ง${bye ? " (รวมคนที่ได้บาย)" : ""}`}
      </p>
      <ul className="space-y-2">
        {tables.map((t) => {
          const warnSchool = sameSchool(byId.get(t.black), byId.get(t.white));
          const warnFamily = sameSurname(byId.get(t.black), byId.get(t.white));
          const gap = Math.abs((score.get(t.black) ?? 0) - (score.get(t.white) ?? 0));
          const again = gap ? [t.black, t.white].filter((id) => movedBefore.has(id)) : [];
          const isRematch = rematches.includes(t.board);
          const notes = [
            gap ? `ข้ามกลุ่มคะแนน (ต่างกัน ${pts(gap)} แต้ม)` : "",
            again.length ? `${again.map((id) => nameOf(byId.get(id))).join(", ")} เคยถูกปัดข้ามกลุ่มแล้ว` : "",
            warnSchool ? "สถาบันเดียวกัน" : "",
            warnFamily ? "นามสกุลเดียวกัน (พี่น้อง?)" : "",
          ].filter(Boolean);
          return (
            <li key={t.board} className={`rounded-xl border px-3 py-2 ${isRematch ? "border-[var(--gt-bad)]" : "border-[var(--gt-line)]"}`}>
              <div className="flex items-center gap-2">
                <span className="gt-num w-12 shrink-0 text-sm font-bold">โต๊ะ {t.board}</span>
                <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2">
                  {(["black", "white"] as const).map((side) => <div key={side} className="min-w-0">{slotBtn({ board: t.board, side }, t[side], side)}</div>)}
                </div>
                <button type="button" onClick={() => swapColours(t.board)} aria-label={`สลับสีโต๊ะ ${t.board}`} title="สลับสี" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--gt-line)]">⇄</button>
              </div>
              {(notes.length > 0 || isRematch) && (
                <p className={`mt-1 text-xs ${isRematch ? "text-[var(--gt-bad)]" : "text-[var(--gt-warn)]"}`}>{isRematch ? "เคยเจอกันแล้ว — ต้องสลับก่อนประกาศ" : notes.join(" · ")}</p>
              )}
            </li>
          );
        })}
      </ul>
      {bye && (
        <div className="rounded-xl bg-[var(--gt-surface-2)] px-3 py-2 text-sm">
          <p className="mb-1 font-semibold">บาย (ได้ 1 แต้ม) <span className="font-normal text-[var(--gt-muted)]">· แตะเพื่อเปลี่ยนคนได้บาย</span></p>
          {slotBtn({ board: 0, side: "bye" }, bye, null)}
          {hadBye.has(bye) && <p className="mt-1 text-xs text-[var(--gt-warn)]">คนนี้เคยได้บายแล้ว — ปกติให้บายกับคนที่ยังไม่เคยได้</p>}
        </div>
      )}
      <ErrorNote text={action.error} />
      <button type="button" onClick={publish} disabled={action.busy || rematches.length > 0} className="gt-gold-btn min-h-12 w-full disabled:opacity-60">
        {action.busy ? "กำลังประกาศ…" : rematches.length ? `ยังมีคู่ที่เคยเจอกัน ${rematches.length} โต๊ะ` : `ประกาศคู่รอบที่ ${round} (${tables.length} โต๊ะ)`}
      </button>
    </section>
  );
}

/**
 * จำนวนรอบของรุ่น: the organiser's number (default 5), with the recommended number for this many players
 * and a warning when it is too few (several undefeated players) or too many (rematches in the last rounds).
 */
function RoundsSetting({ divisionId, saved, rounds, players, played, reload }: {
  divisionId: string; saved: number | null; rounds: number; players: number; played: number; reload: () => Promise<void>;
}) {
  const [value, setValue] = useState(String(rounds));
  const action = useAction();
  const n = Number(value);
  const need = recommendedRounds(players);
  const warn = roundsWarning(rounds, players);
  const save = async (to: number) => {
    const res = await action.run<{ ok: boolean; error?: string; played?: number }>(() => staffDb()!.rpc("gt_staff_set_division_rounds_v1", { p_division: divisionId, p_rounds: to }));
    if (!res) return;
    if (!res.data?.ok) return action.setError(res.data?.error === "BELOW_PLAYED" ? `ออกคู่ไปแล้ว ${res.data.played} รอบ ตั้งน้อยกว่านั้นไม่ได้` : "บันทึกไม่สำเร็จ");
    await reload();
  };
  return (
    <section className={`gt-card space-y-2 p-4 text-sm ${warn ? "border-[var(--gt-warn)]" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`rounds-${divisionId}`} className="font-semibold">จำนวนรอบของรุ่นนี้</label>
        <select id={`rounds-${divisionId}`} value={value} onChange={(e) => setValue(e.target.value)} disabled={action.busy}
          className="min-h-11 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3">
          {Array.from({ length: 15 }, (_, i) => i + 1).filter((r) => r >= Math.max(1, played)).map((r) => <option key={r} value={r}>{r} รอบ</option>)}
        </select>
        {n !== rounds && <button type="button" disabled={action.busy} onClick={() => save(n)} className="gt-cta-btn min-h-11 rounded-xl px-4 font-semibold">บันทึก</button>}
        {need > 0 && need !== rounds && played < need && (
          <button type="button" disabled={action.busy} onClick={() => save(need)} className="gt-outline-btn min-h-11 px-3">ใช้ {need} รอบตามที่แนะนำ</button>
        )}
        {saved == null && <span className="text-[var(--gt-muted)]">(ค่าเริ่มต้น)</span>}
      </div>
      {need > 0 && <p className="text-[var(--gt-muted)]">ผู้เล่น {players} คน แนะนำ {need} รอบ (ให้เหลือผู้ชนะรวดคนเดียว)</p>}
      {warn && <p role="alert" className="font-semibold text-[var(--gt-warn)]">⚠ {warn.text}</p>}
      {action.error && <p role="alert" className="text-[var(--gt-bad)]">{action.error}</p>}
    </section>
  );
}
