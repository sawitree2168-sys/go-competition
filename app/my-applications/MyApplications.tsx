"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { divisionLabel } from "@/lib/division-display";
import { RANKS, baht, phoneDigits, slipExt, slipProblem } from "@/lib/register-form.mjs";
import { KIND_LABEL, actionState, applicationStatus, refundLines, requestMoney, requestReason, thaiShort } from "@/lib/application-changes.mjs";
import { BirthPicker, Ico, Label, Note, Sheet, inputCls } from "../tournaments/[id]/register/parts";

type Policy = {
  allow_withdraw: boolean; withdraw_until: string | null; refund_tiers: { until: string; percent: number }[]; refund_after_percent: number;
  allow_swap: boolean; swap_until: string | null; swap_fee: number; allow_division: boolean; division_until: string | null; division_fee: number; note: string | null;
};
type Req = { id: string; kind: Kind; status: "pending" | "approved" | "rejected"; created_at: string; refund_amount: number; charge_amount: number;
  refund_done: boolean; new_division: string | null; new_name: string | null; decision_note: string | null };
type App = {
  id: string; reference: string; created_at: string; status: "pending" | "approved" | "rejected"; full_name: string; rank: string; club: string | null;
  tournament_id: string; title: string; event_date: string | null; division_id: string; division: string; fee: number | null; paid: boolean;
  registration: string | null; payment: string | null; policy: Policy | null; refund_percent_today: number;
  divisions: { id: string; name: string; fee: number | null }[]; requests: Req[];
  /** how this browser may act on it: its own account, or reference + phone */
  access: { kind: "account" } | { kind: "code"; reference: string; phone: string };
};
type Kind = "withdraw" | "swap" | "division";

const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const noop = () => () => {};
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const TONE = { ok: "bg-[var(--gt-win-bg)] text-[var(--gt-win-ink)]", bad: "bg-[var(--gt-loss-bg)] text-[var(--gt-loss-ink)]", wait: "bg-[var(--gt-warn-soft)] text-[var(--gt-warn)]" } as const;

export default function MyApplications({ initialRef }: { initialRef: string }) {
  const today = useSyncExternalStore(noop, bangkokToday, () => "");
  const [mine, setMine] = useState<App[] | null>(null);
  const [found, setFound] = useState<App[]>([]);
  const [ref, setRef] = useState(initialRef.toUpperCase());
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sheet, setSheet] = useState<{ app: App; kind: Kind } | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  const loadMine = useCallback(async () => {
    const db = staffDb();
    if (!db) return setMine([]);
    const { data: s } = await db.auth.getSession();
    setSignedIn(Boolean(s.session));
    if (!s.session) return setMine([]);
    const { data } = await db.rpc("gt_my_applications_v1");
    setMine(((data ?? []) as Omit<App, "access">[]).map((a) => ({ ...a, access: { kind: "account" } })));
  }, []);
  useEffect(() => { queueMicrotask(loadMine); }, [loadMine]);

  const lookup = useCallback(async (r: string, p: string) => {
    const db = staffDb();
    if (!db) return;
    setBusy(true); setMsg("");
    const { data, error } = await db.rpc("gt_application_status_v1", { p_reference: r, p_phone: phoneDigits(p) });
    setBusy(false);
    if (error || !data?.ok) return setMsg(requestReason(data?.error ?? "NETWORK"));
    const app = { ...(data.application as Omit<App, "access">), access: { kind: "code" as const, reference: r, phone: phoneDigits(p) } };
    setFound((list) => [app, ...list.filter((x) => x.id !== app.id)]);
  }, []);

  const refresh = async (app: App) => {
    if (app.access.kind === "code") await lookup(app.access.reference, app.access.phone);
    else await loadMine();
  };

  const apps = useMemo(() => {
    const seen = new Set(found.map((a) => a.id));
    return [...found, ...(mine ?? []).filter((a) => !seen.has(a.id))];
  }, [found, mine]);

  return (
    <div className="mt-4 space-y-4 pb-10">
      <form onSubmit={(e) => { e.preventDefault(); lookup(ref.trim(), phone); }} className="gt-card space-y-3 p-4">
        <p className="font-semibold">ค้นหาใบสมัครด้วยเลขอ้างอิง</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div><Label text="เลขอ้างอิง (6 ตัว)" htmlFor="ref" /><input id="ref" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} maxLength={12} autoComplete="off" placeholder="เช่น 3F9A1C" className={`${inputCls} gt-num uppercase tracking-widest`} /></div>
          <div><Label text="เบอร์โทรที่ใช้สมัคร" htmlFor="rph" /><input id="rph" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} placeholder="08x-xxx-xxxx" className={inputCls} /></div>
          <button type="submit" disabled={busy} className="gt-cta-btn min-h-12 px-6 disabled:opacity-60">{busy ? "…" : "ค้นหา"}</button>
        </div>
        {msg && <Note tone="bad">{msg}</Note>}
        {!signedIn && <p className="text-sm text-[var(--gt-muted)]">มีบัญชีนักกีฬา ผู้ปกครอง หรือครูสถาบัน? <Link href="/login" className="font-semibold text-[var(--gt-cta)] underline">เข้าสู่ระบบ</Link> เพื่อดูใบสมัครทั้งหมดในบัญชี</p>}
      </form>

      {mine === null && found.length === 0 ? <p className="text-center text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>
        : apps.length === 0 ? <p className="gt-card p-6 text-center text-[var(--gt-muted)]">ยังไม่มีใบสมัครที่แสดง กรอกเลขอ้างอิงและเบอร์โทรด้านบน</p>
        : apps.map((a) => <AppCard key={a.id} app={a} today={today} onAsk={(kind) => setSheet({ app: a, kind })} onChanged={() => refresh(a)} />)}

      {sheet && <RequestSheet app={sheet.app} kind={sheet.kind} today={today} onClose={() => setSheet(null)} onDone={() => { const a = sheet.app; setSheet(null); refresh(a); }} />}
    </div>
  );
}

