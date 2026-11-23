import type { Metadata } from "next";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import AccountView from "./AccountView";

export const metadata: Metadata = { title: "บัญชีของฉัน · GO TOURNAMENT" };

export default function Account() {
  return (
    <div className="min-h-screen">
      <Shell fullWidth>
        <SiteBar />
        <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6"><AccountView /></main>
      </Shell>
    </div>
  );
}
