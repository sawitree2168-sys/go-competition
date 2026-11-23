import type { Metadata } from "next";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import MyPhoto from "./MyPhoto";

export const metadata: Metadata = { title: "รูปและระดับฝีมือ · GO TOURNAMENT" };

export default function AccountPhotoPage() {
  return (
    <div className="min-h-screen">
      <Shell fullWidth>
        <SiteBar />
        <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6"><MyPhoto /></main>
      </Shell>
    </div>
  );
}
