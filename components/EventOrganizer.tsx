import { eventOrganizer } from "@/lib/event-organizers";

/** Shared placement: directly below the event title, on cards, event pages and historical results. */
export default function EventOrganizer({ title, onDark = false, compact = false }: { title: string; onDark?: boolean; compact?: boolean }) {
  const organizer = eventOrganizer(title);
  if (!organizer) return null;
  return (
    <div aria-label={`ทีมผู้จัดแข่งขัน ${organizer.name}`} className={`mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 border-l-2 pl-2.5 ${onDark ? "border-[#e9c46a] text-white" : "border-[#c79a39] text-[var(--gt-ink)]"} ${compact ? "text-xs" : "text-sm"}`}>
      <span className={onDark ? "text-white/75" : "text-[var(--gt-muted)]"}>ทีมผู้จัดแข่งขัน</span>
      <strong className="font-bold tracking-wide">{organizer.name}</strong>
    </div>
  );
}
