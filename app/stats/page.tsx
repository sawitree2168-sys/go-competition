import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { thaiDate } from "@/lib/division-display";
import StatsBoard, { type WinStats } from "./StatsBoard";

// Rebuilt at most every 5 minutes; all switching (ดั้ง/คิว/ระดับ) happens in the browser, so taps are instant.
export const revalidate = 300;
export const metadata: Metadata = { title: "อันดับและสถิติ" };

// อันดับและสถิติ: % ชนะ ปีนี้ แยกดั้ง / คิว และระดับ · ทุกแถวดูได้ว่ามาจากรายการไหน (ที่มาของสถิติ)
export default async function StatsPage() {
  const db = publicDb();
  const res = db ? await db.rpc("gt_public_win_stats_v1", { p_year: null }) : null;
  const data: WinStats = (res && !res.error && res.data) ? res.data as WinStats : { year: null, from: null, to: null, games: 0, events: [], players: [] };
  const year = (data.year ?? new Date().getFullYear()) + 543;
  const range = data.from && data.to ? ` · ${thaiDate(data.from, "short")} – ${thaiDate(data.to, "short")}` : "";
  return (
    <PublicPage icon="stats" title="อันดับและสถิติ" sub={`เปอร์เซ็นต์ชนะ ปี ${year}${range}`}>
      <StatsBoard data={data} />
    </PublicPage>
  );
}
