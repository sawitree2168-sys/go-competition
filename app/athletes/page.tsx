import type { Metadata } from "next";
import { AthleteSearch } from "./athlete-search";
import { listPublicAthletes } from "@/lib/data/athletes";

export const metadata: Metadata = { title: "ค้นหานักกีฬา" };

export default async function AthletesPage() {
  const athletes = await listPublicAthletes();

  return (
    <section className="section-shell page-section">
      <div className="page-title">
        <span className="eyebrow">ATHLETE DIRECTORY</span>
        <h1>ค้นหาข้อมูลนักกีฬา</h1>
        <p>ค้นหาจากชื่อ รหัสนักกีฬา สถาบัน หรือระดับฝีมือ แล้วกดดูประวัติการแข่งขันและคะแนน</p>
      </div>

      <AthleteSearch athletes={athletes} />

      <div className="mt-8 rounded-2xl bg-slate-100 p-5 text-sm leading-6 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <strong className="text-slate-900 dark:text-white">ความเป็นส่วนตัว</strong>
        <p className="mt-1">หน้านี้แสดงเฉพาะข้อมูลการแข่งขันที่ได้รับอนุญาต ไม่แสดงวันเกิด เบอร์โทร อีเมล ข้อมูลผู้ปกครอง หรือเอกสารส่วนตัว</p>
      </div>
    </section>
  );
}