function AppCard({ app, today, onAsk, onChanged }: { app: App; today: string; onAsk: (k: Kind) => void; onChanged: () => void }) {
  const st = applicationStatus(app);
  const active = st.tone !== "bad";
  const pending = app.requests.find((r) => r.status === "pending");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    if (!window.confirm("ยกเลิกคำขอนี้?")) return;
    setBusy(true);
    await staffDb()!.rpc("gt_application_cancel_request_v1", { p: app.access.kind === "code" ? { reference: app.access.reference, phone: app.access.phone } : { application_id: app.id } });
    setBusy(false); onChanged();
  };
  return (
    <section className="gt-card overflow-hidden" aria-label={`ใบสมัคร ${app.reference}`}>
      <div className="flex items-start gap-3 border-b border-[var(--gt-line)] p-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{app.title}</h2>
          <p className="text-sm text-[var(--gt-muted)]">รหัสใบสมัคร <span className="gt-num font-semibold">{app.reference}</span> · {when(app.created_at)}</p>
        </div>
        <span className={`shrink-0 rounded-2xl px-3 py-1 text-sm font-semibold ${TONE[st.tone as keyof typeof TONE]}`}>{st.label}</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-[17px] font-semibold">{app.full_name}</p>
          <p className="font-semibold text-[var(--gt-cta)]">{divisionLabel(app.division)}</p>
        </div>
        {active && !pending && (
          <div className="grid grid-cols-3 gap-2">
            {(["withdraw", "swap", "division"] as const).map((k) => {
              const s = actionState(app.policy, k, today, app.event_date);
              return (
                <button key={k} type="button" disabled={!s.ok} onClick={() => onAsk(k)} title={s.ok ? undefined : s.why}
                  className={`min-h-11 rounded-xl border px-2 text-[15px] font-semibold disabled:opacity-40 ${k === "withdraw" ? "border-[var(--gt-bad)] text-[var(--gt-bad)]" : "border-[var(--gt-line)]"}`}>{KIND_LABEL[k]}</button>
              );
            })}
          </div>
        )}
        {pending && (
          <div role="status" className="rounded-xl bg-[var(--gt-warn-soft)] p-3 text-sm">
            <p className="font-semibold text-[var(--gt-warn)]">ส่งคำขอ{KIND_LABEL[pending.kind]}แล้ว · รอผู้จัดตรวจ</p>
            <p>{pending.kind === "division" && `รุ่นใหม่: ${divisionLabel(pending.new_division ?? "")} · `}{pending.kind === "swap" && `คนใหม่: ${pending.new_name} · `}
              {pending.refund_amount > 0 && `เงินคืน ${baht(pending.refund_amount)} · `}{pending.charge_amount > 0 && `ค่าธรรมเนียม ${baht(pending.charge_amount)} · `}ส่งเมื่อ {when(pending.created_at)}</p>
            <button type="button" onClick={cancel} disabled={busy} className="mt-1 min-h-9 font-semibold text-[var(--gt-bad)] underline disabled:opacity-60">ยกเลิกคำขอ</button>
          </div>
        )}
        {app.requests.filter((r) => r.status !== "pending").slice(0, 3).map((r) => (
          <p key={r.id} className="text-sm">
            <span className={r.status === "approved" ? "text-[var(--gt-ok)]" : "text-[var(--gt-bad)]"}>{r.status === "approved" ? "✓ อนุมัติ" : "✕ ไม่อนุมัติ"}คำขอ{KIND_LABEL[r.kind]}</span>
            {r.refund_amount > 0 && r.status === "approved" && <> · เงินคืน {baht(r.refund_amount)} {r.refund_done ? "(โอนคืนแล้ว)" : "(รอผู้จัดโอน)"}</>}
            {r.decision_note && <span className="text-[var(--gt-muted)]"> · {r.decision_note}</span>}
          </p>
        ))}
        {active && (
          <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="rounded-xl bg-[var(--gt-surface-2)] px-3 py-2 text-sm">
            <summary className="cursor-pointer font-semibold">เงื่อนไขถอนตัว / เปลี่ยนคน / เปลี่ยนรุ่น ของงานนี้</summary>
            <PolicyText policy={app.policy} />
          </details>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--gt-line)] px-4 py-3">
        <span className={`text-sm font-semibold ${st.tone === "ok" ? "text-[var(--gt-ok)]" : st.tone === "bad" ? "text-[var(--gt-bad)]" : "text-[var(--gt-warn)]"}`}>
          {st.tone === "ok" ? "✓ ยืนยันการสมัครเรียบร้อย" : st.label}
        </span>
        <span className="text-sm text-[var(--gt-muted)]">ค่าสมัคร <b className="gt-num text-lg text-[var(--gt-ink)]">{Number(app.fee ?? 0).toLocaleString("th-TH")} ฿</b></span>
      </div>
    </section>
  );
}

