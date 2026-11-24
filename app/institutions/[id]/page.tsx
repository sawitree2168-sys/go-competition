import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHero, SiteFooter } from "@/components/SiteDesign";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { LogoDisplay } from "@/app/institution/_ui/LogoEditor";
import ShareLink from "./ShareLink";

export const revalidate = 60;

type Podium = { name: string; athlete_id: string | null; go_id: string | null; title: string; date: string | null; division: string; pos: number; wins: number; games: number };
type Academy = {
  id: string; name: string; logo_path: string | null; shape: string | null; zoom: number | null; x: number | null; y: number | null;
  students: number; events: number; games: number; wins: number; gold: number; silver: number; bronze: number; podiums: Podium[];
};

async function load(id: string): Promise<Academy | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = publicDb(); if (!db) return null;
  const { data, error } = await db.rpc("gt_public_academy_v1", { p_academy: id });
  return error || !data ? null : (data as Academy);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = await load((await params).id);
  return { title: a ? `${a.name} · สถาบันหมากล้อม · GO TOURNAMENT` : "ไม่พบสถาบัน · GO TOURNAMENT" };
}

const thDate = (d: string | null) => d ? new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(`${d}T00:00:00+07:00`)) : "";
const medal = (p: number) => (p === 1 ? "🥇" : p === 2 ? "🥈" : "🥉");

/** Public institution page: name, logo, student count, medals and latest podium places. */
export default async function InstitutionPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const a = await load((await params).id);
  if (!a) notFound();
  const rate = a.games ? Math.round((a.wins / a.games) * 100) : null;
  return (
    <div className="min-h-screen">
      <Shell wide>
        <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar current="/menu" /></div>
        <PageHero title="สถาบันหมากล้อม" sub="ผลงานนักเรียนจากรายการแข่งขันที่เผยแพร่แล้ว" />
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-8">
          <section className="flex flex-wrap items-center gap-4 rounded-[24px] border-[3px] border-[#e9bd55] bg-[linear-gradient(160deg,#0a3e89,#062a5f)] p-5 text-white sm:p-7">
            <LogoDisplay branding={{ logo_path: a.logo_path, shape: a.shape === "square" ? "square" : "circle", zoom: a.zoom ?? 100, x: a.x ?? 50, y: a.y ?? 50 }} name={a.name} className="h-24 w-24 sm:h-28 sm:w-28" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-[.18em] text-[#f9d67d]">GO TOURNAMENT · สถาบัน</p>
              <h1 className="mt-1 break-words text-3xl font-black sm:text-4xl">{a.name}</h1>
              <p className="mt-2 text-sm text-white/85">นักเรียน {a.students} คน · ลงแข่ง {a.events} รายการ</p>
            </div>
          </section>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[["🥇 ชนะเลิศ", a.gold], ["🥈 รองชนะเลิศ", a.silver], ["🥉 อันดับ 3", a.bronze], ["อัตราชนะรวม", rate == null ? "—" : `${rate}%`]].map(([l, v]) => (
              <div key={String(l)} className="gt-card p-3 text-center"><b className="gt-num block text-3xl text-[var(--gt-cta)]">{v}</b><span className="text-sm">{l}</span></div>
            ))}
          </div>
          <section className="gt-card space-y-3 p-4 sm:p-5">
            <h2 className="text-xl font-bold">ผลงานล่าสุด</h2>
            {a.podiums.length ? (
              <ul className="divide-y divide-[var(--gt-line)]">
                {a.podiums.map((p, i) => {
                  const href = p.athlete_id ? `/athletes/${p.athlete_id}` : p.go_id ? `/athletes/history/${encodeURIComponent(p.go_id)}` : null;
                  return (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      <span className="text-2xl" aria-hidden="true">{medal(p.pos)}</span>
                      <span className="min-w-0 flex-1">
                        {href ? <Link href={href} className="block break-words font-semibold hover:underline">{p.name}</Link> : <b className="block break-words">{p.name}</b>}
                        <span className="block text-sm text-[var(--gt-muted)]">{p.title} · {p.division}{p.date ? ` · ${thDate(p.date)}` : ""}</span>
                      </span>
                      <span className="shrink-0 text-sm">ชนะ {p.wins}/{p.games}</span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-[var(--gt-muted)]">ยังไม่มีผลงานอันดับ 1–3</p>}
          </section>
          <ShareLink title={`${a.name} · สถาบันหมากล้อม`} />
          <p className="text-xs text-[var(--gt-muted)]">ข้อมูลจากรายการแข่งขันบน GO TOURNAMENT และทำเนียบดั้งสมาคม / 1go · ไม่แสดงข้อมูลส่วนตัวของนักเรียนและผู้ปกครอง</p>
        </div>
        <SiteFooter />
      </Shell>
    </div>
  );
}
