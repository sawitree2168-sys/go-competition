import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import AthleteProfile, { type Athlete, type GameRow } from "./AthleteProfile";
import type { Cert } from "./certificate-draw";

// Rebuilt from the database at most every 30 s.
export const revalidate = 30;

async function load(id: string): Promise<{ athlete: Athlete; rows: GameRow[]; certs: Cert[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = publicDb();
  if (!db) return null;
  const [a, g, c] = await Promise.all([db.rpc("gt_athlete_public_v1", { p_athlete: id }), db.rpc("gt_athlete_games_v1", { p_athlete: id }), db.rpc("gt_athlete_certificates_v1", { p_athlete: id })]);
  const athlete = ((a.data ?? []) as Athlete[])[0];
  if (a.error || !athlete) return null;
  return { athlete, rows: (g.error ? [] : g.data ?? []) as GameRow[], certs: (c.error ? [] : c.data ?? []) as Cert[] };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await load((await params).id);
  return { title: data ? `${data.athlete.full_name} · โปรไฟล์นักกีฬา · GO TOURNAMENT` : "ไม่พบนักกีฬา · GO TOURNAMENT" };
}

export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const data = await load((await params).id);
  if (!data) notFound();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  return (
    <div className="min-h-screen">
      <Shell wide>
        <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar /></div>
        <div className="px-4 pt-4 sm:px-8"><AthleteProfile athlete={data.athlete} rows={data.rows} today={today} certs={data.certs} /></div>
      </Shell>
    </div>
  );
}
