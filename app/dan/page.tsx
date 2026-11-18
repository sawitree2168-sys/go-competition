import type { Metadata } from "next";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import DanBoard, { type Board } from "./DanBoard";

export const metadata: Metadata = { title: "ประกาศรายชื่อดั้งใหม่ · GO TOURNAMENT" };

// The association updates its list a few times a month; rebuild at most every 10 minutes.
export const revalidate = 600;

async function load(): Promise<Board | null> {
  const db = publicDb();
  if (!db) return null;
  const { data, error } = await db.rpc("gt_dan_board_v1");
  return error || !data ? null : (data as Board);
}

export default async function DanPage() {
  const board = await load();
  return (
    <Shell wide>
      <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar current="/dan" /></div>
      {board
        ? <DanBoard board={board} />
        : <p className="gt-card m-4 p-6 text-center text-[var(--gt-muted)]">ยังโหลดรายชื่อดั้งไม่ได้ กรุณาลองใหม่อีกครั้ง</p>}
    </Shell>
  );
}
