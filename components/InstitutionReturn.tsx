"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import MenuIcon from "./MenuIcon";

/** Saved by the institution page so teachers can always find their way back to it. */
export const INSTITUTION_RETURN_KEY = "gt-institution-return";
type Saved = { href: string; name: string };

/**
 * A "กลับหน้าสถาบัน" button on every other page for teachers / institution owners who opened the institution page
 * (e.g. after tapping a student's profile). Hidden on the institution, organiser and referee pages.
 */
export default function InstitutionReturn() {
  const pathname = usePathname();
  const [saved, setSaved] = useState<Saved | null>(null);
  useEffect(() => {
    let next: Saved | null = null;
    try {
      const raw = window.localStorage.getItem(INSTITUTION_RETURN_KEY);
      const v = raw ? JSON.parse(raw) : null;
      if (v && typeof v.href === "string" && v.href.startsWith("/institution")) next = { href: v.href, name: String(v.name ?? "") };
    } catch { next = null; }
    queueMicrotask(() => setSaved(next));
  }, [pathname]);
  if (!saved || /^\/(institution|organizer|referee)(\/|$)/.test(pathname)) return null;
  return (
    <Link href={saved.href} className="gt-institution-return" aria-label={`กลับหน้าสถาบัน ${saved.name}`}>
      <MenuIcon name="school" className="h-5 w-5 shrink-0" />
      <span className="min-w-0 truncate">กลับหน้าสถาบัน{saved.name ? ` · ${saved.name}` : ""}</span>
    </Link>
  );
}
