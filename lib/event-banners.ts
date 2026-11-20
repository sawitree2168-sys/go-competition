/**
 * A tournament's own banner (artwork that already carries the event name). When set, the event page shows it
 * whole — not cropped, nothing printed over it — with date, venue and the sign-up button underneath, instead
 * of the shared dark hero photo. Files live in /public/banners. Key = tournament id.
 */
export type EventBanner = { src: string; mobile: string; width: number; height: number };

export const EVENT_BANNERS: Record<string, EventBanner> = {
  // ZEER GO KYU WAR 2026 (21 Nov 2026)
  "ce1382d9-1e1f-4697-8fe4-6a1a347d91eb": { src: "/banners/zeer-go-kyu-war-2026.webp", mobile: "/banners/zeer-go-kyu-war-2026-m.webp", width: 2172, height: 724 },
};
