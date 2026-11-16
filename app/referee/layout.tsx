import type { Metadata } from "next";
import { themeBootScript } from "../tournaments/[id]/_ui/ThemeToggle";
import "../tournaments/[id]/_ui/theme.css";


export const metadata: Metadata = {
  title: "กรรมการ | GO TOURNAMENT",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RefereeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gt min-h-screen w-full" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <main className="w-full">{children}</main>
    </div>
  );
}
