import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "รายการแข่งขัน" };

const tournaments = [
  { title: "ZEER GO KYU WAR 2026", status: "เปิดรับสมัคร", date: "5 ธันวาคม 2569", place: "ZEER Rangsit", entries: "42 / 80", format: "Swiss" },
  { title: "GO CARNIVAL @ ZEER", status: "เตรียมเปิดรับสมัคร", date: "กุมภาพันธ์ 2570", place: "ZEER Rangsit", entries: "หลายกิจกรรม", format: "Multi-format" },
  { title: "Thailand Go Super Series", status: "ประกาศผลแล้ว", date: "ฤดูกาล 2569", place: "ประเทศไทย", entries: "อันดับรวม", format: "Series" },
];

export default function TournamentsPage() {
  return (
    <section className="section-shell page-section">
      <div className="page-title">
        <span className="eyebrow">TOURNAMENT DIRECTORY</span>
        <h1>รายการแข่งขันหมากล้อม</h1>
        <p>ค้นหางาน สมัครแข่งขัน และติดตามสถานะจากหน้าเดียว</p>
      </div>
      <div className="filter-bar">
        <button className="filter-active">ทั้งหมด</button><button>เปิดรับสมัคร</button><button>กำลังแข่งขัน</button><button>ประกาศผลแล้ว</button>
      </div>
      <div className="list-stack">
        {tournaments.map((item) => (
          <article className="tournament-row" key={item.title}>
            <div className="row-date"><strong>{item.date.split(" ")[0]}</strong><span>{item.date.substring(item.date.indexOf(" ") + 1)}</span></div>
            <div className="row-main"><span className="status-pill status-open">{item.status}</span><h2>{item.title}</h2><p>{item.place} · {item.format}</p></div>
            <div className="row-stat"><small>ผู้สมัคร / ข้อมูล</small><strong>{item.entries}</strong></div>
            <Link className="button button-secondary" href="/live">ดูรายละเอียด</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
