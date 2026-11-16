import Link from "next/link";
import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
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
    <PublicPage icon="athlete" title="นักกีฬา" sub="ค้นหาด้วยชื่อจริง หรือชื่อ-นามสกุลเต็ม">
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
          <ul className="gt-card mt-4 divide-y divide-[var(--gt-line)] overflow-hidden">
            {found.map((a) => (
              <li key={a.go_id} className="flex items-center gap-3 px-3 py-3">
                <AthleteAvatar src={a.photo} name={a.full_name} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{a.full_name}</span>
                  <span className="block text-sm text-[var(--gt-muted)]">{a.go_id}{a.rank ? ` · ${a.rank}` : ""}{a.institution ? ` · ${a.institution}` : ""}</span>
                </span>
                <span className="gt-num shrink-0 text-right text-sm"><span className="block font-semibold">{a.events} รายการ</span><span className="block text-[var(--gt-muted)]">ชนะ {a.wins} · แพ้ {a.losses}</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="gt-card mt-4 p-6 text-center text-[var(--gt-muted)]">ไม่พบ &quot;{q}&quot; · ลองพิมพ์ชื่อจริงเต็มคำ หรือชื่อ-นามสกุลให้ครบ</p>
      )}
      {q.length === 1 && <p className="mt-4 text-[var(--gt-muted)]">พิมพ์อย่างน้อย 2 ตัวอักษร</p>}

      {top && top.rows.length > 0 && (
        <>
          <h2 className="mt-6 text-lg font-bold">นักกีฬาที่ชนะมากที่สุดปี {top.year + 543}</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {top.rows.map((x) => (
              <li key={x.go_id} className="gt-card flex items-center gap-3 p-3">
                <AthleteAvatar src={x.photo} name={x.full_name} />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{x.full_name}</span><span className="block text-sm text-[var(--gt-muted)]">{x.go_id}{x.rank ? ` · ${x.rank}` : ""}</span></span>
                <span className="gt-num shrink-0 text-sm">ชนะ {x.wins}–{x.losses}</span>
              </li>
            ))}
          </ul>
          <Link href="/stats" className="mt-3 inline-block font-semibold text-[var(--gt-cta)] underline">ดูอันดับทั้งหมด →</Link>
        </>
      )}
    </PublicPage>
  );
}
