"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import AthleteAvatar from "@/components/AthleteAvatar";
import CompetitionPanel from "@/components/CompetitionPanel";

/** One kyu player. source: self = the athlete set it, division = latest kyu division entered, association = ทำเนียบคิวสมาคม. */
export type KyuRow = {
  go_id: string; name: string; kyu: number | null; source: "self" | "division" | "association" | null;
  event: string | null; division: string | null; date: string | null;
  assoc_kyu: number | null; assoc_source: string | null; self_kyu: number | null; last_played: string | null;
  photo: string | null; institution: string | null;
};
type Data = { total: number; page: number; page_size: number; counts: Record<string, number>; unknown: number; all: number; rows: KyuRow[] };

const KYUS = Array.from({ length: 15 }, (_, i) => i + 1);
const num = (n: number) => n.toLocaleString("en-US");
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
/** "3-4 Kyu" → "รุ่น 3-4 คิว", "OPEN Friendship 9×9" → "รุ่นเฟรนชิพ 9×9". */
const divisionText = (d: string) => {
  const t = d.replace(/^รุ่น\s*/, "").replace(/\bkyu\b/gi, "คิว").replace(/friendship/gi, "เฟรนชิพ").replace(/^open\s+/i, "").trim();
  return `รุ่น${/^\d/.test(t) ? " " : ""}${t}`;
};

/** Where the level comes from, in one short line under the name. */
export function KyuSource({ r }: { r: Pick<KyuRow, "kyu" | "source" | "event" | "division" | "date" | "assoc_kyu" | "assoc_source"> }) {
  if (r.kyu === null) return <span>ยังไม่ทราบระดับ</span>;
  if (r.source === "self") return <span>นักกีฬาระบุเอง</span>;
  if (r.source === "association") return <span>{r.assoc_source ?? "ทำเนียบคิวสมาคม"}</span>;
  return (
    <span>
      จาก{r.division ? divisionText(r.division) : "รุ่นที่แข่งล่าสุด"}{r.event ? ` · ${r.event}` : ""}{r.date ? ` · ${shortDate(r.date)}` : ""}
      {r.assoc_kyu !== null && r.assoc_kyu !== r.kyu && <> · ทำเนียบคิวสมาคม {r.assoc_kyu} คิว</>}
    </span>
  );
}

