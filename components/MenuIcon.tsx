/** Line icons for the site menu and bottom bar (one consistent set instead of text symbols). */
export type MenuIconName =
  | "home" | "trophy" | "register" | "results" | "stats" | "athlete" | "fan" | "news" | "gallery" | "documents" | "faq" | "menu" | "entrants" | "dan";

const PATHS: Record<MenuIconName, React.ReactNode> = {
  home: <><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" /></>,
  trophy: <><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v3M8.5 20.5h7M9.5 17h5" /></>,
  // Clipboard with a check: sign up for an event.
  register: <><rect x="5" y="4.5" width="14" height="16" rx="2" /><path d="M9 4.5V3.5h6v1" /><rect x="9" y="2.8" width="6" height="3.4" rx="1" /><path d="M8.5 13l2.3 2.3 4.7-4.8" /></>,
  // Medal on a ribbon: results.
  results: <><path d="M7.5 2.8h3.2l1.3 5.2M16.5 2.8h-3.2L12 8" /><circle cx="12" cy="14.6" r="6" /><path d="m12 11.4 1.05 2.1 2.3.34-1.67 1.62.4 2.3L12 16.67l-2.08 1.1.4-2.3-1.67-1.63 2.3-.33z" fill="currentColor" stroke="none" /></>,
  // Rising bar chart: rankings and statistics.
  stats: <><path d="M3.5 20.5h17" /><rect x="5" y="12.5" width="3.4" height="8" rx="1" /><rect x="10.3" y="8.5" width="3.4" height="12" rx="1" /><rect x="15.6" y="4" width="3.4" height="16.5" rx="1" /></>,
  // Athlete: head and shoulders with a medal on the chest.
  athlete: <><circle cx="12" cy="6.8" r="3.6" /><path d="M4.5 21v-1.2c0-3.6 2.7-6 7.5-6s7.5 2.4 7.5 6V21" /><path d="m9.4 14.2 2.6 3.3 2.6-3.3" /><circle cx="12" cy="18.6" r="1.9" fill="currentColor" stroke="none" /></>,
  fan: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  news: <><rect x="3.5" y="5" width="13.5" height="15" rx="1.6" /><path d="M17 9h2.5a1 1 0 0 1 1 1v8.2a1.8 1.8 0 0 1-3.5 0" /><path d="M6.5 8.5h7.5M6.5 12h7.5M6.5 15.5h4.5" /></>,
  gallery: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.8" /><path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4" /></>,
  documents: <><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5z" /><path d="M14 3v4.5h4.5" /><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5" /></>,
  faq: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.6" /><path d="M12 16.6h.01" strokeWidth="2.6" /></>,
  // List with people: entrants.
  entrants: <><circle cx="8" cy="8" r="2.8" /><path d="M3 18.5c.4-3 2.4-4.8 5-4.8s4.6 1.8 5 4.8" /><path d="M14.5 7h6M14.5 11h6M15.5 15h5" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  // New dan: two Go stones under a star.
  dan: <><circle cx="8.5" cy="15.5" r="4.5" fill="currentColor" stroke="none" /><circle cx="15.5" cy="15.5" r="4.5" /><path d="m12 2.8 1.2 2.4 2.6.4-1.9 1.8.45 2.6L12 8.8l-2.35 1.2.45-2.6-1.9-1.8 2.6-.4z" /></>,
};

export default function MenuIcon({ name, className = "h-6 w-6" }: { name: MenuIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
