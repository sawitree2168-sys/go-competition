export default function Home() {
  const menu = [
    { label: "ปฏิทินการแข่งขัน", icon: "📅" },
    { label: "สมัครแข่งขัน", icon: "📝" },
    { label: "ค้นหานักกีฬา", icon: "🔍" },
    { label: "ผลการแข่งขัน", icon: "🏆" },
    { label: "ติดต่อแอดมิน", icon: "📞" },
  ];

  const events = [
    "การแข่งขันหมากล้อมเยาวชน 2567",
    "ชิงชนะเลิศแห่งประเทศไทย 2567",
    "Go Tournament Open 2026",
  ];

  return (
    <main className="bg-slate-100 min-h-screen">

      {/* NAVBAR */}
      <header className="bg-slate-950 text-white px-8 py-4 flex justify-between">
        <div className="font-bold text-xl">GO TOURNAMENT</div>
        <div className="flex gap-6 text-sm">
          <span>หน้าแรก</span>
          <span>ปฏิทินการแข่งขัน</span>
          <span>ผลการแข่งขัน</span>
          <span>ข่าวสาร</span>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">

          <div>
            <p className="text-yellow-400 mb-2">เปิดรับสมัคร</p>

            <h1 className="text-5xl font-bold leading-tight">
              การแข่งขันหมากล้อม
              <br />
              ชิงชนะเลิศแห่งประเทศไทย
            </h1>

            <p className="mt-4 text-slate-300">
              สมัครแข่งขัน ดูตาราง ตรวจผล และติดตามข่าวสารในที่เดียว
            </p>

            <button className="mt-6 bg-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-700">
              สมัครแข่งขัน
            </button>
          </div>

          <div className="bg-slate-700/50 backdrop-blur rounded-2xl p-8 text-center shadow-lg">
            <div className="text-6xl">🏆</div>
            <p className="mt-3 font-bold text-lg">GO MASTER CUP 2026</p>
            <p className="text-slate-300">เงินรางวัลกว่า 100,000 บาท</p>
          </div>

        </div>
      </section>

      {/* MENU */}
      <section className="max-w-6xl mx-auto px-6 -mt-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {menu.map((m) => (
            <div
              key={m.label}
              className="bg-white rounded-2xl shadow-md p-5 text-center hover:shadow-xl transition"
            >
              <div className="text-2xl">{m.icon}</div>
              <p className="mt-2 font-semibold text-sm">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EVENTS */}
      <section className="max-w-6xl mx-auto px-6 py-12">

        <div className="flex justify-between mb-6">
          <h2 className="text-2xl font-bold">
            รายการแข่งขันที่เปิดรับสมัคร
          </h2>
          <span className="text-blue-600 font-semibold cursor-pointer">
            ดูทั้งหมด
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition"
            >

              <div className="bg-slate-800 h-40 flex items-center justify-center text-5xl text-white">
                ⚫⚪
              </div>

              <div className="p-5">
                <h3 className="font-bold">{event}</h3>

                <p className="text-sm text-slate-500 mt-2">
                  25 - 26 พฤษภาคม 2567 · กรุงเทพมหานคร
                </p>

                <button className="mt-4 w-full bg-green-600 text-white py-2 rounded-xl font-bold hover:bg-green-700">
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