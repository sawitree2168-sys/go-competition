"use client";
/* eslint-disable @next/next/no-img-element -- local object URL preview */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEW = 280;     // on-screen crop square (css px)
const OUT = 400;      // saved photo: 400×400 JPEG
const MAX_BYTES = 290_000;

type Props = { file: File; onCancel: () => void; onDone: (blob: Blob) => void };

/** Square photo crop: drag to move, slider / pinch / wheel to zoom, rotate 90°. Saves a 400×400 JPEG. */
export default function PhotoCropper({ file, onCancel, onDone }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(VIEW);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  // Object URL lives exactly as long as this effect (safe under StrictMode's mount → unmount → mount).
  useEffect(() => {
    const u = URL.createObjectURL(file);
    queueMicrotask(() => setSrc(u));
    return () => URL.revokeObjectURL(u);
  }, [file]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => setView(entry.contentRect.width || VIEW));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const turned = rot % 180 !== 0;
  const ew = nat ? (turned ? nat.h : nat.w) : 1, eh = nat ? (turned ? nat.w : nat.h) : 1;
  const scale = (view / Math.min(ew, eh)) * zoom;
  const clamp = (p: { x: number; y: number }, s = scale) => {
    const mx = Math.max(0, (ew * s - view) / 2), my = Math.max(0, (eh * s - view) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  };
  const shown = clamp(pos);

  const setZoomTo = (z: number) => setZoom(Math.min(4, Math.max(1, z)));

  const down = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };
  const move = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      setZoomTo(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist));
      return;
    }
    setPos(clamp({ x: shown.x + (e.clientX - prev.x), y: shown.y + (e.clientY - prev.y) }));
  };
  const up = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const save = async () => {
    const img = imgRef.current;
    if (!img || !nat) return;
    setSaving(true);
    const canvas = document.createElement("canvas");
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, OUT, OUT);
    const k = OUT / view;
    ctx.translate(OUT / 2 + shown.x * k, OUT / 2 + shown.y * k);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(scale * k, scale * k);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -nat.w / 2, -nat.h / 2);
    let blob: Blob | null = null;
    for (const q of [0.88, 0.78, 0.65, 0.5]) {
      blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= MAX_BYTES) break;
    }
    setSaving(false);
    if (blob) onDone(blob);
  };

  const host = typeof document !== "undefined" ? ((document.querySelector(".gt") as HTMLElement | null) ?? document.body) : null;
  if (!host) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="crop-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="max-h-full w-full max-w-sm overflow-y-auto overscroll-contain rounded-2xl bg-[var(--gt-surface)] p-3 text-[var(--gt-ink)] shadow-xl sm:p-4">
        <h3 id="crop-title" className="text-lg font-bold">ครอปรูปนักกีฬา</h3>
        <p className="text-sm text-[var(--gt-muted)]">ลากเพื่อเลื่อน · ซูมด้วยแถบด้านล่าง (มือถือใช้สองนิ้วได้)</p>
        {failed ? (
          <p role="alert" className="mt-4 rounded-xl border border-[var(--gt-bad)] px-3 py-3 text-sm text-[var(--gt-bad)]">เปิดไฟล์รูปนี้ไม่ได้ กรุณาเลือกรูปแบบ JPG หรือ PNG</p>
        ) : (
          <>
            <div
              ref={stageRef}
              className="relative mx-auto mt-3 aspect-square max-w-full cursor-grab touch-none select-none overflow-hidden rounded-xl bg-[var(--gt-surface-2)] active:cursor-grabbing"
              style={{ width: VIEW }}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              onWheel={(e) => setZoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
            >
              {src && <img ref={imgRef} src={src} alt="" draggable={false}
                onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                onError={() => setFailed(true)}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{ width: nat?.w, height: nat?.h, visibility: nat ? "visible" : "hidden", transform: `translate(-50%, -50%) translate(${shown.x}px, ${shown.y}px) rotate(${rot}deg) scale(${scale})` }} />}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] ring-2 ring-white/90" />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span aria-hidden="true" className="text-sm">−</span>
              <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoomTo(Number(e.target.value))} aria-label="ซูม" className="min-w-0 flex-1 accent-[var(--gt-cta)]" />
              <span aria-hidden="true" className="text-sm">+</span>
              <button type="button" onClick={() => { setRot((r) => (r + 90) % 360); setPos({ x: 0, y: 0 }); }} className="gt-outline-btn min-h-10 shrink-0 px-3 text-sm font-semibold">หมุน ↻</button>
            </div>
          </>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="gt-outline-btn min-h-12 font-semibold">ยกเลิก</button>
          <button type="button" onClick={save} disabled={!nat || failed || saving} className="gt-cta-btn min-h-12 disabled:opacity-60">{saving ? "กำลังบันทึก…" : "ใช้รูปนี้"}</button>
        </div>
      </div>
    </div>,
    host,
  );
}
