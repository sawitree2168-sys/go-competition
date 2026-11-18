import Link from "next/link";
import SiteBar from "../_ui/SiteBar";
import { loadEventPage, loadDivisionPage, publicDb } from "../_ui/data";
import { divisionLabel, thaiDate } from "@/lib/division-display";
import { roundState, roundsOf } from "@/lib/competition-day.mjs";
import "@/app/competition/competition.css";
export const revalidate = 30;
export default async function EventCompetition({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = publicDb();
  const { event, divisions, entrants } = await loadEventPage(db, id);
  if (!event) return <main className="competition-page competition-content"><h1>ยังไม่พบรายการแข่งขันที่เผยแพร่</h1><Link href="/tournaments">กลับรายการแข่งขัน</Link></main>;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const before = Boolean(event.event_date && event.event_date > today);
  const rows = await Promise.all(divisions.map(async division => {
    const page = await loadDivisionPage(db, id, division.id);
    const state = roundState(page.matches, page.byes, roundsOf(division));
    const pools = new Set([...page.matches, ...page.byes].map(m => m.pool_label ?? ""));
    state.complete = pools.size > 0 && [...pools].every(pool => roundState(
      page.matches.filter(m => (m.pool_label ?? "") === pool),
      page.byes.filter(m => (m.pool_label ?? "") === pool), roundsOf(division),
    ).complete);
    // Pairings published the evening before play do not mean play has started.
    const played = page.matches.some(m => m.state === "verified");
    const status = before ? "รอการแข่งขัน" : state.complete ? "จบการแข่งขันแล้ว" : played ? "กำลังแข่งขัน" : state.lastRound ? "ประกาศคู่แข่งขันแล้ว" : "รอการแข่งขัน";
    return { division, state, status, tone: !before && state.complete ? "done" : !before && played ? "live" : "" };
  }));
  const zeer = /zeer.*kyu.*war.*2026/i.test(event.title);
  const schedule = zeer ? [
    ["Friendship 9×9", "08:30–11:20 น. (6 รอบ)", "11:45 น."],
    ["Friendship 13×13", "เริ่ม 14:00 น. (5 รอบ)", "16:40 น."],
    ["รุ่น Kyu", "เริ่ม 08:30 น. ตามตารางแต่ละรุ่น", "18:00 น."],
  ] : [];
  return <div className="competition-page"><SiteBar current="/tournaments" />
    <header className="competition-hero"><img src="/event-hero-wide.webp" alt="" /><div className="competition-content">
      {event.poster_url && <img className="competition-poster" src={event.poster_url} alt={`โปสเตอร์ ${event.title}`} />}
      <p>GO TOURNAMENT · {before ? "ยังไม่เริ่มการแข่งขัน" : "ศูนย์ติดตามการแข่งขัน"}</p><h1>{event.title}</h1>
      <p>{thaiDate(event.event_date) ?? "รอประกาศวันแข่งขัน"} · {event.venue ?? "รอประกาศสถานที่"}</p><div className="competition-clear" />
    </div></header>
    <main className="competition-content"><nav className="competition-nav" aria-label="เมนูงานแข่งขัน">
      <Link href={`/tournaments/${id}`}>รายละเอียดงาน</Link><Link href={`/tournaments/${id}/competition`} aria-current="page">ภาพรวมการแข่งขัน</Link>
      <Link href={`/tournaments/${id}/entrants`}>รายชื่อผู้สมัคร</Link><Link href={`/tournaments/${id}/standings`}>ตารางอันดับ</Link><Link href="#schedule">ตารางเวลา</Link>
    </nav><h2>สถานะการแข่งขัน (แยกตามรุ่น)</h2><p className="competition-subtle">ผู้สมัคร {entrants.length} สิทธิ์ · {divisions.length} รุ่น · สถานะอ้างอิงผลที่ยืนยันแล้ว</p>
    {before && <p className="competition-note">ยังไม่เริ่มการแข่งขัน สามารถตรวจรายชื่อและคู่แข่งขันที่ผู้จัดประกาศล่วงหน้าได้ ผลการแข่งขันและอันดับจะปรากฏเมื่อมีผลที่ยืนยันแล้ว</p>}
    <div className="competition-cards">{rows.map(({ division, state, status, tone }) => <article className="competition-panel" key={division.id}>
      <h2>{divisionLabel(division.name)}</h2><span className={`competition-status ${tone}`}>{status}</span>
      <p>{before || !state.lastRound ? `กำหนด ${roundsOf(division)} รอบ` : `เผยแพร่คู่ถึงรอบที่ ${state.lastRound} / ${roundsOf(division)}`}</p>
      <Link className="competition-button" href={`/tournaments/${id}/divisions/${division.id}`}>{tone === "done" ? "ดูผลการแข่งขันและอันดับ" : "ดูตารางการแข่งขัน"} →</Link>
    </article>)}</div>{!rows.length && <p className="competition-empty">รอผู้จัดประกาศรุ่นการแข่งขัน</p>}
    <section className="competition-section" id="schedule"><h2>ตารางเวลาแข่งขันและมอบรางวัล</h2>
      {schedule.length ? <div className="competition-scroll"><table className="competition-table"><thead><tr><th scope="col">รุ่นแข่งขัน</th><th scope="col">เวลาแข่งขัน</th><th scope="col">มอบรางวัล</th></tr></thead><tbody>{schedule.map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div> : <p className="competition-empty">รอผู้จัดประกาศตารางเวลา</p>}
    </section><section className="competition-section"><h2>คู่แข่งขันล่าสุดและอันดับ</h2><p className="competition-empty">{before ? "ยังไม่เริ่มแข่งขัน จึงยังไม่มีผลการแข่งขันหรืออันดับจากการแข่งขันครั้งนี้" : "เลือกแต่ละรุ่นด้านบนเพื่อดูคู่แข่งขันและผลที่ยืนยันล่าสุด"}</p></section>
    <aside className="competition-note">แต่ละรุ่นดำเนินการแข่งขันแยกกัน รุ่นที่แข่งเสร็จแล้วสามารถดูผลได้โดยไม่ต้องรอรุ่นอื่น เวลาอาจเปลี่ยนแปลงตามประกาศจากผู้จัด</aside>
    <details className="competition-reference"><summary>ดูภาพต้นแบบหน้าแข่งขันทั้ง 2 แบบ</summary><p>ภาพตัวอย่างการออกแบบ ตัวเลข รายชื่อ และสถานะในภาพเป็นข้อมูลประกอบภาพ ไม่ใช่ผลแข่งขันจริง</p>
      <img src="/competition/overview-reference.webp" alt="ต้นแบบภาพรวมการแข่งขัน สีน้ำเงินขาว ขอบตารางชัดเจน" loading="lazy" />
      <img src="/competition/divisions-reference.webp" alt="ต้นแบบสถานะการแข่งขันแยกตามรุ่นและตารางมอบรางวัล" loading="lazy" />
    </details></main></div>;
}
