import type { Metadata } from "next";
import { themeBootScript } from "../tournaments/[id]/_ui/ThemeToggle";
import "../tournaments/[id]/_ui/theme.css";
import "./organizer-reference.css";
import { StaffProvider } from "./_lib/staff";
import OrganizerBar from "./_lib/OrganizerBar";
import { EventDayProvider } from "./_lib/EventDay";
import AlertBar from "./_lib/AlertBar";


export const metadata: Metadata = {
  title: "ผู้จัดการแข่งขัน | GO TOURNAMENT",
  robots: { index: false, follow: false },
};

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gt site-operations min-h-screen w-full" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <StaffProvider>
        <OrganizerBar />
        <EventDayProvider>
          <AlertBar />
          <main className="mx-auto w-full max-w-7xl px-3 pb-16 pt-4 sm:px-5">{children}</main>
        </EventDayProvider>
      </StaffProvider>
    </div>
  );
}
