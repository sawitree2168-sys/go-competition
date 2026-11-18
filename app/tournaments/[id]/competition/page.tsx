import Link from "next/link";
import CompetitionDashboard, { type DashboardDivision } from "@/components/CompetitionDashboard";
import { loadEventPage, loadDivisionPage, publicDb } from "../_ui/data";
import "@/app/competition/competition.css";

export const revalidate = 30;

export default async function EventCompetition({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab = tab === "standings" || tab === "pairings" || tab === "entrants" || tab === "announcements" ? tab : "overview";
  const db = publicDb();
  const { event, divisions, entrants } = await loadEventPage(db, id);
  if (!event) return <main className="competition-page competition-content"><h1>ยังไม่พบรายการแข่งขันที่เผยแพร่</h1><Link href="/tournaments">กลับรายการแข่งขัน</Link></main>;
  const data: DashboardDivision[] = await Promise.all(divisions.map(async division => {
    const [page, fingerprint] = await Promise.all([
      loadDivisionPage(db, id, division.id),
      db?.rpc("gt_division_live_v1", { p_division: division.id }),
    ]);
    return { division, matches: page.matches, byes: page.byes, standings: page.standings,
      people: Array.from(page.people.entries()), boardAvailable: page.boardAvailable,
      standingsAvailable: page.standingsAvailable, fingerprint: fingerprint?.error ? null : fingerprint?.data as string | null ?? null,
      announcements: page.announcements };
  }));
  return <CompetitionDashboard event={event} divisions={data} entrants={entrants} initialTab={initialTab} />;
}
