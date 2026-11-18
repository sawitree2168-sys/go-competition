"use client";
/* eslint-disable @next/next/no-img-element -- athlete photos come from Supabase Storage */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Tap an athlete photo once to see it large. Wraps any avatar; does nothing when there is no photo
 * (the default avatar is not worth enlarging). Closes on tap anywhere, the close button or Esc.
 */
export default function PhotoZoom({ src, name, className = "", children }: { src: string | null | undefined; name: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [open]);

  if (!src) return <>{children}</>;
  return (
    <>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        aria-label={`ดูรูปของ ${name} ขนาดใหญ่`} className={`cursor-zoom-in rounded-full ${className}`}>
        {children}
      </button>
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={`รูปของ ${name}`} onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-[rgba(3,19,45,.88)] p-4">
          <img src={src} alt={`รูปของ ${name}`} className="aspect-square w-[min(92vw,480px)] rounded-2xl bg-white object-cover shadow-2xl ring-4 ring-white/80" />
          <p className="max-w-[92vw] text-center text-lg font-semibold text-white">{name}</p>
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-full bg-white/15 px-6 text-sm font-semibold text-white hover:bg-white/25">ปิด</button>
        </div>,
        document.body,
      )}
    </>
  );
}
