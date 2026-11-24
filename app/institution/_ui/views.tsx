"use client";

import {LinkStudents} from "./AcademyPeople";
import { DisplayModeToggle, useInstitutionDisplayMode } from "./DisplayMode";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { RANK_OPTIONS } from "@/lib/competition-day.mjs";
import { OUTCOME, achievements, amountDue, baht, portalError, rankStats, studentReport, studentStats, totals } from "@/lib/institution-portal.mjs";
import ShareSave from "./ShareSave";
import StudentPanel, { useOpenStudent } from "./StudentPanel";
import { Avatar, Chip, Empty, ICONS, SectionTitle, StudentName, inputCls, selectCls, type Application, type Overview, type Rec, type Student, type Track, type TrackRound, type View } from "./bits";

type F = { filters: React.ReactNode };
const byId = (ov: Overview) => new Map(ov.students.map((s) => [s.id, s]));

/* ------------------------------------------------------------- overview */

export function Home({ ov, records, track, apps, filters, go }: { ov: Overview; records: Rec[]; track: Track[]; apps: Application[]; go: (v: View) => void } & F) {
  const t = totals(records, ov.students);
  const report = studentReport(records, ov.students).filter((r) => r.latest).slice(0, 3);
  const live = track.slice(0, 4);
  const who = byId(ov);
  const due = amountDue(apps);
  return (
    <div className="relative z-10 space-y-5">
      <SectionTitle right={filters}>ภาพรวมสถาบัน</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Tile icon={<span className="h-7 w-7 text-[var(--gt-cta)] sm:h-8 sm:w-8">{ICONS.students}</span>} n={t.students} unit="นักเรียน" />
        <Tile icon={<span className="h-7 w-7 sm:h-8 sm:w-8">{ICONS.awards}</span>} n={t.events} unit="รายการ" />
        <Tile icon={<span className="h-7 w-7 text-[var(--gt-cta)] sm:h-8 sm:w-8">{ICONS.tracking}</span>} n={t.games} unit="เกม" />
        <div className="gt-card flex items-center justify-center gap-1.5 p-2 sm:gap-2 sm:p-3">
          <span className="flex min-h-11 items-center gap-1 whitespace-nowrap rounded-xl bg-[var(--gt-win-bg)] px-2 text-[15px] font-semibold text-[var(--gt-win-ink)] sm:px-3">✓ ชนะ <b className="gt-num text-lg sm:text-xl">{t.wins}</b></span>
          <span className="flex min-h-11 items-center gap-1 whitespace-nowrap rounded-xl bg-[var(--gt-loss-bg)] px-2 text-[15px] font-semibold text-[var(--gt-loss-ink)] sm:px-3">✕ แพ้ <b className="gt-num text-lg sm:text-xl">{t.losses}</b></span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([{id:"students",label:"นักกีฬา",detail:"จัดการรายชื่อและติดตามผล"},{id:"tracking",label:"ผลการแข่งขัน",detail:"รอบ โต๊ะ และผลล่าสุด"},{id:"stats",label:"อันดับ / พัฒนาการ",detail:"อันดับ กราฟการเติบโต ประวัติรายคน"},{id:"reports",label:"รายงาน",detail:"สรุปผลงานรายบุคคล"}] as const).map((item)=>
          <button key={item.id} type="button" onClick={()=>go(item.id)} className="group rounded-[20px] border-[3px] border-[#e7b950] bg-[linear-gradient(145deg,#0a3e89,#08306c)] p-4 text-left text-white shadow-[0_7px_14px_rgba(8,44,98,.17)] transition hover:-translate-y-0.5 hover:border-[#f9d779]">
            <span className="flex items-center justify-between"><span className="h-9 w-9 text-[#ffdc83]">{ICONS[item.id==="reports"?"reports":item.id]}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#edbb55] font-black text-[#0e3470]">›</span></span>
            <strong className="mt-3 block text-lg">{item.label}</strong><span className="block text-xs text-white/80">{item.detail}</span>
          </button>
        )}
      </div>
      <section className="gt-card overflow-hidden border-[3px] border-[#bed1eb]" aria-labelledby="rep-h">
        <header className="flex items-start gap-3 px-4 pb-3 pt-4 sm:px-6">
          <span className="h-9 w-9 shrink-0 text-[var(--gt-cta)] sm:h-11 sm:w-11">{ICONS.awards}</span>
          <div>
            <h3 id="rep-h" className="text-lg font-bold sm:text-2xl">รายงานการแข่งขัน</h3>
            <p className="text-sm text-[var(--gt-muted)]">นักเรียนที่ทำผลงานโดดเด่น</p>
          </div>
        </header>
        {report.length ? <ReportTable rows={report} /> : <div className="px-4 pb-4 sm:px-6"><Empty>ยังไม่มีผลการแข่งขันในช่วงที่เลือก</Empty></div>}
        <footer className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
          <span className="text-[var(--gt-muted)]">ⓘ ผลจากรายการที่เผยแพร่แล้ว รวมผลย้อนหลังจากทำเนียบดั้งสมาคมและ 1go</span>
          <button type="button" onClick={() => go("reports")} className="font-semibold text-[var(--gt-cta)] underline underline-offset-4">ดูรายงานทั้งหมด →</button>
        </footer>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="gt-card overflow-hidden" aria-labelledby="trk-h">
          <header className="flex items-center gap-3 px-4 pt-4 sm:px-5">
            <span className="h-8 w-8 text-[var(--gt-cta)]">{ICONS.tracking}</span>
            <h3 id="trk-h" className="text-lg font-bold sm:text-xl">ติดตามผลการแข่งขัน</h3>
          </header>
          <div className="p-3 sm:p-4">
            {live.length ? <TrackTable rows={live} who={who} compact /> : <Empty>ยังไม่มีนักเรียนลงแข่งในช่วงที่เลือก</Empty>}
          </div>
          <footer className="px-4 pb-3 text-right text-sm sm:px-5">
            <button type="button" onClick={() => go("tracking")} className="font-semibold text-[var(--gt-cta)] underline underline-offset-4">ดูทั้งหมด →</button>
          </footer>
        </section>

        <section className="gt-card space-y-4 p-4 sm:p-5" aria-labelledby="grp-h">
          <header className="flex items-center gap-3">
            <span className="h-8 w-8 text-[var(--gt-cta)]">{ICONS.students}</span>
            <h3 id="grp-h" className="text-lg font-bold sm:text-xl">สมัครแข่งขันแบบกลุ่ม</h3>
          </header>
          <Steps />
          <div className="mx-auto max-w-sm space-y-2.5">
            <button type="button" onClick={() => go("apply")} className="gt-cta-btn flex min-h-12 w-full items-center justify-center gap-2 text-[15px]">เลือกนักเรียนเพื่อสมัคร <span aria-hidden="true">→</span></button>
            <button type="button" onClick={() => { go("apply"); setTimeout(() => document.getElementById("pay-list")?.scrollIntoView({ behavior: "smooth" }), 80); }}
              className="gt-outline-btn min-h-12 w-full text-[15px] font-medium">ดูรายการชำระเงิน{due ? ` · ค้าง ${baht(due)}` : ""}</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Tile({ icon, n, unit }: { icon: React.ReactNode; n: number; unit: string }) {
  return (
    <div className="gt-card flex min-h-[4.25rem] items-center justify-center gap-3 p-3 sm:min-h-20">
      {icon}<span className="gt-num text-2xl font-bold sm:text-4xl">{n}</span><span className="text-[15px] sm:text-lg">{unit}</span>
    </div>
  );
}

export function Steps({ at = 0 }: { at?: number }) {
  const s = ["เลือกงาน", "ติ๊กชื่อนักเรียน", "เลือกรุ่น", "ชำระเงิน"];
  return (
    <ol className="grid grid-cols-4 text-center text-[13px] leading-tight sm:text-sm" aria-label="ขั้นตอนสมัคร">
      {s.map((label, i) => (
        <li key={label} className="relative flex flex-col items-center gap-1.5 px-1" aria-current={at === i + 1 ? "step" : undefined}>
          {i > 0 && <span aria-hidden="true" className={`absolute top-3.5 h-0.5 ${at > i ? "bg-[var(--gt-ok)]" : "bg-[var(--gt-cta)] opacity-40"}`} style={{ left: "calc(-50% + 1.1rem)", right: "calc(50% + 1.1rem)" }} />}
          <span className={`relative grid h-7 w-7 place-items-center rounded-full border text-sm font-semibold ${at > i + 1 ? "border-[var(--gt-ok)] bg-[var(--gt-ok)] text-white" : at === i + 1 ? "border-[var(--gt-cta)] bg-[var(--gt-cta)] text-white" : "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]"}`}>
            {at > i + 1 ? "✓" : i + 1}
          </span>
          <span className={at === i + 1 ? "font-semibold" : ""}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

type ReportRow = ReturnType<typeof studentReport>[number];
function ReportTable({ rows, full = false }: { rows: ReportRow[]; full?: boolean }) {
  const tone = (r: ReportRow) => (r.tone === "gold" ? "font-semibold text-[var(--gt-gold-ink)]" : r.tone === "up" ? "text-[var(--gt-win-ink)]" : "");
  return (
    <>
      <table className="hidden w-full border-y border-[var(--gt-line)] text-left sm:table">
        <thead className="bg-[var(--gt-cta-soft)] text-[15px]">
          <tr><th className="px-6 py-2.5 font-medium">นักเรียน</th><th className="px-4 py-2.5 font-medium">ผลล่าสุด</th><th className="px-4 py-2.5 font-medium">จุดเด่น</th>{full && <th className="px-4 py-2.5 font-medium">รายการล่าสุด</th>}</tr>
        </thead>
        <tbody className="divide-y divide-[var(--gt-line)]">
          {rows.map((r) => (
            <tr key={r.student.id}>
              <td className="px-6 py-2.5"><StudentName s={r.student} sub={full ? r.student.rank : undefined} /></td>
              <td className="px-4 py-2.5">{r.latest?.games ? <Chip tone="win">{r.line}</Chip> : <span className="text-sm text-[var(--gt-muted)]">{r.line}</span>}</td>
              <td className={`px-4 py-2.5 ${tone(r)}`}>{r.note}</td>
              {full && <td className="px-4 py-2.5 text-sm text-[var(--gt-muted)]">{r.latest ? `${r.latest.title} · ${r.latest.division}` : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-[var(--gt-line)] border-y border-[var(--gt-line)] sm:hidden">
        {rows.map((r) => (
          <li key={r.student.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <StudentName s={r.student} sub={r.latest?.games ? <span className="mt-0.5 inline-block rounded-md bg-[var(--gt-win-bg)] px-2 text-[var(--gt-win-ink)]">{r.line}</span> : r.line} />
              {full && r.latest && <p className="mt-1 truncate pl-[3.25rem] text-xs text-[var(--gt-muted)]">{r.latest.title} · {r.latest.division}</p>}
            </div>
            <span className={`w-[38%] shrink-0 border-l border-[var(--gt-line)] pl-3 text-[13px] ${tone(r)}`}>{r.note}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function TrackTable({ rows, who, compact = false }: { rows: Track[]; who: Map<string, Student>; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--gt-line)]">
      <table className={`w-full text-left text-sm ${compact ? "table-fixed" : ""}`}>
        {compact && <colgroup><col /><col className="w-[6.25rem] sm:w-[8.5rem]" /><col className="w-[4.75rem]" /></colgroup>}
        <thead className="bg-[var(--gt-cta-soft)]">
          <tr><th className="px-3 py-2 font-medium">นักเรียน</th>{!compact && <th className="hidden px-3 py-2 font-medium md:table-cell">รายการ / รุ่น</th>}<th className="px-2 py-2 text-center font-medium">รอบ / โต๊ะ</th><th className="px-2 py-2 text-center font-medium">สถานะ</th></tr>
        </thead>
        <tbody className="divide-y divide-[var(--gt-line)]">
          {rows.map((t) => {
            const s = who.get(t.athlete_id); const o = OUTCOME[t.outcome];
            return (
              <tr key={`${t.athlete_id}-${t.division_id}`}>
                <td className={`px-3 py-2 ${compact ? "" : "max-w-0"}`}>{s ? <StudentName s={s} small={compact} sub={compact ? undefined : <span className="md:hidden">{t.title} · {t.division}</span>} /> : "—"}</td>
                {!compact && <td className="hidden px-3 py-2 md:table-cell"><Link href={`/tournaments/${t.tournament_id}`} className="hover:underline">{t.title}</Link><span className="block text-xs text-[var(--gt-muted)]">{t.division}</span></td>}
                <td className="gt-num px-2 py-2 text-center">{compact ? <>รอบ {t.round}{t.board ? <span className="block sm:inline"><span className="hidden sm:inline"> / </span>โต๊ะ {t.board}</span> : null}</> : <span className="whitespace-nowrap">รอบ {t.round}{t.board ? ` / โต๊ะ ${t.board}` : ""}</span>}</td>
                <td className="px-2 py-2 text-center"><Chip tone={o.tone as "win"}>{o.label}</Chip></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------- menus */

export function Students({ ov, canEdit, reload, workspaceType="academy" }: { ov: Overview; canEdit: boolean; reload: () => Promise<void>; workspaceType?:"academy"|"independent_coach" }) {
  const [mode,setMode] = useInstitutionDisplayMode("students");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "rate" | "games">("name");
  const [open, setOpen] = useOpenStudent();
  const stats = useMemo(() => new Map(studentStats(ov.records, ov.students).map((r) => [r.student.id, r])), [ov.records, ov.students]);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    const found = ov.students.filter((s) => !k || `${s.name} ${s.nickname ?? ""} ${s.go_id ?? ""}`.toLowerCase().includes(k));
    const st = (id: string) => stats.get(id);
    return sort === "name" ? found
      : found.slice().sort((a, b) => sort === "rate"
        ? (st(b.id)?.rate ?? -1) - (st(a.id)?.rate ?? -1) || (st(b.id)?.games ?? 0) - (st(a.id)?.games ?? 0)
        : (st(b.id)?.games ?? 0) - (st(a.id)?.games ?? 0) || (st(b.id)?.rate ?? -1) - (st(a.id)?.rate ?? -1));
  }, [ov.students, q, sort, stats]);
  const chosen = ov.students.find((s) => s.id === open);
  if (chosen) return <StudentPanel academyId={ov.academy.id} academyName={ov.academy.name} student={chosen} records={ov.records} rank={null} onClose={() => setOpen(null)} backLabel="← กลับไปรายชื่อนักเรียน" />;
  return (
    <div className="space-y-4">
      <SectionTitle>นักเรียน <span className="text-base font-normal text-[var(--gt-muted)]">{ov.students.length} คน</span></SectionTitle>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="min-w-[12rem] flex-1"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ ชื่อเล่น หรือรหัสนักกีฬา" aria-label="ค้นหานักเรียน" className={inputCls} /></div>
        <select aria-label="เรียงรายชื่อ" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={selectCls}>
          <option value="name">เรียงตามชื่อ</option><option value="rate">อัตราชนะสูงสุด</option><option value="games">แข่งมากที่สุด</option>
        </select>
        <DisplayModeToggle mode={mode} onChange={setMode}/>
      </div>
      <p className="text-sm text-[var(--gt-muted)]">แตะนักเรียนเพื่อดูกราฟการเติบโตและประวัติการแข่งขัน</p>
      {list.length ? mode === "table" ? (
        <div className="overflow-hidden rounded-xl border-2 border-[#bcd1e9] bg-white">
          <table className="w-full table-fixed text-left text-xs sm:text-sm">
            <colgroup><col /><col className="hidden w-24 sm:table-column" /><col className="w-11 sm:w-16" /><col className="w-14 sm:w-20" /><col className="w-12 sm:w-16" /></colgroup>
            <thead className="bg-[#e8f2ff] text-[#123a76]"><tr><th className="px-2 py-3 sm:px-4">นักเรียน</th><th className="hidden px-2 py-3 sm:table-cell">ระดับ</th><th className="px-1 py-3 text-center">รายการ</th><th className="px-1 py-3 text-center">ชนะ–แพ้</th><th className="px-1 py-3 text-center">%ชนะ</th></tr></thead>
            <tbody className="divide-y divide-[#d9e6f6]">{list.map((s) => { const r = stats.get(s.id); return (
              <tr key={s.id} onClick={() => setOpen(s.id)} className="cursor-pointer hover:bg-[#f2f7ff]">
                <td className="px-2 py-2.5 sm:px-4"><button type="button" onClick={(e) => { e.stopPropagation(); setOpen(s.id); }} className="w-full text-left"><StudentRow s={s} sub={[s.rank, s.history_only && "จากประวัติ"].filter(Boolean).join(" · ") || undefined} /></button></td>
                <td className="hidden px-2 sm:table-cell">{s.rank ?? "—"}</td>
                <td className="gt-num px-1 text-center">{r?.events ?? 0}</td>
                <td className="gt-num px-1 text-center"><span className="text-[var(--gt-win-ink)]">{r?.wins ?? 0}</span>–<span className="text-[var(--gt-loss-ink)]">{r?.losses ?? 0}</span></td>
                <td className="gt-num px-1 text-center font-semibold">{r?.rate == null ? "—" : `${r.rate}%`}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((s) => { const r = stats.get(s.id); return (
            <li key={s.id}>
              <button type="button" onClick={() => setOpen(s.id)} className="gt-card flex h-full w-full flex-col items-center gap-2 border-2 border-[#bcd1e9] p-3 text-center transition hover:border-[var(--gt-cta)] active:scale-[.98]">
                <Avatar src={s.photo} className="h-20 w-20 sm:h-24 sm:w-24" />
                <span className="w-full">
                  <strong className="block break-words text-[15px] leading-snug">{s.name}</strong>
                  <span className="block truncate text-xs text-[var(--gt-muted)]">{[s.nickname && `“${s.nickname}”`, s.rank, s.history_only && "จากประวัติ"].filter(Boolean).join(" · ") || "\u00a0"}</span>
                </span>
                <span className="mt-auto grid w-full grid-cols-3 gap-1 text-center">
                  <span className="rounded-lg bg-[#edf5ff] py-1.5"><b className="gt-num block text-base leading-tight">{r?.events ?? 0}</b><span className="text-[11px]">รายการ</span></span>
                  <span className="rounded-lg bg-[#e6f7ec] py-1.5"><b className="gt-num block text-base leading-tight text-[#176738]">{r?.wins ?? 0}</b><span className="text-[11px]">ชนะ</span></span>
                  <span className="rounded-lg bg-[#fff0f1] py-1.5"><b className="gt-num block text-base leading-tight text-[#a42841]">{r?.losses ?? 0}</b><span className="text-[11px]">แพ้</span></span>
                </span>
                <span className="w-full">
                  <span className="flex justify-between text-xs"><span className="text-[var(--gt-muted)]">อัตราชนะ</span><b>{r?.rate == null ? "—" : `${r.rate}%`}</b></span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#e8edf6]"><span className="block h-full rounded-full bg-[#1770d5]" style={{ width: `${r?.rate ?? 0}%` }} /></span>
                </span>
              </button>
            </li>); })}
        </ul>
      ) : <Empty>{q ? "ไม่พบนักเรียนที่ค้นหา" : "ยังไม่มีนักเรียน — เพิ่มนักเรียนใหม่ได้ด้านล่าง หรือรายชื่อจะขึ้นเองเมื่อนักเรียนลงแข่งในนามสถาบันนี้"}</Empty>}
      {canEdit&&<LinkStudents academyId={ov.academy.id} reload={reload} workspaceType={workspaceType}/>}
      {workspaceType==="academy"&&<div className="rounded-xl border-2 border-[#e8bd58] bg-[#fff9ea] p-3 text-sm text-[#694d15]" role="note"><strong>เพิ่มนักเรียนด้วยโปรไฟล์เดิม</strong><p className="mt-1">ค้นหาชื่อหรือ GO ID ในส่วน “ค้นหาและเพิ่มนักเรียนที่มีประวัติอยู่แล้ว” ด้านบน เพื่อเชื่อมเข้าหลายสถาบันได้โดยไม่สร้าง GO ID ซ้ำ หากไม่พบชื่อ ให้ตรวจสอบก่อนสร้างโปรไฟล์นักกีฬาใหม่</p></div>}
      <p className="text-xs text-[var(--gt-muted)]">{workspaceType==="academy"?"รายชื่อรวมผู้ที่ลงแข่งในนามสถาบันนี้ และนักเรียนที่ครูเชื่อมเอง":"รายชื่อรวมเฉพาะนักเรียนที่ครูเชื่อมกับพื้นที่ส่วนตัว"} · นักเรียนหนึ่งคนมีได้หลายครูและหลายสถาบัน โดยไม่เปลี่ยนชื่อในรายการแข่งขันเดิม · ไม่แสดงข้อมูลส่วนตัวของผู้ปกครอง</p>
    </div>
  );
}

function AddStudent({ academyId, canEdit, reload }: { academyId: string; canEdit: boolean; reload: () => Promise<void> }) {
  const [name, setName] = useState(""); const [nick, setNick] = useState(""); const [rank, setRank] = useState("");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { data, error } = await staffDb()!.rpc("gt_academy_add_student_v1", { p_academy: academyId, p_name: name, p_nickname: nick, p_rank: rank });
    setBusy(false);
    if (error || !data?.ok) { setMsg({ ok: false, text: portalError(data?.error) }); return; }
    setMsg({ ok: true, text: `เพิ่ม ${name.trim()} แล้ว` }); setName(""); setNick(""); setRank("");
    await reload();
  };
  return (
    <form onSubmit={submit} className="gt-card space-y-3 p-4 sm:p-5" aria-labelledby="add-h">
      <h3 id="add-h" className="text-lg font-bold">เพิ่มนักเรียนใหม่</h3>
      {!canEdit && <p className="text-sm text-[var(--gt-warn)]">ใช้ได้เมื่อเจ้าของระบบอนุมัติสิทธิ์ครูแล้ว</p>}
      <p className="text-sm text-[var(--gt-muted)]">สำหรับนักเรียนที่ยังไม่เคยแข่ง · นักเรียนที่เคยแข่งจะขึ้นในรายชื่อเองเมื่อลงแข่งในนามสถาบันนี้</p>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="block text-sm font-medium">ชื่อ–นามสกุล
          <input required value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="เช่น ธนวัฒน์ ศรีสุข" className={`${inputCls} mt-1 font-normal`} />
        </label>
        <label className="block text-sm font-medium">ชื่อเล่น
          <input value={nick} onChange={(e) => setNick(e.target.value)} disabled={!canEdit} maxLength={40} placeholder="ไม่บังคับ" className={`${inputCls} mt-1 font-normal`} />
        </label>
        <label className="block text-sm font-medium">ระดับฝีมือ
          <select required value={rank} onChange={(e) => setRank(e.target.value)} disabled={!canEdit} className={`${selectCls} mt-1 min-h-12 w-full font-normal`}>
            <option value="">เลือกระดับ</option>{RANK_OPTIONS.map((r: string) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-[var(--gt-ok)]" : "text-[var(--gt-bad)]"}`}>{msg.text}</p>}
      <button type="submit" disabled={!canEdit || busy} className="gt-cta-btn min-h-12 px-6 disabled:opacity-50">{busy ? "กำลังเพิ่ม…" : "เพิ่มนักเรียน"}</button>
    </form>
  );
}

export function Tracking({ ov, track, filters }: { ov: Overview; track: Track[] } & F) {
  const [mode,setMode] = useInstitutionDisplayMode("tracking");
  const [onlyMine,setOnlyMine] = useState(false);
  const [myStudentIds,setMyStudentIds] = useState<string[]>([]);
  useEffect(()=>{
    let active=true;
    void (async()=>{
      const db=staffDb();if(!db)return;
      const {data}=await db.rpc("gt_teacher_my_students_v1",{p_academy:ov.academy.id});
      if(active)setMyStudentIds(data?.ok?(data.items??[]).map((x:{id:string})=>x.id):[]);
    })();
    return()=>{active=false;};
  },[ov.academy.id]);
  const visibleTrack=useMemo(()=>onlyMine?track.filter(t=>myStudentIds.includes(t.athlete_id)):track,[track,myStudentIds,onlyMine]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const liveCard = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => visibleTrack.filter(t => {
    const student = ov.students.find(s => s.id === t.athlete_id);
    const matches = `${student?.name ?? ""} ${student?.nickname ?? ""} ${t.title} ${t.division}`.toLowerCase().includes(query.trim().toLowerCase());
    return matches && (status === "all" || t.outcome === status);
  }), [visibleTrack, ov.students, query, status]);
  const pending = visibleTrack.filter(t => t.outcome === "pending").length;
  const wins = visibleTrack.filter(t => t.outcome === "win").length;
  const names = new Set(visibleTrack.map(t => t.athlete_id)).size;
  const keyOf = (t: Track) => `${t.athlete_id}:${t.division_id}`;
  const chosen = rows.find(t => keyOf(t) === selected) ?? rows[0];
  const athlete = ov.students.find(s => s.id === chosen?.athlete_id);
  return (
    <div className="space-y-4">
      <SectionTitle right={filters}>{ov.academy.name} · ติดตามนักกีฬา</SectionTitle>
      <p className="text-sm text-[var(--gt-muted)]">ติดตามนักกีฬาในสังกัดทั้งหมดด้วยข้อมูลเดียวกับ GO FAN · เลือกรายชื่อเพื่อเปิดผลจับคู่ ผลการแข่งขัน และตารางอันดับจริง</p>
      <div role="group" aria-label="เลือกนักกีฬาที่ต้องการติดตาม" className="inline-flex flex-wrap gap-2 rounded-xl border-2 border-[#b9cfea] bg-white p-2 text-sm font-bold">
        <button type="button" aria-pressed={!onlyMine} onClick={()=>setOnlyMine(false)} className={`rounded-lg px-4 py-2 ${!onlyMine?"bg-[#0a5fbd] text-white":"bg-[#f2f7ff] text-[#164c88]"}`}>นักกีฬาทั้งสถาบัน</button>
        <button type="button" aria-pressed={onlyMine} onClick={()=>setOnlyMine(true)} className={`rounded-lg px-4 py-2 ${onlyMine?"bg-[#0a5fbd] text-white":"bg-[#f2f7ff] text-[#164c88]"}`}>นักเรียนที่ฉันสอน ({myStudentIds.length})</button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[["นักกีฬาในรายการ", names], ["รอผลแข่งขัน", pending], ["ผลชนะล่าสุด", wins]].map(([label, value]) => (
          <div key={String(label)} className="gt-card rounded-2xl border-2 border-[var(--gt-line)] p-3 text-center sm:p-5">
            <strong className="gt-num block text-2xl text-[var(--gt-cta)] sm:text-3xl">{value}</strong>
            <span className="text-xs text-[var(--gt-muted)] sm:text-sm">{label}</span>
          </div>
        ))}
      </div>
      <div className="gt-card space-y-3 border-2 border-[var(--gt-line)] p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">★ นักกีฬาของ {ov.academy.name} ({rows.length})</h3>
          <div className="flex flex-wrap items-center gap-2"><DisplayModeToggle mode={mode} onChange={setMode}/><Link href="/go-fan" className="gt-outline-btn inline-flex min-h-10 items-center px-3 text-sm">เปิด GO FAN</Link></div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="search" aria-label="ค้นหานักกีฬาในสถาบัน" className={inputCls} placeholder="ค้นหาชื่อนักกีฬา / รายการ / รุ่น" value={query} onChange={e => setQuery(e.target.value)} />
          <select aria-label="กรองผลแข่งขัน" className={selectCls} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">ทุกสถานะ</option><option value="pending">รอผล</option><option value="win">ชนะ</option><option value="loss">แพ้</option><option value="draw">เสมอ</option><option value="bye">บาย</option>
          </select>
        </div>
        {rows.length ? mode === "table" ? <div className="min-w-0 overflow-hidden rounded-xl border-2 border-[#bed2ed]"><table className="w-full table-fixed text-xs sm:text-sm"><thead className="bg-[#e8f2ff] text-[#133c77]"><tr><th className="px-3 py-3 text-left">นักกีฬา</th><th className="px-3 py-3 text-left">รายการ / รุ่น</th><th className="px-3 py-3">รอบ</th><th className="px-3 py-3">โต๊ะ</th><th className="px-3 py-3">ผล</th></tr></thead><tbody className="divide-y divide-[#d8e6f7]">{rows.map(t=><tr key={keyOf(t)} onClick={()=>setSelected(keyOf(t))} className={`cursor-pointer hover:bg-[#eef5ff] ${chosen===t?"bg-[#e6f0ff]":""}`}><td className="break-words px-2 py-3 text-left font-semibold sm:px-3">{ov.students.find(x=>x.id===t.athlete_id)?.name??"นักกีฬา"}{t.opponent&&<span className="block text-xs font-normal text-[#56708e]">พบ {t.opponent}</span>}</td><td className="break-words px-2 py-3 text-left sm:px-3">{t.title}<span className="block text-xs text-[#56708e]">{t.division}</span></td><td className="px-3 py-3 text-center">{t.round || "รอจับคู่"}</td><td className="px-3 py-3 text-center">{t.outcome==="bye"?"—":t.board??"รอประกาศ"}</td><td className="px-3 py-3 text-center"><Chip tone={OUTCOME[t.outcome].tone as "win"}>{OUTCOME[t.outcome].label}</Chip></td></tr>)}</tbody></table></div> : <div className="grid gap-2 sm:grid-cols-2">
          {rows.map(t => {
            const s = ov.students.find(x => x.id === t.athlete_id);
            const active = chosen ? keyOf(chosen) === keyOf(t) : false;
            return <button key={keyOf(t)} type="button" onClick={() => setSelected(keyOf(t))}
              aria-pressed={active} className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border-2 p-3 text-left transition active:scale-[.99] ${active ? "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)]" : "border-[var(--gt-line)] hover:border-[var(--gt-cta)]"}`}>
              <div className="min-w-0"><strong className="block truncate">{s?.name ?? "นักกีฬา"}</strong><span className="block truncate text-xs text-[var(--gt-muted)]">{t.title} · {t.division}</span><span className="text-xs">{t.round ? `รอบ ${t.round}` : "รอจับคู่"}{t.outcome === "bye" ? " · ได้บาย" : ` · โต๊ะ ${t.board ?? "รอประกาศ"}`}</span>{t.opponent && <span className="block truncate text-xs text-[var(--gt-muted)]">พบ {t.opponent}</span>}</div>
              <Chip tone={OUTCOME[t.outcome].tone as "win"}>{OUTCOME[t.outcome].label}</Chip>
            </button>;
          })}
        </div> : <Empty>ไม่พบนักกีฬาในช่วงเวลาหรือเงื่อนไขที่เลือก</Empty>}
      </div>
      {chosen && athlete && <section className="gt-card space-y-4 border-2 border-[var(--gt-cta)] p-4 sm:p-6">
        <div ref={liveCard} className="-m-2 space-y-4 rounded-xl bg-white p-2">
        <p className="text-xs font-bold text-[var(--gt-muted)]">{ov.academy.name} · ติดตามผลการแข่งขัน</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold">{athlete.name}</h3>
          <Chip tone={OUTCOME[chosen.outcome].tone as "win"}>{OUTCOME[chosen.outcome].label}</Chip>
        </div>
        <p className="text-sm text-[var(--gt-muted)]">{chosen.title} · {chosen.division}</p>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-[var(--gt-cta-soft)] p-3 text-center sm:gap-3 sm:p-4">
          <div><b className="gt-num block text-xl sm:text-2xl">{chosen.round ? `รอบ ${chosen.round}` : "รอจับคู่"}</b><span className="text-xs text-[var(--gt-muted)]">รอบล่าสุด</span></div>
          <div><b className="gt-num block text-xl sm:text-2xl">{chosen.outcome === "bye" ? "บาย" : chosen.board ? `โต๊ะ ${chosen.board}` : "รอประกาศ"}</b><span className="text-xs text-[var(--gt-muted)]">โต๊ะแข่งขัน</span></div>
          <div><b className="gt-num block text-xl sm:text-2xl">{chosen.points != null ? formatPoints(chosen.points) : "—"}</b><span className="text-xs text-[var(--gt-muted)]">คะแนนรวม</span></div>
        </div>
        {chosen.rounds?.length ? <RoundList rounds={chosen.rounds} /> : null}
        </div>
        <ShareSave target={liveCard} filename={`${athlete.name} ${chosen.title}`}
          text={`${athlete.name} (${ov.academy.name}) · ${chosen.title} ${chosen.division}${chosen.round ? ` · รอบ ${chosen.round} ${OUTCOME[chosen.outcome].label}` : ""}${chosen.points != null ? ` · คะแนนรวม ${formatPoints(chosen.points)}` : ""}`}
          url={`/go-fan?event=${encodeURIComponent(chosen.tournament_id)}&search=${encodeURIComponent(athlete.name)}`} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href={`/go-fan?event=${encodeURIComponent(chosen.tournament_id)}&search=${encodeURIComponent(athlete.name)}`} className="gt-cta-btn flex min-h-12 items-center justify-center px-4 text-center">★ ดูผลจับคู่และอันดับใน GO FAN</Link>
          <Link href={`/athletes/${athlete.id}`} className="gt-outline-btn flex min-h-12 items-center justify-center px-4 text-center">ดูประวัติและพัฒนาการนักกีฬา</Link>
        </div>
        <p className="text-xs text-[var(--gt-muted)]">ผลและคู่แข่งขันอ้างอิงข้อมูลจริงจากระบบ GO FAN ไม่มีการจำลองคะแนนหรืออันดับ</p>
      </section>}
    </div>
  );
}

function formatPoints(n: number) {
  const whole = Math.floor(n);
  return n - whole === 0.5 ? (whole ? `${whole}½` : "½") : String(n);
}

/** Every round of one student in one division: who they played, colour, board and result. */
function RoundList({ rounds }: { rounds: TrackRound[] }) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-[#bed2ed]">
      <table className="w-full table-fixed text-left text-xs sm:text-sm">
        <colgroup><col className="w-[3.25rem] sm:w-16" /><col /><col className="w-[3.25rem] sm:w-16" /><col className="w-[4rem] sm:w-20" /></colgroup>
        <thead className="bg-[#e8f2ff] text-[#133c77]"><tr><th className="px-2 py-2 text-center">รอบ</th><th className="px-2 py-2">คู่แข่ง</th><th className="px-2 py-2 text-center">โต๊ะ</th><th className="px-2 py-2 text-center">ผล</th></tr></thead>
        <tbody className="divide-y divide-[#d8e6f7]">
          {[...rounds].reverse().map(r => (
            <tr key={r.round}>
              <td className="gt-num px-2 py-2 text-center">{r.round}</td>
              <td className="break-words px-2 py-2">{r.outcome === "bye" ? <span className="text-[var(--gt-muted)]">ไม่มีคู่ (ได้บาย)</span> : <>
                {r.colour && <span aria-label={r.colour === "black" ? "ถือดำ" : "ถือขาว"} title={r.colour === "black" ? "ถือดำ" : "ถือขาว"} className={`mr-1.5 inline-block h-3 w-3 rounded-full border border-[#1b2a3d] align-middle ${r.colour === "black" ? "bg-[#1b2a3d]" : "bg-white"}`} />}
                {r.opponent_id ? <Link href={`/athletes/${r.opponent_id}`} className="hover:underline">{r.opponent ?? "คู่แข่ง"}</Link> : (r.opponent ?? "—")}
              </>}</td>
              <td className="gt-num px-2 py-2 text-center">{r.board ?? "—"}</td>
              <td className="px-2 py-2 text-center"><Chip tone={OUTCOME[r.outcome].tone as "win"}>{OUTCOME[r.outcome].label}</Chip></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Awards({ ov, records, filters }: { ov: Overview; records: Rec[] } & F) {
  const [mode,setMode] = useInstitutionDisplayMode("awards");
  const list = achievements(records, ov.students);
  const medal = (p: number) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : "");
  return (
    <div className="space-y-4">
      <SectionTitle right={filters}>ผลงาน</SectionTitle>
      <div className="flex justify-end"><DisplayModeToggle mode={mode} onChange={setMode}/></div>
      {list.length ? mode === "table" ? <div className="overflow-x-auto rounded-xl border-2 border-[#bcd1e9] bg-white"><table className="w-full min-w-[38rem] text-left text-sm"><thead className="bg-[#e8f2ff]"><tr><th className="px-4 py-3">อันดับ</th><th className="px-4 py-3">นักกีฬา</th><th className="px-4 py-3">รายการ / รุ่น</th><th className="px-4 py-3">ผล</th></tr></thead><tbody className="divide-y divide-[#d9e6f6]">{list.map(r=><tr key={`${r.athlete_id}-${r.division_id}`}><td className="px-4 py-3 font-bold">{medal(r.pos)||`#${r.pos}`}</td><td className="px-4 py-3"><StudentName s={r.student}/></td><td className="px-4 py-3">{r.title} · {r.division}</td><td className="px-4 py-3">{r.label} · ชนะ {r.wins}/{r.games}</td></tr>)}</tbody></table></div> : (
        <ul className="space-y-2.5">
          {list.map((r) => (
            <li key={`${r.athlete_id}-${r.division_id}`} className={`gt-card flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap ${r.pos <= 3 ? "border-[var(--gt-gold)]" : ""}`}>
              <span className="grid w-12 shrink-0 place-items-center text-2xl" aria-hidden="true">{medal(r.pos) || <span className="text-base font-semibold text-[var(--gt-muted)]">#{r.pos}</span>}</span>
              <div className="min-w-0 flex-1"><StudentName s={r.student} sub={`${r.title} · ${r.division}`} /></div>
              <div className="ml-auto text-right">
                <p className={`font-semibold ${r.pos <= 3 ? "text-[var(--gt-gold-ink)]" : ""}`}>{r.label}</p>
                <p className="text-xs text-[var(--gt-muted)]">จาก {r.field ?? "–"} คน · ชนะ {r.wins}/{r.games}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : <Empty>ยังไม่มีอันดับในช่วงที่เลือก (อันดับขึ้นเมื่อมีผลการแข่งขันที่ยืนยันแล้ว)</Empty>}
      <p className="text-xs text-[var(--gt-muted)]">ใบประกาศดาวน์โหลดได้จากหน้าผลการแข่งขันของแต่ละรายการเมื่อผู้จัดออกใบประกาศแล้ว</p>
    </div>
  );
}

export function Stats({ ov, records, filters }: { ov: Overview; records: Rec[] } & F) {
  const [mode,setMode] = useInstitutionDisplayMode("stats");
  const [open, setOpen] = useOpenStudent();
  const board = useRef<HTMLDivElement>(null);
  const rows = rankStats(studentStats(records, ov.students));
  const t = totals(records, ov.students);
  const pct = t.games ? Math.round((t.wins / t.games) * 100) : 0;
  const chosen = rows.find((r) => r.student.id === open);
  if (chosen) return <StudentPanel academyId={ov.academy.id} academyName={ov.academy.name} student={chosen.student} records={ov.records} rank={chosen.rank} onClose={() => setOpen(null)} />;
  const medal = (n: number | null) => (n === 1 ? "🥇" : n === 2 ? "🥈" : n === 3 ? "🥉" : n ? String(n) : "–");
  const pick = (id: string) => setOpen(id);
  const top = rows.filter((r) => r.rank).slice(0, 3).map((r) => `${r.rank}. ${r.student.name} ${r.rate}%`).join("\n");
  return (
    <div className="space-y-4">
      <SectionTitle right={filters}>อันดับและสถิติพัฒนาการ</SectionTitle>
      <p className="text-sm text-[var(--gt-muted)]">เรียงตามอัตราชนะ แล้วจำนวนเกม · แตะชื่อนักเรียนเพื่อดูกราฟการเติบโตและประวัติการแข่งขันว่าเจอกับใครมาบ้าง</p>
      <div ref={board} className="-m-2 space-y-3 rounded-xl bg-white p-2">
      <div className="gt-card flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
        <p className="text-sm text-[var(--gt-muted)]">ทั้งสถาบัน · {ov.academy.name}</p>
        <p><b className="gt-num text-2xl">{t.games}</b> เกม</p>
        <p className="text-[var(--gt-win-ink)]">ชนะ <b className="gt-num text-2xl">{t.wins}</b></p>
        <p className="text-[var(--gt-loss-ink)]">แพ้ <b className="gt-num text-2xl">{t.losses}</b></p>
        {t.draws > 0 && <p>เสมอ <b className="gt-num text-2xl">{t.draws}</b></p>}
        <p>อัตราชนะ <b className="gt-num text-2xl">{pct}%</b></p>
      </div>
      <div className="flex justify-end" data-export-ignore="true"><DisplayModeToggle mode={mode} onChange={setMode}/></div>
      {mode === "cards" ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map(r=><button type="button" onClick={()=>pick(r.student.id)} key={r.student.id} className="gt-card space-y-3 border-2 border-[#bcd1e9] p-4 text-left transition hover:border-[var(--gt-cta)] active:scale-[.99]"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--gt-cta-soft)] text-lg font-black text-[var(--gt-cta)]">{medal(r.rank)}</span><StudentRow s={r.student}/></div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-[#edf5ff] p-2"><strong className="gt-num block text-xl">{r.games}</strong><span className="text-xs">เกม</span></div><div className="rounded-lg bg-[#e6f7ec] p-2"><strong className="gt-num block text-xl text-[#176738]">{r.wins}</strong><span className="text-xs">ชนะ</span></div><div className="rounded-lg bg-[#fff0f1] p-2"><strong className="gt-num block text-xl text-[#a42841]">{r.losses}</strong><span className="text-xs">แพ้</span></div></div><div className="flex justify-between text-sm"><span>{r.events} รายการ</span><b>อัตราชนะ {r.rate == null ? "—" : `${r.rate}%`}</b></div><div className="h-2 overflow-hidden rounded-full bg-[#e8edf6]"><div className="h-full rounded-full bg-[#1770d5]" style={{width:`${r.rate??0}%`}}/></div></button>)}{!rows.length&&<Empty>ยังไม่มีนักเรียน</Empty>}</div> : <div className="gt-card min-w-0 overflow-hidden">
        <table className="w-full table-fixed text-left text-xs sm:text-sm">
          <colgroup><col className="w-10 sm:w-14" /><col /><col className="w-10 sm:w-14" /><col className="w-10 sm:w-14" /><col className="w-10 sm:w-14" /><col className="w-[26%]" /></colgroup>
          <thead className="bg-[var(--gt-cta-soft)]"><tr>
            <th className="px-1 py-2.5 text-center font-medium">ที่</th><th className="px-2 py-2.5 font-medium">นักเรียน</th><th className="px-1 py-2.5 text-center font-medium">เกม</th>
            <th className="px-1 py-2.5 text-center font-medium">ชนะ</th><th className="px-1 py-2.5 text-center font-medium">แพ้</th><th className="px-2 py-2.5 font-medium">อัตราชนะ</th>
          </tr></thead>
          <tbody className="divide-y divide-[var(--gt-line)]">
            {rows.map((r) => (
              <tr key={r.student.id} onClick={() => pick(r.student.id)} className="cursor-pointer hover:bg-[#f2f7ff]">
                <td className="gt-num px-1 text-center text-base font-bold">{medal(r.rank)}</td>
                <td className="px-2 py-2"><button type="button" onClick={(e) => { e.stopPropagation(); pick(r.student.id); }} className="w-full text-left"><StudentRow s={r.student} sub={`${r.events} รายการ`} /></button></td>
                <td className="gt-num px-1 text-center">{r.games}</td>
                <td className="gt-num px-1 text-center text-[var(--gt-win-ink)]">{r.wins}</td><td className="gt-num px-1 text-center text-[var(--gt-loss-ink)]">{r.losses}</td>
                <td className="px-2">
                  {r.rate == null ? <span className="text-[var(--gt-muted)]">—</span> : (
                    <span className="flex items-center gap-1.5">
                      <span className="hidden h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--gt-loss-bg)] sm:block" role="img" aria-label={`ชนะ ${r.rate}%`}>
                        <span className="block h-full rounded-full bg-[var(--gt-ok)]" style={{ width: `${r.rate}%` }} />
                      </span>
                      <span className="gt-num font-semibold sm:w-11 sm:text-right">{r.rate}%</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="p-4"><Empty>ยังไม่มีนักเรียน</Empty></div>}
      </div>}
      </div>
      {rows.some((r) => r.rank) && <ShareSave target={board} filename={`อันดับนักเรียน ${ov.academy.name}`} text={`อันดับนักเรียน ${ov.academy.name}\n${top}`} url="/institution?v=stats" />}
    </div>
  );
}

/** Photo + name without a link (the whole row opens the student panel). */
function StudentRow({ s, sub }: { s: Student; sub?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar src={s.photo} className="h-9 w-9 shrink-0" />
      <span className="min-w-0"><span className="block break-words font-semibold leading-snug">{s.name}</span>{(sub || s.rank) && <span className="block truncate text-xs text-[var(--gt-muted)]">{sub ?? s.rank}</span>}</span>
    </span>
  );
}

export function Reports({ ov, records, filters }: { ov: Overview; records: Rec[] } & F) {
  const [mode,setMode] = useInstitutionDisplayMode("reports");
  const rows = studentReport(records, ov.students);
  return (
    <div className="space-y-4">
      <SectionTitle right={filters}>รายงาน</SectionTitle>
      <p className="text-sm text-[var(--gt-muted)]">ผลล่าสุดและจุดเด่นของนักเรียนทุกคน · กดชื่อเพื่อดูประวัติ สถิติ และคู่แข่งรายคน</p>
      <section className="gt-card space-y-3 border-2 border-[var(--gt-line)] p-4 sm:p-5">
        <h3 className="text-lg font-bold">แนวโน้มการเติบโตจากการแข่งขัน</h3>
        <p className="text-xs text-[var(--gt-muted)]">เปรียบเทียบอัตราชนะของการแข่งขันสองรายการล่าสุดที่มีผลจริง ไม่ใช่ระดับฝีมือจากการสอบหรือคะแนน Elo</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ov.students.map(student => {
            const history = records.filter(r => r.athlete_id === student.id && r.games > 0)
              .sort((x,y) => String(y.date ?? "").localeCompare(String(x.date ?? "")));
            if (!history.length) return null;
            const now = history[0], before = history[1];
            const currentRate = Math.round(now.wins / now.games * 100);
            const previousRate = before ? Math.round(before.wins / before.games * 100) : null;
            const delta = previousRate == null ? null : currentRate - previousRate;
            return <div key={student.id} className="rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-3">
              <StudentName s={student} sub={now.title} small />
              <div className="mt-3 flex items-end justify-between gap-2"><span className="text-sm text-[var(--gt-muted)]">อัตราชนะล่าสุด</span><strong className="gt-num text-xl">{currentRate}%</strong></div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--gt-surface-2)]"><div className="h-full rounded-full bg-[var(--gt-cta)]" style={{width:`${currentRate}%`}} /></div>
              <p className={`mt-2 text-sm font-semibold ${delta != null && delta > 0 ? "text-[var(--gt-win-ink)]" : "text-[var(--gt-muted)]"}`}>
                {delta == null ? "ยังไม่มีผลครั้งก่อนให้เปรียบเทียบ" : delta > 0 ? `↑ เพิ่มขึ้น ${delta} จุดเปอร์เซ็นต์` : delta < 0 ? `↓ ลดลง ${Math.abs(delta)} จุดเปอร์เซ็นต์` : "เท่ากับรายการก่อน"}
              </p>
            </div>;
          })}
        </div>
      </section>
      <div className="flex justify-end"><DisplayModeToggle mode={mode} onChange={setMode}/></div>
      {mode === "cards" ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map(r=><div key={r.student.id} className="gt-card space-y-3 border-2 border-[#bcd1e9] p-4"><StudentName s={r.student} sub={r.student.rank}/><div className="rounded-lg bg-[#edf5ff] p-3 text-sm"><p className="font-semibold">{r.line}</p><p className="mt-1">{r.note}</p></div><p className="text-xs text-[var(--gt-muted)]">{r.latest ? `${r.latest.title} · ${r.latest.division}` : "ยังไม่มีผลแข่งขันล่าสุด"}</p></div>)}{!rows.length&&<Empty>ยังไม่มีนักเรียน</Empty>}</div> :
        <section className="gt-card overflow-hidden">{rows.length ? <ReportTable rows={rows} full /> : <div className="p-4"><Empty>ยังไม่มีนักเรียน</Empty></div>}</section>}
      <button type="button" onClick={() => window.print()} className="gt-outline-btn min-h-11 px-5 text-sm print:hidden">พิมพ์ / บันทึกเป็น PDF</button>
    </div>
  );
}
