export default function Home() {
  const menuItems = [
    { icon: "📅", title: "ปฏิทินการแข่งขัน", desc: "ดูรายการแข่งขันทั้งหมด" },
    { icon: "📄", title: "สมัครแข่งขัน", desc: "สมัครเข้าร่วมการแข่งขัน" },
    { icon: "🔍", title: "ค้นหานักกีฬา", desc: "ค้นหาข้อมูลและสถิติ" },
    { icon: "🏆", title: "ผลการแข่งขัน", desc: "ดูผลการแข่งขันสด" },
    { icon: "💬", title: "ติดต่อแอดมิน", desc: "สอบถามข้อมูลเพิ่มเติม" },
  ];

  const events = [
    "การแข่งขันหมากล้อมเยาวชนชิงแชมป์ภาคเหนือ 2567",
    "ชิงชนะเลิศแห่งประเทศไทย 2567",
    "การแข่งขันหมากล้อมเยาวชนภาคตะวันออกเฉียงเหนือ 2567",
    "การแข่งขันหมากล้อมเยาวชนภาคใต้ 2567",
  ];

  return (
    <main className="min-h-screen bg-[#f3f7fb] text-[#0f172a]">
      <header className="bg-[#06152c] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow">
              <span className="text-xl">⚫⚪</span>
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-wide">GO</div>
              <div className="-mt-1 text-xs font-semibold tracking-widest text-slate-300">
                TOURNAMENT
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a>หน้าแรก</a>
            <a>ปฏิทินการแข่งขัน</a>
            <a>ค้นหานักกีฬา</a>
            <a>ผลการแข่งขัน</a>
            <a>ข่าวสาร</a>
            <button className="rounded-lg border border-white/30 px-4 py-2">
              เข้าสู่ระบบ
            </button>
            <button className="rounded-lg bg-white px-4 py-2 text-[#06152c]">
              สมัครสมาชิก
            </button>
          </nav>
        </div>
      </header>

      <section className="bg-[#06152c]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-20 pt-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold text-[#f6c453]">
              การแข่งขันหมากล้อม
            </p>

            <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl">
              การแข่งขันหมากล้อม
              <br />
              ชิงชนะเลิศแห่งประเทศไทย 2567
            </h1>

            <p className="mt-4 text-lg text-slate-300">
              Thailand Go Championship 2024
            </p>

            <div className="mt-5 space-y-2 text-sm text-slate-300">
              <p>📅 25 - 26 พฤษภาคม 2567</p>
              <p>📍 ณ หอประชุมเมืองไทยรัชดาลัย กรุงเทพมหานคร</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#d99b32] via-[#b77a24] to-[#1b2437] p-8 shadow-2xl">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-yellow-300/20 blur-3xl" />
            <div className="relative mx-auto aspect-[4/3] max-w-md rounded-xl bg-[#c98935] p-5 shadow-inner">
              <div className="grid h-full grid-cols-9 grid-rows-7 gap-1 opacity-60">
                {Array.from({ length: 63 }).map((_, i) => (
                  <div key={i} className="border border-black/20" />
                ))}
              </div>
              <div className="absolute left-16 top-16 h-9 w-9 rounded-full bg-black shadow" />
              <div className="absolute left-28 top-20 h-9 w-9 rounded-full bg-white shadow" />
              <div className="absolute left-40 top-28 h-9 w-9 rounded-full bg-black shadow" />
              <div className="absolute left-52 top-20 h-9 w-9 rounded-full bg-white shadow" />
              <div className="absolute right-12 bottom-10 text-6xl">🏆</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-12 max-w-7xl px-5">
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-3 shadow-xl md:grid-cols-5">
          {menuItems.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-100 bg-white p-5 text-center transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="text-3xl">{item.icon}</div>
              <h3 className="mt-3 font-bold">{item.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">
            รายการแข่งขันที่เปิดรับสมัคร
          </h2>
          <button className="rounded-lg bg-[#0b5bd3] px-4 py-2 text-sm font-bold text-white">
            ดูทั้งหมด
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          {events.map((event, index) => (
            <article
              key={event}
              className="overflow-hidden rounded-2xl bg-white shadow-md"
            >
              <div className="relative h-36 bg-gradient-to-br from-[#06152c] via-[#17345f] to-[#c98935] p-4 text-white">
                <div className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-xs">
                  เปิดรับสมัคร
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-sm font-extrabold leading-snug">
                    {event}
                  </h3>
                </div>
              </div>

              <div className="space-y-2 p-4 text-sm">
                <p>📅 25 - 26 พ.ค. 2567</p>
                <p>📍 กรุงเทพมหานคร</p>
                <p>👥 7 รุ่นการแข่งขัน</p>
                <p>💰 ค่าสมัคร {index === 1 ? "500" : "400"} บาท</p>

                <button
                  className={`mt-3 w-full rounded-lg py-2 font-bold ${
                    index === 1
                      ? "bg-orange-500 text-white"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {index === 1 ? "ใกล้ปิดรับสมัคร" : "เปิดรับสมัคร"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}