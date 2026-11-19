"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { athletePhotoSource, DEFAULT_ATHLETE_PHOTO } from "@/lib/athlete-photo.mjs";

/** Native modal stays above page navigation and restores focus after closing. */
export default function PhotoZoom({ src, name, className = "", children }: { src: string | null | undefined; name: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const modal = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal?.showModal();
    return () => { modal?.close(); document.body.style.overflow = overflow; trigger.current?.focus(); };
  }, [open]);
  return <>
    <button ref={trigger} type="button" data-athlete-photo="true" onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      aria-label={`ดูรูปของ ${name} ขนาดใหญ่`} className={`cursor-zoom-in rounded-lg ${className}`}>{children}</button>
    {open && createPortal(<dialog ref={dialog} className="gt-photo-zoom" aria-label={`รูปของ ${name}`}
      onClose={() => setOpen(false)} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="gt-photo-zoom-content">
        <button type="button" autoFocus className="gt-outline-btn" onClick={() => setOpen(false)}>✕ ปิดรูป</button>
        <img src={athletePhotoSource(src)} alt={`รูปของ ${name}`} onError={e => { if (!e.currentTarget.src.endsWith(DEFAULT_ATHLETE_PHOTO)) e.currentTarget.src = DEFAULT_ATHLETE_PHOTO; }} />
        <p>{name}</p>{!src && <p>นักกีฬายังไม่ได้เพิ่มรูปถ่าย</p>}
      </div>
    </dialog>, document.body)}
  </>;
}
