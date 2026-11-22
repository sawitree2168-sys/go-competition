"use client";

import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

/** Lets content inside a CompetitionPanel open that panel full screen (e.g. one tap on a table). */
export const PanelContext = createContext<{ expanded: boolean; expand: () => void } | null>(null);

/**
 * A wide table (wall list) on a narrow screen behaves like a picture:
 * - On the page it is shrunk to the screen width, so the whole sheet is visible at once (no sideways swiping).
 *   One tap anywhere on it opens the surrounding CompetitionPanel full screen (PNG / PDF, photo switch there).
 * - Full screen it starts fitted to the width; one tap zooms in to real size at the tapped spot, another tap
 *   goes back to the whole sheet. − / พอดีจอ / + do the same with buttons; two-finger zoom still works.
 * On screens wide enough to show the real size nothing changes.
 * Uses transform (not layout) so measuring stays exact; exports and print reset it (see .gt-fitzoom in competition.css).
 */
export default function FitZoom({ children, minWidth = 760 }: { children: ReactNode; minWidth?: number }) {
  const panel = useContext(PanelContext);
  const expanded = panel?.expanded ?? false;
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0, content: 0 });
  const [factor, setFactor] = useState(1);

  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const measure = () => setBox((b) => {
      const next = { width: o.clientWidth, height: i.offsetHeight, content: i.scrollWidth };
      return next.width === b.width && next.height === b.height && next.content === b.content ? b : next;
    });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o); ro.observe(i);
    return () => ro.disconnect();
  }, []);
  // Opening / closing full screen always starts from the whole sheet.
  useEffect(() => { queueMicrotask(() => setFactor(1)); }, [expanded]);

  const base = Math.max(box.width, minWidth, box.content);
  const fit = box.width ? Math.min(1, box.width / base) : 1;
  const narrow = fit < 0.999;
  const real = 1 / fit; // factor that shows the table at its real size
  const maxFactor = Math.max(real * 1.6, 1);
  const scale = narrow ? fit * factor : 1;
  const zoomed = factor > 1.001;

  /** Zoom to `next`, keeping the point under (clientX, clientY) in place. */
  const zoomTo = (next: number, clientX?: number, clientY?: number) => {
    const o = outer.current;
    const v = o?.closest<HTMLElement>(".cd-panel-reader") ?? null;
    next = Math.min(maxFactor, Math.max(1, next));
    if (!o || clientX === undefined || clientY === undefined) { setFactor(next); return; }
    const or = o.getBoundingClientRect(), vr = v?.getBoundingClientRect();
    const old = fit * factor, now = fit * next;
    const x = (clientX - or.left + o.scrollLeft) / old; // tapped point in table pixels
    const y = (clientY - or.top) / old;
    const top = vr && v ? or.top - vr.top + v.scrollTop : 0; // where the table starts inside the scrolling page
    setFactor(next);
    requestAnimationFrame(() => {
      o.scrollLeft = x * now - (clientX - or.left);
      if (v && vr) v.scrollTop = top + y * now - (clientY - vr.top);
    });
  };

  const onTap = (e: MouseEvent) => {
    if (!narrow) return;
    const target = e.target as HTMLElement;
    if (panel && !expanded) {
      // On the page the shrunk sheet acts as one picture: any tap (names, photos too) opens it full screen.
      e.preventDefault(); e.stopPropagation();
      panel.expand();
      return;
    }
    if (zoomed) {
      // At real size links and photos work as usual; a tap on the table itself goes back to the whole sheet.
      if (target.closest("a, button, input, select, label")) return;
      zoomTo(1);
    } else {
      e.preventDefault(); e.stopPropagation();
      zoomTo(real, e.clientX, e.clientY);
    }
  };

  return (
    <div className="gt-fitzoom" data-zoomed={zoomed || undefined}>
      {narrow && (expanded || !panel) && (
        <div className="gt-fitzoom-bar" data-export-ignore="true">
          <button type="button" onClick={() => zoomTo(factor / 1.4)} disabled={factor <= 1} aria-label="ย่อ">−</button>
          <button type="button" onClick={() => zoomTo(1)} aria-pressed={!zoomed}>เห็นทั้งแผ่น</button>
          <button type="button" onClick={() => zoomTo(factor * 1.4)} disabled={factor >= maxFactor} aria-label="ขยาย">+</button>
          <span className="gt-fitzoom-tip">{zoomed ? "แตะตารางเพื่อกลับไปเห็นทั้งแผ่น" : "แตะตารางตรงที่อยากดูเพื่อขยาย"}</span>
        </div>
      )}
      <div ref={outer} className="gt-fitzoom-scroll">
        <div className="gt-fitzoom-sizer" style={narrow ? { width: base * scale, height: box.height * scale } : undefined}
          onClickCapture={onTap} role={narrow && panel ? "button" : undefined} tabIndex={narrow && panel && !expanded ? 0 : undefined}
          aria-label={narrow && panel && !expanded ? "แตะเพื่อดูตารางเต็มจอ ขยาย และดาวน์โหลด" : undefined}
          onKeyDown={(e) => { if (narrow && panel && !expanded && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); panel.expand(); } }}>
          <div ref={inner} className="gt-fitzoom-inner" style={narrow ? { width: base, transform: `scale(${scale})` } : undefined}>{children}</div>
        </div>
      </div>
      {narrow && panel && !expanded && <p className="gt-fitzoom-hint" data-export-ignore="true">แตะตารางเพื่อขยาย · ดาวน์โหลด PNG / PDF ได้ในหน้าที่เปิดขึ้น</p>}
    </div>
  );
}
