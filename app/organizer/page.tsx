"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Gate from "./_lib/Gate";
import { isPlatformAdmin, staffDb, useStaff } from "./_lib/staff";
import { thaiDate } from "@/lib/division-display";

type Row = { id: string; title: string; event_date: string | null; published: boolean; organizer_id: string | null; gt_organizers: { name: string } | null };

export default function OrganizerHome() {
  return <Gate><EventList /></Gate>;
}

function EventList() {
  const staff = useStaff();
  const platform = isPlatformAdmin(staff);
  const orgIds = staff.status === "staff" ? staff.organizers.filter((o) => o.status === "active").map((o) => o.id) : [];
  const orgKey = orgIds.join(",");
  const eventKey = staff.status === "staff" ? staff.eventIds.join(",") : "";
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (staff.status !== "staff") return;
    // Published events are readable by everyone, so an organiser's list is limited to their own organisers' events.
    let q = staffDb()!.from("gt_tournaments").select("id,title,event_date,published,organizer_id,gt_organizers(name)")
      .order("event_date", { ascending: false, nullsFirst: false });
    if (!platform) {
      const ids = orgKey ? orgKey.split(",") : ["00000000-0000-0000-0000-000000000000"];
      q = eventKey ? q.or(`organizer_id.in.(${ids.join(",")}),id.in.(${eventKey})`) : q.in("organizer_id", ids);
    }
    q.then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  }, [staff.status, platform, orgKey, eventKey]);

  const groups = new Map<string, Row[]>();
  for (const r of rows ?? []) {
    const k = r.gt_organizers?.name ?? "ยังไม่ระบุผู้จัด";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">เลือกรายการแข่งขัน</h1>
        {platform && <Link href="/organizer/platform" className="gt-outline-btn inline-flex min-h-11 items-center px-3 text-sm">จัดการผู้จัดงาน</Link>}
      </div>
      {rows === null && <p className="text-[var(--gt-muted)]">กำลังโหลด…</p>}
      {rows?.length === 0 && <p className="text-[var(--gt-muted)]">ยังไม่มีรายการแข่งขัน</p>}
      {[...groups].map(([org, list]) => (
        <div key={org} className="space-y-2">
          {(platform || groups.size > 1) && <h2 className="text-sm font-semibold text-[var(--gt-muted)]">ผู้จัด: {org}</h2>}
          <ul className="space-y-2">
            {list.map((t) => (
              <li key={t.id}>
                <Link href={`/organizer/${t.id}`} className="gt-card gt-row flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{t.title}</span>
                    <span className="text-sm text-[var(--gt-muted)]">{thaiDate(t.event_date) ?? "ยังไม่กำหนดวัน"}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${t.published ? "gt-pill-gold" : "border border-[var(--gt-line)] text-[var(--gt-muted)]"}`}>
                    {t.published ? "เผยแพร่แล้ว" : "ยังไม่เผยแพร่"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
