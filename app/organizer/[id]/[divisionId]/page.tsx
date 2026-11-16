"use client";

import Link from "next/link";
import { use, useState } from "react";
import Gate from "../../_lib/Gate";
import { useDivision } from "../../_lib/division/useDivision";
import PoolsPanel from "../../_lib/division/PoolsPanel";
import RoundsPanel from "../../_lib/division/RoundsPanel";
import StandingsPanel from "../../_lib/division/StandingsPanel";
import { divisionLabel } from "@/lib/division-display";
import { clock } from "../../../tournaments/[id]/_ui/live";

type Tab = "pools" | "rounds" | "standings";
const TABS: [Tab, string][] = [["pools", "สาย"], ["rounds", "ออกคู่ / กรอกผล"], ["standings", "ตารางคะแนน"]];

export default function OrganizerDivision({ params }: { params: Promise<{ id: string; divisionId: string }> }) {
  const { id, divisionId } = use(params);
  return <Gate><Console eventId={id} divisionId={divisionId} /></Gate>;
}

function Console({ eventId, divisionId }: { eventId: string; divisionId: string }) {
  const { data, missing, reload, live } = useDivision(divisionId);
  const [tab, setTab] = useState<Tab | null>(null);

  if (missing) return <p className="py-10 text-center">ไม่พบรุ่นนี้</p>;
  if (!data) return <p className="py-10 text-center text-[var(--gt-muted)]">กำลังโหลด…</p>;
  const current: Tab = tab ?? (data.matches.length || data.byes.length ? "rounds" : "pools");

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/organizer/${eventId}`} className="text-sm text-[var(--gt-muted)] underline-offset-2 hover:underline">← ทุกรุ่น</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-bold">{divisionLabel(data.division.name)}</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${live.offline ? "bg-[var(--gt-warn-soft)] text-[var(--gt-warn)]" : "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]"}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${live.offline ? "bg-[var(--gt-warn)]" : "animate-pulse bg-[var(--gt-ok)]"}`} />
            {live.offline ? "ขาดการเชื่อมต่อ" : `สด · ตรวจล่าสุด ${clock(live.checkedAt)}`}
          </span>
          <a href={`/tournaments/${eventId}/divisions/${divisionId}?tab=pairs`} target="_blank" rel="noopener" className="text-sm text-[var(--gt-cta)] underline">ดูหน้าสาธารณะ ↗</a>
        </div>
      </div>
      <div role="tablist" aria-label="ขั้นตอน" className="gt-tabs grid grid-cols-3 gap-1 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-1">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={current === k} onClick={() => setTab(k)} className="min-h-11 rounded-xl px-2 text-sm font-semibold">{label}</button>
        ))}
      </div>
      {current === "pools" && <PoolsPanel data={data} reload={reload} />}
      {current === "rounds" && <RoundsPanel data={data} reload={reload} eventId={eventId} />}
      {current === "standings" && <StandingsPanel data={data} eventId={eventId} />}
    </div>
  );
}
