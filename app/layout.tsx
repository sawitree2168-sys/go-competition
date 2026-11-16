import type { Metadata } from "next";
// Prompt (Google Fonts, OFL-1.1) served from this site via @fontsource: Thai + Latin, 400 / 500 / 600.
import "@fontsource/prompt/400.css";
import "@fontsource/prompt/500.css";
import "@fontsource/prompt/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GO TOURNAMENT | การแข่งขันหมากล้อม",
  description: "ติดตามรายการแข่งขันหมากล้อม สมัครแข่งขัน และดูผลการแข่งขัน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
