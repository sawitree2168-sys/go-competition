"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Switch tab from anywhere on the page (e.g. "ดูตารางอันดับ" in the news tab). */
export const showTab = (id: TabId) => window.dispatchEvent(new CustomEvent<TabId>("gt-tab", { detail: id }));

export type TabId = "list" | "pairs" | "results" | "standings" | "news" | "register";
const TABS: { id: TabId; label: string }[] = [
  { id: "list", label: "นักกีฬา" }, { id: "pairs", label: "จับคู่" }, { id: "results", label: "ผลแข่ง" }, { id: "standings", label: "อันดับ" }, { id: "news", label: "ข่าว" }, { id: "register", label: "สมัคร" },
];
const isTab = (v: string | null): v is TabId => TABS.some((t) => t.id === v);

const subscribe = (cb: () => void) => { window.addEventListener("popstate", cb); return () => window.removeEventListener("popstate", cb); };
const urlTab = () => new URLSearchParams(window.location.search).get("tab");

/** All panels are rendered up front; switching only toggles visibility, so it is instant. */
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

  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<TabId>).detail;
      if (!isTab(id)) return;
      choose(id);
      document.getElementById(`tab-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener("gt-tab", on);
    return () => window.removeEventListener("gt-tab", on);
  });


  return (
    <>
      <div role="tablist" aria-label="ข้อมูลรุ่น" className="gt-card mt-4 grid grid-cols-6 gap-0.5 p-1 sm:gap-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} aria-selected={active === t.id}
            onClick={() => choose(t.id)}
            className={`rounded-[10px] px-0.5 py-2.5 text-center text-[13px] font-semibold sm:text-[15px] ${active === t.id ? "bg-[var(--gt-cta)] text-white shadow-sm" : "text-[var(--gt-ink)] hover:bg-[var(--gt-surface-2)]"}`}>{t.label}</button>
        ))}
      </div>
      {TABS.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id}>{panels[t.id]}</div>
      ))}
    </>
  );
}
