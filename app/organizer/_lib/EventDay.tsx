"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { staffDb, useStaff } from "./staff";
import { divisionSortValue } from "@/lib/division-display";
import { roundsOf } from "@/lib/competition-day.mjs";
import { useLiveFingerprint, type LiveStatus } from "../../tournaments/[id]/_ui/live";

/**
 * Competition-day picture of one event, shared by every organiser page of that event
 * (โต๊ะกรรมการ board, the alert bar, division pages): where every division / สาย stands,
 * planned times, medal/photo ticks and open calls from line referees. Polls every 10 s.
 */
export type Kind = "ready" | "playing" | "notStarted" | "done";
export type PoolStatus = { pool: string; kind: Kind; last: number; tables: number; pending: number; checked: number; seats: number };
export type DivisionStatus = {
  id: string; name: string; rounds: number; pools: PoolStatus[]; kind: Kind; players: number;
  friendship: boolean; nextRound: number | null;
};
export type DivisionDay = { division_id: string; round_times: string[]; ceremony_at: string | null; medals_done_at: string | null; photo_done_at: string | null };
export type RefereeCall = { id: number; division_id: string; pool: string | null; round: number | null; kind: "results_done" | "problem" | "when_next"; note: string | null; referee: string | null; created_at: string };

type MatchRow = { division_id: string; pool_label: string | null; round_number: number; state: string; black_checkin_at: string | null; white_checkin_at: string | null };
type ByeRow = { division_id: string; pool_label: string | null; round_number: number };
type DivisionRow = { id: string; name: string; total_rounds: number | null; award_scheme: string | null };

export const KIND_ORDER: Record<Kind, number> = { ready: 0, playing: 1, notStarted: 2, done: 3 };
const poolKey = (p: string | null) => (p ?? "").trim().toUpperCase();

export function summarise(divisions: DivisionRow[], matches: MatchRow[], byes: ByeRow[], players: Map<string, number>): DivisionStatus[] {
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
    const kind = list.map((p) => p.kind).sort((a, b) => KIND_ORDER[a] - KIND_ORDER[b])[0];
    const n = players.get(d.id) ?? 0;
    const last = Math.min(...list.map((p) => p.last));
    return {
      id: d.id, name: d.name, rounds, pools: list, kind: n ? kind : "notStarted", players: n,
      friendship: d.award_scheme === "friendship_wins",
      nextRound: kind === "done" ? null : last + 1,
    };
  }).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || divisionSortValue(a.name) - divisionSortValue(b.name));
}

type EventDayValue = {
  eventId: string;
  eventDate: string | null;
  rows: DivisionStatus[] | null;
  days: Map<string, DivisionDay>;
  calls: RefereeCall[];
  /** false until the schedule / referee-call tables are installed in the database */
  dayReady: boolean;
  /** first time (ms) this browser saw a division become "ready to pair" */
  readySince: Map<string, number>;
  live: LiveStatus;
  refresh: () => Promise<void>;
};

const Ctx = createContext<EventDayValue | null>(null);
export const EventDayContext = Ctx;
export const useEventDay = () => useContext(Ctx);

/** /organizer/<event-uuid>/... → event id */
export function eventIdFromPath(path: string | null) {
  const m = /^\/organizer\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i.exec(path ?? "");
  return m ? m[1] : null;
}

export function EventDayProvider({ children }: { children: ReactNode }) {
  const eventId = eventIdFromPath(usePathname());
  const staff = useStaff();
  if (!eventId || staff.status !== "staff") return <>{children}</>;
  return <Feed key={eventId} eventId={eventId}>{children}</Feed>;
}

const SINCE_KEY = "gt-ready-since";

function Feed({ eventId, children }: { eventId: string; children: ReactNode }) {
  const [rows, setRows] = useState<DivisionStatus[] | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [days, setDays] = useState<Map<string, DivisionDay>>(new Map());
  const [calls, setCalls] = useState<RefereeCall[]>([]);
  const [dayReady, setDayReady] = useState(false);
  const readySince = useRef<Map<string, number>>(new Map());
  const [sinceView, setSinceView] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    try { readySince.current = new Map(JSON.parse(sessionStorage.getItem(SINCE_KEY) ?? "[]")); } catch { /* no storage */ }
  }, []);

  const load = useCallback(async () => {
    const db = staffDb()!;
    const [ev, dv, rg] = await Promise.all([
      db.from("gt_tournaments").select("event_date").eq("id", eventId).maybeSingle(),
      db.from("gt_divisions").select("id,name,total_rounds,award_scheme").eq("tournament_id", eventId),
      db.from("gt_registrations").select("division_id").eq("tournament_id", eventId).eq("registration_status", "confirmed").limit(5000),
    ]);
    if (dv.error) throw new Error("load failed");
    const divisions = (dv.data ?? []) as DivisionRow[];
    const ids = divisions.map((d) => d.id);
    const [mt, by, day] = await Promise.all([
      ids.length ? db.from("gt_matches").select("division_id,pool_label,round_number,state,black_checkin_at,white_checkin_at").in("division_id", ids).neq("state", "void").limit(10000) : Promise.resolve({ data: [], error: null }),
      ids.length ? db.from("gt_byes").select("division_id,pool_label,round_number").in("division_id", ids).limit(5000) : Promise.resolve({ data: [], error: null }),
      db.rpc("gt_staff_event_day_v1", { p_tournament: eventId }),
    ]);
    if (mt.error) throw new Error("load failed");
    const players = new Map<string, number>();
    for (const r of (rg.data ?? []) as { division_id: string }[]) players.set(r.division_id, (players.get(r.division_id) ?? 0) + 1);
    const next = summarise(divisions, (mt.data ?? []) as MatchRow[], (by.data ?? []) as ByeRow[], players);

    // remember when each division first became ready (survives page changes in this tab)
    const since = readySince.current, now = Date.now();
    for (const d of next) {
      const key = `${d.id}:${d.nextRound}`;
      if (d.kind === "ready" && !since.has(key)) since.set(key, now);
    }
    for (const k of [...since.keys()]) if (!next.some((d) => d.kind === "ready" && `${d.id}:${d.nextRound}` === k)) since.delete(k);
    try { sessionStorage.setItem(SINCE_KEY, JSON.stringify([...since])); } catch { /* no storage */ }

    setSinceView(new Map(since));
    setEventDate((ev.data as { event_date: string | null } | null)?.event_date ?? null);
    setRows(next);
    if (day.error) { setDayReady(false); setDays(new Map()); setCalls([]); }
    else {
      const v = day.data as { days: DivisionDay[]; calls: RefereeCall[] };
      setDayReady(true);
      setDays(new Map(v.days.map((x) => [x.division_id, x])));
      setCalls(v.calls);
    }
    return JSON.stringify([next, day.data]);
  }, [eventId]);

  const { status: live } = useLiveFingerprint(load, () => {}, { interval: 10000 });
  const refresh = useCallback(async () => { await load(); }, [load]);

  return <Ctx.Provider value={{ eventId, eventDate, rows, days, calls, dayReady, readySince: sinceView, live, refresh }}>{children}</Ctx.Provider>;
}
