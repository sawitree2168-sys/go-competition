export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "sans-serif" }}>
      <header style={headerStyle}>
        <h1 style={{ fontSize: "22px", fontWeight: "bold" }}>Go Tournament</h1>

        <nav style={{ display: "flex", gap: "14px", fontSize: "14px" }}>
          <a href="#news" style={navStyle}>ข่าวสาร</a>
          <a href="#certificate" style={navStyle}>ดาวน์โหลดใบประกาศ</a>
          <a href="#register" style={navStyle}>สมัครแข่งขัน</a>
        </nav>
      </header>

      <section style={{ textAlign: "center", padding: "55px 20px" }}>
        <h2 style={{ fontSize: "38px", fontWeight: "bold", marginBottom: "12px" }}>
          Go Tournament
        </h2>
        <p style={{ fontSize: "20px", color: "#444", marginBottom: "10px" }}>
          แพลตฟอร์มกลางสำหรับการแข่งขันหมากล้อม
        </p>
        <p style={{ fontSize: "16px", color: "#666" }}>
          สมัครแข่งขัน • ดูตาราง • เช็คผล • จัดอันดับ • ข่าวสาร • ดาวน์โหลดใบประกาศ
        </p>
      </section>

      <section style={gridStyle}>
        {card("📢 ประกาศการแข่งขัน", "รายละเอียดวัน เวลา สถานที่ และกติกาการแข่งขัน")}
        {card("📰 ข่าวสาร", "ติดตามข่าวล่าสุดเกี่ยวกับการแข่งขันหมากล้อม")}
        {card("👥 รายชื่อนักแข่ง", "ตรวจสอบรายชื่อผู้สมัครแข่งขันทั้งหมด")}
        {card("📅 ตารางแข่งขัน", "ดูรอบการแข่งขัน คู่แข่งขัน และเวลาแข่ง")}
        {card("🏆 ผลการแข่งขัน", "บันทึกและดูผลการแข่งขัน")}
        {card("⭐ อันดับคะแนน", "ดูอันดับคะแนนสะสมของผู้เล่น")}
        {card("📄 ใบประกาศ", "ดาวน์โหลดใบประกาศหลังจบการแข่งขัน")}
        {card("📝 สมัครแข่งขัน", "สมัครเข้าร่วมการแข่งขันออนไลน์")}
      </section>

      <section id="news" style={sectionStyle}>
        <h2 style={titleStyle}>ข่าวสารการแข่งขัน</h2>

        <div style={listBoxStyle}>
          <h3>เปิดรับสมัครการแข่งขันหมากล้อมรายการใหม่</h3>
          <p>ผู้เล่นสามารถติดตามรายละเอียดและสมัครเข้าร่วมการแข่งขันได้ผ่านระบบ Go Tournament</p>
        </div>

        <div style={listBoxStyle}>
          <h3>ประกาศตารางแข่งขัน</h3>
          <p>ระบบจะแสดงรอบการแข่งขัน คู่แข่งขัน และผลการแข่งขันในหน้าเดียวกัน</p>
        </div>
      </section>

      <section id="certificate" style={sectionStyle}>
        <h2 style={titleStyle}>ดาวน์โหลดใบประกาศ</h2>

        <div style={listBoxStyle}>
          <p>กรอกชื่อผู้เข้าแข่งขัน หรือค้นหาจากรายการแข่งขัน เพื่อดาวน์โหลดใบประกาศ</p>

          <button style={buttonStyle}>
            ดาวน์โหลดใบประกาศ
          </button>
        </div>
      </section>

      <section id="register" style={sectionStyle}>
        <h2 style={titleStyle}>สมัครแข่งขัน</h2>

        <div style={listBoxStyle}>
          <p>ระบบสมัครแข่งขันจะเชื่อมต่อกับ Supabase ในขั้นตอนถัดไป</p>

          <button style={buttonStyle}>
            สมัครแข่งขัน
          </button>
        </div>
      </section>
    </main>
  );
}

function card(title: string, desc: string) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: "20px", marginBottom: "10px" }}>{title}</h3>
      <p style={{ color: "#666", lineHeight: "1.6" }}>{desc}</p>
    </div>
  );
}

const headerStyle = {
  background: "#1e3a8a",
  color: "white",
  padding: "16px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
};

const navStyle = {
  color: "white",
  textDecoration: "none",
};

const gridStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "20px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
};

const cardStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "16px",
  boxShadow: "0 6px 15px rgba(0,0,0,0.08)",
};

const sectionStyle = {
  maxWidth: "900px",
  margin: "30px auto",
  padding: "20px",
};

const titleStyle = {
  fontSize: "28px",
  marginBottom: "16px",
};

const listBoxStyle = {
  background: "white",
  padding: "22px",
  borderRadius: "16px",
  marginBottom: "14px",
  boxShadow: "0 5px 14px rgba(0,0,0,0.07)",
};

const buttonStyle = {
  marginTop: "12px",
  background: "#1e3a8a",
  color: "white",
  padding: "12px 22px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};