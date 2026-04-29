export default function CompetitionPage() {
  return (
    <main className="bg-gray-50 min-h-screen">

      {/* HEADER */}
      <section className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8">
        
        {/* IMAGE */}
        <div>
          <img
            src="/go-poster.jpg"
            className="rounded-xl shadow w-full"
          />
        </div>

        {/* INFO */}
        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-black">
            การแข่งขันหมากล้อม ชิงชนะเลิศแห่งประเทศไทย 2567
          </h1>

          <div className="text-gray-600 space-y-2 text-sm">
            <p>📅 25 - 26 พฤษภาคม 2567</p>
            <p>📍 กรุงเทพมหานคร</p>
            <p>👥 รับสมัคร 500 คน</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow text-sm text-gray-700">
            การแข่งขันหมากล้อมระดับประเทศ สำหรับเยาวชนและบุคคลทั่วไป
            เพื่อพัฒนาทักษะการคิด วิเคราะห์ และแข่งขันอย่างมืออาชีพ
          </div>

          <button className="w-full bg-green-500 text-white py-3 rounded-lg text-lg">
            สมัครแข่งขัน
          </button>
        </div>
      </section>

      {/* DETAIL */}
      <section className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-6 pb-16">

        {/* SCHEDULE */}
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-bold text-black mb-4">
            กำหนดการแข่งขัน
          </h2>

          <div className="text-sm text-gray-700 space-y-2">
            <p>08:30 - 09:00 ลงทะเบียน</p>
            <p>09:00 - 12:00 รอบที่ 1-2</p>
            <p>13:00 - 16:00 รอบที่ 3-4</p>
            <p>16:00 - 17:00 รอบชิงชนะเลิศ</p>
          </div>
        </div>

        {/* CATEGORY */}
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-bold text-black mb-4">
            รุ่นการแข่งขัน
          </h2>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="bg-gray-100 p-2 rounded">รุ่น 3-4 คิว</span>
            <span className="bg-gray-100 p-2 rounded">รุ่น 5-6 คิว</span>
            <span className="bg-gray-100 p-2 rounded">รุ่น 7-10 คิว</span>
            <span className="bg-gray-100 p-2 rounded">รุ่นโอเพ่น</span>
          </div>
        </div>

        {/* CONTACT */}
        <div className="bg-white p-5 rounded-xl shadow md:col-span-2">
          <h2 className="font-bold text-black mb-4">
            ติดต่อสอบถาม
          </h2>

          <div className="text-sm text-gray-700 space-y-2">
            <p>📞 081-234-5678</p>
            <p>📧 admin@gotournament.com</p>
            <p>LINE: @gotournament</p>
          </div>
        </div>

      </section>

    </main>
  );
}