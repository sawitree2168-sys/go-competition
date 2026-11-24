"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OUTCOME, placeLabel } from "@/lib/institution-portal.mjs";
import { Avatar, Chip, Empty, SectionTitle, selectCls, type Overview, type Track } from "./bits";
import ShareSave from "./ShareSave";
import EventCertificates from "./EventCertificates";

const thDate = (iso: string | null) => iso ? new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(`${iso}T00:00:00+07:00`)) : "";
const pts = (n: number | null | undefined) => n == null ? "—" : n % 1 ? `${Math.floor(n) || ""}½` : String(n);
const medal = (p: number | null) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : "");

/**
 * กระดานสด: every student in one competition on one screen (table, round, opponent, result), refreshed every
 * 30 seconds by the page — for a tablet or TV at the institution's table — and the end-of-event summary card.
 */
export default function LiveBoard({ ov }: { ov: Overview }) {
  const events = useMemo(() => {
    const m = new Map<string, { id: string; title: string; date: string | null }>();
    for (const t of ov.tracking) m.set(t.tournament_id, { id: t.tournament_id, title: t.title, date: t.date });
    for (const r of ov.records) if (r.source !== "history" && !m.has(r.tournament_id)) m.set(r.tournament_id, { id: r.tournament_id, title: r.title, date: r.date });
    return [...m.values()].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  }, [ov.tracking, ov.records]);
  const [eventId, setEventId] = useState("");
  const current = events.find((e) => e.id === eventId) ?? events[0];
  const board = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [updated, setUpdated] = useState(() => new Date());

  useEffect(() => { queueMicrotask(() => setUpdated(new Date())); }, [ov]);
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === board.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const who = useMemo(() => new Map(ov.students.map((s) => [s.id, s])), [ov.students]);
  const recs = useMemo(() => ov.records.filter((r) => r.tournament_id === current?.id), [ov.records, current]);
  const rows = useMemo(() => {
    const tracked = ov.tracking.filter((t) => t.tournament_id === current?.id);
    const seen = new Set(tracked.map((t) => `${t.athlete_id}:${t.division_id}`));
    const waiting: Track[] = recs.filter((r) => !seen.has(`${r.athlete_id}:${r.division_id}`)).map((r) => ({
      athlete_id: r.athlete_id, tournament_id: r.tournament_id, title: r.title, date: r.date, division_id: r.division_id,
      division: r.division, round: 0, board: null, outcome: "pending" }));
    return [...tracked, ...waiting].sort((a, b) => a.division.localeCompare(b.division, "th") || (b.points ?? 0) - (a.points ?? 0)
      || (who.get(a.athlete_id)?.name ?? "").localeCompare(who.get(b.athlete_id)?.name ?? "", "th"));
  }, [ov.tracking, recs, current, who]);

  if (!current) return <div className="space-y-4"><SectionTitle>กระดานสด</SectionTitle><Empty>ยังไม่มีนักเรียนลงแข่งในรายการที่เผยแพร่แล้ว</Empty></div>;

  const latest = Math.max(0, ...rows.map((r) => r.round));
  const waiting = rows.filter((r) => r.outcome === "pending").length;
  const wonLatest = rows.filter((r) => r.round === latest && (r.outcome === "win" || r.outcome === "bye")).length;
  const pos = new Map(recs.map((r) => [`${r.athlete_id}:${r.division_id}`, r]));

  // Summary
  const games = recs.reduce((n, r) => n + r.games, 0), wins = recs.reduce((n, r) => n + r.wins, 0), losses = recs.reduce((n, r) => n + r.losses, 0);
  const podium = recs.filter((r) => r.pos && r.pos <= 3 && r.games > 0).sort((a, b) => (a.pos ?? 9) - (b.pos ?? 9));
  const unbeaten = recs.filter((r) => r.games >= 3 && r.wins === r.games && !(r.pos && r.pos <= 3));
  const finished = waiting === 0 && games > 0;

  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await board.current?.requestFullscreen(); } catch { /* not allowed */ }
  }

  return (
    <div className="space-y-5">
      <SectionTitle right={<select aria-label="เลือกรายการแข่งขัน" className={selectCls} value={current.id} onChange={(e) => setEventId(e.target.value)}>
        {events.map((e) => <option key={e.id} value={e.id}>{e.title}{e.date ? ` · ${thDate(e.date)}` : ""}</option>)}</select>}>กระดานสด</SectionTitle>

      <div ref={board} className={`space-y-3 bg-[#f0f6ff] ${full ? "overflow-y-auto p-4 sm:p-6" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className={`font-black text-[#0e3974] ${full ? "text-3xl" : "text-xl"}`}>{ov.academy.name} · {current.title}</h3>
            <p className="text-sm text-[var(--gt-muted)]">อัปเดต {updated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. · รีเฟรชเองทุก 30 วินาที</p>
          </div>
          <button type="button" onClick={() => void fullscreen()} className="gt-outline-btn min-h-11 px-4 text-sm">{full ? "ออกจากเต็มจอ" : "⛶ เต็มจอ"}</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["นักเรียนในงาน", new Set(rows.map((r) => r.athlete_id)).size], [latest ? `รอผลรอบ ${latest}` : "รอจับคู่", waiting], [latest ? `ชนะรอบ ${latest}` : "ชนะ", wonLatest]].map(([l, v]) => (
            <div key={String(l)} className="gt-card p-2 sm:p-3"><b className={`gt-num block text-[var(--gt-cta)] ${full ? "text-4xl" : "text-2xl"}`}>{v}</b><span className="text-xs sm:text-sm">{l}</span></div>
          ))}
        </div>
        {rows.length ? (
          <ul className={`grid gap-2 sm:gap-3 ${full ? "grid-cols-2 md:grid-cols-4 xl:grid-cols-5" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
            {rows.map((t) => {
              const s = who.get(t.athlete_id); const o = OUTCOME[t.outcome]; const rec = pos.get(`${t.athlete_id}:${t.division_id}`);
              const tone = t.outcome === "win" || t.outcome === "bye" ? "border-[#4caf7a] bg-[#f1fbf5]" : t.outcome === "loss" ? "border-[#e7a3ad] bg-[#fff6f7]" : "border-[#bcd1e9] bg-white";
              return (
                <li key={`${t.athlete_id}:${t.division_id}`} className={`flex flex-col gap-1.5 rounded-2xl border-2 p-2.5 sm:p-3 ${tone}`}>
                  <span className="flex items-center gap-2">
                    <Avatar src={s?.photo ?? null} className={full ? "h-14 w-14 shrink-0" : "h-11 w-11 shrink-0"} />
                    <span className="min-w-0"><b className={`block break-words leading-snug ${full ? "text-lg" : "text-sm sm:text-base"}`}>{s?.name ?? "นักเรียน"}</b>
                      <span className="block truncate text-xs text-[var(--gt-muted)]">{t.division}</span></span>
                  </span>
                  <span className="text-xs sm:text-sm">{t.round ? <>รอบ <b>{t.round}</b>{t.outcome === "bye" ? " · ได้บาย" : <> · โต๊ะ <b>{t.board ?? "–"}</b></>}</> : "รอจับคู่"}</span>
                  {t.opponent && <span className="truncate text-xs sm:text-sm">พบ {t.opponent}</span>}
                  <span className="mt-auto flex items-center justify-between gap-1">
                    <Chip tone={o.tone as "win"}>{o.label}</Chip>
                    <span className="text-xs">{rec?.pos && rec.games ? `${medal(rec.pos)}ที่ ${rec.pos}` : t.points != null ? `${pts(t.points)} คะแนน` : ""}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : <Empty>ยังไม่มีนักเรียนในรายการนี้</Empty>}
      </div>

      <section className="space-y-3" aria-labelledby="sum-h">
        <h3 id="sum-h" className="text-lg font-bold">การ์ดสรุปผลงาน{finished ? "" : " (ระหว่างแข่ง)"}</h3>
        <div ref={summary} className="-m-1 rounded-2xl bg-white p-1">
          <div className="overflow-hidden rounded-2xl border-[3px] border-[#e9bd55] bg-[linear-gradient(160deg,#0a3e89,#062a5f)] p-4 text-white sm:p-6">
            <p className="text-xs font-bold tracking-[.18em] text-[#f9d67d]">GO TOURNAMENT · สรุปผลงาน</p>
            <h4 className="mt-1 text-2xl font-black sm:text-3xl">{ov.academy.name}</h4>
            <p className="text-sm text-white/85">{current.title}{current.date ? ` · ${thDate(current.date)}` : ""}</p>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[["นักเรียน", new Set(recs.map((r) => r.athlete_id)).size], ["เกม", games], ["ชนะ", wins], ["แพ้", losses]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-white/10 p-2"><b className="gt-num block text-2xl text-[#ffdc83]">{v}</b><span className="text-xs">{l}</span></div>
              ))}
            </div>
            {podium.length > 0 && <ul className="mt-4 space-y-1.5">
              {podium.map((r) => <li key={`${r.athlete_id}:${r.division_id}`} className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-[#0e2f5f]">
                <span className="text-2xl" aria-hidden="true">{medal(r.pos)}</span>
                <span className="min-w-0 flex-1"><b className="block break-words">{who.get(r.athlete_id)?.name ?? "นักเรียน"}</b><span className="text-xs text-[#4b6383]">{r.division} · ชนะ {r.wins}/{r.games}</span></span>
                <b className="shrink-0 text-sm">{placeLabel(r.pos)}</b>
              </li>)}
            </ul>}
            {unbeaten.length > 0 && <p className="mt-3 text-sm">⭐ ชนะทุกเกม: {unbeaten.map((r) => who.get(r.athlete_id)?.name).filter(Boolean).join(", ")}</p>}
            {!podium.length && !unbeaten.length && <p className="mt-4 text-sm text-white/85">ชนะรวม {wins} เกม{games ? ` · อัตราชนะ ${Math.round((wins / games) * 100)}%` : ""} · ขอบคุณนักเรียนทุกคนที่ตั้งใจแข่งขัน</p>}
          </div>
        </div>
        <ShareSave target={summary} filename={`สรุปผลงาน ${ov.academy.name} ${current.title}`}
          text={`${ov.academy.name} · ${current.title}\nนักเรียน ${new Set(recs.map((r) => r.athlete_id)).size} คน ชนะ ${wins} เกม${podium.length ? `\n${podium.map((r) => `${medal(r.pos)} ${who.get(r.athlete_id)?.name ?? ""} ${r.division}`).join("\n")}` : ""}`}
          url={`/tournaments/${current.id}`} />
      </section>
      <EventCertificates tournamentId={current.id} students={[...new Set(recs.map((r) => r.athlete_id))].map((id) => ({ id, name: who.get(id)?.name ?? "นักเรียน" }))} />
    </div>
  );
}
