import "../tournaments/directory.css";
import "./dan.css";
import { SiteFooter } from "@/components/SiteDesign";
import type { Metadata } from "next";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import DanBoard, { type Board } from "./DanBoard";
import type { Ranking } from "./RankTable";

export const metadata: Metadata = { title: "ทำเนียบนักกีฬาหมากล้อมไทย · GO TOURNAMENT" };

// The association updates its list a few times a month; rebuild at most every 10 minutes.
export const revalidate = 600;

async function load(): Promise<[Board | null, Ranking | null]> {
  const db = publicDb();
  if (!db) return [null, null];
  const [b, r] = await Promise.all([db.rpc("gt_dan_board_v1"), db.rpc("gt_national_ranking_v1")]);
  return [b.error || !b.data ? null : (b.data as Board), r.error || !r.data ? null : (r.data as Ranking)];
}

/** ทำเนียบนักกีฬาหมากล้อมไทย: same frame as the competition directory (hero artwork, tools, cards and table). */
export default async function DanPage() {
  const [board, ranking] = await load();
  return (
    <div className="min-h-screen">
      <Shell wide>
        <div className="gt-dash gt-directory relative left-1/2 -mb-10 min-h-screen w-screen -translate-x-1/2 overflow-hidden pb-12">
          <SiteBar current="/dan" />
          <section className="gt-directory-hero" aria-labelledby="dan-title">
            {/* eslint-disable-next-line @next/next/no-img-element -- reuse the approved, unified Go artwork */}
            <picture aria-hidden="true" className="gt-directory-art"><img src="/design/site-banner.webp" alt="" width="2000" height="667" fetchPriority="high" /></picture>
            <div className="gt-directory-hero-inner">
              <h1 id="dan-title">ทำเนียบนักกีฬาหมากล้อมไทย</h1>
              <p>อันดับคะแนน รายชื่อดั้ง และประกาศดั้งใหม่ จากสมาคมกีฬาหมากล้อมแห่งประเทศไทย</p>
              <span className="gt-directory-gold" aria-hidden="true" />
            </div>
          </section>
          <div className="gt-directory-content relative mx-auto max-w-6xl px-4 sm:px-8">
            {board
              ? <DanBoard board={board} ranking={ranking} />
              : <p className="gt-card p-6 text-center text-[var(--gt-muted)]">ยังโหลดรายชื่อดั้งไม่ได้ กรุณาลองใหม่อีกครั้ง</p>}
          </div>
          <SiteFooter/>
        </div>
      </Shell>
    </div>
  );
}
