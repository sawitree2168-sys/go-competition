/** Organizer identity belongs to the event, independently of its result source or player institutions.
 * Only explicitly confirmed events are mapped; never assign a default organizer to new imports.
 * Current three events: confirmed by site owner, 17 Nov 2026.
 */
export type EventOrganizer = { id: string; name: string };
const TOP_CLASS: EventOrganizer = { id: "top-class-go", name: "TOP CLASS GO" };
const BUDDY: EventOrganizer = { id: "buddy-go", name: "BUDDY GO" };
const key = (title: string) => title.normalize("NFC").replace(/[’‘]/g, "'").replace(/\s+/g, "").toLowerCase();
const EVENTS = new Map<string, EventOrganizer>([
  ["ZEER GO KYU WAR 2026", TOP_CLASS],
  ["ธรรมศาสตร์ โอเพ่น 2026", TOP_CLASS],
  ["Mingle GO Kyu War 2026", TOP_CLASS],
  // Official announcement: thaigo.org, LOTUS’S × BUDDY GO Championship 2026, 15 Nov 2026.
  // This metadata does not publish a competition or import its results.
  ["LOTUS’S × BUDDY GO Championship 2026", BUDDY],
].map(([title, organizer]) => [key(title as string), organizer as EventOrganizer]));
export const eventOrganizer = (title: string): EventOrganizer | null => EVENTS.get(key(title)) ?? null;
