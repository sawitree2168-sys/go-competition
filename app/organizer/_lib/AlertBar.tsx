"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { divisionLabel } from "@/lib/division-display";
import { countdownText, elapsedText, minutesUntil, urgency } from "@/lib/event-day.mjs";
import { staffDb } from "./staff";
import { play, SOUND_KEY, unlockSoundOnFirstTap } from "@/lib/sounds";
import { useEventDay, type DivisionDay, type DivisionStatus, type RefereeCall } from "./EventDay";

/**
 * Sticky bar on every organiser page of an event: whatever needs the admin now, most urgent first —
 * a line referee calling, a division whose results are all in (with how long it has waited and the
 * planned start of its next round), a medal / photo time coming up. New items beep (if sound is on)
 * and vibrate, so the admin notices while working in another division.
 */
type Level = "red" | "amber" | "green";
type Alert = { key: string; level: Level; icon: string; title: string; detail: string; href: string; tab: string; callId?: number };

const LEVEL_ORDER: Record<Level, number> = { red: 0, amber: 1, green: 2 };
const CALL_TEXT: Record<RefereeCall["kind"], string> = { problem: "มีปัญหา ขอแอดมินมาที่สาย", results_done: "ลงผลครบแล้ว พร้อมจับคู่", when_next: "ถามว่าจะออกคู่รอบถัดไปเมื่อไร" };

export function buildAlerts(rows: DivisionStatus[], days: Map<string, DivisionDay>, calls: RefereeCall[], readySince: Map<string, number>, eventDate: string | null, eventId: string, now = Date.now()): Alert[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const href = (id: string, tab: string) => `/organizer/${eventId}/${id}?tab=${tab}`;
  const out: Alert[] = [];
  for (const c of calls) {
    const d = byId.get(c.division_id);
    const name = d ? divisionLabel(d.name) : "รุ่น";
    out.push({
      key: `call:${c.id}:${c.created_at}`, level: c.kind === "problem" ? "red" : "amber", icon: c.kind === "problem" ? "🚨" : "📣",
      title: `${name}${c.round ? ` รอบ ${c.round}` : ""}: ${c.referee ?? "กรรมการ"} แจ้ง "${CALL_TEXT[c.kind]}"`,
      detail: [c.note, `เมื่อ ${elapsedText(new Date(c.created_at).getTime(), now)} นาทีที่แล้ว`].filter(Boolean).join(" · "),
      href: href(c.division_id, c.kind === "problem" ? "monitor" : "rounds"), tab: c.kind === "problem" ? "monitor" : "rounds", callId: c.id,
    });
  }
  for (const d of rows) {
    const day = days.get(d.id);
    if (d.kind === "ready" && d.nextRound) {
      const planned = day?.round_times?.[d.nextRound - 1] || null;
      const min = minutesUntil(planned, eventDate, new Date(now));
      const since = readySince.get(`${d.id}:${d.nextRound}`);
      const u = urgency(min);
      out.push({
        key: `ready:${d.id}:${d.nextRound}`, level: u === "late" || u === "soon" ? "red" : "green", icon: "✅",
        title: `${divisionLabel(d.name)} ลงผลครบ — รอจับคู่รอบ ${d.nextRound}`,
        detail: [since ? `รอมาแล้ว ${elapsedText(since, now)} นาที` : "", planned ? `กำหนดเริ่ม ${planned}${min !== null ? ` (${countdownText(min)})` : ""}` : ""].filter(Boolean).join(" · "),
        href: href(d.id, "rounds"), tab: "rounds",
      });
    }
    if (day?.ceremony_at && !day.medals_done_at && d.players > 0) {
      const min = minutesUntil(day.ceremony_at, eventDate, new Date(now));
      if (min !== null && min <= 15) {
        out.push({
          key: `ceremony:${d.id}`, level: min <= 0 ? "red" : "amber", icon: "🏅",
          title: `มอบเหรียญ / ถ่ายรูป ${divisionLabel(d.name)} ${day.ceremony_at} (${countdownText(min)})`,
          detail: d.kind === "done" ? "แข่งครบแล้ว รายชื่อรับเหรียญพร้อม" : `ยังแข่งไม่ครบ (รอบ ${Math.max(...d.pools.map((p) => p.last))}/${d.rounds})`,
          href: `/organizer/${eventId}#ceremony-${d.id}`, tab: "",
        });
      }
    }
  }
  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

const beep = () => play("alert", { force: true });

export default function AlertBar() {
  const day = useEventDay();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => { try { queueMicrotask(() => setSound(localStorage.getItem(SOUND_KEY) === "1")); } catch { /* no storage */ } }, []);
  useEffect(() => unlockSoundOnFirstTap(), []);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(t); }, []);

  const alerts = useMemo(() => (day?.rows ? buildAlerts(day.rows, day.days, day.calls, day.readySince, day.eventDate, day.eventId, now) : []), [day, now]);

  // beep for anything new (not on first load)
  useEffect(() => {
    const keys = new Set(alerts.map((a) => a.key.replace(/^ready:([^:]+):.*/, "ready:$1")));
    if (seen.current && [...keys].some((k) => !seen.current!.has(k)) && sound) beep();
    seen.current = keys;
  }, [alerts, sound]);

  if (!day) return null;
  const toggleSound = () => {
    const next = !sound; setSound(next);
    try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch { /* no storage */ }
    if (next) beep();
  };
  const go = (a: Alert) => {
    setOpen(false);
    // already on that division page: switch the tab without a reload
    if (a.tab && path === a.href.split("?")[0]) window.dispatchEvent(new CustomEvent("gt-open-tab", { detail: a.tab }));
  };
  const resolve = async (id: number) => {
    await staffDb()!.rpc("gt_staff_resolve_call_v1", { p_call: id });
    await day.refresh();
  };
  const top = alerts[0];

  return (
    <div className={`gt-alertbar ${top ? `lvl-${top.level}` : "lvl-none"}`} role="region" aria-label="เรื่องที่รอแอดมิน">
      {open && top && (
        <ul className="gt-alertbar-list">
          {alerts.map((a) => (
            <li key={a.key} className={`lvl-${a.level}`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{a.icon} {a.title}</p>
                {a.detail && <p className="text-sm opacity-90">{a.detail}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={a.href} onClick={() => go(a)} className="gt-alertbar-go">ไปที่รุ่นนี้ ›</Link>
                {a.callId && <button type="button" onClick={() => void resolve(a.callId!)} className="gt-alertbar-ack">รับทราบ</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="gt-alertbar-row">
        {top ? (
          <button type="button" className="gt-alertbar-main" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <b className="gt-alertbar-count">{alerts.length}</b>
            <span className="min-w-0 flex-1 truncate">{top.icon} {top.title}</span>
            <span aria-hidden="true">{open ? "▾" : "▴"}</span>
          </button>
        ) : (
          <Link href={`/organizer/${day.eventId}#event-divisions`} className="gt-alertbar-main">✓ ไม่มีเรื่องรอ · ดูโต๊ะกรรมการ</Link>
        )}
        <button type="button" onClick={toggleSound} aria-pressed={sound} className="gt-alertbar-sound" title="เสียงแจ้งเตือน">{sound ? "🔔 เสียงเปิด" : "🔕 เปิดเสียง"}</button>
      </div>
    </div>
  );
}