export default function KyuBoard() {
  const [kyu, setKyu] = useState<number | null>(null); // null = ทุกระดับ, 0 = ยังไม่ทราบระดับ
  const [scope, setScope] = useState<"all" | "active">("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    const db = staffDb();
    if (!db) { queueMicrotask(() => { setError(true); setLoading(false); }); return; }
    let live = true;
    queueMicrotask(() => setLoading(true));
    db.rpc("gt_kyu_board_v1", { p_kyu: kyu, p_query: query, p_scope: scope, p_page: page, p_size: per }).then(({ data: d, error: e }) => {
      if (!live) return;
      setError(Boolean(e) || !d); if (d) setData(d as Data); setLoading(false);
    });
    return () => { live = false; };
  }, [kyu, query, scope, page, per]);

  const pick = (k: number | null) => { setKyu(k); setPage(1); };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const go = (p: number) => { setPage(p); document.getElementById("kyu-results")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const chip = (active: boolean) => `inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${active ? "border-transparent bg-[var(--gt-cta)] text-white" : "border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)]"}`;
  const badge = (active: boolean) => `gt-num rounded-full px-2 text-xs ${active ? "bg-white/20" : "bg-[var(--gt-surface-2)]"}`;
  const label = kyu === null ? "ทุกระดับ" : kyu === 0 ? "ยังไม่ทราบระดับ" : `${kyu} คิว`;

  return (
    <div className="kyu-board">
      <aside className="dan-help">
        <strong>ระดับคิวมาจากไหน</strong>
        <p>สมาคมมีเพียงทำเนียบคิว เราจึงดูจาก<b>รุ่นคิวที่ลงแข่งล่าสุด</b>ด้วย โดยใช้ระดับที่เก่งที่สุดของรุ่น (เช่น ลงรุ่น 3-4 คิว = 3 คิว · เฟรนชิพ 9×9 = 15 คิว · 13×13 = 13 คิว) ถ้าทำเนียบคิวสมาคมสูงกว่า ใช้ตามทำเนียบ</p>
        <p>นักกีฬาที่ยังไม่ทราบระดับจะเว้นว่างไว้ · นักกีฬา/ผู้ปกครอง <Link href="/account/photo" className="font-semibold text-[var(--gt-cta)] hover:underline">เข้าสู่ระบบแล้วแก้ระดับคิวเองได้</Link> ถ้าลงแข่งรุ่นที่สูงกว่าหลังจากนั้น ระบบจะเลื่อนให้อัตโนมัติ</p>
      </aside>

      <div className="gt-directory-tools gt-dan-tools">
        <label className="gt-directory-search relative block">
          <span className="sr-only">ค้นหาชื่อหรือรหัส GO</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--gt-muted)]" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ หรือรหัส GO…"
            className="block min-h-12 w-full rounded-full border border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)] pl-12 pr-4 text-base outline-none focus:border-[var(--gt-cta)] focus:ring-2 focus:ring-[var(--gt-cta)]/25" />
        </label>
        <label className="gt-directory-year relative block">
          <span className="sr-only">ช่วงเวลาแข่งขัน</span>
          <select value={scope} onChange={(e) => { setScope(e.target.value as "all" | "active"); setPage(1); }}
            className="block min-h-12 w-full appearance-none rounded-full border border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)] pl-5 pr-10 text-base font-semibold outline-none focus:border-[var(--gt-cta)]">
            <option value="all" className="text-black">ทุกคน</option>
            <option value="active" className="text-black">แข่งใน 6 เดือนล่าสุด</option>
          </select>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </label>
      </div>

      <div role="group" aria-label="ระดับคิว" className="gt-directory-filters kyu-chips mb-4">
        <button type="button" aria-pressed={kyu === null} onClick={() => pick(null)} className={`${chip(kyu === null)} kyu-chip-wide`}>
          ทุกระดับ {data && <span className={badge(kyu === null)}>{num(data.all)}</span>}
        </button>
        {KYUS.map((k) => (
          <button key={k} type="button" aria-pressed={kyu === k} onClick={() => pick(k)} className={chip(kyu === k)}>
            {k} คิว {data && <span className={badge(kyu === k)}>{num(data.counts[String(k)] ?? 0)}</span>}
          </button>
        ))}
        <button type="button" aria-pressed={kyu === 0} onClick={() => pick(0)} className={`${chip(kyu === 0)} kyu-chip-wide`}>
          ยังไม่ทราบระดับ {data && <span className={badge(kyu === 0)}>{num(data.unknown)}</span>}
        </button>
      </div>

      <CompetitionPanel title="ทำเนียบคิว" context={`GO TOURNAMENT · ทำเนียบนักกีฬาหมากล้อมไทย · ${label} · หน้าที่ ${data?.page ?? 1}`}>
        <div id="kyu-results" className="dan-results" aria-busy={loading}>
          <div className="dan-display-tools" data-export-ignore="true">
            <h2 className="text-lg font-bold">{label}</h2>
            <label>แสดงต่อหน้า <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }}>{[30, 50, 100].map((n) => <option key={n} value={n}>{n} คน</option>)}</select></label>
            {data && <span aria-live="polite">{data.total ? num((data.page - 1) * data.page_size + 1) : 0}–{num(Math.min(data.page * data.page_size, data.total))} จาก {num(data.total)} คน</span>}
          </div>

          {error ? <p role="alert" className="gt-card p-6 text-center">โหลดทำเนียบคิวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
            : !data ? <p className="py-10 text-center text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>
            : data.total === 0 ? (
              <div className="gt-card mt-2 px-5 py-8 text-center">
                <p className="font-semibold">ไม่พบรายชื่อที่ตรงกับเงื่อนไข</p>
                <button type="button" onClick={() => { setQ(""); pick(null); setScope("all"); }} className="gt-outline-btn mt-3 min-h-11 px-5 text-sm font-semibold">ล้างตัวกรอง</button>
              </div>
            ) : (
              <div className={`gt-athlete-table overflow-hidden rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] ${loading ? "opacity-60" : ""}`}>
                <div className="hidden grid-cols-[54px_minmax(0,1fr)_96px_minmax(0,1.3fr)_96px] items-center gap-3 border-b border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 py-3 text-xs font-semibold text-[var(--gt-muted)] lg:grid">
                  <span>รูป</span><span>ชื่อ–นามสกุล</span><span>ระดับ</span><span>ที่มาของระดับ</span><span>แข่งล่าสุด</span>
                </div>
                <ol className="divide-y divide-[var(--gt-line)]" aria-label="รายชื่อนักกีฬาระดับคิว">
                  {data.rows.map((r) => (
                    <li key={r.go_id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 lg:grid-cols-[54px_minmax(0,1fr)_96px_minmax(0,1.3fr)_96px] lg:gap-3">
                      <AthleteAvatar src={r.photo} name={r.name} zoom className="h-11 w-11 sm:h-12 sm:w-12" />
                      <span className="min-w-0">
                        <Link href={`/athletes/history/${r.go_id}`} className="block break-words text-sm font-semibold leading-snug hover:underline sm:text-base">{r.name}</Link>
                        <span className="gt-num mt-0.5 block text-xs text-[var(--gt-muted)]">{r.go_id}{r.institution ? ` · ${r.institution}` : ""}</span>
                        <span className="mt-0.5 block text-xs text-[var(--gt-muted)] lg:hidden"><KyuSource r={r} /></span>
                      </span>
                      <span>
                        {r.kyu !== null
                          ? <span className="whitespace-nowrap rounded-full bg-[var(--gt-surface-2)] px-2.5 py-0.5 text-sm font-bold text-[var(--gt-brand)]">{r.kyu} คิว</span>
                          : <span className="text-[var(--gt-muted)]" aria-label="ยังไม่ทราบระดับ">–</span>}
                      </span>
                      <span className="hidden text-sm text-[var(--gt-muted)] lg:block"><KyuSource r={r} /></span>
                      <span className="gt-num hidden text-sm text-[var(--gt-muted)] lg:block">{r.last_played ? shortDate(r.last_played) : "-"}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

          {data && pages > 1 && (
            <nav aria-label="เลือกหน้า" className="dan-pagination" data-export-ignore="true">
              <button disabled={data.page <= 1} onClick={() => go(data.page - 1)}>‹ ก่อน</button>
              <label>หน้า <select aria-label="ไปหน้าที่" value={data.page} onChange={(e) => go(Number(e.target.value))}>{Array.from({ length: pages }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select> / {pages}</label>
              <button disabled={data.page >= pages} onClick={() => go(data.page + 1)}>ถัดไป ›</button>
            </nav>
          )}
        </div>
      </CompetitionPanel>
    </div>
  );
}
