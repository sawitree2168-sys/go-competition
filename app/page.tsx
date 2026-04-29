export default function Home() {
  const menuItems = [
    "ปฏิทินการแข่งขัน",
    "สมัครแข่งขัน",
    "ค้นหานักกีฬา",
    "ผลการแข่งขัน",
    "ติดต่อแอดมิน",
  ];

  const events = [
    "การแข่งขันหมากล้อมเยาวชน 2567",
    "ชิงชนะเลิศแห่งประเทศไทย 2567",
    "Go Tournament Open 2026",
  ];

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl">GO TOURNAMENT</div>
        <nav className="hidden md:flex gap-6 text-sm">
          <span>หน้าแรก</span>
          <span>ปฏิทินการแข่งขัน</span>
          <span>ผลการแข่งขัน</span>
          <span>ข่าวสาร</span>
        </nav>
      </header>

      <section className="bg-slate-900 text-white px-6 py-14">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-yellow-400 mb-3">เปิดรับสมัคร</p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              การแข่งขันหมากล้อม
              <br />
              ชิงชนะเลิศแห่งประเทศไทย
            </h1>
            <p className="mt-4 text-slate-300">
              สมัครแข่งขัน ดูตาราง ตรวจผล และติดตามข่าวสารได้ในที่เดียว
            </p>
            <button className="mt-6 bg-blue-600 px-6 py-3 rounded-xl font-bold">
              สมัครแข่งขัน
            </button>
          </div>

          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <div className="text-7xl">🏆</div>
            <p className="mt-4 text-xl font-bold">GO MASTER CUP 2026</p>
            <p className="text-slate-300">เงินรางวัลรวมกว่า 100,000 บาท</p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {menuItems.map((item) => (
            <div
              key={item}
              className="bg-white rounded-2xl shadow p-5 text-center font-bold"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold">รายการแข่งขันที่เปิดรับสมัคร</h2>
          <button className="text-blue-600 font-bold">ดูทั้งหมด</button>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {events.map((event) => (
            <div key={event} className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="bg-slate-800 text-white h-36 flex items-center justify-center text-5xl">
                ⚫⚪
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg">{event}</h3>
                <p className="text-sm text-slate-500 mt-2">
                  25 - 26 พฤษภาคม 2567 · กรุงเทพมหานคร
                </p>
                <button className="mt-4 w-full bg-green-600 text-white py-2 rounded-xl font-bold">
                  เปิดรับสมัคร
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}