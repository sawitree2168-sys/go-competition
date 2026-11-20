"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { setRemember, staffDb } from "@/app/organizer/_lib/staff";
import { authErrorMessage, destinationFor, looksLikeEmail } from "@/lib/auth-routing.mjs";
import { callEasy } from "@/lib/easy-auth.mjs";
import { Field, FormError, GoogleLogo, PasswordField, inputCls } from "./fields";
import Welcome from "./Welcome";

/** Google button appears once the provider is switched on in Supabase and this flag is set on Vercel. */
export const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1";

const nextParam = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("next"));

type Suggestion = { label: string; value: string; sub: string; photo: string | null };
type Pending = { kind: "teacher" | "freelance" | "referee"; role_label: string; name: string; academies?: { id: string; name: string }[] };
type Signed = { role_label: string | null; name: string | null; using_default: boolean; has_recovery: boolean };

const rankText = (sub: string) => sub.replace(/ · (\d{1,2})( ·|$)/, " · $1 คิว$2");

/**
 * The one sign-in form for every role: name / institution / team / GO ID / dan number / username (or e-mail) + password.
 * Each role has a default password; people without an account yet get one the first time they sign in with it.
 * With `stay`, the surrounding page (e.g. the organiser gate) takes over instead of navigating.
 */
export default function LoginForm({ stay, heading = "เข้าสู่ระบบ" }: { stay?: boolean; heading?: string }) {
  const [id, setId] = useState("");
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [password, setPassword] = useState("");
  const [remember, setRem] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [academy, setAcademy] = useState("");
  const [signed, setSigned] = useState<Signed | null>(null);

  const goOn = async () => {
    const { data } = await staffDb()!.rpc("gt_my_access_v1");
    if (stay) {
      // Signed in from an organiser page: stay only if this account may use it; referees / athletes / teachers go to their own page.
      const staff = Boolean(data?.platform_role) || (data?.organizers ?? []).some((o: { status: string }) => o.status === "active") || (data?.events ?? []).length > 0;
      if (staff) { window.location.reload(); return; }
      window.location.assign(destinationFor(data, null));
      return;
    }
    window.location.assign(destinationFor(data, nextParam()));
  };

  const afterSession = async (data: { session: { access_token: string; refresh_token: string } } & Signed) => {
    const { error: err } = await staffDb()!.auth.setSession(data.session);
    if (err) { setError(authErrorMessage(err.message)); return; }
    if (data.using_default) { setSigned(data); return; }
    await goOn();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const db = staffDb();
    if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    const who = (picked?.value ?? id).trim();
    if (!who || !password) return setError("กรุณากรอกชื่อ และรหัสผ่าน");
    setBusy(true);
    try {
      setRemember(remember);
      if (looksLikeEmail(who)) {
        const { error: err } = await db.auth.signInWithPassword({ email: who, password });
        if (err) { setError(authErrorMessage(err.message)); return; }
        await goOn();
        return;
      }
      const r = await callEasy("login", { identifier: who, password });
      if (r.data?.need_create) { setPending(r.data); return; }
      if (!r.ok || !r.data?.session) { setError(r.data?.message ?? "เข้าสู่ระบบไม่สำเร็จ"); return; }
      await afterSession(r.data);
    } catch (x) {
      setError(authErrorMessage(x instanceof Error ? x.message : ""));
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!pending) return;
    if (pending.kind === "teacher" && !academy) return setError("กรุณาเลือกสถาบันที่สอน");
    setBusy(true); setError("");
    const r = await callEasy("create", { identifier: pending.name, password, kind: pending.kind, academy_id: academy || undefined });
    setBusy(false);
    if (!r.ok || !r.data?.session) { setError(r.data?.message ?? "เปิดบัญชีไม่สำเร็จ"); return; }
    setPending(null);
    await afterSession(r.data);
  };

  const google = async () => {
    const db = staffDb();
    if (!db) return;
    setError("");
    setRemember(true);
    const back = new URL("/login/continue", window.location.origin);
    const n = nextParam();
    if (n) back.searchParams.set("next", n);
    const { error: err } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: back.toString() } });
    if (err) setError(authErrorMessage(err.message));
  };

  if (signed) return <Welcome who={signed} onDone={goOn} />;

  if (pending) {
    return (
      <div className="space-y-4">
        <h1 className="text-[1.75rem] sm:text-[2.25rem]">เปิดบัญชี{pending.role_label}</h1>
        <p className="text-base">ยังไม่มีชื่อ <b>{pending.name}</b> ในระบบ ต้องการเปิดบัญชี<b>{pending.role_label}</b>ด้วยชื่อนี้ใช่ไหม</p>
        {pending.kind === "teacher" && (
          <label className="block">
            <span className="gt-auth-label">สถาบันที่สอน</span>
            <select value={academy} onChange={(e) => setAcademy(e.target.value)} className={`${inputCls} mt-2 px-3.5`}>
              <option value="">— เลือกสถาบัน —</option>
              {(pending.academies ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <span className="mt-1 block text-xs text-[var(--gt-muted)]">ไม่มีสถาบันของคุณ? ใช้รหัสของครูอิสระแทน หรือให้เจ้าของสถาบันเข้าระบบก่อน</span>
          </label>
        )}
        {pending.kind === "freelance" && <p className="rounded-xl bg-[var(--gt-cta-soft)] p-3 text-sm">ครูอิสระจะได้พื้นที่ของตัวเอง เพิ่มนักเรียนที่สอนได้ แม้นักเรียนจะลงแข่งในนามโรงเรียนหรือสถาบันอื่น</p>}
        {pending.kind === "referee" && <p className="rounded-xl bg-[var(--gt-cta-soft)] p-3 text-sm">หลังเปิดบัญชี ผู้จัดงานจะเลือกชื่อคุณเป็นกรรมการของงานนั้น แล้วงานจะขึ้นในหน้า “บัญชีของฉัน”</p>}
        <p className="text-sm text-[var(--gt-muted)]">สะกดชื่อผิด? กด “กลับ” แล้วพิมพ์ใหม่ · ถ้าเป็นนักกีฬาหรือสถาบัน ให้ใช้รหัสของตำแหน่งนั้น</p>
        <FormError text={error} />
        <button type="button" onClick={create} disabled={busy} className="gt-cta-btn flex min-h-[3.25rem] w-full items-center justify-center text-[19px] disabled:opacity-60">
          {busy ? "กำลังเปิดบัญชี…" : `เปิดบัญชี${pending.role_label}`}
        </button>
        <button type="button" onClick={() => { setPending(null); setError(""); }} className="gt-outline-btn min-h-12 w-full font-semibold">กลับ</button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[2rem] sm:text-[2.625rem]">{heading}</h1>
      <p className="mt-1 text-base text-[var(--gt-muted)] sm:text-lg">ยินดีต้อนรับสู่ GO TOURNAMENT</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-5">
        <WhoField value={id} picked={picked} onChange={(v) => { setId(v); setPicked(null); }} onPick={(s) => { setPicked(s); setId(s.label); }} />
        <PasswordField label="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่าน" autoComplete="current-password"
          hint="ยังไม่เคยเปลี่ยน = ใช้รหัสเริ่มต้นของตำแหน่งที่ได้รับแจ้ง" />
        <div className="flex items-center justify-between gap-3">
          <label className="flex min-h-11 items-center gap-2.5 text-base">
            <input type="checkbox" checked={remember} onChange={(e) => setRem(e.target.checked)} className="h-5 w-5 accent-[var(--gt-cta)]" />
            จดจำฉัน
          </label>
          <Link href="/login/forgot" className="font-semibold text-[var(--gt-cta)] underline underline-offset-2">ลืมรหัสผ่าน?</Link>
        </div>
        <FormError text={error} />
        <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-[3.25rem] w-full items-center justify-center text-[19px] disabled:opacity-60">
          {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>

      {GOOGLE_ENABLED && (
        <>
          <div className="my-5 flex items-center gap-4 text-sm text-[var(--gt-muted)]"><span className="h-px flex-1 bg-[var(--gt-line)]" />หรือ<span className="h-px flex-1 bg-[var(--gt-line)]" /></div>
          <button type="button" onClick={google} className="flex min-h-[3.25rem] w-full items-center justify-center gap-3 rounded-xl border-2 border-[var(--gt-cta)]/60 bg-[var(--gt-surface)] text-[17px] hover:bg-[var(--gt-cta-soft)]">
            <GoogleLogo />เข้าสู่ระบบด้วย Google
          </button>
        </>
      )}

      <div className="mt-5 rounded-xl bg-[var(--gt-cta-soft)] px-3 py-3 text-sm text-[var(--gt-muted)]">
        <p className="font-semibold text-[var(--gt-ink)]">ใช้ชื่ออะไรเข้าระบบ</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>นักกีฬา: ชื่อ-นามสกุล รหัส GO หรือเลขดั้ง</li>
          <li>เจ้าของสถาบัน: ชื่อสถาบัน · ผู้จัดงาน: ชื่อทีม</li>
          <li>ครู ครูอิสระ กรรมการ: ชื่อของตัวเอง (ครั้งแรกระบบจะเปิดบัญชีให้)</li>
        </ul>
      </div>
      {!stay && <p className="mt-4 text-center text-base"><Link href="/tournaments" className="font-normal text-[var(--gt-cta)] underline underline-offset-2">ดูการแข่งขันโดยไม่เข้าสู่ระบบ</Link></p>}
    </div>
  );
}

/** Name box with suggestions (institutions, teams, athletes with photo and GO ID). */
function WhoField({ value, picked, onChange, onPick }: { value: string; picked: Suggestion | null; onChange: (v: string) => void; onPick: (s: Suggestion) => void }) {
  const [list, setList] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const q = value.trim();
    if (picked || q.length < 2 || looksLikeEmail(q)) { queueMicrotask(() => setList([])); return; }
    const n = ++seq.current;
    const t = setTimeout(async () => {
      const { data } = await staffDb()!.rpc("gt_easy_suggest_v1", { p_query: q });
      if (n === seq.current) setList((data ?? []) as Suggestion[]);
    }, 250);
    return () => clearTimeout(t);
  }, [value, picked]);

  return (
    <div className="relative">
      <Field label="ชื่อ / ชื่อสถาบัน / ชื่อทีม / รหัส GO" icon="person" value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="พิมพ์ 2–3 ตัวอักษรแล้วเลือกชื่อ" autoComplete="username" autoCapitalize="none" spellCheck={false}
        hint={picked ? `เลือกแล้ว: ${picked.label} (${rankText(picked.sub)})` : "ชื่อซ้ำกัน ดูรูปและรหัส GO ในรายการแล้วเลือกให้ถูกคน"} />
      {open && list.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-80 overflow-auto rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] shadow-lg">
          {list.map((s) => (
            <li key={s.value + s.sub}>
              <button type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(s); setOpen(false); }}
                className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--gt-cta-soft)]">
                {s.photo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={s.photo} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--gt-cta-soft)] text-sm font-bold text-[var(--gt-cta)]">{s.label.slice(0, 1)}</span>}
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.label}</span>
                  <span className="block truncate text-xs text-[var(--gt-muted)]">{rankText(s.sub)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
