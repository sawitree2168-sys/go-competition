import type { Metadata } from "next";
import { Shell } from "../tournaments/[id]/_ui/chrome";
import SiteBar from "../tournaments/[id]/_ui/SiteBar";
import { publicDb } from "../tournaments/[id]/_ui/data";
import { divisionLabel, divisionSortValue } from "@/lib/division-display";
import MyApplications, { type DivisionOption } from "./MyApplications";

export const metadata: Metadata = { title: "สถานะการสมัคร" };
export const revalidate = 60;

/** Divisions of published events that take web sign-ups (the ones that can have an application). */
async function divisionOptions(): Promise<DivisionOption[]> {
  const db = publicDb();
  if (!db) return [];
  const { data: ev } = await db.from("gt_tournaments").select("id,title,event_date").eq("published", true).eq("registration_mode", "web")
    .order("event_date", { ascending: false }).limit(20);
  const events = (ev ?? []) as { id: string; title: string }[];
  if (!events.length) return [];
  const { data: dv } = await db.from("gt_divisions").select("id,name,tournament_id").in("tournament_id", events.map((e) => e.id));
  const divs = (dv ?? []) as { id: string; name: string; tournament_id: string }[];
  return events.flatMap((e) => divs.filter((d) => d.tournament_id === e.id)
    .sort((a, b) => divisionSortValue(a.name) - divisionSortValue(b.name))
    .map((d) => ({ id: d.id, name: divisionLabel(d.name), event: e.title })));
}

// สถานะการสมัคร: find an entry by name + division + phone, then withdraw / swap / change division under the organiser's conditions.
export default async function MyApplicationsPage({ searchParams }: { searchParams: Promise<{ name?: string; division?: string }> }) {
  const [{ name, division }, divisions] = await Promise.all([searchParams, divisionOptions()]);
  return (
    <Shell wide>
      <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar /></div>
      <main className="mx-auto max-w-2xl px-3 pt-5 sm:px-4">
        <h1 className="text-2xl font-bold sm:text-3xl">สถานะการสมัคร</h1>
        <p className="mt-1 text-[var(--gt-muted)]">ใบสมัครของคุณ พร้อมสถานะและรุ่นที่ลงไว้ · ขอถอนตัว เปลี่ยนคน หรือเปลี่ยนรุ่นได้ตามเงื่อนไขของผู้จัด</p>
        <MyApplications divisions={divisions} initialName={(name ?? "").slice(0, 120)} initialDivision={division ?? ""} />
      </main>
    </Shell>
  );
}
