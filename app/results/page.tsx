import {filterAthleteResults} from "@/lib/athlete-results.mjs";
import NewsDivisionResults from "@/components/NewsDivisionResults";
import {loadNewsWall} from "@/lib/news-wall";
import EventOrganizer from "@/components/EventOrganizer";
import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { loadResults, type ResultPerson } from "@/lib/public-site";
import { thaiDate } from "@/lib/division-display";

export const revalidate = 60;
export const metadata: Metadata = { title: "ผลการแข่งขัน" };

const isUpcoming = (p: ResultPerson) => !!p.upcoming?.length;
/** Name looks like an upcoming entrant (same surname, spelt differently) but nobody has confirmed it is the same person. */
const isPending = (p: ResultPerson) => !isUpcoming(p) && !!p.pending?.length;

// ผลการแข่งขัน: recorded results of past events, by event and division. Every player when the whole standings sheet is on
// file; players who are also entered in an upcoming event get a ★ and a bold name (ครูเล็ก, 17 Nov 2026).
export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ only?: string; event?: string; q?:string; go_id?:string }> }) {
  const { only, event: selectedEvent, q:athleteName, go_id:goId } = await searchParams;
  const onlyUpcoming = only === "upcoming";
  const allEvents = filterAthleteResults(await loadResults(publicDb()),{goId:goId??"",name:athleteName??""}) as Awaited<ReturnType<typeof loadResults>>;
  const events = selectedEvent ? allEvents.filter((e) => e.title === selectedEvent) : allEvents;
  const walls=new Map(await Promise.all(events.map(async e=>[`${e.title}|${e.date}`,await loadNewsWall(e.title,e.date)] as const)));
  const resultsHref = (upcoming: boolean) => {
    const params = new URLSearchParams();
    if(athleteName)params.set("q",athleteName);
    if(goId)params.set("go_id",goId);
    if (selectedEvent) params.set("event", selectedEvent);
    if (upcoming) params.set("only", "upcoming");
    return `/results${params.size ? `?${params}` : ""}`;
  };
  const upcomingTitles = [...new Set(events.flatMap((e) => e.divisions.flatMap((d) => d.people.flatMap((p) => p.upcoming ?? []))))];
  const upcomingLabel = upcomingTitles.join(" / ");

  return (
    <PublicPage icon="results" title="ผลการแข่งขัน" sub="อันดับและผลชนะ–แพ้ของทุกรุ่น จากผลการแข่งขันที่บันทึกไว้" current="/results">
      <Link href="/results/history" className="gt-card mb-4 block border-l-4 border-blue-600 p-4 font-bold text-blue-900">ดูวอลล์ลิสต์ย้อนหลังทุกรายการ (ผลรายรอบ · SOS · SOSOS) →</Link>
      {(athleteName||goId)&&<div className="gt-card mb-4 p-5"><h2 className="text-xl font-bold">ผลงานของ {athleteName||goId}</h2><p>{goId} · {events.length} รายการที่มีผลเผยแพร่ในระบบ</p><Link href="/athletes" className="text-blue-800 underline">กลับรายชื่อนักกีฬา</Link></div>}
      <div className="flex flex-wrap gap-2">
        {selectedEvent && <Link href="/results" className="gt-outline-btn inline-flex min-h-11 items-center px-4 font-semibold">ผลการแข่งขันทุกรายการ</Link>}
        <Link href="/tournaments?status=finished" className="gt-outline-btn inline-flex min-h-11 items-center px-4 font-semibold">รายการที่จบการแข่งขัน →</Link>
      </div>

      {upcomingTitles.length > 0 && (
        <div className="gt-card mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="flex items-center gap-2 text-sm">
            <Star />
            <span><b>ชื่อตัวหนา + ดาว</b> = สมัครแข่ง <b>{upcomingLabel}</b> ด้วย
              <span className="block text-[var(--gt-muted)]"><Pending /> รอยืนยันตัวตน = นามสกุลตรงกับผู้สมัครแต่ชื่อสะกดต่างกัน รอผู้สมัครหรือผู้จัดยืนยัน</span></span>
          </p>
          <div className="gt-tabs flex gap-1 rounded-full p-1 text-sm" aria-label="เลือกการแสดงผล">
            <Link href={resultsHref(false)} aria-current={onlyUpcoming ? undefined : "page"} className="inline-flex min-h-10 items-center rounded-full px-4 font-semibold">ทุกคน</Link>
            <Link href={resultsHref(true)} aria-current={onlyUpcoming ? "page" : undefined} className="inline-flex min-h-10 items-center rounded-full px-4 font-semibold">เฉพาะผู้สมัครครั้งนี้</Link>
          </div>
        </div>
      )}

      {events.length ? (
        <div className="mt-5 space-y-8">
          {events.map((e) => {
            const all = e.divisions.reduce((s, d) => s + d.people.length, 0);
            const marked = e.divisions.reduce((s, d) => s + d.people.filter(isUpcoming).length, 0);
            const divisions = onlyUpcoming
              ? e.divisions.map((d) => ({ ...d, people: d.people.filter(isUpcoming) })).filter((d) => d.people.length)
              : e.divisions;
            if (onlyUpcoming && !divisions.length) return null;
            return (
              <section key={e.title} id={encodeURIComponent(e.title)} className="scroll-mt-4">
                <h2 className="text-xl font-bold">{e.title}</h2>
                <EventOrganizer title={e.title} />
                <p className="text-sm text-[var(--gt-muted)]">
                  {thaiDate(e.date) ?? "ไม่ระบุวันที่"} · {e.divisions.length} รุ่น · {athleteName||goId ? `แสดงผลงานเฉพาะนักกีฬาที่เลือก ${all} คน` : e.complete ? `ผู้เข้าแข่งขันทั้งหมด ${all} คน` : `${all} คนที่บันทึกไว้`}
                  {marked > 0 && <> · <span className="font-semibold text-[var(--gt-chip-near-ink)]">★ สมัครครั้งนี้ {marked} คน</span></>}
                </p>
                <div className="mt-3 space-y-4">
                  {divisions.map((d) => {
                    const m = d.people.filter(isUpcoming).length;
                    return (
                      <details key={d.division} className="gt-card overflow-hidden" open={onlyUpcoming || divisions.length <= 2}>
                        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 bg-[var(--gt-table-head)] px-4 py-2 font-semibold text-white">
                          <span>{d.division}</span>
                          <span className="flex items-center gap-2 text-sm font-normal">
                            {m > 0 && !onlyUpcoming && <span className="rounded-full bg-[var(--gt-chip-near-bg)] px-2 py-0.5 font-semibold text-[var(--gt-chip-near-ink)]">★ {m}</span>}
                            <span className="opacity-80">{d.people.length} คน</span>
                          </span>
                        </summary>
                        <NewsDivisionResults showAwards={false} story={{id:`${e.title}::${d.division}`,title:"สรุปผลการแข่งขัน",event:e.title,date:e.date,division:d.division,complete:!!e.complete,kind:"results",body:"",href:"",poster:"",people:d.people}} games={walls.get(`${e.title}|${e.date}`)?.games??[]} unavailable={walls.get(`${e.title}|${e.date}`)?.unavailable??false}/>

                      </details>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="gt-card mt-5 p-6 text-center text-[var(--gt-muted)]">{athleteName||goId ? "ยังไม่มีผลงานที่เผยแพร่ของนักกีฬาคนนี้ในระบบ" : "ยังไม่มีผลการแข่งขันที่บันทึกไว้"}</p>
      )}
    </PublicPage>
  );
}

function Pending({ title }: { title?: string }) {
  return (
    <span title={title} className="inline-flex items-center rounded-full border border-dashed border-[var(--gt-chip-near-line)] px-2 py-px text-xs font-semibold text-[var(--gt-chip-near-ink)]">
      ? รอยืนยันตัวตน
    </span>
  );
}

function Star({ title }: { title?: string }) {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gt-chip-near-ink)]" fill="currentColor" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d="m12 2.8 2.8 5.7 6.3.9-4.55 4.43 1.07 6.27L12 17.1l-5.62 2.96 1.07-6.27L2.9 9.4l6.3-.9z" />
    </svg>
  );
}
