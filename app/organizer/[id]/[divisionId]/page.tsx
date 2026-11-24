"use client";

import Monitor from "../../_lib/division/Monitor";
import PreparedRoster from "../../_lib/division/PreparedRoster";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { divisionSound } from "@/lib/sound-events.mjs";
import { play } from "@/lib/sounds";
import Gate from "../../_lib/Gate";
import TestMode from "../../_lib/TestMode";
import { useDivision } from "../../_lib/division/useDivision";
import PoolsPanel from "../../_lib/division/PoolsPanel";
import RoundsPanel from "../../_lib/division/RoundsPanel";
import StandingsPanel from "../../_lib/division/StandingsPanel";
import { divisionLabel } from "@/lib/division-display";
import { clock } from "../../../tournaments/[id]/_ui/live";

// 4 แท็บ แถวเดียวบนมือถือ (รายชื่อรวมอยู่ในแท็บสาย) · old links ?tab=entrants still open "pools"
type Tab = "monitor" | "rounds" | "pools" | "standings";
const TABS: [Tab, string][] = [["monitor", "มอนิเตอร์"], ["rounds", "จับคู่ / ลงผล"], ["pools", "รายชื่อ / สาย"], ["standings", "คะแนน"]];
const asTab = (t: string | null): Tab | null => (t === "entrants" ? "pools" : TABS.some(([k]) => k === t) ? (t as Tab) : null);

export default function OrganizerDivision({ params }: { params: Promise<{ id: string; divisionId: string }> }) {
  const { id, divisionId } = use(params);
  return <Gate><Console eventId={id} divisionId={divisionId} /></Gate>;
}

function Console({ eventId, divisionId }: { eventId: string; divisionId: string }) {
  const { data, missing, reload, live } = useDivision(divisionId);
  const [tab, setTab] = useState<Tab | null>("monitor");
  // the table tapped on the monitor (ลงผล ›): the rounds tab opens at that table
  const [focus, setFocus] = useState<string | null>(null);
  const openTab = (t: Tab) => { setFocus(null); setTab(t); };
  // เสียง: เช็คอิน / ลงผลมีคนชนะ (whoever entered it: admin or a line referee). Uses the 🔔 switch in the alert bar.
  const prevMatches = useRef<typeof data extends null ? never : NonNullable<typeof data>["matches"] | null>(null);
  useEffect(() => {
    if (!data) return;
    const kind = divisionSound(prevMatches.current, data.matches);
    if (kind) play(kind, { unlessRecent: true });
    prevMatches.current = data.matches;
  }, [data]);
  // โต๊ะกรรมการ (all divisions) links here with ?tab=rounds etc.
  useEffect(() => {
    const want = asTab(new URLSearchParams(window.location.search).get("tab"));
    if (want) queueMicrotask(() => setTab(want));
    // the alert bar asks for a tab while we are already on this page
    const onTab = (e: Event) => { const t = asTab((e as CustomEvent<string>).detail); if (t) { setFocus(null); setTab(t); } };
    window.addEventListener("gt-open-tab", onTab);
    return () => window.removeEventListener("gt-open-tab", onTab);
  }, []);

  if (missing) return <p className="py-10 text-center">ไม่พบรุ่นนี้</p>;
  if (!data) return <p className="py-10 text-center text-[var(--gt-muted)]">กำลังโหลด…</p>;
  if(data.division.tournament_id!==eventId)return <p role="alert">รุ่นนี้ไม่อยู่ในรายการที่เลือก</p>;
  const current: Tab = tab ?? (data.matches.length || data.byes.length ? "rounds" : "pools");

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/organizer/${eventId}`} className="text-sm text-[var(--gt-muted)] underline-offset-2 hover:underline">← โต๊ะกรรมการ · ทุกรุ่น</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-bold">{divisionLabel(data.division.name)}</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${live.offline ? "bg-[var(--gt-warn-soft)] text-[var(--gt-warn)]" : "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]"}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${live.offline ? "bg-[var(--gt-warn)]" : "animate-pulse bg-[var(--gt-ok)]"}`} />
            {live.offline ? "ขาดการเชื่อมต่อ" : `สด · ตรวจล่าสุด ${clock(live.checkedAt)}`}
          </span>
          <a href={`/tournaments/${eventId}/divisions/${divisionId}?tab=pairs`} target="_blank" rel="noopener" className="text-sm text-[var(--gt-cta)] underline">ดูหน้าสาธารณะ ↗</a>
        </div>
      </div>
      <TestMode eventId={eventId} compact />
      <div role="tablist" aria-label="ขั้นตอน" className="gt-tabs grid grid-cols-4 gap-1 rounded-2xl border-2 border-[var(--gt-gold)] bg-[var(--gt-surface)] p-1.5 shadow-sm sm:gap-2 sm:p-2">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={current === k} onClick={() => openTab(k)} className="min-h-12 rounded-xl px-1 text-[13px] font-semibold leading-tight sm:text-sm">{label}</button>
        ))}
      </div>
      {data.regs.length === 0 && <PreparedRoster eventId={eventId} divisionId={divisionId} divisionName={data.division.name} />}
      {current === "monitor" && data.regs.length > 0 && <Monitor data={data} onResults={(id)=>{ setFocus(id); setTab("rounds"); }}/>}
      {current === "pools" && <PoolsPanel data={data} reload={reload} />}
      {current === "rounds" && data.regs.length > 0 && <RoundsPanel key={focus ?? "rounds"} data={data} reload={reload} eventId={eventId} focus={focus} />}
      {current === "standings" && data.regs.length > 0 && <StandingsPanel data={data} eventId={eventId} />}
    </div>
  );
}