export function PolicyText({ policy }: { policy: Policy | null }) {
  if (!policy) return <p className="mt-1.5 text-[var(--gt-muted)]">ผู้จัดยังไม่ได้ตั้งเงื่อนไข กรุณาติดต่อผู้จัด</p>;
  return (
    <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
      {policy.allow_withdraw ? <li>ถอนตัวได้{policy.withdraw_until ? `ถึง ${thaiShort(policy.withdraw_until)}` : "จนถึงวันแข่ง"} · {refundLines(policy).join(" · ")}</li> : <li>ไม่เปิดให้ถอนตัว</li>}
      {policy.allow_swap ? <li>เปลี่ยนคนได้{policy.swap_until ? `ถึง ${thaiShort(policy.swap_until)}` : "จนถึงวันแข่ง"}{Number(policy.swap_fee) > 0 ? ` · ค่าธรรมเนียม ${baht(policy.swap_fee)}` : " · ไม่มีค่าธรรมเนียม"}</li> : <li>ไม่เปิดให้เปลี่ยนคน</li>}
      {policy.allow_division ? <li>เปลี่ยนรุ่นได้{policy.division_until ? `ถึง ${thaiShort(policy.division_until)}` : "จนถึงวันแข่ง"}{Number(policy.division_fee) > 0 ? ` · ค่าธรรมเนียม ${baht(policy.division_fee)}` : ""} · รุ่นใหม่แพงกว่าจ่ายส่วนต่าง</li> : <li>ไม่เปิดให้เปลี่ยนรุ่น</li>}
      {policy.note && <li className="whitespace-pre-line">{policy.note}</li>}
      <li>ทุกคำขอต้องรอผู้จัดอนุมัติ</li>
    </ul>
  );
}

const BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงเทพ", "กรุงไทย", "กรุงศรีอยุธยา", "ทหารไทยธนชาต (ttb)", "ออมสิน", "ธ.ก.ส.", "พร้อมเพย์"];

