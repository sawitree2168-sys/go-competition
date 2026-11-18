import type { Metadata } from "next";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import ResultSubmit from "./ResultSubmit";

export const metadata: Metadata = { title: "ส่งผลการแข่งขัน · GO TOURNAMENT" };

export default function ResultSubmitPage() {
  return (
    <div className="min-h-screen">
      <Shell wide>
        <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar /></div>
        <div className="mx-auto max-w-3xl px-4 py-6"><ResultSubmit /></div>
      </Shell>
    </div>
  );
}
