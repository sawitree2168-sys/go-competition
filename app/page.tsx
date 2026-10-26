import Link from "next/link";

const features = [
  { icon: "♟", title: "สมัครแข่งขัน", detail: "ตรวจสอบประวัตินักกีฬาเดิมก่อนสมัครใหม่", href: "/athletes/search" },
  { icon: "▦", title: "ปฏิทินการแข่งขัน", detail: "แสดงเฉพาะรายการที่ยืนยันข้อมูลแล้ว", href: "/schedule" },
  { icon: "◎", title: "ค้นหานักกีฬา", detail: "ดูข้อมูลที่ได้รับอนุญาตจากฐานข้อมูล", href: "/athletes/search" },
];
export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f6fb] text-[#132a4e]">
      <header className="bg-[#0b2854] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <Link href="/" className="font-bold tracking-wider text-[#efc875] sm:text-xl">GO TOURNAMENT</Link>
          <span className="rounded-full border border-white/30 px-3 py-1 text-xs sm:text-sm">เว็บไซต์ระหว่างพัฒนา</span>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#123e7a] to-[#071d41] p-7 text-white shadow-xl sm:p-12">
          <p className="mb-3 font-semibold tracking-widest text-[#f0cc77]">GO TOURNAMENT</p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">ศูนย์กลางการแข่งขันหมากล้อมและประวัตินักกีฬา</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-blue-100 sm:text-lg">
            ระบบรับสมัคร ตรวจสอบนักกีฬา ติดตามผลการแข่งขัน และสถิติในที่เดียว
          </p>
          <div className="mt-7 rounded-xl border border-amber-300/40 bg-white/10 p-4 text-sm leading-relaxed">
            <strong>กำลังพัฒนาระบบ</strong>
            <p className="mt-1 text-blue-100">ยังไม่เปิดรับสมัครจริง และยังไม่ได้เชื่อมฐานข้อมูล GO TOURNAMENT โปรดอย่าส่งข้อมูลส่วนตัวหรือหลักฐานชำระเงินผ่านเว็บไซต์ทดสอบนี้</p>
          </div>
          <Link href="/athletes/search" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f0c96f] px-6 py-3 font-bold text-[#102850]">
            ทดลองหน้าค้นหานักกีฬา
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-xl font-bold sm:text-2xl">เมนูระบบ</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <span aria-hidden="true" className="text-3xl text-blue-700">{feature.icon}</span>
              <h3 className="mt-3 text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.detail}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-blue-700">ดูหน้าระบบ ›</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold">รายการแข่งขันที่เปิดรับสมัคร</h2>
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-slate-600">
            ยังไม่สามารถตรวจสอบรายการแข่งขันจากฐานข้อมูลได้ในขณะนี้
          </div>
        </div>
      </section>
      <footer className="border-t bg-white py-7 text-center text-sm text-slate-500">© GO TOURNAMENT · ระบบทดสอบก่อนเปิดใช้งานจริง</footer>
    </main>
  );
}
