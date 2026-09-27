import type { Metadata } from "next";

export const metadata: Metadata = { title: "ผลการแข่งขันสด" };

const pairings = [
  ["1", "ผู้เล่น A", "สโมสร 1", "ผู้เล่น B", "สโมสร 2", "รอผล"],
  ["2", "ผู้เล่น C", "สโมสร 3", "ผู้เล่น D", "สโมสร 4", "ดำชนะ"],
  ["3", "ผู้เล่น E", "สโมสร 2", "ผู้เล่น F", "สโมสร 1", "กำลังแข่ง"],
  ["4", "ผู้เล่น G", "สโมสร 4", "ผู้เล่น H", "สโมสร 3", "รอผล"],
];

export default function LivePage() {
  return (
    <section className="section-shell page-section">
      <div className="live-header">
        <div className="page-title compact">
          <span className="eyebrow">LIVE TOURNAMENT</span>
          <h1>ตารางจับคู่และผลสด</h1>
          <p>GO Tournament Demo · รุ่น Open · รอบที่ 3 จาก 5</p>
        </div>
        <div className="live-badge"><span className="live-dot" /> กำลังแข่งขัน</div>
      </div>
      <div className="round-tabs">
        <button>รอบ 1</button><button>รอบ 2</button><button className="filter-active">รอบ 3</button>
        <button disabled>รอบ 4</button><button disabled>รอบ 5</button>
      </div>
      <div className="table-card">
        <div className="pairing-table pairing-head"><span>โต๊ะ</span><span>ดำ</span><span>ขาว</span><span>สถานะ</span></div>
        {pairings.map(([board, black, blackClub, white, whiteClub, result]) => (
          <div className="pairing-table" key={board}>
            <strong className="board-number">{board}</strong>
            <span><b className="mini-stone black" /><strong>{black}</strong><small>{blackClub}</small></span>
            <span><b className="mini-stone white" /><strong>{white}</strong><small>{whiteClub}</small></span>
            <span className={result === "กำลังแข่ง" ? "result-live" : "result-wait"}>{result}</span>
          </div>
        ))}
      </div>
      <p className="data-note">ข้อมูลตัวอย่างสมมติสำหรับวางโครงหน้า Live — จะเชื่อม Supabase Realtime ในขั้นถัดไป</p>
    </section>
  );
}
