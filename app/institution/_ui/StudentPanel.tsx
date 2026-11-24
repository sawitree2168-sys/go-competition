"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { placeLabel, studentGrowth, totals } from "@/lib/institution-portal.mjs";
import { Avatar, Chip, Empty, type Rec, type Student } from "./bits";
import ShareSave from "./ShareSave";

type Game = {
  date: string | null; title: string; division: string; round_label: string | null; opponent: string | null;
  opponent_id: string | null; opponent_go_id: string | null; outcome: string; source: "live" | "history";
};
type Point = ReturnType<typeof studentGrowth>[number];

const thDate = (iso: string | null) => iso ? new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(`${iso}T00:00:00+07:00`)) : "ไม่ระบุวันที่";
const OUT: Record<string, { label: string; tone: "win" | "loss" | "draw" | "wait" | "info" }> = {
  win: { label: "ชนะ", tone: "win" }, loss: { label: "แพ้", tone: "loss" }, draw: { label: "เสมอ", tone: "draw" },
  pending: { label: "รอผล", tone: "wait" }, bye: { label: "บาย", tone: "info" },
  win_walkover: { label: "ชนะผ่าน", tone: "win" }, loss_walkover: { label: "แพ้ผ่าน", tone: "loss" },
};

/** Win rate in each competition, oldest → newest. Gold dots = placed 1st–3rd. Tap a dot for the details. */
export function GrowthChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length < 2) return <p className="rounded-xl bg-[var(--gt-surface-2)] p-3 text-sm">ต้องมีผลอย่างน้อย 2 รายการจึงจะเห็นกราฟการเติบโต</p>;
  const W = 640, H = 220, L = 40, R = 16, T = 16, B = 34;
  const x = (i: number) => L + (points.length === 1 ? 0 : (i * (W - L - R)) / (points.length - 1));
  const y = (rate: number) => T + ((100 - rate) * (H - T - B)) / 100;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`).join(" ");
  const step = (W - L - R) / Math.max(1, points.length - 1);
  const shown = active ?? points.length - 1;
  const p = points[shown];
  const first = points[0].rate, last = points[points.length - 1].rate, diff = last - first;
  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-bold">อัตราชนะแต่ละรายการ</span>
        <span className={`text-sm font-semibold ${diff > 0 ? "text-[var(--gt-win-ink)]" : diff < 0 ? "text-[var(--gt-loss-ink)]" : "text-[var(--gt-muted)]"}`}>
          {diff > 0 ? `▲ ดีขึ้น ${diff}%` : diff < 0 ? `▼ ลดลง ${-diff}%` : "เท่าเดิม"} <span className="font-normal text-[var(--gt-muted)]">เทียบรายการแรก</span>
        </span>
      </figcaption>
      <div className="rounded-xl border border-[var(--gt-line)] bg-white p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`กราฟอัตราชนะ ${points.length} รายการ จาก ${first}% เป็น ${last}%`}>
          {[0, 50, 100].map((g) => (
            <g key={g}>
              <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#d9e3f0" strokeWidth={1} strokeDasharray={g === 0 ? undefined : "3 4"} />
              <text x={L - 8} y={y(g) + 4} textAnchor="end" fontSize={12} fill="#5b6f88">{g}%</text>
            </g>
          ))}
          <path d={path} fill="none" stroke="var(--gt-cta, #0b5fbd)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active !== null && <line x1={x(active)} x2={x(active)} y1={T} y2={H - B} stroke="#9fb3cc" strokeWidth={1} />}
          {points.map((pt, i) => {
            const podium = pt.pos !== null && pt.pos <= 3;
            return <circle key={pt.key} cx={x(i)} cy={y(pt.rate)} r={i === shown ? 7 : 5.5} fill={podium ? "#e9b33f" : "var(--gt-cta, #0b5fbd)"} stroke="#fff" strokeWidth={2} />;
          })}
          <text x={L} y={H - 10} fontSize={12} fill="#5b6f88">{thDate(points[0].date)}</text>
          <text x={W - R} y={H - 10} fontSize={12} fill="#5b6f88" textAnchor="end">{thDate(points[points.length - 1].date)}</text>
          {points.map((pt, i) => (
            <rect key={`hit-${pt.key}`} x={x(i) - step / 2} y={0} width={Math.max(step, 24)} height={H} fill="transparent" className="cursor-pointer"
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => setActive(i)}>
              <title>{`${pt.title} · ${pt.rate}%`}</title>
            </rect>
          ))}
        </svg>
      </div>
      <div className="rounded-xl bg-[var(--gt-cta-soft)] p-3 text-sm" aria-live="polite">
        <b className="block">{p.title}</b>
        <span className="text-[var(--gt-muted)]">{thDate(p.date)} · {p.division}</span>
        <span className="mt-1 block">ชนะ {p.wins} แพ้ {p.losses}{p.draws ? ` เสมอ ${p.draws}` : ""} · <b>{p.rate}%</b>{p.pos ? ` · ${placeLabel(p.pos)}${p.field ? ` จาก ${p.field} คน` : ""}` : ""}</span>
      </div>
      <p className="text-xs text-[var(--gt-muted)]" data-export-ignore="true"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#e9b33f] align-middle" />ได้ที่ 1–3 · แตะจุดเพื่อดูรายละเอียด</p>
    </figure>
  );
}

/** One student: totals, growth chart, every game (who they played and the result), share / save picture. */
export default function StudentPanel({ academyId, academyName, student, records, rank, onClose }:
  { academyId: string; academyName: string; student: Student; records: Rec[]; rank: number | null; onClose: () => void }) {
  const card = useRef<HTMLDivElement>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [failed, setFailed] = useState(false);
  const mine = useMemo(() => records.filter((r) => r.athlete_id === student.id), [records, student.id]);
  const t = totals(mine, [student]);
  const points = useMemo(() => studentGrowth(records, student.id), [records, student.id]);
  const best = mine.filter((r) => r.pos && r.games).sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99))[0];
  const rate = t.games ? Math.round((t.wins / t.games) * 100) : null;
  const profile = student.history_only && student.go_id ? `/athletes/history/${encodeURIComponent(student.go_id)}` : `/athletes/${student.id}`;

  useEffect(() => {
    let live = true;
    const db = staffDb();
    if (!db) { queueMicrotask(() => { setFailed(true); setGames([]); }); return; }
    db.rpc("gt_academy_student_games_v1", { p_academy: academyId, p_student: student.id }).then(({ data, error }) => {
      if (!live) return;
      if (error || !data?.ok) { setFailed(true); setGames([]); return; }
      setGames(data.games as Game[]);
    });
    return () => { live = false; };
  }, [academyId, student.id]);

  const byEvent = useMemo(() => {
    const m = new Map<string, { title: string; date: string | null; division: string; items: Game[] }>();
    for (const g of games ?? []) {
      const k = `${g.title}|${g.division}|${g.date ?? ""}`;
      if (!m.has(k)) m.set(k, { title: g.title, date: g.date, division: g.division, items: [] });
      m.get(k)!.items.push(g);
    }
    return [...m.values()];
  }, [games]);

  return (
    <section className="gt-card space-y-4 border-2 border-[var(--gt-cta)] p-4 sm:p-6" aria-labelledby="student-panel-h">
      <div className="flex justify-between gap-2" data-export-ignore="true">
        <button type="button" onClick={onClose} className="gt-outline-btn min-h-11 px-4 text-sm">← กลับไปอันดับ</button>
        <Link href={profile} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--gt-cta)] underline underline-offset-4">โปรไฟล์นักกีฬา →</Link>
      </div>
      <div ref={card} className="-m-2 space-y-4 rounded-xl bg-white p-2">
        <header className="flex items-center gap-3">
          <Avatar src={student.photo} className="h-16 w-16" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--gt-muted)]">{academyName}{rank ? ` · อันดับ ${rank} ของสถาบัน` : ""}</p>
            <h3 id="student-panel-h" className="text-xl font-bold sm:text-2xl">{student.name}</h3>
            <p className="text-sm text-[var(--gt-muted)]">{[student.rank, student.go_id].filter(Boolean).join(" · ")}</p>
          </div>
        </header>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[["รายการ", t.events, ""], ["ชนะ", t.wins, "text-[var(--gt-win-ink)]"], ["แพ้", t.losses, "text-[var(--gt-loss-ink)]"], ["อัตราชนะ", rate == null ? "—" : `${rate}%`, ""]].map(([label, v, cls]) => (
            <div key={String(label)} className="rounded-xl bg-[var(--gt-surface-2)] p-2"><b className={`gt-num block text-xl sm:text-2xl ${cls}`}>{v}</b><span className="text-xs text-[var(--gt-muted)]">{label}</span></div>
          ))}
        </div>
        {best && <p className="rounded-xl border border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] p-3 text-sm">🏆 ผลงานดีที่สุด: <b>{placeLabel(best.pos)}</b> · {best.title} · {best.division}</p>}
        <GrowthChart points={points} />
        <div className="space-y-2">
          <h4 className="font-bold">ประวัติการแข่งขัน · เจอกับใครมาบ้าง</h4>
          {games === null ? <p role="status" className="text-sm text-[var(--gt-muted)]">กำลังโหลดประวัติ…</p>
            : failed ? <p role="alert" className="text-sm">ยังโหลดรายเกมไม่ได้ ดูได้ที่ <Link href={profile} className="font-semibold text-[var(--gt-cta)] underline">โปรไฟล์นักกีฬา</Link></p>
            : byEvent.length ? byEvent.map((ev) => (
              <div key={`${ev.title}|${ev.division}|${ev.date}`} className="overflow-hidden rounded-xl border-2 border-[#bed2ed]">
                <p className="bg-[#e8f2ff] px-3 py-2 text-sm"><b>{ev.title}</b><span className="block text-xs text-[#56708e]">{thDate(ev.date)} · {ev.division}</span></p>
                <ul className="divide-y divide-[#d8e6f7]">
                  {ev.items.map((g, i) => {
                    const o = OUT[g.outcome] ?? { label: "ไม่ได้แข่ง", tone: "draw" as const };
                    return (
                      <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className="w-14 shrink-0 text-xs text-[var(--gt-muted)]">{g.round_label ? (/^\d+$/.test(g.round_label) ? `รอบ ${g.round_label}` : g.round_label) : "—"}</span>
                        <span className="min-w-0 flex-1 break-words">{g.outcome === "bye" ? <span className="text-[var(--gt-muted)]">ได้บาย</span>
                          : g.opponent_id ? <Link href={`/athletes/${g.opponent_id}`} className="hover:underline">{g.opponent ?? "คู่แข่ง"}</Link>
                          : g.opponent_go_id ? <Link href={`/athletes/history/${encodeURIComponent(g.opponent_go_id)}`} className="hover:underline">{g.opponent ?? "คู่แข่ง"}</Link>
                          : (g.opponent ?? "—")}</span>
                        <Chip tone={o.tone}>{o.label}</Chip>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )) : <Empty>ยังไม่มีประวัติการแข่งขัน</Empty>}
        </div>
        <p className="text-center text-xs text-[var(--gt-muted)]">GO TOURNAMENT · ผลจากรายการบนเว็บและทำเนียบดั้งสมาคม / 1go</p>
      </div>
      <ShareSave target={card} filename={`${student.name} ${academyName}`}
        text={`${student.name} (${academyName}) · ${t.events} รายการ ชนะ ${t.wins} แพ้ ${t.losses}${rate == null ? "" : ` · อัตราชนะ ${rate}%`}`} url={profile} />
    </section>
  );
}
