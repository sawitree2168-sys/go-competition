import ChooseAcademy from "@/components/ChooseAcademy";
import { PageHero, SiteFooter } from "@/components/SiteDesign";
import {loadCrowdGames} from "@/lib/crowd-results";
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
  const rows=(g.error?[]:g.data??[]) as GameRow[];
  for(const m of await loadCrowdGames(db,id)){
    const side=m.black_id===id?"black":"white",opp=side==="black"?"white":"black";
    if(rows.some(r=>r.title===m.event&&r.event_date===m.date&&r.round_number===m.round&&r.opponent_id===m[`${opp}_id`]))continue;
    rows.push({kind:"match",tournament_id:`community:${m.event}`,title:m.event,event_date:m.date,division_id:`community:${m.division}`,division_name:m.division,round_number:m.round,colour:side,opponent_id:m[`${opp}_id`],opponent_name:m[`${opp}_name`],opponent_institution:m[`${opp}_school`],opponent_rank:null,opponent_photo:m[`${opp}_photo`],winner_id:m.result.startsWith('black_win')?m.black_id:m.result.startsWith('white_win')?m.white_id:null,result_code:m.result,result_margin:null,state:"verified"});
  }
  return { athlete, rows, certs: (c.error ? [] : c.data ?? []) as Cert[] };
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
        <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar current="/athletes" /></div>
        <PageHero title="โปรไฟล์นักกีฬา" sub="ประวัติและผลงานการแข่งขันหมากล้อม"/><div className="site-profile px-4 pt-4 sm:px-8"><AthleteProfile athlete={data.athlete} rows={data.rows} today={today} certs={data.certs} /><ChooseAcademy athleteId={data.athlete.id}/><div className="my-5"><a className="gt-cta-btn inline-flex min-h-12 items-center px-5" href={`/results/submit?athlete=${encodeURIComponent(data.athlete.full_name)}`}>ส่งภาพผลการแข่งขันเพิ่มเติม</a></div></div><SiteFooter/>
      </Shell>
    </div>
  );
}
