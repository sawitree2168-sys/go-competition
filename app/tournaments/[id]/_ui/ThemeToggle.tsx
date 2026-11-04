"use client";

import { useSyncExternalStore } from "react";

type Mode = "light" | "dark";
const KEY = "gt-theme";
const EVENT = "gt-theme-change";

function current(): Mode {
  const set = (document.querySelector(".gt") as HTMLElement | null)?.dataset.gtTheme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  window.addEventListener(EVENT, onChange);
  return () => { mq.removeEventListener("change", onChange); window.removeEventListener(EVENT, onChange); };
}

export default function ThemeToggle() {
  const mode = useSyncExternalStore<Mode | null>(subscribe, current, () => null);

  const toggle = () => {
    const next: Mode = current() === "dark" ? "light" : "dark";
    document.querySelectorAll<HTMLElement>(".gt").forEach((el) => { el.dataset.gtTheme = next; });
    try { localStorage.setItem(KEY, next); } catch { /* private mode: theme still applies for this visit */ }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      className="grid h-11 w-11 place-items-center rounded-full border border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] text-[var(--gt-gold-ink)]"
    >
      {mode === "dark" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z" /></svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      )}
    </button>
  );
}

/** Runs before paint so a saved choice never flashes the wrong theme. */
export const themeBootScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.currentScript.parentElement.dataset.gtTheme=t}catch(e){}`;
