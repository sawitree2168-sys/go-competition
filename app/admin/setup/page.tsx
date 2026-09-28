import type { Metadata } from "next";

export const metadata: Metadata = { title: "ตั้งค่าการแข่งขัน" };

const formats = [
  { name: "Swiss", tag: "แนะนำสำหรับผู้เล่นจำนวนมาก", text: "ผู้เล่นทุกคนแข่งครบตามจำนวนรอบ และจับผู้ที่มีคะแนนใกล้กันมาพบกัน" },
  { name: "McMahon", tag: "เหมาะกับระดับฝีมือต่างกันมาก", text: "แบ่งคะแนนเริ่มต้นตามระดับ แล้วจับคู่ภายในกลุ่มคะแนน McMahon ที่ใกล้กัน" },
  { name: "Round Robin", tag: "เหมาะกับกลุ่มขนาดเล็ก", text: "ผู้เล่นในกลุ่มพบกันทุกคน ระบบคำนวณจำนวนรอบให้จากจำนวนผู้เล่น" },
  { name: "Knockout", tag: "เหมาะกับรอบชิง", text: "ผู้แพ้ตกรอบ ผู้ชนะผ่านเข้าสู่สายการแข่งขันรอบต่อไป" },
  { name: "Custom", tag: "กิจกรรมพิเศษ", text: "สำหรับ GO Survival, Boss Battle หรือกติกาที่ไม่ใช่การแข่งขันมาตรฐาน" },
];

export default function SetupPage() {
  return (
    <section className="section-shell page-section setup-layout">
      <aside className="setup-sidebar">
        <span className="eyebrow">SETUP WIZARD</span><h1>สร้างการแข่งขัน</h1>
        <ol>
          <li className="done">ข้อมูลงาน</li><li className="current">รูปแบบการแข่งขัน</li><li>รุ่นและผู้เล่น</li><li>กติกาการจับคู่</li><li>คะแนนและอันดับ</li><li>ตรวจสอบและเปิดงาน</li>
        </ol>
        <button className="button button-secondary">บันทึกฉบับร่าง</button>
      </aside>
      <div className="setup-content">
        <div className="setup-intro"><span>ขั้นตอนที่ 2 จาก 6</span><h2>เลือกรูปแบบการแข่งขัน</h2><p>เลือกรูปแบบหลักของ Stage นี้ ระบบจะเตรียมค่าที่เหมาะสมให้ คุณสามารถแก้ไขเพิ่มเติมภายหลังได้</p></div>
        <div className="recommendation"><strong>คำแนะนำ</strong><p>หากมีผู้เล่นประมาณ 32 คนและต้องการแข่งให้จบภายในวันเดียว แนะนำ <b>Swiss 5 รอบ</b></p></div>
        <div className="format-grid">
          {formats.map((format, index) => (
            <article className={index === 0 ? "format-card selected" : "format-card"} key={format.name}>
              <div><span className="radio-dot" /><h3>{format.name}</h3></div>
              <strong>{format.tag}</strong><p>{format.text}</p>
              <button type="button">อ่านวิธีตั้งค่าแบบเต็ม →</button>
            </article>
          ))}
        </div>
        <div className="setup-actions"><button className="button button-secondary">ย้อนกลับ</button><button className="button button-primary">ใช้ Swiss และไปต่อ</button></div>
      </div>
    </section>
  );
}
