import type { Metadata } from "next";
import { Geist } from "next/font/google";
import SiteShell from "@/components/site-shell";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "GO Tournament",
    template: "%s | GO Tournament",
  },
  description: "ระบบรับสมัคร จัดการแข่งขัน จับคู่ และแสดงผลการแข่งขันหมากล้อม",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={geist.variable}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
