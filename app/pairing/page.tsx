import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "ระบบจับคู่" };

export default function PairingPage() {
  return (
    <section className="section-shell page-section">
      <div className="page-title">
        <span className="eyebrow">PAIRING CONTROL</span>
        <h1>ระบบจับคู่การแข่งขัน</h1>
        <p>พื้นที่ทำงานสำหรับผู้จัดและกรรมการ แยกจากหน้าสาธารณะอย่างชัดเจน</p>
      </div>
      <div className="metric-grid">
        <div><small>ผู้เล่นที่เช็กชื่อ</small><strong>64</strong><span>จาก 68 คน</span></div>
        <div><small>รอบปัจจุบัน</small><strong>3 / 5</strong><span>Swiss System</span></div>
        <div><small>ผลที่ส่งแล้ว</small><strong>26 / 32</strong><span>เหลือ 6 คู่</span></div>
        <div><small>การแจ้งเตือน</small><strong>2</strong><span>ต้องตรวจสอบ</span></div>
      </div>
      <div className="workflow-card">
        <h2>ลำดับการทำงาน</h2>
        <div className="workflow-steps">
          <span className="done">1 เช็กชื่อ</span><span className="done">2 ยืนยันผู้เล่น</span><span className="current">3 จับคู่</span><span>4 ลงผล</span><span>5 ประกาศอันดับ</span>
        </div>
        <div className="notice warning"><strong>โหมดตัวอย่าง</strong><p>Pairing Engine เดิมยังไม่ได้ย้ายเข้าหน้านี้ เพื่อรอ Ruleset และ Golden Tests ป้องกันคู่ซ้ำและการคำนวณ SOS ผิด</p></div>
        <Link className="button button-primary" href="/admin/setup">ตรวจการตั้งค่าการแข่งขัน</Link>
      </div>
    </section>
  );
}
