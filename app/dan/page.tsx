import { PresentationBanner, Sponsors } from '@/components/Presentation';
import { defaultPresentation, normalizePresentation } from '@/lib/site-presentation';
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
export const revalidate = 30;

async function load(): Promise<[Board | null, Ranking | null]> {
  const db = publicDb();
  if (!db) return [null, null];
  const [b, r] = await Promise.all([db.rpc("gt_dan_board_v1"), db.rpc("gt_national_ranking_v1")]);
  return [b.error || !b.data ? null : (b.data as Board), r.error || !r.data ? null : (r.data as Ranking)];
}

export default async function DanPage() {
  const [board, ranking] = await load();
  const result = await publicDb()?.from('gt_site_presentation_v1').select('config').eq('page','dan').maybeSingle();
  const presentation = result?.data ? normalizePresentation(result.data.config) : defaultPresentation;
  return (
    <div className="min-h-screen">
      <Shell wide>
        <div className="gt-dash gt-directory relative left-1/2 -mb-10 min-h-screen w-screen -translate-x-1/2 overflow-hidden pb-12">
          <SiteBar current="/dan" />
          <main className="dan-page-content">
            {board
              ? <><PresentationBanner config={presentation.banner}/><DanBoard board={board} ranking={ranking} /></>
              : <div className="gt-card p-6 text-center">
                  <h1 className="text-2xl font-bold">ทำเนียบนักกีฬาหมากล้อมไทย</h1>
                  <p className="mt-2 text-[var(--gt-muted)]">ยังโหลดรายชื่อดั้งไม่ได้ กรุณาลองใหม่อีกครั้ง</p>
                </div>}
            <Sponsors items={presentation.sponsors}/>
          </main>
          <SiteFooter />
        </div>
      </Shell>
    </div>
  );
}
