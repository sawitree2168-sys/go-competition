import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import AthleteDirectory from "@/components/AthleteDirectory";
import AthleteAvatar from "@/components/AthleteAvatar";
import MenuIcon from "@/components/MenuIcon";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { loadRankings } from "@/lib/public-site";

export const metadata: Metadata = { title: "นักกีฬา" };

type Found = { go_id: string; full_name: string; rank: string | null; photo: string | null; institution: string | null; events: number; wins: number; losses: number };

// นักกีฬา: search the registry by first name or full name; without a search, this year's athletes with most wins.
export default async function AthletesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const db = publicDb();
  const [found, top] = await Promise.all([
    q.length >= 2 && db ? db.rpc("gt_register_search_v1", { p_query: q }).then((r) => (r.error ? [] : (r.data ?? []) as Found[]), () => []) : Promise.resolve(null),
    q ? Promise.resolve(null) : loadRankings(db, 10),
  ]);
  return (
    <PublicPage icon="athlete" title="นักกีฬา" sub="ค้นหานักกีฬา ดูประวัติ และติดตามผลงานการแข่งขัน" current="/athletes">
      <form action="/athletes" className="flex gap-2">
        <label className="gt-card flex min-h-12 flex-1 items-center gap-2 px-3">
          <span className="sr-only">ชื่อนักกีฬา</span>
          <MenuIcon name="athlete" className="h-5 w-5 shrink-0 text-[var(--gt-muted)]" />
          <input name="q" defaultValue={q} placeholder="เช่น ภูภูมิ หรือ ภูภูมิ คัมภีรพงศ์" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--gt-muted)]" />
        </label>
        <button className="gt-cta-btn min-h-12 px-5">ค้นหา</button>
      </form>

      {found && (
        found.length ? (
          <AthleteDirectory rows={found}/>
        ) : <p className="gt-card mt-4 p-6 text-center text-[var(--gt-muted)]">ไม่พบ &quot;{q}&quot; · ลองพิมพ์ชื่อจริงเต็มคำ หรือชื่อ-นามสกุลให้ครบ</p>
      )}
      {q.length === 1 && <p className="mt-4 text-[var(--gt-muted)]">พิมพ์อย่างน้อย 2 ตัวอักษร</p>}

      {top && top.rows.length > 0 && (
        <>
          <h2 className="mt-6 text-lg font-bold">นักกีฬาที่ชนะมากที่สุดปี {top.year + 543}</h2>
          <AthleteDirectory rows={top.rows}/>
          <Link href="/stats" className="mt-3 inline-block font-semibold text-[var(--gt-cta)] underline">ดูอันดับทั้งหมด →</Link>
        </>
      )}
    </PublicPage>
  );
}
