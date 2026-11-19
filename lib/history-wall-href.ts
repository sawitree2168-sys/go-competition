export const historyWallHref=(eventId:string,division?:string|null)=>`/results/history/${encodeURIComponent(eventId)}${division?`?division=${encodeURIComponent(division)}`:''}`;