function RequestSheet({ app, kind, today, onClose, onDone }: { app: App; kind: Kind; today: string; onClose: () => void; onDone: () => void }) {
  const [newDiv, setNewDiv] = useState("");
  const [bank, setBank] = useState({ bank_name: "", account_name: "", account_number: "" });
  const [reason, setReason] = useState("");
  const [accept, setAccept] = useState(false);
  const [slip, setSlip] = useState<File | null>(null);
  const [slipErr, setSlipErr] = useState("");
  const [person, setPerson] = useState({ first_name: "", last_name: "", birth_date: "", phone: "", rank: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const money = requestMoney(app, kind, today, newDiv);
  const other = app.divisions.filter((d) => d.id !== app.division_id);

  const submit = async () => {
    const db = staffDb();
    if (!db) return;
    setBusy(true); setErrors([]);
    let slipPath: string | null = null;
    if (money.charge > 0 && slip) {
      const path = `web/${crypto.randomUUID()}.${slipExt(slip.type)}`;
      const up = await db.storage.from("gt-payment-slips").upload(path, slip, { contentType: slip.type, upsert: false });
      if (up.error) { setBusy(false); return setErrors(["UPLOAD"]); }
      slipPath = path;
    }
    const who = app.access.kind === "code" ? { reference: app.access.reference, phone: app.access.phone } : { application_id: app.id };
    const { data, error } = await db.rpc("gt_application_request_v1", {
      p: { ...who, kind, reason, accept, new_division: kind === "division" ? newDiv : null,
        refund_bank: kind === "withdraw" ? bank : null, pay_slip: slipPath, pay_slip_mime: slipPath ? slip?.type : null,
        new_person: kind === "swap" ? { mode: "new", ...person, phone: phoneDigits(person.phone) } : null },
    });
    setBusy(false);
    if (error) return setErrors(["NETWORK"]);
    if (!data?.ok) return setErrors((data?.errors ?? ["NETWORK"]) as string[]);
    setDone(true);
  };

  return (
    <Sheet title={`ขอ${KIND_LABEL[kind]}`} onClose={done ? onDone : onClose}>
      {done ? (
        <div role="status" className="space-y-3 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--gt-ok)] text-white"><Ico name="check" className="h-8 w-8" /></span>
          <p className="text-lg font-bold">ส่งคำขอ{KIND_LABEL[kind]}แล้ว</p>
          <p className="text-[var(--gt-muted)]">รอผู้จัดตรวจและอนุมัติ{money.refund > 0 ? ` · เมื่ออนุมัติ ผู้จัดจะโอนเงินคืน ${baht(money.refund)} เข้าบัญชีที่กรอกไว้` : ""}</p>
          <button type="button" onClick={onDone} className="gt-cta-btn min-h-12 w-full">กลับไปที่ใบสมัคร</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--gt-surface-2)] p-3 text-sm">
            <p className="font-semibold">{app.full_name} · {divisionLabel(app.division)}</p>
            <p className="text-[var(--gt-muted)]">{app.title} · รหัส {app.reference}</p>
          </div>

          {kind === "withdraw" && (
            <>
              <div className="rounded-2xl border border-[var(--gt-line)] p-3 text-center">
                <p className="text-sm text-[var(--gt-muted)]">{app.paid ? `ขอวันนี้ได้คืน ${money.percent}% ของ ${baht(app.fee)}` : "ยังไม่ได้ชำระเงิน จึงไม่มีเงินคืน"}</p>
                <p className="gt-num text-3xl font-bold text-[var(--gt-cta)]">{baht(money.refund)}</p>
                <p className="text-xs text-[var(--gt-muted)]">{refundLines(app.policy).join(" · ")}</p>
              </div>
              {money.refund > 0 && (
                <fieldset className="space-y-3">
                  <legend className="mb-1 font-semibold">บัญชีรับเงินคืน <span className="text-[var(--gt-bad)]">*</span></legend>
                  <input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} list="refund-banks" placeholder="ธนาคาร" aria-label="ธนาคาร" className={inputCls} aria-invalid={errors.includes("BANK")} />
                  <datalist id="refund-banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
                  <input value={bank.account_name} onChange={(e) => setBank({ ...bank, account_name: e.target.value })} placeholder="ชื่อบัญชี" aria-label="ชื่อบัญชี" className={inputCls} />
                  <input value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value })} inputMode="numeric" placeholder="เลขบัญชี / พร้อมเพย์" aria-label="เลขบัญชี" className={inputCls} />
                  <Note>เห็นเฉพาะผู้จัด ใช้สำหรับโอนเงินคืนเท่านั้น</Note>
                </fieldset>
              )}
            </>
          )}

          {kind === "division" && (
            <div>
              <Label text="รุ่นใหม่" required htmlFor="nd" />
              <select id="nd" value={newDiv} onChange={(e) => setNewDiv(e.target.value)} className={inputCls} aria-invalid={errors.includes("DIVISION")}>
                <option value="">เลือกรุ่นใหม่</option>
                {other.map((d) => <option key={d.id} value={d.id}>{divisionLabel(d.name)}{d.fee !== null ? ` · ${baht(d.fee)}` : ""}</option>)}
              </select>
            </div>
          )}

          {kind === "swap" && (
            <fieldset className="space-y-3">
              <legend className="mb-1 font-semibold">นักกีฬาคนใหม่</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label text="ชื่อ" required htmlFor="sf" /><input id="sf" value={person.first_name} onChange={(e) => setPerson({ ...person, first_name: e.target.value })} maxLength={60} className={inputCls} /></div>
                <div><Label text="นามสกุล" required htmlFor="sl" /><input id="sl" value={person.last_name} onChange={(e) => setPerson({ ...person, last_name: e.target.value })} maxLength={60} className={inputCls} /></div>
              </div>
              <div><Label text="วันเดือนปีเกิด" required /><BirthPicker value={person.birth_date} onChange={(v) => setPerson((p) => ({ ...p, birth_date: v }))} today={today} invalid={errors.includes("BIRTH")} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label text="ระดับฝีมือ" required htmlFor="sr" />
                  <select id="sr" value={person.rank} onChange={(e) => setPerson({ ...person, rank: e.target.value })} className={inputCls}><option value="">เลือกระดับ</option>{RANKS.map((r) => <option key={r}>{r}</option>)}</select></div>
                <div><Label text="เบอร์ติดต่อ" required htmlFor="sp" /><input id="sp" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} inputMode="tel" maxLength={20} className={inputCls} /></div>
              </div>
            </fieldset>
          )}

          {money.charge > 0 && (
            <div className="space-y-2 rounded-2xl border border-[var(--gt-line)] p-3">
              <p className="flex justify-between"><span>ค่าธรรมเนียม{kind === "division" ? " + ส่วนต่างค่าสมัคร" : ""}</span><b className="gt-num text-lg text-[var(--gt-cta)]">{baht(money.charge)}</b></p>
              <p className="text-sm text-[var(--gt-muted)]">โอนเข้าบัญชีเดียวกับตอนสมัคร แล้วแนบสลิป</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="gt-outline-btn min-h-11 w-full font-semibold">{slip ? `เปลี่ยนสลิป (${slip.name})` : "แนบสลิป"}</button>
              {slipErr && <Note tone="bad">{slipErr}</Note>}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" aria-label="เลือกไฟล์สลิปค่าธรรมเนียม"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const p = slipProblem(f); setSlipErr(p); if (!p) setSlip(f); }} />
            </div>
          )}

          <div><Label text="เหตุผล (ไม่บังคับ)" htmlFor="rs" /><textarea id="rs" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} className={`${inputCls} py-2`} /></div>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gt-cta)]" />
            <span>อ่านเงื่อนไขของผู้จัดแล้ว และเข้าใจว่าคำขอต้องรอผู้จัดอนุมัติ</span>
          </label>
          {errors.length > 0 && (
            <div role="alert" className="rounded-xl border border-[var(--gt-bad)] p-3 text-sm text-[var(--gt-bad)]">
              <p className="font-bold">ส่งคำขอไม่สำเร็จ</p>
              <ul className="list-disc pl-5">{errors.map((c) => <li key={c}>{requestReason(c)}</li>)}</ul>
            </div>
          )}
          <button type="button" onClick={submit} disabled={busy} className={`min-h-12 w-full rounded-xl font-bold text-white disabled:opacity-60 ${kind === "withdraw" ? "bg-[var(--gt-bad)]" : "gt-cta-btn"}`}>
            {busy ? "กำลังส่ง…" : `ส่งคำขอ${KIND_LABEL[kind]}`}
          </button>
        </div>
      )}
    </Sheet>
  );
}
