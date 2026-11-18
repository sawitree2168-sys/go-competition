import EventOrganizer from "@/components/EventOrganizer";
import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { loadResults, type ResultPerson } from "@/lib/public-site";
import { thaiDate } from "@/lib/division-display";

export const revalidate = 60;
export const metadata: Metadata = { title: "ผลการแข่งขัน" };

const medal = (p: number | null) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : null);
const isUpcoming = (p: ResultPerson) => !!p.upcoming?.length;
/** Name looks like an upcoming entrant (same surname, spelt differently) but nobody has confirmed it is the same person. */
const isPending = (p: ResultPerson) => !isUpcoming(p) && !!p.pending?.length;

// ผลการแข่งขัน: recorded results of past events, by event and division. Every player when the whole standings sheet is on
// file; players who are also entered in an upcoming event get a ★ and a bold name (ครูเล็ก, 17 Nov 2026).
export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ only?: string; event?: string }> }) {
  const { only, event: selectedEvent } = await searchParams;
  const onlyUpcoming = only === "upcoming";
  const allEvents = await loadResults(publicDb());
  const events = selectedEvent ? allEvents.filter((e) => e.title === selectedEvent) : allEvents;
  const resultsHref = (upcoming: boolean) => {
    const params = new URLSearchParams();
    if (selectedEvent) params.set("event", selectedEvent);
    if (upcoming) params.set("only", "upcoming");
    return `/results${params.size ? `?${params}` : ""}`;
  };
  const upcomingTitles = [...new Set(events.flatMap((e) => e.divisions.flatMap((d) => d.people.flatMap((p) => p.upcoming ?? []))))];
  const upcomingLabel = upcomingTitles.join(" / ");

  return (
    <PublicPage icon="results" title="ผลการแข่งขัน" sub="อันดับและผลชนะ–แพ้ของทุกรุ่น จากผลการแข่งขันที่บันทึกไว้" current="/results">
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
                  {thaiDate(e.date) ?? "ไม่ระบุวันที่"} · {e.divisions.length} รุ่น · {e.complete ? `ผู้เข้าแข่งขันทั้งหมด ${all} คน` : `${all} คนที่บันทึกไว้`}
                  {marked > 0 && <> · <span className="font-semibold text-[var(--gt-chip-near-ink)]">★ สมัครครั้งนี้ {marked} คน</span></>}
                </p>
                <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
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
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-[var(--gt-muted)]">
                              <th className="w-14 px-3 py-2 font-medium">อันดับ</th>
                              <th className="py-2 font-medium">ชื่อ · สถาบัน</th>
                              <th className="px-3 py-2 text-right font-medium">ชนะ–แพ้</th>
                              {e.complete && <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">SOS</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {d.people.map((p) => {
                              const up = isUpcoming(p);
                              return (
                                <tr key={p.go_id} className={`border-t border-[var(--gt-line)] ${up ? "bg-[var(--gt-chip-near-bg)]" : ""}`}>
                                  <td className="gt-num px-3 py-2 align-top font-semibold">{medal(p.placing) ?? p.placing ?? "–"}</td>
                                  <td className="py-2 pr-2">
                                    <span className={`flex items-start gap-1.5 ${up ? "font-bold" : ""}`}>
                                      {up && <Star title={`สมัคร ${(p.upcoming ?? []).join(", ")}`} />}
                                      {p.athlete_id ? <Link href={`/athletes/${p.athlete_id}`} className="text-[var(--gt-cta)] underline">{p.full_name}</Link> : <span>{p.full_name}</span>}
                                    </span>
                                    {isPending(p) && <span className="mt-0.5 block"><Pending title={`ชื่อคล้ายผู้สมัคร ${(p.pending ?? []).join(", ")} รอยืนยันว่าเป็นคนเดียวกันหรือไม่`} /></span>}
                                    {p.institution && <span className={`block text-xs text-[var(--gt-muted)] ${up ? "pl-6" : ""}`}>{p.institution}</span>}
                                  </td>
                                  <td className="gt-num whitespace-nowrap px-3 py-2 text-right align-top">{p.wins}–{p.losses}{p.byes ? <span className="block text-xs text-[var(--gt-muted)]">บาย {p.byes}</span> : null}</td>
                                  {e.complete && <td className="gt-num hidden px-3 py-2 text-right align-top text-[var(--gt-muted)] sm:table-cell">{p.sos ?? "–"}</td>}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </details>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="gt-card mt-5 p-6 text-center text-[var(--gt-muted)]">ยังไม่มีผลการแข่งขันที่บันทึกไว้</p>
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
