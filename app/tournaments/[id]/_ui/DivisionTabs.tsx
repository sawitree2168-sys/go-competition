"use client";

import { useState, useSyncExternalStore } from "react";

export type TabId = "list" | "pairs" | "results" | "standings";
const TABS: { id: TabId; label: string }[] = [
  { id: "list", label: "รายชื่อ" }, { id: "pairs", label: "จับคู่" }, { id: "results", label: "ผลแข่ง" }, { id: "standings", label: "อันดับ" },
];
const isTab = (v: string | null): v is TabId => TABS.some((t) => t.id === v);

const subscribe = (cb: () => void) => { window.addEventListener("popstate", cb); return () => window.removeEventListener("popstate", cb); };
const urlTab = () => new URLSearchParams(window.location.search).get("tab");

/** All four panels are rendered up front; switching only toggles visibility, so it is instant. */
export default function DivisionTabs({ panels }: { panels: Record<TabId, React.ReactNode> }) {
  const fromUrl = useSyncExternalStore(subscribe, urlTab, () => null);
  const [picked, setPicked] = useState<TabId | null>(null);
  const active: TabId = picked ?? (isTab(fromUrl) ? fromUrl : "list");

  const choose = (id: TabId) => {
    setPicked(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <>
      <div role="tablist" aria-label="ข้อมูลรุ่น" className="gt-tabs gt-card mt-4 grid grid-cols-4 gap-1 p-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} aria-selected={active === t.id}
            onClick={() => choose(t.id)}
            className="rounded-[10px] py-2.5 text-center text-[15px] font-semibold text-[var(--gt-ink)]">{t.label}</button>
        ))}
      </div>
      {TABS.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id}>{panels[t.id]}</div>
      ))}
    </>
  );
}
