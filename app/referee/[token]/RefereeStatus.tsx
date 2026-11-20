"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countdownText, minutesUntil } from "@/lib/event-day.mjs";

/**
 * For the line referee: where this division stands, so nobody has to walk to the desk to ask.
 * All results in → "รอแอดมินจับคู่รอบ N+1" with the planned start time; a new round published → a banner
 * that beeps / vibrates. Buttons send a call to the admin's screen (ลงผลครบแล้ว / มีปัญหา / ถามเวลาออกคู่).
 */
type MyCall = { id: number; kind: string; created_at: string; resolved_at: string | null };
type Day = { total_rounds: number; round_times: string[]; ceremony_at: string | null; calls: MyCall[] };

const time = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

export default function RefereeStatus({ db, token, code, divisionId, round, total, pending, eventDate }: {
  db: () => SupabaseClient | null; token: string; code: string; divisionId: string;
  round: number | null; total: number; pending: number; eventDate: string | null;
}) {
  const [day, setDay] = useState<Day | null>(null);
  const [available, setAvailable] = useState(true);
  const [sending, setSending] = useState("");
  const [msg, setMsg] = useState("");
  const [fresh, setFresh] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const lastRound = useRef<{ division: string; round: number | null } | null>(null);

  const load = async () => {
    const { data, error } = await db()!.rpc("gt_referee_day_v1", { p_token: token, p_code: code, p_division: divisionId });
    if (error) { setAvailable(false); return; }
    if (data?.ok) { setAvailable(true); setDay(data as Day); }
  };
  useEffect(() => {
    queueMicrotask(load);
    const t = window.setInterval(() => { if (document.visibilityState === "visible") { void load(); setNow(Date.now()); } }, 15000);
    return () => window.clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId, token, code]);

  // a new round appeared while this screen was open: tell the referee loudly
  useEffect(() => {
    const prev = lastRound.current;
    if (prev && prev.division === divisionId && round && prev.round && round > prev.round) {
      queueMicrotask(() => setFresh(round));
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* none */ }
      try {
        const ctx = new AudioContext(); const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.value = 0.2; o.start(); o.stop(ctx.currentTime + 0.35);
        window.setTimeout(() => void ctx.close(), 600);
      } catch { /* audio blocked until the referee has tapped once */ }
    }
    lastRound.current = { division: divisionId, round };
  }, [round, divisionId]);

  if (!round) return null;
  const rounds = day?.total_rounds ?? total;
  const allIn = pending === 0;
  const finished = allIn && rounds > 0 && round >= rounds;
  const next = round + 1;
  const planned = day?.round_times?.[next - 1] || null;
  const min = minutesUntil(planned, eventDate, new Date(now));
  const open = (k: string) => day?.calls.find((c) => c.kind === k && !c.resolved_at);
  const lastAck = day?.calls.find((c) => c.resolved_at);

  const send = async (kind: "results_done" | "problem" | "when_next") => {
    let note = "";
    if (kind === "problem") {
      const v = window.prompt("มีปัญหาอะไร (ไม่ใส่ก็ได้) เช่น โต๊ะ 5 โต้แย้งผล", "");
      if (v === null) return;
      note = v;
    }
    setSending(kind); setMsg("");
    const { data, error } = await db()!.rpc("gt_referee_call_admin_v1", { p_token: token, p_code: code, p_division: divisionId, p_kind: kind, p_note: note });
    setSending("");
    if (error || !data?.ok) { setMsg("ส่งไม่สำเร็จ ลองอีกครั้ง"); return; }
    setMsg("ส่งถึงแอดมินแล้ว ขึ้นที่จอแอดมินทันที");
    await load();
  };
  const callBtn = (kind: "results_done" | "problem" | "when_next", label: string, cls: string) => {
    const c = open(kind);
    return (
      <button type="button" disabled={Boolean(sending)} onClick={() => void send(kind)} className={`gt-ref-call ${cls}`}>
        {sending === kind ? "กำลังส่ง…" : label}
        {c && <small>ส่งแล้ว {time(c.created_at)} · รอแอดมินรับทราบ (กดอีกครั้งเพื่อเตือน)</small>}
      </button>
    );
  };

  return (
    <section className={`gt-ref-status ${finished ? "is-finished" : allIn ? "is-waiting" : "is-playing"}`} aria-live="polite">
      {fresh && fresh === round && (
        <button type="button" className="gt-ref-fresh" onClick={() => setFresh(null)}>📢 ประกาศคู่รอบ {round} แล้ว — ดูโต๊ะด้านล่าง <span>ปิด ✕</span></button>
      )}
      {finished ? (
        <p className="gt-ref-headline">🏁 รุ่นนี้แข่งครบ {rounds} รอบแล้ว{day?.ceremony_at ? ` · มอบเหรียญ / ถ่ายรูป ${day.ceremony_at}` : ""}</p>
      ) : allIn ? (
        <>
          <p className="gt-ref-headline">✓ ลงผลรอบ {round} ครบแล้ว — รอแอดมินตรวจผลและจับคู่รอบ {next}</p>
          {planned && <p className="gt-ref-sub">กำหนดเริ่มรอบ {next}: <b>{planned}</b>{min !== null && ` (${countdownText(min)})`}</p>}
          <p className="gt-ref-sub">หน้านี้จะเปลี่ยนเป็นคู่รอบ {next} เองเมื่อแอดมินประกาศ ไม่ต้องเดินไปถาม</p>
        </>
      ) : (
        <p className="gt-ref-headline small">รอบ {round}{rounds ? ` / ${rounds}` : ""} · กำลังแข่ง · เหลือรอผล {pending} โต๊ะ{planned ? ` · รอบถัดไปกำหนด ${planned}` : ""}</p>
      )}
      {available && !finished && (
        <div className="gt-ref-calls">
          {allIn && callBtn("results_done", "📣 แจ้งแอดมิน: ลงผลครบแล้ว", "ok")}
          {allIn && callBtn("when_next", "❓ ถามเวลาออกคู่รอบถัดไป", "ask")}
          {callBtn("problem", "🚨 มีปัญหา ขอแอดมินมาที่สาย", "bad")}
        </div>
      )}
      {lastAck?.resolved_at && <p className="gt-ref-sub">✓ แอดมินรับทราบแล้ว {time(lastAck.resolved_at)}</p>}
      {msg && <p role="status" className="gt-ref-sub">{msg}</p>}
    </section>
  );
}
