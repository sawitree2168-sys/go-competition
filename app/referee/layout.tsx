import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import { themeBootScript } from "../tournaments/[id]/_ui/ThemeToggle";
import "../tournaments/[id]/_ui/theme.css";

const prompt = Prompt({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-gt", display: "swap" });

export const metadata: Metadata = {
  title: "กรรมการ | GO TOURNAMENT",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RefereeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`gt ${prompt.variable} min-h-screen w-full`} suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-4">{children}</main>
    </div>
  );
}
