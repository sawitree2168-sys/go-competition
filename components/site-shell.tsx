"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { href: "/", th: "หน้าหลัก", en: "Home" },
  { href: "/tournaments", th: "รายการแข่งขัน", en: "Tournaments" },
  { href: "/live", th: "ผลสด", en: "Live" },
  { href: "/pairing", th: "จับคู่", en: "Pairing" },
];

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [language, setLanguage] = useState<"th" | "en">("th");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("go-theme");
    const storedLanguage = window.localStorage.getItem("go-language");
    if (storedTheme === "dark") {
      setDark(true);
      document.documentElement.dataset.theme = "dark";
    }
    if (storedLanguage === "en") setLanguage("en");
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("go-theme", next ? "dark" : "light");
  }

  function toggleLanguage() {
    const next = language === "th" ? "en" : "th";
    setLanguage(next);
    window.localStorage.setItem("go-language", next);
    document.documentElement.lang = next;
  }

  return (
    <div className="site-frame">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="GO Tournament Home">
            <span className="brand-symbol"><i /><b /></span>
            <span><strong>GO</strong> TOURNAMENT<small>PLAY • PAIR • PERFORM</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="เมนูหลัก">
            {navigation.map((item) => (
              <Link className={pathname === item.href ? "active" : ""} href={item.href} key={item.href}>
                {language === "th" ? item.th : item.en}
              </Link>
            ))}
          </nav>
          <div className="header-tools">
            <button type="button" onClick={toggleLanguage} aria-label="เปลี่ยนภาษา">
              {language === "th" ? "EN" : "TH"}
            </button>
            <button type="button" onClick={toggleTheme} aria-label="เปลี่ยนโหมดสี">
              {dark ? "☀" : "◐"}
            </button>
            <Link className="admin-link" href="/admin/setup">{language === "th" ? "สำหรับผู้จัด" : "Organizer"}</Link>
          </div>
        </div>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <div className="section-shell footer-inner">
          <span>© 2026 GO Tournament</span>
          <span>ระบบจัดการแข่งขันหมากล้อมที่ออกแบบเพื่อผู้จัด ผู้เล่น และผู้ชม</span>
        </div>
      </footer>
      <nav className="mobile-nav" aria-label="เมนูมือถือ">
        {navigation.map((item, index) => (
          <Link className={pathname === item.href ? "active" : ""} href={item.href} key={item.href}>
            <span>{["⌂", "▦", "●", "⌘"][index]}</span>
            {language === "th" ? item.th : item.en}
          </Link>
        ))}
        <Link className={pathname.startsWith("/admin") ? "active" : ""} href="/admin/setup">
          <span>⚙</span>{language === "th" ? "ตั้งค่า" : "Setup"}
        </Link>
      </nav>
    </div>
  );
}
