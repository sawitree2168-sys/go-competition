import type { Metadata } from "next";
import CompetitionDaySimulation from "@/app/organizer/_lib/division/CompetitionDaySimulation";

export const metadata: Metadata = {
  title: "ทดลองวันแข่งขัน | GO TOURNAMENT",
  description: "หน้าจำลองการแข่งขันเพื่อทดลองมุมมองกรรมการ แอดมิน และสาธารณะ โดยไม่แตะผลจริง",
  robots: { index: false, follow: false },
};

/** Public, standalone simulation: synthetic participants and in-memory state only.
 * No Gate, no login, no mutation of real competition data.
 */
export default function DemoCompetitionPage() {
  return (
    <div className="gt">
      <CompetitionDaySimulation
        eventId="ce1382d9-1e1f-4697-8fe4-6a1a347d91eb"
        divisionId="2a16422f-3436-4b66-8c16-7836ff7f7344"
        publicDemo
      />
    </div>
  );
}
