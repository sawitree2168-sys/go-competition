import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { athletes, getAthlete } from "@/lib/athletes";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return athletes.map((athlete) => ({ id: athlete.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const athlete = getAthlete(decodeURIComponent(id));
  return { title: athlete ? `${athlete.displayName} | ข้อมูลนักกีฬา` : "ไม่พบนักกีฬา" };
}

export default async function AthleteProfilePage({ params }: Props) {
  const { id } = await params;
  const athlete = getAthlete(decodeURIComponent(id));
  if (!athlete) notFound();

  const totalWins = athlete.events.reduce((sum, event) => sum + event.wins, 0);
  const totalLosses = athlete.events.reduce((sum, event) => sum + event.losses, 0);
  const played = totalWins + totalLosses;
  const winRate = played ? Math.round((totalWins / played) * 100) : 0;

  return (
    <section className="section-shell page-section">
      <Link className="text-link" href="/athletes">← กลับไปค้นหานักกีฬา</Link>

      <div className="mt-5 grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[120px_1fr_auto] md:p-7">
        <div className="grid h-[150px] w-[120px] place-items-center rounded-2xl bg-gradient-to-br from-blue-100 to-slate-200 text-4xl font-black text-blue-700 dark:from-blue-950 dark:to-slate-800">
          {athlete.displayName.slice(-1)}
        </div>
        <div>
          <span className="eyebrow">ATHLETE PROFILE</span>
          <h1 className="mt-1 text-3xl font-black">{athlete.displayName}</h1>
          <p className="mt-1 text-sm text-slate-500">{athlete.id}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">{athlete.level}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">{athlete.institute}</span>
          </div>
        </div>
        <div className="min-w-48 rounded-2xl bg-slate-950 p-5 text-white">
          <small className="text-slate-300">{athlete.ratingLabel}</small>
          <strong className="mt-2 block text-3xl">{athlete.ratingValue ?? "ยังไม่กำหนด"}</strong>
          <p className="mt-2 text-xs leading-5 text-slate-300">{athlete.ratingNote}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><small className="text-slate-500">รายการแข่งขัน</small><strong className="mt-1 block text-2xl">{athlete.events.length}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><small className="text-slate-500">ชนะ</small><strong className="mt-1 block text-2xl text-emerald-600">{totalWins}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><small className="text-slate-500">แพ้</small><strong className="mt-1 block text-2xl">{totalLosses}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><small className="text-slate-500">อัตราชนะ</small><strong className="mt-1 block text-2xl">{winRate}%</strong></div>
      </div>

      <div className="mt-7">
        <div className="section-heading">
          <div><span className="eyebrow">TOURNAMENT HISTORY</span><h2>ประวัติการแข่งขัน</h2></div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr><th className="p-4">วันที่ / รายการแข่งขัน</th><th className="p-4">รุ่น</th><th className="p-4">อันดับ</th><th className="p-4 text-center">ชนะ</th><th className="p-4 text-center">แพ้</th><th className="p-4 text-center">คะแนนงาน</th><th className="p-4 text-center">SOS</th></tr>
            </thead>
            <tbody>
              {athlete.events.map((event) => (
                <tr className="border-t border-slate-200 dark:border-slate-700" key={`${event.date}-${event.tournament}`}>
                  <td className="p-4"><strong className="block">{event.tournament}</strong><span className="text-xs text-slate-500">{event.date}</span></td>
                  <td className="p-4">{event.division}</td><td className="p-4 font-bold">{event.rank}</td>
                  <td className="p-4 text-center font-bold text-emerald-600">{event.wins}</td><td className="p-4 text-center">{event.losses}</td>
                  <td className="p-4 text-center font-bold">{event.score}</td><td className="p-4 text-center">{event.sos ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">“คะแนนงาน” คือคะแนนที่ได้ในรายการนั้น ไม่ใช่คะแนนสะสมระดับคิว ส่วนคะแนนสะสมจะแสดงเมื่อกติกากลางได้รับการอนุมัติแล้ว</p>
      </div>
    </section>
  );
}
