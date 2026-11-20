"use client";
/* Accessible full-screen table preview and lossless visual exports (Thai fonts included via PNG). */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  title: string;
  filename: string;
  children: ReactNode;
  inline?: boolean;
  className?: string;
};

function cleanName(value: string) {
  return (value.normalize("NFC").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_").slice(0, 110) || "go-tournament");
}

export default function FullscreenReport({ title, filename, children, inline = true, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const inlineRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const name = cleanName(filename);

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setOpen(false); };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [open, busy]);

  const exportImage = useCallback(async (type: "png" | "pdf") => {
    const node = (open ? modalRef.current : inlineRef.current);
    if (!node || busy) return;
    setBusy(type);
    setError("");
    try {
      // Both exports rasterise the actual table so Thai and all Go symbols
      // stay visible even if the PDF viewer has no Thai fonts installed.
      if (document.fonts?.ready) await document.fonts.ready;
      const { toPng } = await import("html-to-image");
      const width = Math.ceil(Math.max(node.scrollWidth, node.getBoundingClientRect().width));
      const height = Math.ceil(Math.max(node.scrollHeight, node.getBoundingClientRect().height));
      const src = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width,
        height,
        style: { width: `${width}px`, height: `${height}px`, maxHeight: "none", overflow: "visible" },
      });
      if (type === "png") {
        const a = document.createElement("a");
        a.href = src;
        a.download = `${name}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const imageW = pageW - 2 * margin;
        const imageH = height * imageW / width;
        const printableH = pageH - margin * 2;
        // Slice a tall table across PDF pages rather than shrink its text.
        const pages = Math.max(1, Math.ceil(imageH / printableH));
        for (let page = 0; page < pages; page++) {
          if (page) pdf.addPage("a4", "landscape");
          pdf.addImage(src, "PNG", margin, margin - page * printableH, imageW, imageH);
        }
        pdf.save(`${name}.pdf`);
      }
    } catch (e) {
      console.error("GO TOURNAMENT table export failed", e);
      setError("ส่งออกไม่สำเร็จ อาจมีภาพนักกีฬาจากแหล่งที่ไม่อนุญาตให้บันทึก กรุณาลองอีกครั้งหรือแจ้งผู้จัด");
    } finally {
      setBusy(null);
    }
  }, [busy, name, open]);

  const buttons = (inModal: boolean) => (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {!inModal && (
        <button type="button" onClick={() => { setError(""); setOpen(true); }}
          className="min-h-11 rounded-xl border-2 border-[var(--gt-gold)] bg-[var(--gt-cta)] px-4 text-sm font-bold text-white">
          ⛶ ดูตารางเต็มจอ
        </button>
      )}
      <button type="button" disabled={Boolean(busy) || (!inModal && !inline)}
        onClick={() => exportImage("png")}
        className="min-h-11 rounded-xl border-2 border-[var(--gt-cta)] bg-[var(--gt-surface)] px-3 text-sm font-bold text-[var(--gt-brand)] disabled:opacity-50">
        {busy === "png" ? "กำลังบันทึก…" : "↓ PNG"}
      </button>
      <button type="button" disabled={Boolean(busy) || (!inModal && !inline)}
        onClick={() => exportImage("pdf")}
        className="min-h-11 rounded-xl border-2 border-[var(--gt-cta)] bg-[var(--gt-surface)] px-3 text-sm font-bold text-[var(--gt-brand)] disabled:opacity-50">
        {busy === "pdf" ? "กำลังบันทึก…" : "↓ PDF"}
      </button>
    </div>
  );

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--gt-gold)] bg-[var(--gt-surface)] p-2 print:hidden">
        <span className="min-w-0 font-bold text-[var(--gt-brand)]">{title}</span>
        {buttons(false)}
        {!inline && <p className="w-full text-xs text-[var(--gt-muted)]">แตะ “ดูตารางเต็มจอ” เพื่อดูข้อมูลทั้งหมดและดาวน์โหลด PNG / PDF</p>}
      </div>
      {inline && <div className="overflow-x-auto"><div ref={inlineRef} className="w-max min-w-full bg-white text-[#122b50]">{children}</div></div>}
      {error && <p role="alert" className="p-2 text-sm text-[var(--gt-bad)]">{error}</p>}
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[200] flex flex-col bg-[#edf4ff] text-[#122b50] print:hidden">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-[#d2a22c] bg-[#0c3d87] p-3 text-white">
            <h2 className="text-lg font-bold">{title}</h2>
            <button type="button" onClick={() => setOpen(false)} disabled={Boolean(busy)} className="min-h-11 rounded-lg border-2 border-[#e0b94f] px-4 font-bold disabled:opacity-50">✕ ปิด</button>
          </header>
          <div className="flex shrink-0 flex-wrap items-center gap-2 bg-white p-3">{buttons(true)}
            <span className="text-xs text-[#526783]">เลื่อนซ้าย–ขวาเพื่ออ่านทุกคอลัมน์</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div ref={modalRef} className="w-max min-w-[960px] border-2 border-[#d2a22c] bg-white text-[#122b50] shadow-lg">
              <div className="bg-[#0c3d87] px-4 py-3 text-lg font-bold text-white">{title}</div>
              {children}
            </div>
          </div>
          {error && <p role="alert" className="shrink-0 bg-white p-3 text-sm text-red-700">{error}</p>}
        </div>, document.body
      )}
    </div>
  );
}
