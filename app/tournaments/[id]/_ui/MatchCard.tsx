/* eslint-disable @next/next/no-img-element -- athlete photos come from arbitrary storage URLs; plain <img> keeps the card server-safe */
/**
 * One table of a round, styled like the approved "จับคู่ & ผล" mockup:
 * โต๊ะ badge + status, black side | VS | white side (photo, colour, name, institution, rank, score),
 * and an optional action bar (check-in / result entry) supplied by the organiser or referee screen.
 * No hooks, so it renders on the server (public page) and inside client screens alike.
 */
export type Seat = {
  id: string; name: string | null; institution?: string | null; rank?: string | null; photo?: string | null;
  score?: number | null; won?: boolean; checkedIn?: boolean;
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Default avatar (approved 16 Nov 2026) for athletes without a photo. */
export const DEFAULT_AVATAR = "/avatars/default-athlete.png";

export function Avatar({ seat, size = "md" }: { seat: Seat; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "h-20 w-20 sm:h-24 sm:w-24" : "h-14 w-14";
  const style = seat.photo ? "rounded-full border-2 border-[var(--gt-surface)] object-cover shadow" : "object-contain";
  return <img src={seat.photo || DEFAULT_AVATAR} alt="" loading="lazy" className={`${dim} shrink-0 ${style}`} />;
}

function Side({ seat, colour, extra }: { seat: Seat; colour: "black" | "white"; extra?: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-2 rounded-xl p-1 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left ${seat.won ? "bg-[var(--gt-gold-soft)]" : ""}`}>
      <div className="relative">
        <Avatar seat={seat} size="lg" />
        <span aria-label={colour === "black" ? "ดำ" : "ขาว"} className="absolute -left-1 -top-1 inline-flex items-center gap-1 rounded-full border border-[var(--gt-line)] bg-[var(--gt-surface)] px-1.5 py-0.5 text-[11px] font-semibold shadow-sm">
          <span className={`h-3.5 w-3.5 rounded-full border ${colour === "black" ? "border-black bg-[#14171e]" : "border-[#9aa3b2] bg-white"}`} />
          {colour === "black" ? "ดำ" : "ขาว"}
        </span>
      </div>
      <div className="min-w-0">
        <p className="break-words text-base font-bold leading-tight sm:text-lg">{seat.name ?? "—"}{seat.won && <span className="ml-1 text-xs font-semibold text-[var(--gt-ok)]">ชนะ</span>}</p>
        {seat.institution && <p className="truncate text-xs text-[var(--gt-muted)] sm:text-sm"><span className="hidden sm:inline">สถาบัน </span>{seat.institution}</p>}
        <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm sm:justify-start">
          {seat.rank && <span className="rounded-md bg-[var(--gt-surface-2)] px-2 py-0.5 font-semibold text-[var(--gt-brand)]">{seat.rank}</span>}
          {seat.score != null && <span className="gt-num">{fmt(seat.score)} คะแนน</span>}
        </p>
        {extra && <div className="mt-1.5 flex justify-center sm:justify-start">{extra}</div>}
      </div>
    </div>
  );
}

export default function MatchCard({ board, status, statusTone = "wait", black, white, blackExtra, whiteExtra, actions, highlight = false }: {
  board: number | null; status: string; statusTone?: "wait" | "done";
  black: Seat; white: Seat; blackExtra?: React.ReactNode; whiteExtra?: React.ReactNode; actions?: React.ReactNode; highlight?: boolean;
}) {
  return (
    <li className={`gt-card overflow-hidden ${highlight ? "border-2 border-[var(--gt-warn)]" : "border-2 border-[var(--gt-brand)]/40"}`}>
      <div className="flex items-center justify-between gap-2 bg-[var(--gt-surface-2)] px-3 py-2">
        <span className="gt-num rounded-lg bg-[var(--gt-brand)] px-3 py-1 text-base font-bold text-white">โต๊ะ {board ?? "–"}</span>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusTone === "done" ? "bg-[var(--gt-gold-soft)] text-[var(--gt-ok)]" : "bg-[var(--gt-surface)] text-[var(--gt-muted)]"}`}>{status}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-3">
        <Side seat={black} colour="black" extra={blackExtra} />
        <span className="rounded-full bg-[var(--gt-surface-2)] px-2.5 py-1 text-sm font-bold text-[var(--gt-brand)]">VS</span>
        <Side seat={white} colour="white" extra={whiteExtra} />
      </div>
      {actions && <div className="border-t border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 py-3">{actions}</div>}
    </li>
  );
}
