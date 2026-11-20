import type { Metadata } from "next";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import ResetPeople from "./ResetPeople";

export const metadata: Metadata = { title: "รีเซ็ตรหัสผ่านให้นักเรียน / ครู · GO TOURNAMENT" };

export default function Page() {
  return (
    <div className="min-h-screen">
      <Shell wide>
        <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar /></div>
        <div className="mx-auto max-w-2xl px-4 py-6"><ResetPeople /></div>
      </Shell>
    </div>
  );
}
