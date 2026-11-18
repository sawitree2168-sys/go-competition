import type { Metadata } from "next";
import GoFan from "./GoFan";
import { loadFanData } from "@/lib/go-fan-data";
import "@/app/competition/competition.css";
import "./go-fan.css";
export const metadata: Metadata = { title: "GO FAN | ติดตามผลการแข่งขันนักกีฬา", description:"ค้นหาชื่อ กดติดตาม ดูผลจับคู่และผลการแข่งขันโดยไม่ต้องล็อกอิน" };
export const revalidate = 30;
export default async function Page({ searchParams }: { searchParams: Promise<{event?:string}> }) {
  const { event }=await searchParams;
  return <GoFan initial={await loadFanData(event)} />;
}
