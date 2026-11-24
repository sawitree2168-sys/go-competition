/* eslint-disable @next/next/no-img-element -- athlete photos and a decorative picture */
import Link from "next/link";
import AthleteAvatar from "@/components/AthleteAvatar";

/** history_only = known only from the central history (ทำเนียบดั้งสมาคม / 1go), no site athlete yet: read-only, id is "h:<GO ID>". */
export type Student = { id: string; name: string; nickname: string | null; rank: string | null; photo: string | null; go_id: string | null; added: boolean; history_only?: boolean };
export type Rec = {
  athlete_id: string; tournament_id: string; title: string; date: string | null; division_id: string; division: string;
  games: number; wins: number; losses: number; draws: number; pos: number | null; field: number | null;
  /** "history" = past result from the central history; tournament_id / division_id start with "h:". */
  source?: "history";
};
export type Outcome = "pending" | "win" | "loss" | "draw" | "bye";
export type TrackRound = { round: number; board: number | null; opponent: string | null; opponent_id: string | null; colour: "black" | "white" | null; outcome: Outcome };
export type Track = {
  athlete_id: string; tournament_id: string; title: string; date: string | null; division_id: string; division: string;
  round: number; board: number | null; outcome: Outcome; opponent?: string | null; points?: number | null; rounds?: TrackRound[];
};
export type Overview = {
  academy: { id: string; name: string }; access: "admin" | "active" | "pending"; role: "manager" | "teacher" | null;
  students: Student[]; records: Rec[]; tracking: Track[];
};
export type Application = {
  id: string; name: string; rank: string; athlete_id: string | null; tournament_id: string; title: string; date: string | null;
  division: string; fee: number | string | null; status: "pending" | "approved" | "rejected"; payment: string | null; created_at: string; reference: string;
};
export type View = "home" | "students" | "teachers" | "tracking" | "live" | "awards" | "stats" | "reports" | "apply" | "settings";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const ICONS: Record<Exclude<View, "home">, React.ReactNode> = {
  teachers: <svg viewBox="0 0 24 24" aria-hidden="true" {...P}><circle cx="12" cy="6" r="3"/><path d="M5 21v-4a7 7 0 0 1 14 0v4M8 13h8"/></svg>,
  settings: <svg viewBox="0 0 24 24" aria-hidden="true" {...P}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12m9.9 9.9 2.12 2.12M4.93 19.07l2.12-2.12m9.9-9.9 2.12-2.12"/></svg>,
  students: <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="7.5" r="3.4" /><circle cx="5.2" cy="9" r="2.5" /><circle cx="18.8" cy="9" r="2.5" /><path d="M5.5 20c0-3.9 2.9-6.6 6.5-6.6s6.5 2.7 6.5 6.6Z" /><path d="M.8 19.2c0-2.8 1.8-4.8 4.3-4.8 1 0 1.8.3 2.5.8-1.4 1.2-2.2 2.6-2.4 4Zm22.4 0c0-2.8-1.8-4.8-4.3-4.8-1 0-1.8.3-2.5.8 1.4 1.2 2.2 2.6 2.4 4Z" /></svg>,
  tracking: <svg viewBox="0 0 24 24" aria-hidden="true" {...P}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><path d="M7 13h.01M12 13h.01M17 13h.01M7 17h.01M12 17h.01M17 17h.01" strokeWidth="2.6" /></svg>,
  awards: <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#f5b52e" d="M7 3h10v5.5a5 5 0 0 1-10 0Z" /><path fill="none" stroke="#f5b52e" strokeWidth="2" d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10m10-5h3.5v1.5A3.5 3.5 0 0 1 17 10" /><path fill="#e09a12" d="M10.5 13h3v3.5h-3z" /><path fill="#f5b52e" d="M7.5 17h9l1 4h-11z" /></svg>,
  live: <svg viewBox="0 0 24 24" aria-hidden="true" {...P}><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8 21h8M12 17v4" /><circle cx="7" cy="10.5" r="1.6" fill="currentColor" /><path d="M10.5 9h7M10.5 12h5" /></svg>,
  stats: <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="3" y="13" width="4.2" height="8" rx="1" /><rect x="9.9" y="8" width="4.2" height="13" rx="1" /><rect x="16.8" y="3" width="4.2" height="18" rx="1" /></svg>,
  reports: <svg viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M6 2.5h8l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4a1.5 1.5 0 0 1 1-1.5Z" /><path d="M14 2.5V8h5M8.5 12.5h7M8.5 16h7" /></svg>,
  apply: <svg viewBox="0 0 24 24" aria-hidden="true" {...P}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m7.5 12.5 3 3 6-7" strokeWidth="2.4" /></svg>,
};

