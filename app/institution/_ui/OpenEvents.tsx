"use client";

import { useEffect, useMemo, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { kyuOfRank, suggestDivision } from "@/lib/institution-portal.mjs";
import type { Application, Overview } from "./bits";

type Division = { id: string; name: string; fee: number | null; seats: number | null };
type OpenEvent = { id: string; title: string; date: string | null; close: string | null; divisions: Division[] };
const thDate = (d: string | null) => (d ? new Date(`${d}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }) : "");

/** Competitions open for entry, who has not entered yet, and the division that fits each student's kyu level. */
export default function OpenEvents({ ov, apps, onApply }: { ov: Overview; apps: Application[]; onApply: (eventId: string) => void }) {
  const [events, setEvents] = useState<OpenEvent[] | null>(null);
  useEffect(() => {
    staffDb()?.rpc("gt_open_events_v1").then(({ data }) => setEvents((data ?? []) as OpenEvent[]));
  }, []);
  const site = useMemo(() => ov.students.filter((s) => !s.history_only), [ov.students]);
  if (!events?.length) return null;
  return (
    <section className="gt-card space-y-3 p-4 sm:p-5" aria-labelledby="open-h">
      <h3 id="open-h" className="text-lg font-bold sm:text-xl">📅 งานที่เปิดรับสมัคร</h3>
      <ul className="space-y-3">
        {events.slice(0, 3).map((e) => {
          const entered = new Set(apps.filter((a) => a.tournament_id === e.id && a.status !== "rejected").map((a) => a.athlete_id));
          const left = site.filter((s) => !entered.has(s.id));
          const tips = left.map((s) => ({ s, d: suggestDivision(e.divisions, kyuOfRank(s.rank)) })).filter((x) => x.d).slice(0, 4);
          return (
            <li key={e.id} className="rounded-xl border-2 border-[#bcd1e9] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><b className="block break-words">{e.title}</b>
                  <span className="text-sm text-[var(--gt-muted)]">{thDate(e.date)}{e.close ? ` · ปิดรับ ${thDate(e.close)}` : ""}</span></div>
                <span className="shrink-0 rounded-full bg-[#fff3d6] px-2.5 py-1 text-xs font-bold text-[#7a540c]">ยังไม่สมัคร {left.length} คน</span>
              </div>
              {tips.length > 0 && <ul className="mt-2 space-y-1 text-sm">
                {tips.map(({ s, d }) => <li key={s.id} className="flex justify-between gap-2"><span className="min-w-0 truncate">{s.name} <span className="text-[var(--gt-muted)]">({s.rank})</span></span><span className="shrink-0 font-semibold text-[var(--gt-cta)]">→ {d!.name}</span></li>)}
              </ul>}
              <button type="button" onClick={() => onApply(e.id)} className="gt-cta-btn mt-3 min-h-11 w-full px-4 text-sm sm:w-auto">สมัครแบบกลุ่ม →</button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-[var(--gt-muted)]">รุ่นที่แนะนำดูจากระดับคิวในโปรไฟล์นักเรียน ครูเปลี่ยนได้ตอนสมัคร</p>
    </section>
  );
}
