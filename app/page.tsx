export default function Home() {
  return (
    <main className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-2 gap-8 items-center">
        
        {/* TEXT */}
        <div>
          <p className="text-blue-600 mb-2 text-sm sm:text-base">
            การแข่งขันหมากล้อม
          </p>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black leading-tight mb-4">
            การแข่งขันหมากล้อม <br />
            ชิงชนะเลิศแห่งประเทศไทย 2567
          </h1>

          <p className="text-gray-600 mb-4 text-sm sm:text-base">
            Thailand Go Championship 2024
          </p>

          <div className="text-sm text-gray-600 space-y-1">
            <p>📅 25 - 26 พฤษภาคม 2567</p>
            <p>📍 กรุงเทพมหานคร</p>
          </div>

          <button className="mt-6 w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            ดูรายละเอียด
          </button>
        </div>

        {/* IMAGE */}
        <div className="relative">
          <img
            src="/go-poster.jpg"
            className="rounded-2xl shadow-lg w-full"
          />

          <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto bg-blue-600 text-white px-4 py-2 rounded-lg shadow text-sm sm:text-base">
            GO CUP 2026 <br />
            เงินรางวัลรวมกว่า 100,000 บาท
          </div>
        </div>

      </section>

      {/* MENU */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">

          {[
            "ปฏิทินการแข่งขัน",
            "สมัครแข่งขัน",
            "ค้นหานักกีฬา",
            "ผลการแข่งขัน",
            "ติดต่อแอดมิน",
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 sm:p-6 text-center shadow hover:shadow-md cursor-pointer"
            >
              <p className="font-semibold text-black text-sm sm:text-base">
                {item}
              </p>
            </div>
          ))}

        </div>
      </section>

      {/* LIST */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-lg sm:text-xl font-bold mb-6 text-black">
          รายการแข่งขันที่เปิดรับสมัคร
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow overflow-hidden">
              
              <img src="/go-poster.jpg" className="h-40 w-full object-cover" />

              <div className="p-4 space-y-2 text-sm text-gray-700">
                <p className="font-semibold text-black">
                  การแข่งขันหมากล้อม 2567
                </p>

                <p>📅 25 - 26 พ.ค. 2567</p>
                <p>📍 กรุงเทพมหานคร</p>
                <p>👥 7 รุ่นการแข่งขัน</p>

                <button className="mt-3 w-full bg-green-500 text-white py-2 rounded-lg">
                  เปิดรับสมัคร
                </button>
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-sm text-gray-500 flex flex-col sm:flex-row justify-between gap-3">
          
          <span className="text-center sm:text-left">
            © 2024 GO Tournament
          </span>

          <div className="flex justify-center sm:justify-end gap-4">
            <span>เกี่ยวกับเรา</span>
            <span>ติดต่อ</span>
            <span>เงื่อนไข</span>
          </div>

        </div>
      </footer>

    </main>
  );
}