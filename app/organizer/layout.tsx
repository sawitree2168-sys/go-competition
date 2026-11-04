import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import { themeBootScript } from "../tournaments/[id]/_ui/ThemeToggle";
import "../tournaments/[id]/_ui/theme.css";
import { StaffProvider } from "./_lib/staff";
import OrganizerBar from "./_lib/OrganizerBar";

const prompt = Prompt({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-gt", display: "swap" });

export const metadata: Metadata = {
  title: "ผู้จัดการแข่งขัน | GO TOURNAMENT",
  robots: { index: false, follow: false },
};

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`gt ${prompt.variable} min-h-screen w-full`} suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <StaffProvider>
        <OrganizerBar />
        <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-4">{children}</main>
      </StaffProvider>
    </div>
  );
}
