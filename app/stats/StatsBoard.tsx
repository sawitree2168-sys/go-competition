"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AthleteAvatar from "@/components/AthleteAvatar";
import { thaiDate } from "@/lib/division-display";

/** gt_public_win_stats_v1: every player of the year once; the page ranks and filters here, so switching is instant. */
type EventEntry = [number, number, number, number, string]; // [event index, wins, losses, byes, division]
type Player = [string, string, string | null, string | null, "dan" | "kyu", number | null, number, number, number, number, number, EventEntry[]];
export type WinStats = { year: number | null; from: string | null; to: string | null; games: number;
  events: { id: string; title: string; date: string | null; year: number | null }[]; players: Player[] };

/** At least this many real games to get a rank by win percentage. */
export const MIN_GAMES = 5;
const PAGE = 50;

const n = (v: number) => v.toLocaleString("th-TH");
const pctText = (w: number, l: number) => (w + l ? `${Math.round((w / (w + l)) * 1000) / 10}%` : "–");
const shortDate = (iso: string | null, year: number | null) => (iso ? thaiDate(iso, "short") : year ? `ปี ${year + 543}` : "ไม่ทราบวันที่");
const unit = (g: "dan" | "kyu") => (g === "dan" ? "ดั้ง" : "คิว");

export default function StatsBoard({ data }: { data: WinStats }) {
  const [grp, setGrp] = useState<"dan" | "kyu">("dan");
  const [level, setLevel] = useState<number>(-1); // -1 all, 0 unknown
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of data.players) {
      c.set(`${p[4]}:-1`, (c.get(`${p[4]}:-1`) ?? 0) + 1);
      c.set(`${p[4]}:${p[5] ?? 0}`, (c.get(`${p[4]}:${p[5] ?? 0}`) ?? 0) + 1);
    }
    return c;
  }, [data.players]);
  const levels = useMemo(() => {
    const s = new Set<number>();
    for (const p of data.players) if (p[4] === grp) s.add(p[5] ?? 0);
    return [-1, ...[...s].filter((x) => x > 0).sort((a, b) => a - b), ...(s.has(0) ? [0] : [])];
  }, [data.players, grp]);

  // ranked by win % (real games only); fewer than MIN_GAMES games are listed after, without a rank
  const rows = useMemo(() => {
    const list = data.players.filter((p) => p[4] === grp && (level === -1 || (p[5] ?? 0) === level));
    const key = (p: Player) => { const g = p[6] + p[7]; return { q: g >= MIN_GAMES, r: g ? p[6] / g : 0, w: p[6], l: p[7] }; };
    list.sort((a, b) => { const x = key(a), y = key(b); return Number(y.q) - Number(x.q) || y.r - x.r || y.w - x.w || x.l - y.l || a[1].localeCompare(b[1], "th"); });
    let pos = 0;
    return list.map((p) => ({ p, pos: p[6] + p[7] >= MIN_GAMES ? ++pos : null }));
  }, [data.players, grp, level]);
  const ranked = rows.filter((r) => r.pos !== null).length;

  const pick = (g: "dan" | "kyu", lv = -1) => { setGrp(g); setLevel(lv); setShown(PAGE); setOpen(null); };
  const chip = (on: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold transition-colors ${on ? "border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] text-[var(--gt-brand)]" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`;
  const range = data.from && data.to ? `${thaiDate(data.from, "short")} – ${thaiDate(data.to, "short")}` : "";

  return (
    <div className="mx-auto max-w-3xl">
      <ul className="grid grid-cols-3 gap-2">
        {[["รายการแข่งขัน", data.events.length], ["เกมที่มีผล", data.games], ["นักกีฬา", data.players.length]].map(([l, v]) => (
          <li key={l as string} className="gt-card p-3 text-center"><span className="gt-num block text-2xl font-bold">{n(Number(v))}</span><span className="text-sm text-[var(--gt-muted)]">{l}</span></li>
        ))}
      </ul>

      <div role="tablist" className="gt-tabs mt-4 grid grid-cols-2 gap-2 rounded-2xl border-2 border-[var(--gt-gold)] bg-[var(--gt-surface)] p-1.5">
        {(["dan", "kyu"] as const).map((g) => (
          <button key={g} type="button" role="tab" aria-selected={grp === g} onClick={() => pick(g)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl font-bold ${grp === g ? "bg-[var(--gt-gold-soft)]" : ""}`}>
            {unit(g)} <span className="text-sm font-normal text-[var(--gt-muted)]">{n(counts.get(`${g}:-1`) ?? 0)} คน</span>
          </button>
        ))}
      </div>

      <nav className="mt-3 flex flex-wrap gap-2" aria-label="เลือกระดับ">
        {levels.map((lv) => (
          <button key={lv} type="button" aria-pressed={lv === level} onClick={() => pick(grp, lv)} className={chip(lv === level)}>
            {lv === -1 ? "ทั้งหมด" : lv === 0 ? "ไม่ทราบระดับ" : `${lv} ${unit(grp)}`}
            <span className="font-normal text-[var(--gt-muted)]">{n(counts.get(`${grp}:${lv}`) ?? 0)}</span>
          </button>
        ))}
      </nav>

      <p className="mt-3 text-sm text-[var(--gt-muted)]">
        เรียงตาม <b className="text-[var(--gt-text)]">% ชนะ</b> (ชนะ ÷ เกมที่แข่งจริง) · ต้องแข่งอย่างน้อย {MIN_GAMES} เกมจึงจัดอันดับ · เท่ากันดูจำนวนชนะ · แตะรูปเพื่อดูรูปใหญ่ · แตะชื่อเพื่อดูว่ามาจากรายการไหน
      </p>

      {rows.length ? (
        <ol className="gt-card mt-2 divide-y divide-[var(--gt-line)] overflow-hidden">
          {rows.slice(0, shown).map(({ p, pos }, i) => {
            const [goId, name, athleteId, photo, g, lv, w, l, ww, wl, b, list] = p;
            const isOpen = open === goId;
            const extra = [ww ? `ชนะผ่าน ${ww}` : "", wl ? `แพ้ผ่าน ${wl}` : "", b ? `บาย ${b}` : ""].filter(Boolean).join(" · ");
            return (
              <li key={goId}>
                {i === ranked && <p className="bg-[var(--gt-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--gt-muted)]">แข่งน้อยกว่า {MIN_GAMES} เกม · ยังไม่จัดอันดับ</p>}
                <div role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : goId)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(isOpen ? null : goId); } }}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[var(--gt-cta-soft)]">
                  <span className="gt-num w-8 shrink-0 text-center text-lg font-bold">{pos ?? "–"}</span>
                  <AthleteAvatar src={photo} name={name} zoom className="h-11 w-11" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{name}</span>
                    <span className="block text-xs text-[var(--gt-muted)]">{lv ? `${lv} ${unit(g)} · ` : ""}{n(list.length)} รายการ <span className="text-[var(--gt-cta)]">· {isOpen ? "ซ่อน ▴" : "ดูที่มา ▾"}</span></span>
                  </span>
                  <span className="gt-num w-28 shrink-0 text-right">
                    <span className="block text-lg font-bold text-[var(--gt-ok)]">{pctText(w, l)}</span>
                    <span className="block text-xs text-[var(--gt-muted)]">ชนะ {n(w)} · แพ้ {n(l)}</span>
                  </span>
                </div>
                {isOpen && (
                  <div className="space-y-1.5 bg-[var(--gt-surface-2)] px-3 pb-3 pt-2 text-sm">
                    <p className="text-xs text-[var(--gt-muted)]">แข่ง {n(w + l)} เกม · ชนะ {n(w)} · แพ้ {n(l)}{extra ? ` · ไม่นับใน %: ${extra}` : ""}</p>
                    <ul className="space-y-1.5">
                      {list.map(([ei, ew, el, eb, div]) => {
                        const e = data.events[ei];
                        return (
                          <li key={ei} className="flex items-start justify-between gap-3 rounded-lg bg-[var(--gt-surface)] px-3 py-2">
                            <span className="min-w-0">
                              <Link href={`/results/history/${e.id}`} className="block font-semibold hover:underline">{e.title}</Link>
                              <span className="block text-xs text-[var(--gt-muted)]">{shortDate(e.date, e.year)}{div && div !== e.title ? ` · ${div}` : ""}</span>
                            </span>
                            <span className="gt-num shrink-0 text-right text-xs"><b className="text-[var(--gt-ok)]">ชนะ {ew}</b> · แพ้ {el}{eb ? ` · บาย ${eb}` : ""}</span>
                          </li>
                        );
                      })}
                    </ul>
                    {athleteId && <Link href={`/athletes/${athleteId}`} className="inline-block pt-1 font-semibold text-[var(--gt-cta)] underline">ดูโปรไฟล์นักกีฬา</Link>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      ) : <p className="gt-card mt-2 p-6 text-center text-[var(--gt-muted)]">ยังไม่มีผลการแข่งขันในกลุ่มนี้</p>}
      {rows.length > shown && (
        <button type="button" onClick={() => setShown((s) => s + PAGE)} className="gt-outline-btn mt-3 min-h-11 w-full font-semibold">แสดงเพิ่ม ({n(rows.length - shown)} คน)</button>
      )}

      <details className="gt-card mt-4 p-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">ที่มาของสถิติ: {n(data.events.length)} รายการ{range ? ` (${range})` : ""} ▾</summary>
        <ul className="mt-1 space-y-1">
          {data.events.map((e) => (
            <li key={e.id} className="flex justify-between gap-3"><Link href={`/results/history/${e.id}`} className="min-w-0 hover:underline">{e.title}</Link><span className="shrink-0 text-xs text-[var(--gt-muted)]">{shortDate(e.date, e.year)}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[var(--gt-muted)]">% ชนะ นับเฉพาะเกมที่แข่งจริง · ชนะผ่าน/แพ้ผ่าน และบาย แยกไว้ ไม่นับ · ระดับดั้งจากทำเนียบดั้งสมาคม ระดับคิวจากทำเนียบนักกีฬา</p>
      </details>
    </div>
  );
}
