"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { staffErrorMessage } from "@/lib/competition-day.mjs";

let client: SupabaseClient | null = null;

/** One browser client for the organiser pages; the login is kept in this browser until sign-out. */
export function staffDb(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "gt-organizer-auth" } });
  return client;
}

type StaffState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "not_staff"; email: string }
  | { status: "staff"; email: string; role: string; session: Session };

const Ctx = createContext<StaffState>({ status: "loading" });
export const useStaff = () => useContext(Ctx);

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StaffState>({ status: "loading" });

  useEffect(() => {
    const db = staffDb();
    if (!db) { queueMicrotask(() => setState({ status: "signed_out" })); return; }
    let active = true;
    const check = async (session: Session | null) => {
      if (!session) { if (active) setState({ status: "signed_out" }); return; }
      const { data } = await db.from("gt_staff_members").select("role,active").eq("user_id", session.user.id).maybeSingle();
      if (!active) return;
      const email = session.user.email ?? "";
      if (data?.active && (data.role === "owner" || data.role === "admin")) setState({ status: "staff", email, role: data.role, session });
      else setState({ status: "not_staff", email });
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
