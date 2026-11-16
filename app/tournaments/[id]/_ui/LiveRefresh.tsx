"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clock, pingLive, useLiveFingerprint } from "./live";

let client: SupabaseClient | null = null;
const anon = () => {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
};

/**
 * Public division page: refreshes itself when pairings, check-ins or results change.
 * `fingerprint` is what the server rendered; when the database differs, the page is rebuilt and reloaded in place
 * (the open tab and scroll position stay).
 */
export default function LiveRefresh({ divisionId, fingerprint }: { divisionId: string; fingerprint: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const wanted = useRef<string | null>(null);
  const shown = useRef(fingerprint);

  const refresh = (fp: string) => {
    wanted.current = fp;
    pingLive(divisionId);
    window.setTimeout(() => startTransition(() => router.refresh()), 400);
  };

  const { status, accept } = useLiveFingerprint(async () => {
    const db = anon(); if (!db) return null;
    const { data, error } = await db.rpc("gt_division_live_v1", { p_division: divisionId });
    if (error) throw error;
    // Server still behind what we asked for (cache rebuilding): try again on this tick.
    if (data && wanted.current === data && shown.current !== data) refresh(data);
    return data as string | null;
  }, (fp) => refresh(fp), { initial: fingerprint, interval: 10000 });

  // New server render arrived.
  useEffect(() => {
    if (fingerprint && fingerprint !== shown.current) {
      shown.current = fingerprint;
      accept(fingerprint);
      queueMicrotask(() => {
        setUpdatedAt(new Date());
        setToast("มีการอัปเดตคู่แข่งขัน / ผล");
      });
      const t = window.setTimeout(() => setToast(""), 4000);
      return () => window.clearTimeout(t);
    }
  }, [fingerprint, accept]);

  return (
    <>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--gt-muted)]" aria-live="off">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${status.offline ? "bg-[var(--gt-warn-soft)] text-[var(--gt-warn)]" : "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]"}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.offline ? "bg-[var(--gt-warn)]" : "animate-pulse bg-[var(--gt-ok)]"}`} />
          {status.offline ? "ขาดการเชื่อมต่อ กำลังลองใหม่" : pending ? "กำลังอัปเดต…" : "สด · อัปเดตอัตโนมัติ"}
        </span>
        <span>ตรวจล่าสุด {clock(status.checkedAt)}{updatedAt ? ` · อัปเดตเมื่อ ${clock(updatedAt)}` : ""}</span>
      </p>
      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-[90vw] rounded-full bg-[var(--gt-ink)] px-5 py-2.5 text-sm font-semibold text-[var(--gt-surface)] shadow-lg">
          ↻ {toast}
        </div>
      )}
    </>
  );
}
