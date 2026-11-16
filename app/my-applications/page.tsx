import type { Metadata } from "next";
import { Shell } from "../tournaments/[id]/_ui/chrome";
import SiteBar from "../tournaments/[id]/_ui/SiteBar";
import MyApplications from "./MyApplications";

export const metadata: Metadata = { title: "สถานะการสมัคร" };

// สถานะการสมัคร: the applicant's entries, with withdraw / swap / change division under the organiser's conditions.
export default async function MyApplicationsPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <Shell wide>
      <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar /></div>
      <main className="mx-auto max-w-2xl px-3 pt-5 sm:px-4">
        <h1 className="text-2xl font-bold sm:text-3xl">สถานะการสมัคร</h1>
        <p className="mt-1 text-[var(--gt-muted)]">ใบสมัครของคุณ พร้อมสถานะและรุ่นที่ลงไว้ · ขอถอนตัว เปลี่ยนคน หรือเปลี่ยนรุ่นได้ตามเงื่อนไขของผู้จัด</p>
        <MyApplications initialRef={(ref ?? "").slice(0, 12)} />
      </main>
    </Shell>
  );
}
