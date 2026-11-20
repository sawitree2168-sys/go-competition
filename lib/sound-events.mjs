// Which competition-day sound to play after fresh data arrives (tested in sound-events.test.mjs).

/**
 * Compares a division's matches before and after a refresh.
 * Returns "result" when a table got a winner, else "checkin" when a player checked in, else null.
 * (A new round is announced event-wide by the organiser feed, so it is not repeated here.)
 */
export function divisionSound(before, after) {
  if (!before) return null;
  const old = new Map(before.map((m) => [m.id, m]));
  let result = false, checkin = false;
  for (const m of after) {
    const p = old.get(m.id);
    if (!p) continue;
    if (m.state === "verified" && m.winner_athlete_id && (p.state !== "verified" || p.winner_athlete_id !== m.winner_athlete_id)) result = true;
    if ((m.black_checkin_at && !p.black_checkin_at) || (m.white_checkin_at && !p.white_checkin_at)) checkin = true;
  }
  return result ? "result" : checkin ? "checkin" : null;
}

/** Divisions whose latest published round went up between two refreshes (a new round started). */
export function startedRounds(before, after) {
  if (!before) return [];
  return [...after].filter(([id, round]) => before.has(id) && round > before.get(id)).map(([id]) => id);
}
