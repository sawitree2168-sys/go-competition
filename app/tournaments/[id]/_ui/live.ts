"use client";
// Live updates: ask the database for a tiny fingerprint of a division every few seconds (only while the
// page is on screen) and react when it changes. Cheap for the database: one md5 per call, no rows.

import { useEffect, useRef, useState } from "react";

export type LiveStatus = { checkedAt: Date | null; offline: boolean };

/**
 * @param get     returns the current fingerprint (null = not visible / not allowed)
 * @param onChange called with the new fingerprint when it differs from the previous one (and from `initial`)
 */
export function useLiveFingerprint(get: () => Promise<string | null>, onChange: (fp: string) => void, { initial = null as string | null, interval = 10000, enabled = true } = {}) {
  const last = useRef<string | null>(initial);
  const getRef = useRef(get), changeRef = useRef(onChange);
  const [status, setStatus] = useState<LiveStatus>({ checkedAt: null, offline: false });
  useEffect(() => { getRef.current = get; changeRef.current = onChange; });

  useEffect(() => {
    if (!enabled) return;
    let stop = false, busy = false;
    const tick = async () => {
      if (stop || busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const fp = await getRef.current();
        if (stop) return;
        setStatus({ checkedAt: new Date(), offline: false });
        if (fp && last.current !== null && fp !== last.current) changeRef.current(fp);
        if (fp) last.current = fp;
      } catch {
        if (!stop) setStatus((s) => ({ ...s, offline: true }));
      } finally { busy = false; }
    };
    queueMicrotask(tick);
    const t = window.setInterval(tick, interval);
    const wake = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => { stop = true; window.clearInterval(t); document.removeEventListener("visibilitychange", wake); window.removeEventListener("online", wake); };
  }, [interval, enabled]);

  /** Tell the hook what the page currently shows (e.g. after a server refresh). */
  const accept = (fp: string | null) => { if (fp) last.current = fp; };
  return { status, accept };
}

/** Ask the server to rebuild the public pages of this division on their next visit (rate-limited there). */
export function pingLive(divisionId: string) {
  try {
    void fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ division: divisionId }), keepalive: true }).catch(() => {});
  } catch { /* offline: the 30-second refresh still applies */ }
}

export const clock = (d: Date | null) => (d ? d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");
