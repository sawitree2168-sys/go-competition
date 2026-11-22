import { publicDb } from "@/app/tournaments/[id]/_ui/data";
import { loadHistoryEvents, type HistoryEventItem } from "@/lib/history-walllist";
import { organizerHistoryWallHref, historyWallHref } from "@/lib/history-wall-href";
import { eventPoster } from "@/lib/event-organizers";
import { eventEditionKey, resolvePoster, tournamentPosterKey, type PosterChoice } from "@/lib/tournament-posters";
import { loadPosterSettings } from "@/lib/poster-settings";

export type ArchivePoster = HistoryEventItem & { href: string; poster: PosterChoice };

export async function loadPosterArchive(): Promise<ArchivePoster[]> {
  const db = publicDb();
  if (!db) return [];
  const [events, settings, tournaments] = await Promise.all([
    loadHistoryEvents(),
    loadPosterSettings(db),
    db.from("gt_tournaments").select("id,title,event_date,poster_url").eq("published", true),
  ]);
  const originals = new Map((tournaments.data ?? []).map(event => [eventEditionKey(event.title, event.event_date), event]));
  const linked = new Map((tournaments.data ?? []).flatMap(event => {
    const href = organizerHistoryWallHref(event.title, event.event_date);
    return href ? [[href, event] as const] : [];
  }));
  return events.map(event => {
    const href = historyWallHref(event.id);
    const current = originals.get(eventEditionKey(event.title, event.event_date)) ?? linked.get(href);
    return {
      ...event,
      href,
      poster: resolvePoster(
        settings.get(event.id) ?? (current ? settings.get(tournamentPosterKey(current.id)) : undefined),
        current?.poster_url ?? eventPoster(event.title),
      ),
    };
  });
}
