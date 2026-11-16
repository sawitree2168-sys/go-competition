import type { Metadata } from "next";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import AccountView from "./AccountView";

export const metadata: Metadata = { title: "บัญชีของฉัน · GO TOURNAMENT" };

export default function Account() {
  return (
    <div className="min-h-screen">
      <Shell wide>
        <div className="relative left-1/2 w-screen -translate-x-1/2"><SiteBar /></div>
        <div className="mx-auto max-w-2xl px-4 py-6"><AccountView /></div>
      </Shell>
    </div>
  );
}
