"use client";

import { useId, useState } from "react";

export const inputCls = "block min-h-[3.25rem] w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] text-[17px] text-[var(--gt-ink)] outline-none placeholder:text-[var(--gt-muted)] focus:border-[var(--gt-cta)] focus:ring-2 focus:ring-[var(--gt-cta)]/25";

const PersonIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeLinecap="round" /></svg>;
const MailIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" strokeLinejoin="round" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3M12 14.5v2.5" strokeLinecap="round" /></svg>;
const Eye = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M4 20 20 4" strokeLinecap="round" />}
  </svg>
);

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & { label: string; icon?: "person" | "mail" | "lock"; hint?: string };

/** Labelled input with a leading icon. */
export function Field({ label, icon, hint, ...rest }: Props) {
  const Icon = icon === "mail" ? MailIcon : icon === "lock" ? LockIcon : icon === "person" ? PersonIcon : null;
  const hintId = useId();
  return (
    <div>
      <label className="block">
        <span className="gt-auth-label">{label}</span>
        <span className="relative mt-2 block">
          {Icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gt-muted)]"><Icon /></span>}
          <input {...rest} aria-describedby={hint ? hintId : undefined} className={`${inputCls} ${Icon ? "pl-11" : "pl-3.5"} pr-3.5`} />
        </span>
      </label>
      {hint && <p id={hintId} className="mt-1 text-xs text-[var(--gt-muted)]">{hint}</p>}
    </div>
  );
}

/** Password input with a lock icon and a show / hide button. */
export function PasswordField({ label, hint, ...rest }: Omit<Props, "icon" | "type">) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="gt-auth-label block">{label}</label>
      <span className="relative mt-2 block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gt-muted)]"><LockIcon /></span>
        <input {...rest} id={id} aria-describedby={hint ? `${id}-hint` : undefined} type={show ? "text" : "password"} className={`${inputCls} pl-11 pr-14`} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={show}
          className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-[var(--gt-muted)] hover:text-[var(--gt-ink)]">
          <Eye off={show} />
        </button>
      </span>
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-[var(--gt-muted)]">{hint}</p>}
    </div>
  );
}

export function FormError({ text }: { text: string }) {
  if (!text) return null;
  return <p role="alert" className="rounded-xl border border-[var(--gt-bad)] px-3 py-2 text-sm text-[var(--gt-bad)]">{text}</p>;
}

export function FormNote({ text, tone = "ok" }: { text: string; tone?: "ok" | "info" }) {
  if (!text) return null;
  return <p role="status" className={`rounded-xl border px-3 py-2.5 text-sm ${tone === "ok" ? "border-[var(--gt-ok)] text-[var(--gt-ok)]" : "border-[var(--gt-line)] bg-[var(--gt-cta-soft)]"}`}>{text}</p>;
}

export const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-6 w-6">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
