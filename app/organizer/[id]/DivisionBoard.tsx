"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { divisionLabel } from "@/lib/division-display";
import { countdownText, elapsedText, minutesUntil, urgency } from "@/lib/event-day.mjs";
import { clock, type LiveStatus } from "../../tournaments/[id]/_ui/live";
import { staffDb } from "../_lib/staff";
import { KIND_ORDER, useEventDay, type DivisionDay, type DivisionStatus, type Kind } from "../_lib/EventDay";
import MedalList from "./MedalList";
import ScheduleEditor from "./ScheduleEditor";

/**
 * โต๊ะกรรมการ · ทุกรุ่น: one screen for the whole event on competition day.
 * Every division (and every สาย) shows where it stands. Most urgent first: results all in and waiting to be
 * paired (late ones first), then medal / photo still to do, then playing, not started, finished.
 * Planned times count down; nothing is paired automatically.
 */
export default function DivisionBoard({ sheet }: { sheet: Map<string, number> }) {
  const day = useEventDay();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(t); }, []);
  if (!day?.rows) return <p className="gt-card p-4 text-sm text-[var(--gt-muted)]">กำลังโหลดสถานะทุกรุ่น…</p>;
  return <BoardView rows={day.rows} days={day.days} eventDate={day.eventDate} dayReady={day.dayReady} live={day.live} eventId={day.eventId}
    sheet={sheet} readySince={day.readySince} now={now} refresh={day.refresh} />;
}

type Group = Kind | "ceremony";
const GROUP_ORDER: Record<Group, number> = { ready: 0, ceremony: 1, playing: 2, notStarted: 3, done: 4 };
const BAND: Record<Group, string> = { ready: "✓ ลงผลครบ · รอจับคู่", ceremony: "🏅 แข่งครบแล้ว · รอมอบเหรียญ / ถ่ายรูป", playing: "⏳ กำลังแข่ง", notStarted: "○ ยังไม่เริ่ม", done: "🏁 จบรุ่นแล้ว" };

