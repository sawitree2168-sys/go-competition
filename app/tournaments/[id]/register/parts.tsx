"use client";
/* eslint-disable @next/next/no-img-element -- local previews and storage URLs */

import { useEffect, useMemo, useState } from "react";
import { MAX_ACADEMIES, THAI_MONTHS, ageOn, beYears, birthIso } from "@/lib/register-form.mjs";

export const inputCls = "block min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3.5 text-base text-[var(--gt-ink)] outline-none placeholder:text-[var(--gt-muted)] focus:border-[var(--gt-cta)] focus:ring-2 focus:ring-[var(--gt-cta)]/25 aria-[invalid=true]:border-[var(--gt-bad)]";

type IconName = "person" | "school" | "users" | "chart" | "search" | "trophy" | "card" | "doc" | "check" | "info" | "camera" | "x" | "lock";
const PATHS: Record<IconName, React.ReactNode> = {
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  school: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17" cy="9" r="2.8" /><path d="M16 14.2c3 .2 5.5 2.4 5.5 5.8" /></>,
  chart: <path d="M5 20V12M10 20V7M15 20v-5M20 20V4" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  trophy: <><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 20h8M9 17h6" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  doc: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
  camera: <><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
};
export function Ico({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{PATHS[name]}</svg>;
}

export function Section({ icon, title, aside, children, id }: { icon: IconName; title: string; aside?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="gt-card overflow-hidden" aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-[var(--gt-line)] bg-[var(--gt-cta-soft)] px-4 py-3">
        <Ico name={icon} className="h-6 w-6 text-[var(--gt-cta)]" />
        <h2 id={id ? `${id}-h` : undefined} className="text-lg font-bold">{title}</h2>
        {aside && <span className="text-sm text-[var(--gt-muted)]">{aside}</span>}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export function Label({ text, required, htmlFor }: { text: string; required?: boolean; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block font-semibold">{text}{required && <span className="text-[var(--gt-bad)]"> *</span>}</label>;
}

export function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "bad" | "warn" | "ok" }) {
  const c = { info: "text-[var(--gt-muted)]", bad: "text-[var(--gt-bad)]", warn: "text-[var(--gt-warn)]", ok: "text-[var(--gt-ok)]" }[tone];
  return <p className={`flex items-start gap-1.5 text-sm ${c}`}><Ico name={tone === "bad" ? "x" : tone === "ok" ? "check" : "info"} className="mt-0.5 h-4 w-4" /><span>{children}</span></p>;
}

/** Day / month / Buddhist year pickers with the age worked out next to them. */
export function BirthPicker({ value, onChange, today, invalid }: { value: string; onChange: (iso: string) => void; today: string; invalid?: boolean }) {
  const [d, setD] = useState(() => (value ? String(Number(value.slice(8, 10))) : ""));
  const [m, setM] = useState(() => (value ? String(Number(value.slice(5, 7))) : ""));
  const [y, setY] = useState(() => (value ? String(Number(value.slice(0, 4)) + 543) : ""));
  const years = useMemo(() => beYears(today), [today]);
  const set = (nd: string, nm: string, ny: string) => { setD(nd); setM(nm); setY(ny); onChange(birthIso(nd, nm, ny)); };
  const age = ageOn(value, today);
  const sel = `${inputCls} !px-2.5`;
  const partial = Boolean(d && m && y) && !value;
  return (
    <div>
      <div className="grid grid-cols-[0.8fr_1fr_1.15fr] gap-2 sm:grid-cols-[0.8fr_1fr_1.15fr_auto]">
        <select aria-label="วันเกิด" value={d} onChange={(e) => set(e.target.value, m, y)} className={sel} aria-invalid={invalid && !d}>
          <option value="">วัน</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </select>
        <select aria-label="เดือนเกิด" value={m} onChange={(e) => set(d, e.target.value, y)} className={sel} aria-invalid={invalid && !m}>
          <option value="">เดือน</option>{THAI_MONTHS.map((t, i) => <option key={t} value={i + 1}>{t}</option>)}
        </select>
        <select aria-label="ปีเกิด (พ.ศ.)" value={y} onChange={(e) => set(d, m, e.target.value)} className={sel} aria-invalid={invalid && !y}>
          <option value="">ปี พ.ศ.</option>{years.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="col-span-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--gt-surface-2)] px-3 text-center sm:col-span-1 sm:min-w-[4.5rem] sm:flex-col sm:gap-0" aria-live="polite">
          <span className="text-sm leading-none text-[var(--gt-muted)] sm:text-[11px]">อายุ</span>
          <span className="gt-num text-lg font-bold leading-tight">{age === null ? "–" : `${age} ปี`}</span>
        </div>
      </div>
      {partial && <Note tone="bad">วันที่นี้ไม่มีในปฏิทิน</Note>}
    </div>
  );
}

/** Pick one or more Go institutions (names from the site), plus any not listed. */
export function AcademyPicker({ names, value, onChange }: { names: string[] | null; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [other, setOther] = useState("");
  const key = (s: string) => s.toLowerCase().replace(/[\s.\-()ฯ]/g, "");
  const chosen = new Set(value.map(key));
  const toggle = (n: string) => onChange(chosen.has(key(n)) ? value.filter((v) => key(v) !== key(n)) : value.length >= MAX_ACADEMIES ? value : [...value, n]);
  const list = useMemo(() => (names ?? []).filter((n) => !q.trim() || key(n).includes(key(q))), [names, q]);
  const extra = value.filter((v) => !(names ?? []).some((n) => key(n) === key(v)));
  const addOther = () => {
    const n = other.trim().replace(/\s+/g, " ");
    if (n.length < 2 || value.length >= MAX_ACADEMIES) return;
    const known = (names ?? []).find((x) => key(x) === key(n));
    if (!chosen.has(key(n))) onChange([...value, known ?? n]);
    setOther("");
  };
  const chip = (n: string, on: boolean) => (
    <label key={n} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[15px] ${on ? "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)] font-semibold" : "border-[var(--gt-line)] bg-[var(--gt-surface)]"}`}>
      <input type="checkbox" checked={on} onChange={() => toggle(n)} className="h-5 w-5 accent-[var(--gt-cta)]" />{n}
    </label>
  );
  return (
    <div className="space-y-3">
      {value.length > 0 && <div className="flex flex-wrap gap-2" aria-label="สถาบันที่เลือก">{value.map((n) => chip(n, true))}</div>}
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อสถาบัน" aria-label="ค้นหาชื่อสถาบัน" className={inputCls} />
      <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
        {names === null ? <p className="text-sm text-[var(--gt-muted)]">กำลังโหลดรายชื่อสถาบัน…</p>
          : list.filter((n) => !chosen.has(key(n))).map((n) => chip(n, false))}
        {names !== null && list.length === 0 && <p className="text-sm text-[var(--gt-muted)]">ไม่พบชื่อนี้ เพิ่มเองได้ที่ช่องด้านล่าง</p>}
      </div>
      <div className="flex gap-2">
        <input value={other} onChange={(e) => setOther(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOther(); } }}
          maxLength={120} placeholder="สถาบันอื่น ๆ (ระบุ)" aria-label="สถาบันอื่น ๆ" className={`${inputCls} min-w-0 flex-1`} />
        <button type="button" onClick={addOther} disabled={other.trim().length < 2 || value.length >= MAX_ACADEMIES} className="gt-outline-btn min-h-12 shrink-0 px-4 font-semibold disabled:opacity-50">เพิ่ม</button>
      </div>
      {extra.length > 0 && <Note>สถาบันที่ไม่มีในรายชื่อ ({extra.join(", ")}) จะส่งให้ผู้จัดตรวจสอบ</Note>}
      <p className="text-sm text-[var(--gt-muted)]">เลือกได้ไม่เกิน {MAX_ACADEMIES} แห่ง · ไม่สังกัดสถาบันไม่ต้องเลือก</p>
    </div>
  );
}

/** A full-screen sheet (mobile) / centred dialog (desktop). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="gt flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[var(--gt-surface)] text-[var(--gt-ink)] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[var(--gt-line)] px-4 py-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="ปิด" className="grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--gt-surface-2)]"><Ico name="x" /></button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function Avatar({ src, className = "h-20 w-20" }: { src: string | null; className?: string }) {
  return src
    ? <img src={src} alt="" className={`${className} shrink-0 rounded-lg border-2 border-[var(--gt-line)] object-cover`} />
    : (
      <span aria-hidden="true" className={`${className} grid shrink-0 place-items-center rounded-full bg-[var(--gt-avatar-top)] text-[var(--gt-cta)]`}>
        <Ico name="person" className="h-1/2 w-1/2" />
      </span>
    );
}
