export default function Home() {
  return (
    <main className="min-h-screen bg-[#eef3f8] text-[#06152c]">
      <header className="bg-[#06152c] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl">
              ⚫⚪
            </div>
            <div className="leading-tight">
              <div className="text-xl font-extrabold">GO</div>
              <div className="text-xs tracking-widest">TOURNAMENT</div>
            </div>
          </div>

          <nav className="hidden gap-6 text-sm font-bold md:flex">
            <span>หน้าแรก</span>
            <span>ปฏิทินการแข่งขัน</span>
            <span>ค้นหานักกีฬา</span>
            <span>ผลการแข่งขัน</span>
            <span>ข่าวสาร</span>
          </nav>
        </div>
      </header>

      <section className="bg-[#06152c] px-6 pb-20 pt-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 font-bold text-[#f6c453]">
              การแข่งขันหมากล้อม
            </p>

            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
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

          {/* ตัวอย่างโปสเตอร์ */}
          <div className="rounded-3xl bg-gradient-to-br from-[#e0a33a] via-[#b67922] to-[#111827] p-6 shadow-2xl">
            <div className="relative h-[360px] overflow-hidden rounded-2xl bg-[#c98935] p-6">
              <div className="absolute inset-0 opacity-30">
                <div className="grid h-full grid-cols-9 grid-rows-9">
                  {Array.from({ length: 81 }).map((_, i) => (
                    <div key={i} className="border border-black/25" />
                  ))}
                </div>
              </div>

              <div className="absolute left-10 top-10 h-12 w-12 rounded-full bg-black shadow-xl" />
              <div className="absolute left-24 top-16 h-12 w-12 rounded-full bg-white shadow-xl" />
              <div className="absolute left-40 top-28 h-12 w-12 rounded-full bg-black shadow-xl" />
              <div className="absolute left-56 top-20 h-12 w-12 rounded-full bg-white shadow-xl" />

              <div className="absolute bottom-8 right-8 text-7xl">🏆</div>

              <div className="absolute bottom-8 left-8">
                <p className="text-sm font-bold text-white/80">
                  GO TOURNAMENT
                </p>
                <h2 className="mt-1 text-3xl font-extrabold text-white">
                  GO CUP 2026
                </h2>
                <p className="mt-1 text-white/80">
                  เงินรางวัลรวมกว่า 100,000 บาท
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-12 max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-white p-4 shadow-xl md:grid-cols-5">
          {[
            ["📅", "ปฏิทินการแข่งขัน", "ดูรายการแข่งขันทั้งหมด"],
            ["📄", "สมัครแข่งขัน", "สมัครเข้าร่วมการแข่งขัน"],
            ["🔍", "ค้นหานักกีฬา", "ค้นหาข้อมูลและสถิติ"],
            ["🏆", "ผลการแข่งขัน", "ดูผลการแข่งขันสด"],
            ["💬", "ติดต่อแอดมิน", "สอบถามข้อมูลเพิ่มเติม"],
          ].map(([icon, title, desc]) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-100 p-5 text-center"
            >
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-3 font-extrabold">{title}</h3>
              <p className="mt-1 text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">
            รายการแข่งขันที่เปิดรับสมัคร
          </h2>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            ดูทั้งหมด
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          {[
            "การแข่งขันหมากล้อมเยาวชนภาคเหนือ 2567",
            "ชิงชนะเลิศแห่งประเทศไทย 2567",
            "การแข่งขันหมากล้อมเยาวชนภาคตะวันออก 2567",
            "การแข่งขันหมากล้อมเยาวชนภาคใต้ 2567",
          ].map((title, index) => (
            <article key={title} className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="h-36 bg-gradient-to-br from-[#06152c] to-[#c98935] p-4 text-white">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs">
                  เปิดรับสมัคร
                </span>
                <h3 className="mt-12 text-sm font-extrabold">{title}</h3>
              </div>

              <div className="space-y-2 p-4 text-sm">
                <p>📅 25 - 26 พ.ค. 2567</p>
                <p>📍 กรุงเทพมหานคร</p>
                <p>👥 7 รุ่นการแข่งขัน</p>
                <p>💰 ค่าสมัคร {index === 1 ? "500" : "400"} บาท</p>

                <button className="mt-3 w-full rounded-lg bg-green-600 py-2 font-bold text-white">
                  เปิดรับสมัคร
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}