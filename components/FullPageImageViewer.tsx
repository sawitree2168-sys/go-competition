"use client";

import { useEffect, useRef, useState } from "react";

type FullPageImageViewerProps = {
  src: string;
  alt: string;
  label?: string;
  className?: string;
};

/**
 * One tap opens an image in a full-viewport reader, not a cropped modal.
 * Supports zoom controls, browser pinch-to-zoom and keyboard shortcuts.
 * This is intentionally opt-in: existing approved layouts are not replaced.
 */
export default function FullPageImageViewer({ src, alt, label = "ดูภาพเต็มหน้า", className = "" }: FullPageImageViewerProps) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "+" || event.key === "=") setScale(v => Math.min(4, +(v + .25).toFixed(2)));
      if (event.key === "-") setScale(v => Math.max(1, +(v - .25).toFixed(2)));
      if (event.key === "Tab") {
        const controls = document.querySelectorAll<HTMLButtonElement>("[data-image-viewer-control]");
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      opener.current?.focus();
    };
  }, [open]);
  const zoom = (amount: number) => setScale(v => Math.max(1, Math.min(4, +(v + amount).toFixed(2))));
  return (
    <>
      <button ref={opener} type="button" className={className} onClick={() => { setScale(1); setOpen(true); }} aria-label={label}>
        <img src={src} alt={alt} className="block max-w-full h-auto" />
        <span className="block text-sm underline mt-2">{label}</span>
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt || "ภาพเต็มหน้า"} className="fixed inset-0 z-[1000] bg-white text-black flex flex-col" style={{ height: "100dvh" }}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 bg-white">
            <strong className="text-base sm:text-lg">{alt || "ภาพเต็มหน้า"}</strong>
            <div className="flex items-center gap-2">
              <button data-image-viewer-control type="button" className="rounded border px-3 py-2 text-lg" onClick={() => zoom(-.25)} disabled={scale <= 1} aria-label="ย่อภาพ">−</button>
              <output aria-live="polite" className="min-w-14 text-center">{Math.round(scale * 100)}%</output>
              <button data-image-viewer-control type="button" className="rounded border px-3 py-2 text-lg" onClick={() => zoom(.25)} disabled={scale >= 4} aria-label="ขยายภาพ">+</button>
              <button data-image-viewer-control type="button" className="rounded border px-3 py-2" onClick={() => setScale(1)}>ขนาดปกติ</button>
              <button data-image-viewer-control ref={closeButton} type="button" className="rounded bg-black text-white px-4 py-2" onClick={() => setOpen(false)}>ปิด</button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto overscroll-contain p-3 sm:p-6" tabIndex={0} aria-label="เลื่อนดูภาพที่ขยาย">
            <div className="min-w-full min-h-full flex items-center justify-center">
              <img src={src} alt={alt} draggable={false} style={{ width: `${scale * 100}%`, maxWidth: "none", height: "auto", objectFit: "contain" }} />
            </div>
          </div>
          <p className="px-3 py-2 text-xs text-gray-700 border-t">กด + เพื่อขยาย กด − เพื่อย่อ หรือเลื่อนหน้าจอเพื่อดูส่วนที่ขยาย</p>
        </div>
      )}
    </>
  );
}
