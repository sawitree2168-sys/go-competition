/* eslint-disable @next/next/no-img-element -- poster URLs from Supabase Storage */
import Link from "next/link";
import type { Metadata } from "next";
import { Shell } from "../tournaments/[id]/_ui/chrome";
import SiteBar from "../tournaments/[id]/_ui/SiteBar";
import { publicDb } from "../tournaments/[id]/_ui/data";
import { thaiDate } from "@/lib/division-display";

export const revalidate = 30;
export const metadata: Metadata = { title: "สมัครแข่งขัน" };

type Row = { id: string; title: string; event_date: string | null; poster_url: string | null; venue: string | null;
  registration_mode: string | null; registration_open_date: string | null; registration_close_date: string | null };

// "สมัครแข่งขัน" on the home page: events taking entries now → each event's sign-up page.
export default async function RegisterIndex() {
  const db = publicDb();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  let rows: Row[] = [];
  if (db) {
    const { data } = await db.from("gt_tournaments")
      .select("id,title,event_date,poster_url,venue,registration_mode,registration_open_date,registration_close_date")
      .eq("published", true).in("registration_mode", ["web", "external"]).order("event_date", { ascending: true }).limit(50);
    rows = ((data ?? []) as Row[]).filter((r) => (!r.event_date || r.event_date >= today) && (!r.registration_close_date || r.registration_close_date >= today));
  }
  const status = (r: Row) => (r.registration_open_date && today < r.registration_open_date ? `เปิดรับสมัคร ${thaiDate(r.registration_open_date, "short")}` : r.registration_close_date ? `รับสมัครถึง ${thaiDate(r.registration_close_date, "short")}` : "เปิดรับสมัคร");

  return (
    <Shell wide>
      <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar current="/tournaments" /></div>
      <main className="mx-auto max-w-4xl px-3 pt-5 sm:px-4">
        <h1 className="text-2xl font-bold sm:text-3xl">สมัครแข่งขัน</h1>
        <p className="mt-1 text-[var(--gt-muted)]">แตะโปสเตอร์ของรายการที่ต้องการสมัคร</p>
        {rows.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/tournaments/${r.id}/register`} className="gt-card gt-row flex h-full flex-col overflow-hidden">
                  <div className="relative h-56 bg-[#0a2f6e]">
                    {r.poster_url ? (
                      <>
                        <img src={r.poster_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-md" />
                        <img src={r.poster_url} alt={`โปสเตอร์ ${r.title}`} className="relative mx-auto h-full w-auto max-w-full object-contain" />
                      </>
                    ) : <span aria-hidden="true" className="grid h-full place-items-center text-5xl">🏆</span>}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <span className="self-start rounded-full bg-[var(--gt-cta-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--gt-cta)]">{status(r)}</span>
                    <h2 className="text-lg font-bold leading-snug">{r.title}</h2>
                    <p className="text-sm text-[var(--gt-muted)]">{thaiDate(r.event_date) ?? "รอประกาศวันแข่งขัน"}{r.venue ? ` · ${r.venue}` : ""}</p>
                    <span className="gt-cta-btn mt-auto flex min-h-11 items-center justify-center">สมัครแข่งขัน →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="gt-card mt-4 p-8 text-center">
            <p className="font-semibold">ตอนนี้ยังไม่มีรายการที่เปิดรับสมัคร</p>
            <Link href="/tournaments" className="gt-outline-btn mt-4 inline-flex min-h-11 items-center px-5 font-semibold">ดูรายการแข่งขันทั้งหมด</Link>
          </div>
        )}
      </main>
    </Shell>
  );
}
