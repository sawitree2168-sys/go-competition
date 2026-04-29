export default function Home() {
  const menuItems = [
    { icon: "📅", title: "ปฏิทินการแข่งขัน", desc: "ดูรายการแข่งขันทั้งหมด" },
    { icon: "📄", title: "สมัครแข่งขัน", desc: "สมัครเข้าร่วมการแข่งขัน" },
    { icon: "🔍", title: "ค้นหานักกีฬา", desc: "ค้นหาข้อมูลและสถิติ" },
    { icon: "🏆", title: "ผลการแข่งขัน", desc: "ดูผลการแข่งขันสด" },
    { icon: "💬", title: "ติดต่อแอดมิน", desc: "สอบถามข้อมูลเพิ่มเติม" },
  ];

  const events = [
    { title: "การแข่งขันหมากล้อมเยาวชนชิงแชมป์ภาคเหนือ 2567", fee: "400", status: "เปิดรับสมัคร" },
    { title: "ชิงชนะเลิศแห่งประเทศไทย 2567", fee: "500", status: "ใกล้ปิดรับสมัคร" },
    { title: "การแข่งขันหมากล้อมเยาวชนภาคตะวันออกเฉียงเหนือ 2567", fee: "400", status: "เปิดรับสมัคร" },
    { title: "การแข่งขันหมากล้อมเยาวชนภาคใต้ 2567", fee: "400", status: "เปิดรับสมัคร" },
  ];

  return (
    <main className="min-h-screen bg-[#f4f8ff] text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b5bd3] text-white shadow">
              ●
            </div>
            <div>
              <div className="text-xl font-black text-[#0b5bd3]">GO</div>
              <div className="-mt-1 text-xs font-bold tracking-widest text-[#111827]">
                TOURNAMENT
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-bold text-[#111827] md:flex">
            <span>หน้าแรก</span>
            <span>ปฏิทินการแข่งขัน</span>
            <span>ค้นหานักกีฬา</span>
            <span>ผลการแข่งขัน</span>
            <span>ข่าวสาร</span>
            <button className="rounded-lg border border-[#0b5bd3] px-4 py-2 text-[#0b5bd3]">
              เข้าสู่ระบบ
            </button>
            <button className="rounded-lg bg-[#0b5bd3] px-4 py-2 text-white shadow">
              สมัครสมาชิก
            </button>
          </nav>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <p className="mb-3 text-sm font-bold text-[#0b5bd3]">
              การแข่งขันหมากล้อม
            </p>

            <h1 className="text-4xl font-black leading-tight text-[#111827] md:text-5xl">
              การแข่งขันหมากล้อม
              <br />
              ชิงชนะเลิศแห่งประเทศไทย 2567
            </h1>

            <p className="mt-4 text-lg text-slate-700">
              Thailand Go Championship 2024
            </p>

            <div className="mt-5 space-y-2 text-sm text-slate-700">
              <p>📅 25 - 26 พฤษภาคม 2567</p>
              <p>📍 ณ หอประชุมเมืองไทยรัชดาลัย กรุงเทพมหานคร</p>
            </div>

            <button className="mt-6 rounded-lg bg-[#0b5bd3] px-6 py-3 font-bold text-white shadow hover:bg-blue-700">
              ดูรายละเอียด
            </button>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <img
              src="/go-poster.jpg"
              alt="Go Tournament Poster"
              className="h-[360px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/20 to-transparent" />
            <div className="absolute bottom-6 left-6 rounded-2xl bg-[#0b5bd3] px-6 py-4 text-white shadow-lg">
              <p className="text-sm font-bold opacity-90">GO CUP 2026</p>
              <p className="text-xl font-black">เงินรางวัลรวมกว่า 100,000 บาท</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5">
        <div className="grid grid-cols-2 gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:grid-cols-5">
          {menuItems.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                {item.icon}
              </div>
              <h3 className="mt-3 font-black text-[#111827]">{item.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-[#111827]">
            รายการแข่งขันที่เปิดรับสมัคร
          </h2>
          <button className="rounded-lg border border-[#0b5bd3] px-4 py-2 text-sm font-bold text-[#0b5bd3]">
            ดูทั้งหมด
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {events.map((event) => (
            <article
              key={event.title}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src="/go-poster.jpg"
                  alt={event.title}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                <div
                  className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white ${
                    event.status === "เปิดรับสมัคร"
                      ? "bg-green-600"
                      : "bg-orange-500"
                  }`}
                >
                  {event.status}
                </div>

                <h3 className="absolute bottom-4 left-4 right-4 text-sm font-black leading-snug text-white">
                  {event.title}
                </h3>
              </div>

              <div className="space-y-2 p-4 text-sm text-[#111827]">
                <p>📅 25 - 26 พ.ค. 2567</p>
                <p>📍 กรุงเทพมหานคร</p>
                <p>👥 7 รุ่นการแข่งขัน</p>
                <p>💰 ค่าสมัคร {event.fee} บาท</p>

                <button
                  className={`mt-3 w-full rounded-lg py-2 font-black text-white shadow ${
                    event.status === "เปิดรับสมัคร"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-orange-500 hover:bg-orange-600"
                  }`}
                >
                  {event.status}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}