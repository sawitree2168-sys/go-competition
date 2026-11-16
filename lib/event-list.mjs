// Competition list page: status of an event from its dates, and the division kinds it offers.

/**
 * @param {{event_date?: string|null, registration_open_date?: string|null, registration_close_date?: string|null, registration_mode?: string|null}} e
 * @param {string} today Bangkok date "YYYY-MM-DD"
 * @returns {"live"|"open"|"finished"|"upcoming"|"closed"|"tba"}
 */
export function eventStatus(e, today) {
  if (e.event_date && today > e.event_date) return "finished";
  if (e.event_date && today === e.event_date) return "live";
  if (e.registration_mode === "closed") return "closed";
  if (e.registration_open_date && today < e.registration_open_date) return "upcoming";
  if (e.registration_close_date && today > e.registration_close_date) return "closed";
  if (e.registration_open_date || e.registration_close_date || e.registration_mode === "web") return "open";
  return "tba";
}

export const STATUS_LABEL = {
  live: "กำลังแข่งขัน", open: "เปิดรับสมัคร", finished: "จบการแข่งขัน",
  upcoming: "รอเปิดรับสมัคร", closed: "ปิดรับสมัครแล้ว", tba: "รออัปเดต",
};

/** "รุ่นคิว • รุ่นดั้ง • รุ่นเฟรนชิพ" from division keys ("kyu:1-2", "dan:1", "friendship:9"). */
export function divisionKinds(keys) {
  const has = (p) => keys.some((k) => k.startsWith(p));
  return [has("kyu:") && "รุ่นคิว", has("dan:") && "รุ่นดั้ง", has("friendship:") && "รุ่นเฟรนชิพ"].filter(Boolean).join(" • ");
}

/** Buddhist-era year of an ISO date, or null. */
export const thaiYear = (iso) => (iso ? Number(iso.slice(0, 4)) + 543 : null);
