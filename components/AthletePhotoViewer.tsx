"use client";
/* eslint-disable @next/next/no-img-element -- show the original athlete photo without cropping */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AthleteAvatar from "./AthleteAvatar";
import { AVATAR } from "@/lib/public-site";

export default function AthletePhotoViewer({ src, name }: { src?: string | null; name: string }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const reader = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    reader?.showModal();
    return () => {
      reader?.close();
      document.body.style.overflow = overflow;
      opener.current?.focus();
    };
  }, [open]);
  return <>
    <button ref={opener} className="cd-photo-open" type="button" aria-label={`ดูรูปนักกีฬา ${name} แบบขยาย`} onClick={() => setOpen(true)}>
      <AthleteAvatar src={src} name={name} className="cd-avatar" />
    </button>
    {open && createPortal(<dialog ref={dialog} className="cd-athlete-photo-dialog" aria-label={`รูปนักกีฬา ${name}`}
      onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="cd-athlete-photo-header"><strong>{name}</strong><button type="button" autoFocus onClick={() => setOpen(false)}>✕ ปิดรูป</button></div>
      <img src={src || AVATAR} alt={name} onError={event => { if (!event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = "true"; event.currentTarget.src = AVATAR; } }} />
      {!src && <p>นักกีฬายังไม่ได้เพิ่มรูปโปรไฟล์</p>}
    </dialog>, document.body)}
  </>;
}
