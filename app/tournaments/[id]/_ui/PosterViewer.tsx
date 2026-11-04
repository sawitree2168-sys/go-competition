"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Poster thumbnail; one tap opens the whole poster full screen.
 * Opens fitted to the screen; + / − (or double-tap) zooms, then drag/scroll to read details.
 */
export default function PosterViewer({ src, thumb, alt, className = "" }: { src: string; thumb: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "+" || e.key === "=") setScale((v) => Math.min(4, v + 0.5));
      if (e.key === "-") setScale((v) => Math.max(1, v - 0.5));
    };
    document.addEventListener("keydown", onKey);
    const back = opener.current;
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); back?.focus(); };
  }, [open]);

  const zoom = (d: number) => setScale((v) => Math.max(1, Math.min(4, v + d)));

  return (
    <>
      <button ref={opener} type="button" onClick={() => { setScale(1); setOpen(true); }} aria-label={`ดูโปสเตอร์เต็มจอ: ${alt}`}
        className={`group relative shrink-0 overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- small local thumbnail */}
        <img src={thumb} alt={alt} className="h-full w-full object-cover object-top" />
        <span className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
        </span>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[100] flex flex-col bg-[#040c1c]/95 text-white" style={{ height: "100dvh" }}>
          <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => zoom(-0.5)} disabled={scale <= 1} aria-label="ย่อ" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl disabled:opacity-40">−</button>
              <span className="w-12 text-center text-sm tabular-nums" aria-live="polite">{Math.round(scale * 100)}%</span>
              <button type="button" onClick={() => zoom(0.5)} disabled={scale >= 4} aria-label="ขยาย" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl disabled:opacity-40">+</button>
            </div>
            <button ref={closeBtn} type="button" onClick={() => setOpen(false)} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0b2a5b]">ปิด</button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain" onDoubleClick={() => setScale((v) => (v > 1 ? 1 : 2.5))}>
            <div className="flex min-h-full items-center justify-center p-3" style={{ width: `${scale * 100}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- full poster, loaded only when opened */}
              <img src={src} alt={alt} draggable={false} className="h-auto w-full max-w-none select-none"
                style={scale === 1 ? { maxHeight: "calc(100dvh - 7rem)", width: "auto", maxWidth: "100%" } : undefined} />
            </div>
          </div>
          <p className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 text-center text-xs text-white/70">แตะสองครั้งหรือกด + เพื่อขยาย แล้วเลื่อนดูรายละเอียด</p>
        </div>
      )}
    </>
  );
}

