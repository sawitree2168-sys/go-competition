"use client";

import { useEffect, useMemo, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { OUTCOME, amountDue, baht, medalCount, shortRank, studentStats, totals, trackedEvents, winRate } from "@/lib/institution-portal.mjs";
import { Avatar, ICONS, type Application, type Overview as OverviewData, type Student, type Track, type View } from "./bits";

type OpenEvent = { id: string; title: string; date: string | null; close: string | null };
type Poster = { id: string; poster_url: string | null; venue: string | null };

export const thDate = (d: string | null, month: "short" | "long" = "short") =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month, year: "numeric", timeZone: "Asia/Bangkok" }) : "";
export const shortName = (s: Student | undefined) => (s ? s.nickname?.trim() || s.name.split(/\s+/)[0] : "นักกีฬา");

/** Big number tile (phone: stacked; computer: icon on the left). */
export function StatTile({ icon, label, value, unit, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; unit?: string; tone: "blue" | "gold" | "purple" | "green" | "red" }) {
  const t = {
    blue: "bg-[#eaf3ff] border-[#c4dbf7] text-[#0b5fc6]",
    gold: "bg-[#fff5dd] border-[#f1d9a0] text-[#c98a08]",
    purple: "bg-[#f2eeff] border-[#d8cdf6] text-[#6b4fd1]",
    green: "bg-[#e9f8ef] border-[#bfe5cd] text-[#1d8a49]",
    red: "bg-[#fff0f1] border-[#f3c9ce] text-[#c8323f]",
  }[tone];
  return (
    <div className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl border px-1.5 py-2.5 text-center sm:flex-row sm:gap-4 sm:px-5 sm:py-4 sm:text-left ${t}`}>
      <span className="h-7 w-7 shrink-0 sm:h-11 sm:w-11">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-semibold text-[#21406e] sm:text-[15px]">{label}</span>
        <span className="gt-num block text-[22px] font-bold leading-tight text-[#0d2a5c] sm:text-[34px]">{value}{unit && <span className="ml-1 hidden text-lg font-semibold sm:inline">{unit}</span>}</span>
      </span>
    </div>
  );
}

const MedalIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M7 2h3l2 4 2-4h3l-3.2 6.4A6 6 0 1 1 10.2 8.4Z" opacity=".55" /><circle cx="12" cy="15" r="5" /><path fill="#fff" d="m12 12 .9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2Z" /></svg>
);

export function Card({ title, icon, more, onMore, children, className = "" }: { title: string; icon: React.ReactNode; more?: string; onMore?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-2xl border border-[#cfe0f5] bg-white p-3.5 shadow-[0_4px_14px_rgba(10,60,130,.06)] sm:p-4 ${className}`}>
      <header className="mb-3 flex items-center gap-2">
        <span className="h-6 w-6 shrink-0 text-[#0b5fc6]">{icon}</span>
        <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold sm:text-lg">{title}</h2>
        {more && onMore && <button type="button" onClick={onMore} className="min-h-9 shrink-0 text-sm font-semibold text-[#0b5fc6] hover:underline">{more} ›</button>}
      </header>
      {children}
    </section>
  );
}

