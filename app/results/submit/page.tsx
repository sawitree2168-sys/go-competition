import PublicPage from "@/components/PublicPage";
import { loadHistoryWall } from "@/lib/history-walllist";
import ResultSubmit from "./ResultSubmit";

export const metadata = { title: "ส่งภาพผลการแข่งขัน | GO TOURNAMENT", referrer: "no-referrer" as const };

export default async function Page({ searchParams }: { searchParams: Promise<{ event?: string; division?: string; athlete?: string }> }) {
  const { event, division, athlete } = await searchParams;
  const wall = typeof event === "string"
    ? await loadHistoryWall(event, typeof division === "string" ? division : null)
    : null;
  const context = wall?.division ? {
    id: wall.event.id, title: wall.event.title, division: wall.division,
    divisions: wall.divisions.map(item => item.name),
    athletes: wall.rows.map(row => row.full_name),
  } : null;
  return (
    <PublicPage icon="upload" title="ส่งผลการแข่งขัน" sub="ถ่ายรูปหรือแคปหน้าจอ แล้วส่งได้เลย • ไม่ต้องล็อกอิน" current="/results/submit">
      <ResultSubmit context={context} initialAthlete={typeof athlete === "string" ? athlete.slice(0, 160) : ""} />
    </PublicPage>
  );
}
