"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { staffErrorMessage } from "@/lib/competition-day.mjs";

let client: SupabaseClient | null = null;

const AUTH_KEY = "gt-organizer-auth";
const EPHEMERAL = "gt-auth-ephemeral";   // set when "จดจำฉัน" was not ticked
const ALIVE_COOKIE = "gt-auth-alive";    // browser-session cookie: gone when the browser is closed

/** "จดจำฉัน": keep the login after the browser is closed (true) or only until then (false). */
export function setRemember(remember: boolean) {
  try {
    if (remember) localStorage.removeItem(EPHEMERAL);
    else {
      localStorage.setItem(EPHEMERAL, "1");
      document.cookie = `${ALIVE_COOKIE}=1; path=/; SameSite=Lax`;
    }
  } catch { /* storage blocked: default behaviour */ }
}

/** One browser client for every signed-in page (organisers, members); shared session, kept until sign-out. */
export function staffDb(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    // Not remembered and the browser has been closed since: start signed out.
    if (localStorage.getItem(EPHEMERAL) === "1" && !document.cookie.split("; ").some((c) => c.startsWith(`${ALIVE_COOKIE}=`))) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(EPHEMERAL);
    }
  } catch { /* storage blocked */ }
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_KEY } });
  return client;
}

export type OrganizerAccess = { id: string; name: string; status: "active" | "suspended"; role: "owner" | "admin" };

type StaffState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "not_staff"; email: string; suspended: boolean }
  | { status: "staff"; email: string; platformRole: string | null; organizers: OrganizerAccess[]; session: Session };

const Ctx = createContext<StaffState>({ status: "loading" });
export const useStaff = () => useContext(Ctx);
/** True for the site owner (and platform admins): sees every organiser and event. */
export const isPlatformAdmin = (s: StaffState) => s.status === "staff" && Boolean(s.platformRole);

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StaffState>({ status: "loading" });

  useEffect(() => {
    const db = staffDb();
    if (!db) { queueMicrotask(() => setState({ status: "signed_out" })); return; }
    let active = true;
    const check = async (session: Session | null) => {
      if (!session) { if (active) setState({ status: "signed_out" }); return; }
      // Platform owner/admin, or a member of an organiser whose account is active.
      const { data } = await db.rpc("gt_my_access_v1");
      if (!active) return;
      const email = session.user.email ?? "";
      const platformRole: string | null = data?.platform_role ?? null;
      const organizers = ((data?.organizers ?? []) as OrganizerAccess[]);
      const usable = organizers.filter((o) => o.status === "active");
      if (platformRole || usable.length) setState({ status: "staff", email, platformRole, organizers, session });
      else setState({ status: "not_staff", email, suspended: organizers.length > 0 });
    };
    db.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") check(session);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

/** Runs an organiser action, turning database errors into a Thai message. Returns null on failure, else { data } (data may be null for void functions). */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = useCallback(async <T,>(fn: () => PromiseLike<{ data: T | null; error: { message: string } | null }>) => {
    setBusy(true); setError("");
    try {
      const { data, error } = await fn();
      if (error) { setError(staffErrorMessage(error.message)); return null; }
      return { data };
    } catch (e) {
      setError(staffErrorMessage(e instanceof Error ? e.message : String(e)));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

export function ErrorNote({ text }: { text: string }) {
  if (!text) return null;
  return <p role="alert" className="rounded-xl border border-[var(--gt-bad)] bg-[var(--gt-surface)] px-4 py-3 text-sm text-[var(--gt-bad)]">{text}</p>;
}