const crown = (i: number) => <span aria-label={`อันดับ ${i + 1}`} className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[12px] font-bold text-white ${["bg-[#e8a900]", "bg-[#8ea0b8]", "bg-[#c8742c]"][i] ?? "bg-[#8ea0b8]"}`}>{i + 1}</span>;

export default function Overview({ ov, apps, track, go }: { ov: OverviewData; apps: Application[]; track: Track[]; go: (v: View) => void }) {
  const [open, setOpen] = useState<OpenEvent[]>([]);
  const [posters, setPosters] = useState<Map<string, Poster>>(new Map());
  const [slide, setSlide] = useState(0);
  const who = useMemo(() => new Map(ov.students.map((s) => [s.id, s])), [ov.students]);
  const t = totals(ov.records, ov.students);
  const medals = medalCount(ov.records);
  const rate = winRate(ov.records);
  const top = useMemo(() => studentStats(ov.records, ov.students).filter((r) => r.games >= 3).slice(0, 3), [ov.records, ov.students]);
  const latest = useMemo(() => {
    const byEvent = new Map<string, typeof ov.records>();
    for (const r of ov.records) if (r.games > 0) byEvent.set(r.tournament_id, [...(byEvent.get(r.tournament_id) ?? []), r]);
    const list = [...byEvent.values()].sort((a, b) => String(b[0].date ?? "").localeCompare(String(a[0].date ?? "")));
    // Prefer the newest event with final places (an event still being played has none yet).
    const done = list.find((rs) => rs.some((r) => r.pos != null)) ?? list[0];
    return done ? { rec: done[0], medals: medalCount(done) } : null;
  }, [ov]);
  const lastEvent = useMemo(() => trackedEvents(track)[0], [track]);
  const recent = useMemo(() => {
    if (!lastEvent) return [];
    const seen = new Set<string>();
    return track.filter((x) => x.tournament_id === lastEvent.id && !seen.has(x.athlete_id) && seen.add(x.athlete_id)).slice(0, 12);
  }, [track, lastEvent]);

  useEffect(() => {
    const db = staffDb();
    if (!db) return;
    db.rpc("gt_open_events_v1").then(({ data }) => setOpen(((data ?? []) as OpenEvent[]).slice(0, 6)));
  }, []);
  useEffect(() => {
    const ids = [...new Set([...open.map((e) => e.id), ...(latest && latest.rec.source !== "history" ? [latest.rec.tournament_id] : [])])];
    if (!ids.length) return;
    staffDb()?.from("gt_tournaments").select("id,poster_url,venue").in("id", ids)
      .then(({ data }) => { if (data) setPosters(new Map((data as Poster[]).map((p) => [p.id, p]))); });
  }, [open, latest]);

  const due = amountDue(apps);
  const waitingApps = apps.filter((a) => a.status === "pending").length;
  const applyTo = (id: string) => { go("apply"); window.history.replaceState(null, "", `/institution?v=apply&event=${encodeURIComponent(id)}`); };
  const ev = open[Math.min(slide, Math.max(0, open.length - 1))];
  const news: { key: string; tag: React.ReactNode; title: string; sub: string; onClick: () => void }[] = [
    ...(lastEvent?.live ? [{ key: "live", tag: <span className="rounded-md bg-[#16a34a] px-1.5 text-[11px] font-bold text-white">สด</span>, title: `กำลังแข่ง ${lastEvent.title}`, sub: "ติดตามผลรายรอบ อัปเดตทุก 30 วินาที", onClick: () => go("tracking") }] : []),
    ...(due ? [{ key: "due", tag: <span className="rounded-md bg-[#d97706] px-1.5 text-[11px] font-bold text-white">ชำระ</span>, title: `ค้างชำระค่าสมัคร ${baht(due)}`, sub: "ดูรายการชำระเงิน", onClick: () => { go("apply"); setTimeout(() => document.getElementById("pay-list")?.scrollIntoView({ behavior: "smooth" }), 80); } }] : []),
    ...(waitingApps ? [{ key: "wait", tag: <span className="rounded-md bg-[#64748b] px-1.5 text-[11px] font-bold text-white">รอ</span>, title: `ใบสมัครรออนุมัติ ${waitingApps} รายการ`, sub: "ตรวจสถานะการสมัคร", onClick: () => go("apply") }] : []),
    ...open.map((e) => ({ key: e.id, tag: <span className="rounded-md bg-[#e11d48] px-1.5 text-[11px] font-bold text-white">ใหม่</span>, title: `เปิดรับสมัคร ${e.title}`, sub: e.close ? `ถึง ${thDate(e.close)}` : thDate(e.date), onClick: () => applyTo(e.id) })),
  ].slice(0, 4);

  const quick: { id: View; label: string; sub?: string; tone: string }[] = [
    { id: "students", label: "นักเรียน", sub: `${t.students} คน`, tone: "bg-[#eaf3ff] text-[#0b5fc6]" },
    { id: "tracking", label: "ผลการแข่งขัน", sub: `${t.events} รายการ`, tone: "bg-[#fff5dd] text-[#c98a08]" },
    { id: "apply", label: "สมัครแข่งขัน", tone: "bg-[#eaf3ff] text-[#0b5fc6]" },
    { id: "awards", label: "ผลงาน", sub: "เหรียญ / รางวัล", tone: "bg-[#fff5dd] text-[#c98a08]" },
    { id: "stats", label: "อันดับ / พัฒนาการ", tone: "bg-[#eaf3ff] text-[#0b5fc6]" },
    { id: "reports", label: "รายงาน", sub: "สรุปผล", tone: "bg-[#fff5dd] text-[#c98a08]" },
  ];
  const quickIcon = (id: View) => (id === "tracking" ? ICONS.awards : id === "awards" ? MedalIcon : ICONS[id as Exclude<View, "home">]);

  const openCard = (
    <Card title="งานที่เปิดรับสมัคร" icon={ICONS.tracking} more="ดูทั้งหมด" onMore={() => go("apply")}>
      {ev ? (
        <div className="flex flex-1 flex-col">
          <div className="flex items-stretch gap-3">
            <PosterBox url={posters.get(ev.id)?.poster_url ?? null} title={ev.title} className="hidden h-[132px] w-[132px] sm:block" />
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#fff5dd] p-2.5 text-[#c98a08] sm:hidden">{ICONS.awards}</span>
            <div className="min-w-0 flex-1">
              <b className="block break-words text-[16px] leading-snug">{ev.title}</b>
              <p className="mt-1 text-sm text-[#4b6588]">📅 {thDate(ev.date, "long")}{posters.get(ev.id)?.venue ? <span className="block truncate">📍 {posters.get(ev.id)?.venue}</span> : null}</p>
              {ev.close && <p className="text-xs text-[#8a5a00]">ปิดรับ {thDate(ev.close)}</p>}
              <button type="button" onClick={() => applyTo(ev.id)} className="mt-2 hidden min-h-10 rounded-xl bg-[#0b5fc6] px-4 text-sm font-semibold text-white hover:bg-[#0a52ab] sm:inline-flex sm:items-center">✎ สมัครแข่งขัน</button>
            </div>
            <button type="button" onClick={() => applyTo(ev.id)} aria-label={`สมัคร ${ev.title}`} className="grid w-8 shrink-0 place-items-center text-2xl text-[#0b5fc6] sm:hidden">›</button>
          </div>
          {open.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button type="button" aria-label="งานก่อนหน้า" onClick={() => setSlide((slide - 1 + open.length) % open.length)} className="grid h-9 w-9 place-items-center rounded-full border border-[#cfe0f5] text-[#0b5fc6]">‹</button>
              <span className="flex gap-1.5">{open.map((e, i) => <span key={e.id} className={`h-2 rounded-full ${i === slide ? "w-5 bg-[#0b5fc6]" : "w-2 bg-[#c6d7ee]"}`} />)}</span>
              <button type="button" aria-label="งานถัดไป" onClick={() => setSlide((slide + 1) % open.length)} className="grid h-9 w-9 place-items-center rounded-full border border-[#cfe0f5] text-[#0b5fc6]">›</button>
            </div>
          )}
        </div>
      ) : <p className="rounded-xl bg-[#f3f7fd] px-3 py-5 text-center text-sm text-[#4b6588]">ยังไม่มีงานที่เปิดรับสมัครตอนนี้</p>}
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <StatTile tone="blue" icon={ICONS.students} label="นักเรียน" value={t.students} unit="คน" />
        <StatTile tone="gold" icon={ICONS.awards} label="รายการ" value={t.events} unit="รายการ" />
        <StatTile tone="purple" icon={MedalIcon} label="เหรียญรวม" value={medals.total} unit="เหรียญ" />
        <StatTile tone="green" icon={ICONS.stats} label="อัตราชนะ" value={rate == null ? "—" : `${rate}%`} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,.85fr)]">
        <div className="lg:col-start-1 lg:row-start-1">{openCard}</div>

        {/* phone only: students in the latest event */}
        {recent.length > 0 && (
          <div className="lg:hidden">
            <Card title="นักเรียนที่ลงแข่งล่าสุด" icon={ICONS.students} more="ดูทั้งหมด" onMore={() => go("tracking")}>
              <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {recent.map((x) => { const s = who.get(x.athlete_id); const o = OUTCOME[x.outcome]; return (
                  <li key={x.athlete_id} className="flex w-[78px] shrink-0 flex-col items-center gap-1 text-center">
                    <Avatar src={s?.photo ?? null} className="h-14 w-14" />
                    <b className="w-full truncate text-[13px]">{shortName(s)}</b>
                    <span className="text-xs font-semibold text-[#0b5fc6]">{shortRank(s?.rank) || "—"}</span>
                    <span className={`rounded-md px-2 text-xs font-bold ${x.round ? (x.outcome === "win" ? "bg-[#dcf5e5] text-[#176738]" : x.outcome === "loss" ? "bg-[#ffe3e6] text-[#b4232f]" : "bg-[#eef2f7] text-[#475569]") : "bg-[#eef2f7] text-[#475569]"}`}>{x.round ? o.label : "รอจับคู่"}</span>
                  </li>); })}
              </ul>
            </Card>
          </div>
        )}

        <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <Card title="เมนูด่วน" icon={ICONS.reports} className="h-full">
            <div className="grid grid-cols-4 gap-2 lg:grid-cols-2 lg:gap-3">
              {quick.map((q) => (
                <button key={q.id} type="button" onClick={() => go(q.id)} className={`${q.id === "awards" || q.id === "stats" ? "hidden lg:flex" : "flex"} min-h-[84px] flex-col items-center justify-center gap-1 rounded-xl border border-[#d3e2f5] px-1 py-2 text-center text-[13px] font-semibold leading-tight shadow-sm transition hover:-translate-y-0.5 lg:min-h-[104px] ${q.tone}`}>
                  <span className="h-7 w-7 lg:h-9 lg:w-9">{quickIcon(q.id)}</span>
                  <span className="text-[#0d2a5c]">{q.label}</span>
                  {q.sub && <span className="hidden text-[12px] font-normal text-[#4b6588] lg:block">({q.sub})</span>}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-start-2 lg:row-start-1">
          <Card title="นักเรียนผลงานเด่น" icon={ICONS.stats} more="ดูอันดับทั้งหมด" onMore={() => go("stats")} className="h-full">
            {top.length ? (
              <ul className="space-y-2">
                {top.map((r, i) => (
                  <li key={r.student.id} className="flex items-center gap-2.5">
                    {crown(i)}
                    <Avatar src={r.student.photo} className="h-10 w-10" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{shortName(r.student)} <span className="text-xs font-normal text-[#4b6588]">{shortRank(r.student.rank) && `(${shortRank(r.student.rank)})`}</span></span>
                    <span className="shrink-0 rounded-lg bg-[#e9f8ef] px-2 py-1 text-xs text-[#176738]">อัตราชนะ <b>{r.rate}%</b></span>
                  </li>
                ))}
              </ul>
            ) : <p className="rounded-xl bg-[#f3f7fd] px-3 py-5 text-center text-sm text-[#4b6588]">ยังไม่มีนักเรียนที่แข่งครบ 3 เกม</p>}
          </Card>
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <Card title="ผลการแข่งขันล่าสุด" icon={ICONS.stats} more="ดูทั้งหมด" onMore={() => go("awards")} className="h-full">
            {latest ? (
              <div className="flex items-center gap-3">
                <PosterBox url={latest.rec.source === "history" ? null : posters.get(latest.rec.tournament_id)?.poster_url ?? null} title={latest.rec.title} className="h-[96px] w-[96px]" />
                <div className="min-w-0 flex-1">
                  <b className="block break-words leading-snug">{latest.rec.title}</b>
                  <p className="text-sm text-[#4b6588]">📅 {thDate(latest.rec.date)}</p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                    {([["ทอง", latest.medals.gold, "bg-[#fff5dd] text-[#a86f00]"], ["เงิน", latest.medals.silver, "bg-[#eef2f7] text-[#475569]"], ["ทองแดง", latest.medals.bronze, "bg-[#fdeee3] text-[#a4541b]"]] as const).map(([l, n, c]) => (
                      <span key={l} className={`rounded-lg py-1 ${c}`}><span className="block text-[12px] font-semibold">{l}</span><b className="gt-num text-xl">{n}</b></span>
                    ))}
                  </div>
                </div>
              </div>
            ) : <p className="rounded-xl bg-[#f3f7fd] px-3 py-5 text-center text-sm text-[#4b6588]">ยังไม่มีผลการแข่งขัน</p>}
          </Card>
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <Card title="กิจกรรม / ประกาศ" icon={ICONS.tracking} className="h-full">
            {news.length ? (
              <ul className="divide-y divide-[#e3ecf7]">
                {news.map((n) => (
                  <li key={n.key}>
                    <button type="button" onClick={n.onClick} className="flex min-h-12 w-full items-center gap-2.5 py-2 text-left">
                      <span className="shrink-0">{n.tag}</span>
                      <span className="min-w-0 flex-1"><b className="block truncate text-sm">{n.title}</b><span className="block truncate text-xs text-[#4b6588]">{n.sub}</span></span>
                      <span aria-hidden="true" className="text-lg text-[#0b5fc6]">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="rounded-xl bg-[#f3f7fd] px-3 py-5 text-center text-sm text-[#4b6588]">ยังไม่มีกิจกรรมใหม่</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Event poster, or a navy-and-gold trophy block when the event has none. */
export function PosterBox({ url, title, className }: { url: string | null; title: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- poster from storage, any size
  return url ? <img src={url} alt={`โปสเตอร์ ${title}`} className={`shrink-0 rounded-xl object-cover ${className}`} loading="lazy" />
    : <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-xl bg-[linear-gradient(150deg,#0b4aa6,#082a62)] p-6 text-[#f2c14e] ${className}`}>{ICONS.awards}</span>;
}
