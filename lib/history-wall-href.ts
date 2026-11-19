export const historyWallHref=(eventId:string,division?:string|null)=>`/results/history/${encodeURIComponent(eventId)}${division?`?division=${encodeURIComponent(division)}`:''}`;

export function organizerHistoryWallHref(title: string, date: string | null) {
  if (date === '2026-05-16' && title === 'Mingle GO Kyu War 2026') {
    return historyWallHref('association:160569');
  }
  if (date === '2026-07-18' && ['ธรรมศาสตร์ โอเพ่น 2026', 'Thammasat Open Go Tournament 2026'].includes(title)) {
    return historyWallHref('association:240769');
  }
  return null;
}
