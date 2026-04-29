export default function Home() {
  const menuItems = [
    { icon: "📅", title: "ปฏิทินการแข่งขัน", desc: "ดูรายการแข่งขันทั้งหมด" },
    { icon: "📄", title: "สมัครแข่งขัน", desc: "สมัครเข้าร่วมการแข่งขัน" },
    { icon: "🔍", title: "ค้นหานักกีฬา", desc: "ค้นหาข้อมูลและสถิติ" },
    { icon: "🏆", title: "ผลการแข่งขัน", desc: "ดูผลการแข่งขันสด" },
    { icon: "💬", title: "ติดต่อแอดมิน", desc: "สอบถามข้อมูลเพิ่มเติม" },
  ];

  const events = [
    {
      title: "การแข่งขันหมากล้อมเยาวชนชิงแชมป์ภาคเหนือ 2567",
      fee: "400",
      status: "เปิดรับสมัคร",
      color: "green",
    },
    {
      title: "ชิงชนะเลิศแห่งประเทศไทย 2567",
      fee: "500",
      status: "ใกล้ปิดรับสมัคร",
      color: "orange",
    },
    {
      title: "การแข่งขันหมากล้อมเยาวชนภาคตะวันออกเฉียงเหนือ 2567",
      fee: "400",
      status: "เปิดรับสมัคร",
      color: "green",
    },
    {
      title: "การแข่งขันหมากล้อมเยาวชนภาคใต้ 2567",
      fee: "400",
      status: "เปิดรับสมัคร",
      color: "green",
    },
  ];

  return (
    <main className="min-h-screen bg-[#eef4fa] text-[#07162f]">
      <header className="bg-[#07162f] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-full bg-white shadow-lg">
              <div className="absolute left-2 top-3 h-6 w-6 rounded-full bg-black" />
              <div className="absolute right-2 top-3 h-6 w-6 rounded-full border border-black bg-white" />
            </div>

            <div className="leading-tight">
              <div className="text-xl font-black">GO</div>
              <div className="text-xs font-bold tracking-widest text-slate-300">
                TOURNAMENT
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-bold md:flex">
            <span>หน้าแรก</span>
            <span>ปฏิทินการแข่งขัน</span>
            <span>ค้นหานักกีฬา</span>
            <span>ผลการแข่งขัน</span>
            <span>ข่าวสาร</span>
            <button className="rounded-lg border border-white/30 px-4 py-2">
              เข้าสู่ระบบ
            </button>
            <button className="rounded-lg bg-white px-4 py-2 text-[#07162f]">
              สมัครสมาชิก
            </button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#07162f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(212,156,54,0.35),transparent_35%),linear-gradient(135deg,#07162f_0%,#092146_55%,#07162f_100%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-24 pt-10 md:grid-cols-[1fr_1.05fr] md:items-center">
          <div>
            <p className="mb-4 text-sm font-bold text-[#f6c453]">
              การแข่งขันหมากล้อม
            </p>

            <h1 className="text-4xl font-black leading-tight md:text-5xl">
              การแข่งขันหมากล้อม
              <br />
              ชิงชนะเลิศแห่งประเทศไทย 2567
            </h1>

            <p className="mt-4 text-lg text-slate-300">
              Thailand Go Championship 2024
            </p>

            <div className="mt-6 space-y-2 text-sm text-slate-300">
              <p>📅 25 - 26 พฤษภาคม 2567</p>
              <p>📍 ณ หอประชุมเมืองไทยรัชดาลัย กรุงเทพมหานคร</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <img
              src="/go-poster.jpg"
              alt="Go Tournament Poster"
              className="h-[360px] w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />

            <div className="absolute bottom-8 left-8 text-white">
              <p className="text-sm font-bold opacity-80">GO TOURNAMENT</p>
              <h2 className="mt-1 text-4xl font-black">GO CUP 2026</h2>
              <p className="mt-1 font-bold opacity-90">
                เงินรางวัลรวมกว่า 100,000 บาท
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-14 max-w-7xl px-5">
        <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur md:grid-cols-5">
          {menuItems.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-[#f7fbff] p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2ff] text-3xl">
                {item.icon}
              </div>
              <h3 className="mt-3 font-black">{item.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">
            รายการแข่งขันที่เปิดรับสมัคร
          </h2>
          <button className="rounded-lg bg-[#0b5bd3] px-4 py-2 text-sm font-bold text-white shadow">
            ดูทั้งหมด
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {events.map((event) => (
            <article
              key={event.title}
              className="overflow-hidden rounded-2xl bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src="/go-poster.jpg"
                  alt={event.title}
                  className="h-full w-full object-cover scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,200,100,0.25),transparent_60%)]" />

                <div className="absolute right-3 top-3 rounded-full bg-white/25 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                  {event.status}
                </div>

                <h3 className="absolute bottom-4 left-4 right-4 text-sm font-black leading-snug text-white">
                  {event.title}
                </h3>
              </div>

              <div className="space-y-2 p-4 text-sm">
                <p>📅 25 - 26 พ.ค. 2567</p>
                <p>📍 กรุงเทพมหานคร</p>
                <p>👥 7 รุ่นการแข่งขัน</p>
                <p>💰 ค่าสมัคร {event.fee} บาท</p>

                <button
                  className={`mt-3 w-full rounded-lg py-2 font-black text-white shadow ${
                    event.color === "orange" ? "bg-orange-500" : "bg-green-600"
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