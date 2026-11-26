"use client";

import { useState, type RefObject } from "react";

const safeName = (s: string) => s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").slice(0, 120);

/** Draws the element as a PNG (export-ignore parts such as these buttons are left out). */
export async function capture(el: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  await Promise.all(Array.from(el.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined)));
  const { toCanvas } = await import("html-to-image");
  const width = Math.max(el.clientWidth, el.scrollWidth);
  const height = el.scrollHeight;
  const canvas = await toCanvas(el, {
    width, height, backgroundColor: "#ffffff", pixelRatio: Math.min(2, 12000 / Math.max(width, height)),
    style: { width: `${width}px`, maxWidth: "none", height: `${height}px`, maxHeight: "none", overflow: "visible" },
    filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === "true"),
  });
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG failed"))), "image/png"));
}

/**
 * "แชร์" + "บันทึกรูป" for a card on the institution page. Share sends the picture when the phone allows it
 * (LINE, Facebook…), otherwise the text and link; save downloads the picture.
 */
export default function ShareSave({ target, filename, text, url, shareLabel = "แชร์ผล" }: { target: RefObject<HTMLElement | null>; filename: string; text: string; url?: string; shareLabel?: string }) {
  const [busy, setBusy] = useState<"" | "share" | "save">("");
  const [note, setNote] = useState("");

  async function save() {
    if (!target.current || busy) return;
    setBusy("save"); setNote("");
    try {
      const blob = await capture(target.current);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = href; a.download = `${safeName(filename)}.png`; a.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 60000);
      setNote("บันทึกรูปแล้ว");
    } catch { setNote("บันทึกรูปไม่สำเร็จ ลองใหม่อีกครั้ง"); }
    setBusy("");
  }

  async function share() {
    if (busy) return;
    setBusy("share"); setNote("");
    const link = url ? new URL(url, window.location.origin).toString() : undefined;
    try {
      let file: File | null = null;
      if (target.current) {
        try { file = new File([await capture(target.current)], `${safeName(filename)}.png`, { type: "image/png" }); } catch { file = null; }
      }
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: filename, text: link ? `${text}\n${link}` : text });
      else if (navigator.share) await navigator.share({ title: filename, text, url: link });
      else { await navigator.clipboard.writeText(link ? `${text}\n${link}` : text); setNote("คัดลอกข้อความแล้ว นำไปวางในไลน์ได้เลย"); }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setNote("แชร์ไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
    setBusy("");
  }

  return (
    <div data-export-ignore="true" className="space-y-1">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void share()} disabled={!!busy} className="gt-cta-btn flex min-h-12 items-center justify-center gap-1.5 px-3 disabled:opacity-60">
          {busy === "share" ? "กำลังเตรียม…" : <>{shareLabel} <span aria-hidden="true">↗</span></>}
        </button>
        <button type="button" onClick={() => void save()} disabled={!!busy} className="gt-outline-btn flex min-h-12 items-center justify-center gap-1.5 px-3 disabled:opacity-60">
          {busy === "save" ? "กำลังสร้างรูป…" : <>บันทึกรูป <span aria-hidden="true">↓</span></>}
        </button>
      </div>
      {note && <p role="status" className="text-center text-xs text-[var(--gt-muted)]">{note}</p>}
    </div>
  );
}
