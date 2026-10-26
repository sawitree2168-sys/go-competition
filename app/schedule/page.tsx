import Link from "next/link";

export default function TournamentSchedulePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-blue-700">GO TOURNAMENT</p>
        <h1 className="mt-2 text-2xl font-bold">ปฏิทินการแข่งขัน</h1>
        <p className="mt-4 text-slate-600">
          ยังไม่มีรายการแข่งขันที่ได้รับการยืนยันจากฐานข้อมูล GO TOURNAMENT ให้แสดง
          ระบบจะนำรายการมาแสดงเมื่อเชื่อมต่อฐานข้อมูลและตรวจสอบข้อมูลสำเร็จ
        </p>
        <Link href="/athletes/search" className="mt-6 inline-flex rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white">
          ค้นหานักกีฬาก่อนสมัคร
        </Link>
      </section>
    </main>
  );
}
