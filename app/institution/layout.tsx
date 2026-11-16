import type { Metadata } from "next";
import { themeBootScript } from "../tournaments/[id]/_ui/ThemeToggle";
import "../tournaments/[id]/_ui/theme.css";

export const metadata: Metadata = {
  title: "หน้าสถาบัน | GO TOURNAMENT",
  description: "พื้นที่ครูดูแลนักเรียนและจัดการการแข่งขันหมากล้อม",
  robots: { index: false, follow: false },
};

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gt min-h-screen w-full" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <main className="w-full">{children}</main>
    </div>
  );
}
