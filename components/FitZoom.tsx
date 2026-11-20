"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** Lets content inside a CompetitionPanel open that panel full screen (e.g. one tap on a table). */
export const PanelContext = createContext<{ expanded: boolean; expand: () => void } | null>(null);

/**
 * A wide table on a narrow screen: shrink the whole table to the screen width (nothing hidden, no sideways
 * swiping), with − / + to zoom and "ดูเต็มจอ". One tap on the table opens the surrounding CompetitionPanel
 * full screen, where the same zoom works and the page can be downloaded. On screens wide enough nothing changes.
 * Uses transform (not layout) so measuring stays exact; exports and print reset it (see .gt-fitzoom in competition.css).
 */
export default function FitZoom({ children, minWidth = 760 }: { children: ReactNode; minWidth?: number }) {
  const panel = useContext(PanelContext);
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

  const base = Math.max(box.width, minWidth, box.content);
  const fit = box.width ? Math.min(1, box.width / base) : 1;
  const narrow = fit < 0.999;
  const maxFactor = Math.max(1, 1.6 / fit);
  const scale = narrow ? Math.min(fit * factor, 1.6) : 1;
  const step = (up: boolean) => setFactor((f) => Math.min(maxFactor, Math.max(1, up ? f * 1.3 : f / 1.3)));

  return (
    <div className="gt-fitzoom">
      {narrow && (
        <div className="gt-fitzoom-bar" data-export-ignore="true">
          <button type="button" onClick={() => step(false)} disabled={factor <= 1} aria-label="ย่อ">−</button>
          <button type="button" onClick={() => setFactor(1)} aria-pressed={factor === 1}>พอดีจอ</button>
          <button type="button" onClick={() => step(true)} disabled={factor >= maxFactor} aria-label="ขยาย">+</button>
          {panel && !panel.expanded && <button type="button" className="gt-fitzoom-full" onClick={panel.expand}>⛶ ดูเต็มจอ / ดาวน์โหลด</button>}
        </div>
      )}
      <div ref={outer} className="gt-fitzoom-scroll">
        <div className="gt-fitzoom-sizer" style={narrow ? { width: base * scale, height: box.height * scale } : undefined}
          onClick={(e) => {
            // One tap on the shrunk table opens it full screen; buttons inside (photos) keep their own action.
            if (narrow && panel && !panel.expanded && !(e.target as HTMLElement).closest("button")) panel.expand();
          }}>
          <div ref={inner} className="gt-fitzoom-inner" style={narrow ? { width: base, transform: `scale(${scale})` } : undefined}>{children}</div>
        </div>
      </div>
      {narrow && panel && !panel.expanded && <p className="gt-fitzoom-hint" data-export-ignore="true">แตะตารางเพื่อดูเต็มจอ · ขยายด้วย + หรือใช้สองนิ้ว</p>}
    </div>
  );
}
