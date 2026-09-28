import Link from "next/link";

const quickActions = [
  { href: "/tournaments", icon: "▦", title: "รายการแข่งขัน", description: "ค้นหาและสมัครการแข่งขัน" },
  { href: "/athletes", icon: "◎", title: "ค้นหานักกีฬา", description: "ประวัติ ผลงาน และอันดับ" },
  { href: "/live", icon: "●", title: "ผลสด", description: "คู่แข่งขัน ผล และอันดับ" },
  { href: "/admin/setup", icon: "⚙", title: "สร้างการแข่งขัน", description: "ตั้งค่าแบบทีละขั้น" },
];

const events = [
  {
    status: "เปิดรับสมัคร",
    statusClass: "status-open",
    title: "ZEER GO KYU WAR 2026",
    date: "5 ธันวาคม 2569",
    venue: "ZEER Rangsit",
    divisions: "Kyu • Beginner",
    accent: "event-blue",
  },
  {
    status: "เตรียมเปิดรับสมัคร",
    statusClass: "status-soon",
    title: "GO CARNIVAL @ ZEER",
    date: "กุมภาพันธ์ 2570",
    venue: "ZEER Rangsit",
    divisions: "หลายรูปแบบการแข่งขัน",
    accent: "event-gold",
  },
  {
    status: "กำลังแข่งขัน",
    statusClass: "status-live",
    title: "GO TOURNAMENT DEMO",
    date: "ระบบทดสอบ",
    venue: "Live Tournament",
    divisions: "Swiss • 5 รอบ",
    accent: "event-green",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <span className="eyebrow">GO TOURNAMENT PLATFORM</span>
          <h1>ทุกการแข่งขันหมากล้อม<br />จัดการได้ในที่เดียว</h1>
          <p>
            สมัครแข่งขัน เช็กชื่อ จับคู่ ลงผล และติดตามอันดับสด
            ด้วยหน้าจอที่อ่านง่ายทั้งคอมพิวเตอร์และมือถือ
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/tournaments">ดูรายการแข่งขัน</Link>
            <Link className="button button-secondary" href="/live">ดูผลการแข่งขันสด</Link>
          </div>
          <div className="hero-points">
            <span>✓ รองรับหลายรายการในหนึ่งงาน</span>
            <span>✓ ไทย / English</span>
            <span>✓ ออกแบบสำหรับมือถือ</span>
          </div>
        </div>
        <div className="hero-board" aria-label="ตัวอย่างกระดานหมากล้อม">
          <div className="board-grid" />
          <span className="stone stone-black stone-a" />
          <span className="stone stone-white stone-b" />
          <span className="stone stone-black stone-c" />
          <span className="stone stone-white stone-d" />
          <div className="board-card">
            <span className="live-dot" />
            LIVE ROUND 3
            <strong>128 ผู้เล่น</strong>
          </div>
        </div>
      </section>

      <section className="section-shell section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">เริ่มต้นใช้งาน</span>
            <h2>คุณต้องการทำอะไร</h2>
          </div>
        </div>
        <div className="quick-grid">
          {quickActions.map((item) => (
            <Link className="quick-card" href={item.href} key={item.href}>
              <span className="quick-icon">{item.icon}</span>
              <span><strong>{item.title}</strong><small>{item.description}</small></span>
              <span className="arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">UPCOMING TOURNAMENTS</span>
            <h2>รายการแข่งขัน</h2>
          </div>
          <Link className="text-link" href="/tournaments">ดูทั้งหมด →</Link>
        </div>
        <div className="event-grid">
          {events.map((event) => (
            <article className="event-card" key={event.title}>
              <div className={`event-cover ${event.accent}`}>
                <span className={`status-pill ${event.statusClass}`}>{event.status}</span>
                <span className="event-mark">GO</span>
              </div>
              <div className="event-content">
                <p className="event-date">{event.date}</p>
                <h3>{event.title}</h3>
                <dl>
                  <div><dt>สถานที่</dt><dd>{event.venue}</dd></div>
                  <div><dt>ประเภท</dt><dd>{event.divisions}</dd></div>
                </dl>
                <Link className="card-link" href="/tournaments">ดูรายละเอียดและสมัคร →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell section-block">
        <div className="platform-panel">
          <div>
            <span className="eyebrow eyebrow-light">สำหรับผู้จัดการแข่งขัน</span>
            <h2>สร้างงานหลายรูปแบบ โดยไม่ต้องจำศัพท์เทคนิค</h2>
            <p>ระบบช่วยอธิบายทุกตัวเลือก แนะนำค่าตามจำนวนผู้เล่น และตรวจความพร้อมก่อนเปิดการแข่งขัน</p>
          </div>
          <Link className="button button-light" href="/admin/setup">เริ่มตั้งค่าการแข่งขัน</Link>
        </div>
      </section>
    </>
  );
}
