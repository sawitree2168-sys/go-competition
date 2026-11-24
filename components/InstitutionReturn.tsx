"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import MenuIcon from "./MenuIcon";

/** Saved by the institution page so teachers can always find their way back to it. */
export const INSTITUTION_RETURN_KEY = "gt-institution-return";
const IDS_CACHE = "gt-my-student-ids";
const STYLE_ID = "gt-my-student-marks";
type Saved = { href: string; name: string };
type Mine = { at: number; user: string; ids: string[] };

/**
 * Green dot "นักเรียนของเรา" next to every name a page tags with data-athlete-id (pairings, standings, wall list,
 * GO FAN…). Pure CSS, so names that arrive later through live refresh are marked too.
 */
export function applyMarks(ids: string[]) {
  document.getElementById(STYLE_ID)?.remove();
  const safe = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!safe.length) return;
  const sel = safe.map((id) => `[data-athlete-id="${id}"]`).join(",");
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `:is(${sel})::before{content:"";display:inline-block;width:.62em;height:.62em;margin-right:.38em;border-radius:50%;background:#16a34a;box-shadow:0 0 0 2px #fff,0 0 0 3.5px #16a34a;vertical-align:.06em;flex:none}`
    + `:is(${sel}){background:linear-gradient(transparent 62%,rgba(22,163,74,.22) 62%);border-radius:2px}`;
  document.head.append(style);
}

async function loadMine(): Promise<string[]> {
  const db = staffDb();
  if (!db) return [];
  const { data } = await db.auth.getSession();
  const user = data.session?.user.id;
  if (!user) return [];
  try {
    const c = JSON.parse(sessionStorage.getItem(IDS_CACHE) ?? "null") as Mine | null;
    if (c && c.user === user && Date.now() - c.at < 10 * 60 * 1000) return c.ids;
  } catch { /* no cache */ }
  const { data: mine, error } = await db.rpc("gt_my_student_ids_v1");
  const ids = !error && Array.isArray(mine?.ids) ? (mine.ids as string[]) : [];
  try { sessionStorage.setItem(IDS_CACHE, JSON.stringify({ at: Date.now(), user, ids })); } catch { /* full */ }
  return ids;
}

/**
 * For teachers / institution owners who opened the institution page:
 * - a "กลับหน้าสถาบัน" button on every other page (hidden on the institution, organiser and referee pages);
 * - a green dot beside their own students' names on competition pages, with the count on this button.
 */
export default function InstitutionReturn() {
  const pathname = usePathname();
  const [saved, setSaved] = useState<Saved | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let next: Saved | null = null;
    try {
      const raw = window.localStorage.getItem(INSTITUTION_RETURN_KEY);
      const v = raw ? JSON.parse(raw) : null;
      if (v && typeof v.href === "string" && v.href.startsWith("/institution")) next = { href: v.href, name: String(v.name ?? "") };
    } catch { next = null; }
    queueMicrotask(() => setSaved(next));
  }, [pathname]);

  // Only teachers (who have opened their institution page) fetch their students.
  const teacher = Boolean(saved);
  useEffect(() => {
    if (!teacher) { applyMarks([]); return; }
    let live = true;
    void loadMine().then((list) => { if (live) { setIds(list); applyMarks(list); } });
    return () => { live = false; };
  }, [teacher]);

  // How many of our students are on this page (re-counted when the page updates itself).
  useEffect(() => {
    if (!ids.length) { queueMicrotask(() => setCount(0)); return; }
    const mine = new Set(ids);
    let timer = 0;
    const recount = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const seen = new Set<string>();
        document.querySelectorAll<HTMLElement>("[data-athlete-id]").forEach((el) => { const id = el.dataset.athleteId; if (id && mine.has(id)) seen.add(id); });
        setCount(seen.size);
      }, 250);
    };
    recount();
    const obs = new MutationObserver(recount);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); window.clearTimeout(timer); };
  }, [ids, pathname]);

  if (!saved || /^\/(institution|organizer|referee)(\/|$)/.test(pathname)) return null;
  return (
    <Link href={saved.href} className="gt-institution-return" aria-label={`กลับหน้าสถาบัน ${saved.name}${count ? ` · นักเรียนของเราในหน้านี้ ${count} คน` : ""}`}>
      <MenuIcon name="school" className="h-5 w-5 shrink-0" />
      <span className="min-w-0 truncate">กลับหน้าสถาบัน{saved.name && !count ? ` · ${saved.name}` : ""}</span>
      {count > 0 && <span className="gt-institution-return-count"><i aria-hidden="true" />นักเรียนเรา {count} คน</span>}
    </Link>
  );
}