export const MENU: { id: Exclude<View, "home">; title: string; sub: string; tone?: string }[] = [
  { id: "students", title: "นักเรียน", sub: "รายชื่อและระดับฝีมือ" },
  { id: "tracking", title: "ผลการแข่งขัน", sub: "รอบ โต๊ะ และคู่แข่ง" },
  { id: "live", title: "กระดานสด", sub: "ทุกคนในงานบนจอเดียว + การ์ดสรุป" },
  { id: "apply", title: "สมัครแข่งขัน", sub: "สมัครแบบกลุ่มและตรวจสถานะ" },
  { id: "awards", title: "ผลงาน", sub: "เหรียญและอันดับของนักเรียน" },
  { id: "stats", title: "อันดับ / พัฒนาการ", sub: "อันดับ กราฟการเติบโต ประวัติรายคน" },
  { id: "reports", title: "รายงาน", sub: "สรุปผลงานรายบุคคล" },
  { id: "teachers", title: "เจ้าของและครู", sub: "เจ้าของหลายคน ครู และผลงาน" },
  { id: "settings", title: "ตั้งค่าสถาบัน", sub: "โลโก้ บัญชี และรหัสผ่าน" },
];

export function Avatar({ src, className = "h-10 w-10" }: { src: string | null; className?: string }) {
  return <AthleteAvatar src={src} name="นักกีฬา" className={`${className} ${src ? "border-2 border-white shadow-sm" : ""}`} />;
}

export function StudentName({ s, sub, small = false }: { s: Student; sub?: React.ReactNode; small?: boolean }) {
  return (
    <Link href={s.history_only && s.go_id ? `/athletes/history/${encodeURIComponent(s.go_id)}` : `/athletes/${s.id}`} className={`flex min-w-0 items-center hover:underline ${small ? "gap-2" : "gap-3"}`}>
      <Avatar src={s.photo} className={small ? "h-8 w-8" : "h-10 w-10"} />
      <span className="min-w-0">
        <span className={`block font-semibold ${small ? "leading-snug" : "truncate"}`}>{s.name}</span>
        {sub && <span className="block truncate text-xs text-[var(--gt-muted)]">{sub}</span>}
      </span>
    </Link>
  );
}

export function Deco({ className }: { className: string }) {
  return (
    <picture>
      <source srcSet="/institution-deco.webp" type="image/webp" />
      <img src="/institution-deco.png" alt="" aria-hidden="true" className={`pointer-events-none select-none ${className}`} />
    </picture>
  );
}

/** Small round Go board logo (institution badge). */
export function BoardLogo({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full border-2 border-[var(--gt-ink)] bg-[var(--gt-surface)] ${className}`}>
      <svg viewBox="0 0 40 40" className="h-[70%] w-[70%]">
        <g stroke="currentColor" strokeWidth="1.4">{[6, 14, 22, 30].map((v) => <g key={v}><path d={`M${v} 4v32`} /><path d={`M4 ${v}h32`} /></g>)}</g>
        <circle cx="22" cy="14" r="4.6" fill="currentColor" /><circle cx="30" cy="22" r="4.6" fill="currentColor" />
        <circle cx="14" cy="22" r="4.6" fill="#fff" stroke="currentColor" strokeWidth="1.4" /><circle cx="22" cy="30" r="4.6" fill="currentColor" />
      </svg>
    </span>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="flex items-center gap-2.5 text-xl font-bold sm:text-2xl"><span aria-hidden="true" className="h-6 w-1 rounded-full bg-[var(--gt-cta)]" />{children}</h2>
      {right && <div className="ml-auto flex flex-wrap gap-2">{right}</div>}
    </div>
  );
}

export const selectCls = "min-h-11 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-[15px]";
export const inputCls = "min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base placeholder:text-[var(--gt-muted)]";

export function Chip({ tone, children }: { tone: "win" | "loss" | "draw" | "wait" | "info" | "gold"; children: React.ReactNode }) {
  const cls = {
    win: "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]",
    loss: "bg-[var(--gt-loss-bg)] text-[var(--gt-loss-ink)]",
    draw: "bg-[var(--gt-surface-2)] text-[var(--gt-ink)]",
    wait: "bg-[var(--gt-gold-soft)] text-[var(--gt-warn)]",
    info: "bg-[var(--gt-cta-soft)] text-[var(--gt-cta)]",
    gold: "gt-pill-gold",
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-lg px-3 py-1 text-sm font-semibold ${cls}`}>{children}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-[var(--gt-surface-2)] px-4 py-6 text-center text-sm text-[var(--gt-muted)]">{children}</p>;
}