export function BoardView({ rows, days, eventDate, dayReady, live, eventId, sheet, readySince, now, refresh }: {
  rows: DivisionStatus[]; days: Map<string, DivisionDay>; eventDate: string | null; dayReady: boolean; live: LiveStatus; eventId: string;
  sheet: Map<string, number>; readySince: Map<string, number>; now: number; refresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<Group | "all">("all");
  const [medals, setMedals] = useState<DivisionStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");

  const items = useMemo(() => {
    const at = new Date(now);
    return rows.map((d) => {
      const dd = days.get(d.id);
      // a finished division still has work: medals / photo (Friendship, or any division with a ceremony time)
      const ceremonyDue = d.kind === "done" && (d.friendship || Boolean(dd?.ceremony_at)) && !(dd?.medals_done_at && dd?.photo_done_at);
      const group: Group = ceremonyDue ? "ceremony" : d.kind;
      const planned = d.nextRound ? dd?.round_times?.[d.nextRound - 1] || null : null;
      const min = minutesUntil(planned, eventDate, at);
      const cer = dd?.ceremony_at ? minutesUntil(dd.ceremony_at, eventDate, at) : null;
      return { d, dd, group, planned, min, cer };
    }).sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || (a.min ?? a.cer ?? 9999) - (b.min ?? b.cer ?? 9999) || KIND_ORDER[a.d.kind] - KIND_ORDER[b.d.kind]);
  }, [rows, days, eventDate, now]);

  const count = (g: Group) => items.filter((x) => x.group === g).length;
  const shown = filter === "all" ? items : items.filter((x) => x.group === filter);
  const chips: [Group | "all", string, number][] = [
    ["all", "ทั้งหมด", items.length], ["ready", "รอจับคู่", count("ready")], ["ceremony", "รอมอบเหรียญ", count("ceremony")],
    ["playing", "กำลังแข่ง", count("playing")], ["notStarted", "ยังไม่เริ่ม", count("notStarted")], ["done", "จบแล้ว", count("done")],
  ];
  const tick = async (id: string, what: "medals" | "photo", done: boolean) => {
    setBusy(`${id}:${what}`);
    try { await staffDb()!.rpc("gt_staff_set_ceremony_done_v1", { p_division: id, p_what: what, p_done: done }); await refresh(); } finally { setBusy(""); }
  };

  return (
    <div className="gt-board space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${live.offline ? "bg-[var(--gt-warn-soft)] text-[var(--gt-warn)]" : "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]"}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${live.offline ? "bg-[var(--gt-warn)]" : "animate-pulse bg-[var(--gt-ok)]"}`} />
          {live.offline ? "ขาดการเชื่อมต่อ" : `อัปเดตเอง · ล่าสุด ${clock(live.checkedAt)}`}
        </span>
        <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="gt-outline-btn ml-auto min-h-11 px-3 text-sm">⏱ ตั้งเวลาแข่งขันทุกรุ่น</button>
      </div>
      {editing && <ScheduleEditor rows={rows} days={days} dayReady={dayReady} onSaved={refresh} onClose={() => setEditing(false)} />}
      {count("ready") > 0 && <p role="status" className="gt-board-alert">🔔 มี <strong>{count("ready")} รุ่น</strong> ลงผลครบแล้ว รอแอดมินตรวจผลและกดจับคู่รอบถัดไป</p>}
      <div className="gt-board-chips" role="group" aria-label="กรองสถานะ">
        {chips.map(([k, label, n]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`kind-${k}`}>{label} <b>{n}</b></button>)}
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map(({ d, dd, group, planned, min, cer }) => {
          const inSheet = sheet.get(d.id) ?? 0;
          const href = (tab: string) => `/organizer/${eventId}/${d.id}?tab=${tab}`;
          const multi = d.pools.length > 1;
          const since = readySince.get(`${d.id}:${d.nextRound}`);
          const late = group === "ready" && (urgency(min) === "late" || urgency(min) === "soon");
          return (
            <li key={d.id} id={`ceremony-${d.id}`} className={`gt-board-card kind-${group} ${late ? "is-late" : ""}`}>
              <div className="gt-board-band">{BAND[group]}{group === "ready" && since ? <span className="gt-board-wait"> · รอมาแล้ว {elapsedText(since, now)} นาที</span> : null}</div>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={href("monitor")} className="text-lg font-bold leading-tight underline-offset-2 hover:underline">{divisionLabel(d.name)}</Link>
                  <span className="gt-num shrink-0 text-right text-xs text-[var(--gt-muted)]">{d.players} คน{inSheet > 0 && inSheet !== d.players && <span className="block text-[var(--gt-warn)]">ใบสมัคร {inSheet}</span>}</span>
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
                {planned && d.nextRound && (
                  <p className={`gt-board-time u-${d.kind === "playing" ? "none" : urgency(min)}`}>⏰ {d.kind === "playing" ? "รอบถัดไป" : "รอบ"} {d.nextRound} เริ่ม {planned}{min !== null && d.kind !== "playing" && <> · <strong>{countdownText(min)}</strong></>}</p>
                )}
                {dd?.ceremony_at && (
                  <p className={`gt-board-time u-${dd.medals_done_at ? "none" : urgency(cer)}`}>🏅 มอบเหรียญ / ถ่ายรูป {dd.ceremony_at}{cer !== null && !dd.medals_done_at && <> · <strong>{countdownText(cer)}</strong></>}</p>
                )}
                {(group === "ceremony" || (d.kind === "done" && (d.friendship || dd?.ceremony_at))) && (
                  <div className="gt-board-ceremony">
                    <button type="button" onClick={() => setMedals(d)} className="gt-gold-btn min-h-11 w-full px-3">🏅 รายชื่อรับเหรียญ{d.friendship ? "" : " / รางวัล"}</button>
                    {dayReady ? (["medals", "photo"] as const).map((w) => {
                      const done = Boolean(w === "medals" ? dd?.medals_done_at : dd?.photo_done_at);
                      return <label key={w}><input type="checkbox" checked={done} disabled={busy === `${d.id}:${w}`} onChange={(e) => void tick(d.id, w, e.target.checked)} /> {w === "medals" ? "มอบเหรียญแล้ว" : "ถ่ายรูปแล้ว"}</label>;
                    }) : null}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {d.kind === "ready" && <Link href={href("rounds")} className="gt-gold-btn inline-flex min-h-12 flex-1 items-center justify-center px-3 text-center">ตรวจผล แล้วจับคู่รอบถัดไป ›</Link>}
                  {d.kind === "playing" && <Link href={href("rounds")} className="gt-cta-btn inline-flex min-h-11 flex-1 items-center justify-center px-3">ลงผล / เช็คอิน</Link>}
                  {d.kind === "notStarted" && <Link href={href(d.players ? "rounds" : "pools")} className="gt-outline-btn inline-flex min-h-11 flex-1 items-center justify-center px-3">{d.players ? "จับคู่รอบ 1" : "เตรียมรายชื่อ"}</Link>}
                  {d.kind === "done" && <Link href={href("standings")} className="gt-outline-btn inline-flex min-h-11 flex-1 items-center justify-center px-3">ตารางคะแนน</Link>}
                  <Link href={href("monitor")} className="gt-outline-btn inline-flex min-h-11 items-center justify-center px-3 text-sm">มอนิเตอร์</Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!shown.length && <p className="gt-card p-4 text-center text-sm text-[var(--gt-muted)]">ไม่มีรุ่นในสถานะนี้</p>}
      {medals && <MedalList division={medals} onClose={() => setMedals(null)} />}
    </div>
  );
}
