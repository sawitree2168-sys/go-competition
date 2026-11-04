"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Gate from "./_lib/Gate";
import { staffDb, useStaff } from "./_lib/staff";
import { thaiDate } from "@/lib/division-display";

type Row = { id: string; title: string; event_date: string | null; published: boolean };

export default function OrganizerHome() {
  return <Gate><EventList /></Gate>;
}

function EventList() {
  const staff = useStaff();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (staff.status !== "staff") return;
    staffDb()!.from("gt_tournaments").select("id,title,event_date,published").order("event_date", { ascending: false, nullsFirst: false })
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [staff.status]);

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-bold">เลือกรายการแข่งขัน</h1>
      {rows === null && <p className="text-[var(--gt-muted)]">กำลังโหลด…</p>}
      {rows?.length === 0 && <p className="text-[var(--gt-muted)]">ยังไม่มีรายการแข่งขัน</p>}
      <ul className="space-y-2">
        {rows?.map((t) => (
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
    </section>
  );
}
