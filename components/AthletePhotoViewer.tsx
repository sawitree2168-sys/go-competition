"use client";
/* eslint-disable @next/next/no-img-element -- show the original athlete photo without cropping */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AthleteAvatar from "./AthleteAvatar";
import { DEFAULT_ATHLETE_PHOTO as AVATAR, athletePhotoSource, sharpPhotoWidth } from "@/lib/athlete-photo.mjs";

export default function AthletePhotoViewer({ src, name }: { src?: string | null; name: string }) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(() => athletePhotoSource(src));
  const [displayWidth, setDisplayWidth] = useState<number | null>(null);
  const isAvatar = photo === AVATAR;
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
    <button ref={opener} className="cd-photo-open" type="button" aria-label={`ดูรูปนักกีฬา ${name} แบบขยาย`} onClick={() => { setPhoto(athletePhotoSource(src)); setDisplayWidth(null); setOpen(true); }}>
      <AthleteAvatar src={src} name={name} className="cd-avatar" />
    </button>
    {open && createPortal(<dialog ref={dialog} className="cd-athlete-photo-dialog" aria-label={`รูปนักกีฬา ${name}`}
      onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="cd-athlete-photo-header"><strong>{name}</strong><button type="button" autoFocus onClick={() => setOpen(false)}>✕ ปิดรูป</button></div>
      <div className="cd-athlete-photo-stage">
        <img src={photo} alt={name} decoding="async"
          style={{ width: isAvatar ? "min(100%, 360px)" : displayWidth ? `${displayWidth}px` : "auto", visibility: !isAvatar && !displayWidth ? "hidden" : "visible" }}
          onLoad={event => setDisplayWidth(sharpPhotoWidth(event.currentTarget.naturalWidth, window.devicePixelRatio))}
          onError={() => { if (!isAvatar) { setPhoto(AVATAR); setDisplayWidth(null); } }} />
      </div>
      {!isAvatar && !displayWidth && <p role="status">กำลังโหลดรูป…</p>}
      {isAvatar ? <p>นักกีฬายังไม่มีรูปที่แสดงได้</p> : <p>แสดงภาพตามความละเอียดต้นฉบับ เพื่อคงความคมชัด</p>}
    </dialog>, document.body)}
  </>;
}
