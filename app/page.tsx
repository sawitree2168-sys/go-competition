export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <header className="bg-slate-900 text-white px-6 py-4">
        <div className="text-xl font-bold">
          GO TOURNAMENT
        </div>
      </header>

      {/* HERO */}
      <section className="bg-white px-6 py-12 text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          ระบบแข่งขันหมากล้อม
        </h1>

        <p className="mt-3 text-slate-600">
          สมัครแข่งขัน • ตารางแข่งขัน • ผลการแข่งขัน • ข่าวสาร
        </p>
      </section>

      {/* MENU GRID */}
      <section className="px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">

          <div className="bg-white p-4 rounded-xl shadow text-center">📢 ประกาศการแข่งขัน</div>
          <div className="bg-white p-4 rounded-xl shadow text-center">📰 ข่าวสาร</div>
          <div className="bg-white p-4 rounded-xl shadow text-center">👥 รายชื่อนักแข่ง</div>
          <div className="bg-white p-4 rounded-xl shadow text-center">📅 ตารางแข่งขัน</div>
          <div className="bg-white p-4 rounded-xl shadow text-center">🏆 ผลการแข่งขัน</div>
          <div className="bg-white p-4 rounded-xl shadow text-center">⭐ อันดับคะแนน</div>
          <div className="bg-white p-4 rounded-xl shadow text-center">📄 ใบประกาศ</div>
          <div className="bg-white p-4 rounded-xl shadow text-center">📝 สมัครแข่งขัน</div>

        </div>
      </section>

    </main>
  );
}