import Link from "next/link";
import SiteBar from "../tournaments/[id]/_ui/SiteBar";
import { publicDb } from "../tournaments/[id]/_ui/data";
import { thaiDate } from "@/lib/division-display";
import "./competition.css";
export const revalidate = 30;
export default async function CompetitionPage() {
  const db = publicDb();
  const result = db ? await db.from("gt_tournaments").select("id,title,event_date,venue").eq("published", true).order("event_date", { ascending: false }).limit(100) : null;
  const events = result?.error ? [] : result?.data ?? [];
  return <div className="competition-page"><SiteBar current="/tournaments" /><main className="competition-content">
    <h1>ศูนย์การแข่งขัน</h1><p>เลือกงานเพื่อดูสถานะแต่ละรุ่น ตารางเวลา และคู่แข่งขัน</p>
    <div className="competition-cards">{events.map(e => <article className="competition-panel" key={e.id}><h2>{e.title}</h2><p>{thaiDate(e.event_date) ?? "รอประกาศวันแข่งขัน"}</p><p>{e.venue}</p><Link className="competition-button" href={`/tournaments/${e.id}/competition`}>ดูหน้าแข่งขัน →</Link></article>)}</div>
    {!events.length && <p className="competition-empty">ยังไม่พบข้อมูลการแข่งขัน กรุณาลองใหม่อีกครั้ง</p>}<Link href="/tournaments">ดูรายการแข่งขันทั้งหมด →</Link>
  </main></div>;
}
