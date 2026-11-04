import Link from "next/link";
import { Prompt } from "next/font/google";
import ThemeToggle, { themeBootScript } from "./ThemeToggle";
import "./theme.css";

const prompt = Prompt({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-gt", display: "swap" });

/** Existing site photo of stones on a board, reused for division and fallback poster thumbnails. */
export const STONES_IMAGE =
  "/Nkg3S2jxuCuM5tcbm-mOxrjS-oYAJ3h0pILeA0ydGh1vHU3qugB8QRDrK0NP0wGENcsQqKpiqXcIewmFOeBIL4zhSBLGBeMu_uTY0MQCVu80rwm7vVZaQsuQdiM4WhENi8mXM-zQeg31wWr99NlBxrtY0udRUXqAKAlRC9KDkMIWGi-FiWnhORh1UXDtsm2Y.jpg";

export function Shell({ children, bottomBar }: { children: React.ReactNode; bottomBar?: React.ReactNode }) {
  return (
    <div className={`gt ${prompt.variable} min-h-screen w-full`} suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <div className={`mx-auto w-full max-w-2xl ${bottomBar ? "pb-28" : "pb-10"}`}>{children}</div>
      {bottomBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--gt-line)] bg-[var(--gt-surface)] pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_rgba(6,22,50,.12)]">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">{bottomBar}</div>
        </div>
      )}
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" aria-label="GO TOURNAMENT หน้าแรก" className="relative flex items-end">
      <svg width="34" height="20" viewBox="0 0 34 20" aria-hidden="true" className="absolute -top-4 left-1/2 -translate-x-1/2">
        <path d="M3 18 L6 5 L12 12 L17 2 L22 12 L28 5 L31 18 Z" fill="var(--gt-gold)" stroke="var(--gt-gold-ink)" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="17" cy="2.5" r="2" fill="var(--gt-gold-2)" />
      </svg>
      <span className="text-[34px] font-bold leading-none tracking-tight text-[var(--gt-gold)] [text-shadow:0_2px_0_var(--gt-gold-ink)]">G</span>
      <span aria-hidden="true" className="ml-0.5 mb-[3px] h-[26px] w-[26px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d9dde5_55%,#9aa3b2)] shadow-[0_2px_3px_rgba(0,0,0,.35)]" />
      <span aria-hidden="true" className="-ml-1.5 mb-[3px] h-[26px] w-[26px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#14171e_60%)] shadow-[0_2px_3px_rgba(0,0,0,.35)]" />
    </Link>
  );
}

export function Header({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <header className="relative bg-[var(--gt-header)]">
      <div className="flex items-center justify-between px-4 pb-4 pt-6">
        <Link href={backHref} aria-label={backLabel} className="grid h-11 w-11 place-items-center rounded-full text-[var(--gt-ink)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
        <Logo />
        <ThemeToggle />
      </div>
      <svg viewBox="0 0 400 18" preserveAspectRatio="none" className="block h-4 w-full" aria-hidden="true">
        <path d="M0 6 C80 20 150 -2 220 8 S350 16 400 2 L400 18 L0 18 Z" fill="var(--gt-bg)" />
        <path d="M0 6 C80 20 150 -2 220 8 S350 16 400 2" fill="none" stroke="var(--gt-gold)" strokeWidth="2" />
      </svg>
    </header>
  );
}

/** Square-ish image tile; `shift` varies the crop so neighbouring rows don't look identical. */
export function Thumb({ src, alt, className = "", shift = 0 }: { src: string; alt: string; className?: string; shift?: number }) {
  const positions = ["20% 30%", "45% 25%", "10% 60%", "35% 55%", "60% 40%", "25% 75%", "50% 65%", "15% 45%"];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote poster URLs come from Supabase Storage
    <img src={src} alt={alt} loading="lazy" className={`shrink-0 object-cover ${className}`} style={{ objectPosition: positions[shift % positions.length] }} />
  );
}

export function Icon({ name, className = "h-5 w-5" }: { name: "calendar" | "pin" | "doc" | "chat" | "hands" | "chevron" | "users" | "grid" | "trophy" | "clock" | "search" | "info"; className?: string }) {
  const p: Record<string, React.ReactNode> = {
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4M9 14.5l2 2 4-4" /></>,
    pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
    doc: <><path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" /><path d="M14 3v5h5M8.5 13h7M8.5 16.5h7" /></>,
    chat: <><path d="M4 12a8 7 0 1 1 3.5 5.8L4 19.5l1-3.6A6.8 6.8 0 0 1 4 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" strokeWidth="2.6" /></>,
    hands: <><path d="M2.5 11l4-4 4 2 3-2 3 1 5 4" /><path d="M6.5 13l3.5 3.5a1.5 1.5 0 0 0 2.1 0l.4-.4M10 12l3.5 3.5M12.5 10.5l3.5 3.5M2.5 11l4 4M21.5 12l-3.5 3.5" /></>,
    chevron: <path d="M9 5l7 7-7 7" />,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14c2.6 0 4.4 1.5 5 4" /></>,
    grid: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" /></>,
    trophy: <><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v3M8.5 20.5h7M9.5 17h5" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
    info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" strokeWidth="2.4" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{p[name]}</svg>;
}
