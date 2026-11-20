"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** The same live content stays mounted when expanded; exports include every visible row. */
/**
 * `onClose`: the panel opens straight in full screen (e.g. from a "ดูเต็มจอ" button) and closing calls it.
 * The photo switch hides athlete pictures on screen and in the PNG / PDF at the same time.
 */
export default function CompetitionPanel({ children, className = "", title, context, onClose }: {
  children: ReactNode; className?: string; title: string; context: string; onClose?: () => void;
}) {
  const [includePhotos, setIncludePhotos] = useState(true);
  const [open, setOpen] = useState(false);
  const expanded = onClose ? true : open;
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const setExpanded = (v: boolean | ((x: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(expanded) : v;
    if (!next && onClose) onClose(); else setOpen(next);
  };
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const panel = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    const focused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    document.body.classList.add("cd-has-fullscreen");
    // A widened wrapper (translate / transform) would trap the fixed full-screen panel: lift those while open.
    const lifted: [HTMLElement, string, string][] = [];
    for (let el = panel.current?.parentElement; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (cs.translate !== "none" || cs.transform !== "none" || cs.filter !== "none") {
        lifted.push([el, el.style.getPropertyValue("translate"), el.style.getPropertyValue("transform")]);
        el.style.setProperty("translate", "none", "important");
        el.style.setProperty("transform", "none", "important");
      }
    }
    toggle.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (closeRef.current) closeRef.current(); else setOpen(false); }
      if (e.key !== "Tab") return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]') ?? []);
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.body.classList.remove("cd-has-fullscreen");
      for (const [el, t, tf] of lifted) { el.style.removeProperty("translate"); el.style.removeProperty("transform"); if (t) el.style.setProperty("translate", t); if (tf) el.style.setProperty("transform", tf); }
      document.removeEventListener("keydown", onKey);
      focused?.focus();
    };
  }, [expanded]);

  async function download(format: "png" | "pdf") {
    if (!content.current || busy) return;
    setBusy(format); setError("");
    try {
      await document.fonts.ready;
      const root = content.current;
      await Promise.all(Array.from(root.querySelectorAll("img")).map(img => img.decode().catch(() => undefined)));
      const { toCanvas } = await import("html-to-image");
      const width = Math.max(root.clientWidth, root.scrollWidth);
      const height = root.scrollHeight;
      const canvas = await toCanvas(root, {
        width, height, backgroundColor: "#ffffff", pixelRatio: Math.min(2, 16000 / Math.max(width, height)),
        style: { height: `${height}px`, maxHeight: "none", overflow: "visible" },
        filter: node => !(node instanceof HTMLElement && (node.dataset.exportIgnore === "true" || (!includePhotos && node.dataset.athletePhoto === "true"))),
      });
      const filename = (context.includes(title) ? context : `${context}-${title}`).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").slice(0, 160);
      if (format === "png") {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("PNG failed")), "image/png"));
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${filename}.png`; a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: width > 850 ? "landscape" : "portrait", unit: "mm", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth() - 16;
        const pageHeight = pdf.internal.pageSize.getHeight() - 16;
        const capacity = Math.floor(pageHeight * canvas.width / pageWidth);
        const top = root.getBoundingClientRect().top;
        const ratio = canvas.height / height;
        const boundaries = Array.from(root.querySelectorAll("tbody tr, .cd-rank-key")).map(el => Math.round((el.getBoundingClientRect().bottom - top) * ratio));
        for (let y = 0, page = 0; y < canvas.height; page++) {
          const limit = Math.min(canvas.height, y + capacity);
          const candidates = boundaries.filter(n => n > y && n <= limit);
          const end = limit === canvas.height ? limit : candidates.at(-1) ?? limit;
          const slice = document.createElement("canvas"); slice.width = canvas.width; slice.height = end - y;
          const ctx = slice.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable");
          ctx.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
          if (page) pdf.addPage();
          pdf.addImage(slice.toDataURL("image/png"), "PNG", 8, 8, pageWidth, slice.height * pageWidth / canvas.width);
          y = end;
        }
        pdf.save(`${filename}.pdf`);
      }
    } catch {
      setError("ดาวน์โหลดไม่สำเร็จ กรุณาลองอีกครั้งเมื่อเชื่อมต่ออินเทอร์เน็ต ภาพนักกีฬาอาจยังโหลดไม่ครบ");
    } finally { setBusy(null); }
  }

  return <section ref={panel} className={`cd-panel cd-download-panel ${className} ${expanded ? "cd-expanded" : ""} ${includePhotos ? "" : "gt-hide-photos"}`}
    role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={title}>
    <div className="cd-panel-controls" data-export-ignore="true">
      <span>{title}</span>
      <span className="cd-panel-buttons">
        <button type="button" aria-pressed={includePhotos} onClick={() => setIncludePhotos(v => !v)}>{includePhotos ? "ซ่อนรูป" : "แสดงรูป"}</button>
        <button ref={toggle} type="button" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? (onClose ? "✕ ปิด" : "✕ กลับมุมมองเดิม") : "⛶ ดูเต็มหน้า"}</button>
      </span>
    </div>
    <div className="cd-panel-reader"><div ref={content} className="cd-export-content">
      <p className="cd-export-context">{context}</p>{children}
    </div></div>
    <div className="cd-download-actions" data-export-ignore="true">
      <label className="cd-export-photo-option"><input type="checkbox" checked={includePhotos} disabled={!!busy} onChange={e => setIncludePhotos(e.target.checked)} /> แสดงรูปนักกีฬา (บนจอและในไฟล์)</label>
      <button type="button" disabled={!!busy} onClick={() => void download("png")}>{busy === "png" ? "กำลังสร้างรูป…" : "↓ ดาวน์โหลดรูป PNG"}</button>
      <button type="button" disabled={!!busy} onClick={() => void download("pdf")}>{busy === "pdf" ? "กำลังสร้าง PDF…" : "↓ ดาวน์โหลด PDF"}</button>
      {error && <p role="alert">{error}</p>}
    </div>
  </section>;
}
