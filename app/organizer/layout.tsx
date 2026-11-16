import type { Metadata } from "next";
import { themeBootScript } from "../tournaments/[id]/_ui/ThemeToggle";
import "../tournaments/[id]/_ui/theme.css";
import { StaffProvider } from "./_lib/staff";
import OrganizerBar from "./_lib/OrganizerBar";


export const metadata: Metadata = {
  title: "ผู้จัดการแข่งขัน | GO TOURNAMENT",
  robots: { index: false, follow: false },
};

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gt min-h-screen w-full" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <StaffProvider>
        <OrganizerBar />
        <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-4">{children}</main>
      </StaffProvider>
    </div>
  );
}
