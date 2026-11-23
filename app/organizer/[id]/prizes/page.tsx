"use client";
/* eslint-disable @next/next/no-img-element -- private signed images (QR, proof photos, slips) */

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import Gate from "../../_lib/Gate";
import { ErrorNote, staffDb, useAction, useStaff } from "../../_lib/staff";
import { divisionLabel } from "@/lib/division-display";
import AthleteAvatar from "@/components/AthleteAvatar";

type Rule = { place: number; cash: number; trophy: boolean };
type Setup = { open: boolean; divisions: { id: string; name: string; friendship: boolean; rules: Rule[] }[] };
type Winner = {
  division_id: string; division: string; pool: string | null; place: number; athlete_id: string; name: string; institution: string | null;
  photo: string | null; go_id: string | null; cash: number; trophy: boolean; has_account: boolean;
  payout: { bank: string | null; account_name: string | null; account_no: string | null; promptpay: string | null; qr_path: string | null } | null;
  proof_path: string | null; proof_at: string | null; trophy_given_at: string | null; paid_at: string | null; paid_amount: number | null; slip_path: string | null;
};

const BUCKET = "gt-payment-slips";
const baht = (n: number) => `${n.toLocaleString("th-TH")} บาท`;
const placeText = (p: number) => (p === 1 ? "ชนะเลิศ" : `รองชนะเลิศอันดับ ${p - 1}`);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export default function PrizesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Gate><Prizes id={id} /></Gate>;
}

/** Private file (QR, proof photo, slip) shown through a short-lived signed link. */
function PrivateImage({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  useEffect(() => {
    let live = true;
    staffDb()?.storage.from(BUCKET).createSignedUrl(path, 600).then(({ data }) => { if (live) setUrl(data?.signedUrl ?? null); });
    return () => { live = false; };
  }, [path]);
  if (!url) return <span className="text-xs text-[var(--gt-muted)]">กำลังโหลด{label}…</span>;
  if (path.endsWith(".pdf")) return <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--gt-cta)] underline">เปิด{label} (PDF)</a>;
  return <>
    <button type="button" onClick={() => setBig(true)} className="block overflow-hidden rounded-lg border border-[var(--gt-line)]" aria-label={`ดู${label}ขนาดใหญ่`}>
      <img src={url} alt={label} className="h-24 w-24 object-cover" />
    </button>
    {big && <div role="dialog" aria-label={label} onClick={() => setBig(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <img src={url} alt={label} className="max-h-full max-w-full rounded-xl bg-white" />
    </div>}
  </>;
}

function Prizes({ id }: { id: string }) {
  const staff = useStaff();
  const action = useAction();
  const { setError } = action;
  const [title, setTitle] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [board, setBoard] = useState<Winner[] | null>(null);
  const [tab, setTab] = useState<"winners" | "rules">("winners");
  const [filter, setFilter] = useState<"all" | "todo">("todo");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const db = staffDb()!;
    const [ev, s, b] = await Promise.all([
      db.from("gt_tournaments").select("title").eq("id", id).maybeSingle(),
      db.rpc("gt_staff_prize_setup_v1", { p_tournament: id }),
      db.rpc("gt_staff_prize_board_v1", { p_tournament: id }),
    ]);
    setTitle(ev.data?.title ?? "");
    if (s.error || b.error) setError("โหลดข้อมูลรางวัลไม่ได้: " + (s.error ?? b.error)!.message);
    setSetup((s.data ?? null) as Setup | null);
    setBoard((b.data ?? []) as Winner[]);
    if (s.data && !(s.data as Setup).divisions.some((d) => d.rules.length)) setTab("rules");
  }, [id, setError]);
  useEffect(() => { if (staff.status === "staff") queueMicrotask(load); }, [staff.status, load]);

  const saveRule = async (division: string, place: number, cash: number, trophy: boolean) => {
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_set_prize_rule_v1", { p_division: division, p_place: place, p_cash: Math.max(0, Math.round(cash || 0)), p_trophy: trophy }));
    if (ok) await load();
  };
  const toggleOpen = async () => {
    if (!setup) return;
    const next = !setup.open;
    if (next && !window.confirm("ประกาศรางวัล? นักกีฬาที่ได้รางวัลจะเห็นในหน้าบัญชีของตัวเอง แนบรูปยืนยัน และกรอกบัญชีรับเงินได้")) return;
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_set_prizes_open_v1", { p_tournament: id, p_open: next }));
    if (ok) await load();
  };
  const mark = async (w: Winner, what: "trophy" | "paid", done: boolean, slip?: File) => {
    let slipPath: string | null = null;
    if (slip) {
      const ext = slip.type === "application/pdf" ? "pdf" : slip.type === "image/png" ? "png" : slip.type === "image/webp" ? "webp" : "jpg";
      slipPath = `prize-slip/${crypto.randomUUID()}.${ext}`;
      const up = await staffDb()!.storage.from(BUCKET).upload(slipPath, slip, { contentType: slip.type, upsert: false });
      if (up.error) { setError("อัปโหลดสลิปไม่สำเร็จ: " + up.error.message); return; }
    }
    if (what === "paid" && !done && !window.confirm(`ยกเลิกสถานะ "โอนแล้ว" ของ ${w.name}?`)) return;
    const ok = await action.run(() => staffDb()!.rpc("gt_staff_mark_prize_v1", { p_division: w.division_id, p_athlete: w.athlete_id, p_what: what, p_done: done, p_amount: what === "paid" ? w.cash : null, p_slip: slipPath }));
    if (ok) await load();
  };
  const copy = async (text: string, key: string) => { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch { /* ignore */ } };

  const totals = useMemo(() => {
    const rows = board ?? [];
    const cash = rows.reduce((s, w) => s + w.cash, 0), paid = rows.filter((w) => w.paid_at).reduce((s, w) => s + (w.paid_amount ?? w.cash), 0);
    return { cash, paid, people: rows.length, waitingPay: rows.filter((w) => w.cash > 0 && !w.paid_at).length, waitingTrophy: rows.filter((w) => w.trophy && !w.trophy_given_at).length,
      noAccount: rows.filter((w) => w.cash > 0 && !w.paid_at && !(w.payout?.account_no || w.payout?.promptpay || w.payout?.qr_path)).length };
  }, [board]);
  const shown = (board ?? []).filter((w) => filter === "all" || (w.cash > 0 && !w.paid_at) || (w.trophy && !w.trophy_given_at));

  if (staff.status !== "staff" || !setup || !board) return <p className="py-10 text-center text-[var(--gt-muted)]">กำลังโหลด…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link href={`/organizer/${id}`} className="text-sm text-[var(--gt-muted)] underline-offset-2 hover:underline">← {title || "กลับหน้ารายการ"}</Link>
        <h1 className="mt-1 text-xl font-bold">🏆 รางวัล · ถ้วย ใบประกาศ เงินรางวัล</h1>
        <p className="text-sm text-[var(--gt-muted)]">รายชื่อผู้ได้รางวัลมาจากผลแข่งในระบบ (อันดับ 1–3 ของแต่ละรุ่น/สาย) · รุ่นเฟรนชิพได้เหรียญและใบประกาศตามจำนวนชนะ ไม่มีเงินรางวัล</p>
      </div>

      <section className={`rounded-2xl border-2 p-4 ${setup.open ? "border-[var(--gt-ok)] bg-[var(--gt-win-bg)]" : "border-[var(--gt-gold)] bg-[var(--gt-gold-soft)]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">{setup.open ? "✓ ประกาศรางวัลแล้ว" : "ยังไม่ประกาศรางวัล"}</p>
            <p className="text-sm">{setup.open ? "นักกีฬาเห็นรางวัลในหน้าบัญชี แนบรูปยืนยัน และกรอกบัญชีรับเงินได้แล้ว" : "ตรวจผลให้ครบก่อน แล้วกดประกาศ นักกีฬาจะเห็นรางวัลในหน้าบัญชีของตัวเอง"}</p>
          </div>
          <button type="button" onClick={toggleOpen} disabled={action.busy} className={setup.open ? "gt-outline-btn min-h-12 px-4 font-bold" : "gt-cta-btn min-h-12 px-5 font-bold"}>{setup.open ? "ปิดการประกาศ" : "📣 ประกาศรางวัล"}</button>
        </div>
      </section>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["ผู้ได้รางวัล", `${totals.people} คน`], ["เงินรางวัลรวม", baht(totals.cash)], ["โอนแล้ว", baht(totals.paid)], ["รอโอน", `${totals.waitingPay} คน`]].map(([l, v]) => (
          <li key={l} className="gt-card p-3 text-center"><span className="gt-num block text-lg font-bold">{v}</span><span className="text-xs text-[var(--gt-muted)]">{l}</span></li>
        ))}
      </ul>
      {totals.noAccount > 0 && <p className="rounded-xl border border-[var(--gt-warn)] bg-[var(--gt-surface)] p-3 text-sm text-[var(--gt-warn)]">ยังไม่กรอกบัญชีรับเงิน {totals.noAccount} คน · นักกีฬากรอกเองได้ในหน้า “บัญชีของฉัน” หลังประกาศรางวัล</p>}

      <div role="tablist" className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-[var(--gt-gold)] bg-[var(--gt-surface)] p-1.5">
        <button type="button" role="tab" aria-selected={tab === "winners"} onClick={() => setTab("winners")} className="min-h-12 rounded-xl font-bold">ผู้ได้รางวัล</button>
        <button type="button" role="tab" aria-selected={tab === "rules"} onClick={() => setTab("rules")} className="min-h-12 rounded-xl font-bold">ตั้งรางวัลแต่ละรุ่น</button>
      </div>
      <ErrorNote text={action.error} />

      {tab === "rules" ? (
        <div className="space-y-3">
          {setup.divisions.map((d) => (
            <section key={d.id} className="gt-card p-4">
              <h2 className="font-bold">{divisionLabel(d.name)}</h2>
              {d.friendship ? <p className="mt-1 text-sm text-[var(--gt-muted)]">รุ่นเฟรนชิพ: เหรียญทอง/เงิน/ทองแดงตามจำนวนชนะ + ใบประกาศ (ไม่มีเงินรางวัล)</p> : (
                <div className="mt-2 space-y-2">
                  {[1, 2, 3].map((place) => {
                    const r = d.rules.find((x) => x.place === place);
                    return <RuleRow key={place} place={place} rule={r} busy={action.busy} onSave={(cash, trophy) => saveRule(d.id, place, cash, trophy)} />;
                  })}
                  <p className="text-xs text-[var(--gt-muted)]">ใช้กับอันดับ 1–3 ของทุกสายในรุ่นนี้ · เงิน 0 และไม่มีถ้วย = ไม่มีรางวัลอันดับนั้น</p>
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2" role="group" aria-label="กรองรายชื่อ">
            <button type="button" aria-pressed={filter === "todo"} onClick={() => setFilter("todo")} className="gt-outline-btn min-h-11 px-4 font-semibold">ยังไม่เสร็จ ({(board ?? []).filter((w) => (w.cash > 0 && !w.paid_at) || (w.trophy && !w.trophy_given_at)).length})</button>
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className="gt-outline-btn min-h-11 px-4 font-semibold">ทั้งหมด ({board.length})</button>
          </div>
          {!board.length && <p className="gt-card p-6 text-center text-[var(--gt-muted)]">ยังไม่มีผู้ได้รางวัล · ตั้งรางวัลแต่ละรุ่นก่อน แล้วรายชื่อจะขึ้นเองจากผลแข่ง</p>}
          {board.length > 0 && !shown.length && <p className="gt-card p-6 text-center text-[var(--gt-ok)]">✓ มอบรางวัลและโอนเงินครบทุกคนแล้ว</p>}
          {shown.map((w) => {
            const acc = w.payout;
            const accText = [acc?.bank, acc?.account_no, acc?.account_name].filter(Boolean).join(" · ");
            return (
              <article key={`${w.division_id}|${w.athlete_id}`} className="gt-card space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <AthleteAvatar src={w.photo} name={w.name} zoom className="h-14 w-14" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{w.name}</p>
                    <p className="text-sm text-[var(--gt-muted)]">{divisionLabel(w.division)}{w.pool ? ` · สาย ${w.pool}` : ""} · <b className="text-[var(--gt-text)]">{placeText(w.place)}</b></p>
                    <p className="text-sm">{w.trophy ? "🏆 ถ้วย · " : ""}📜 ใบประกาศ{w.cash > 0 ? <> · 💰 <b>{baht(w.cash)}</b></> : ""}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--gt-line)] p-3">
                    <p className="text-sm font-semibold">รูปยืนยันจากนักกีฬา</p>
                    {w.proof_path ? <div className="mt-2 flex items-center gap-2"><PrivateImage path={w.proof_path} label="รูปยืนยัน" /><span className="text-xs text-[var(--gt-muted)]">ส่งเมื่อ {when(w.proof_at)}</span></div>
                      : <p className="mt-1 text-sm text-[var(--gt-warn)]">{w.has_account ? "ยังไม่ได้ส่งรูป" : "นักกีฬายังไม่ได้เข้าสู่ระบบ · ส่งรูปไม่ได้จนกว่าจะเข้าระบบ"}</p>}
                  </div>
                  {w.cash > 0 && <div className="rounded-xl border border-[var(--gt-line)] p-3">
                    <p className="text-sm font-semibold">บัญชีรับเงิน</p>
                    {acc && (acc.account_no || acc.promptpay || acc.qr_path) ? <div className="mt-1 space-y-1 text-sm">
                      {accText && <p className="flex flex-wrap items-center gap-2">{accText}{acc.account_no && <button type="button" onClick={() => copy(acc.account_no!, `a${w.athlete_id}`)} className="rounded-full border px-2 text-xs">{copied === `a${w.athlete_id}` ? "คัดลอกแล้ว" : "คัดลอกเลขบัญชี"}</button>}</p>}
                      {acc.promptpay && <p className="flex flex-wrap items-center gap-2">พร้อมเพย์ {acc.promptpay}<button type="button" onClick={() => copy(acc.promptpay!, `p${w.athlete_id}`)} className="rounded-full border px-2 text-xs">{copied === `p${w.athlete_id}` ? "คัดลอกแล้ว" : "คัดลอก"}</button></p>}
                      {acc.qr_path && <PrivateImage path={acc.qr_path} label="QR รับเงิน" />}
                    </div> : <p className="mt-1 text-sm text-[var(--gt-warn)]">ยังไม่ได้กรอกบัญชี</p>}
                  </div>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {w.trophy && (w.trophy_given_at
                    ? <button type="button" onClick={() => mark(w, "trophy", false)} disabled={action.busy} className="min-h-11 rounded-xl border-2 border-[var(--gt-ok)] bg-[var(--gt-win-bg)] px-4 font-semibold">✓ ให้ถ้วยแล้ว · {when(w.trophy_given_at)}</button>
                    : <button type="button" onClick={() => mark(w, "trophy", true)} disabled={action.busy} className="gt-outline-btn min-h-11 px-4 font-semibold">🏆 ให้ถ้วยแล้ว</button>)}
                  {w.cash > 0 && (w.paid_at
                    ? <span className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => mark(w, "paid", false)} disabled={action.busy} className="min-h-11 rounded-xl border-2 border-[var(--gt-ok)] bg-[var(--gt-win-bg)] px-4 font-semibold">✓ โอนแล้ว {baht(w.paid_amount ?? w.cash)} · {when(w.paid_at)}</button>{w.slip_path && <PrivateImage path={w.slip_path} label="สลิป" />}</span>
                    : <>
                      <button type="button" onClick={() => { if (window.confirm(`บันทึกว่าโอน ${baht(w.cash)} ให้ ${w.name} แล้ว?`)) void mark(w, "paid", true); }} disabled={action.busy} className="gt-cta-btn min-h-11 px-4 font-semibold">💸 โอนแล้ว</button>
                      <label className="gt-outline-btn inline-flex min-h-11 cursor-pointer items-center px-4 font-semibold">📎 โอนแล้ว + แนบสลิป
                        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void mark(w, "paid", true, f); }} />
                      </label>
                    </>)}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RuleRow({ place, rule, busy, onSave }: { place: number; rule?: Rule; busy: boolean; onSave: (cash: number, trophy: boolean) => void }) {
  const [cash, setCash] = useState(String(rule?.cash ?? 0));
  const [trophy, setTrophy] = useState(rule?.trophy ?? true);
  const changed = Number(cash || 0) !== (rule?.cash ?? 0) || trophy !== (rule?.trophy ?? (rule ? rule.trophy : true)) || !rule;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--gt-line)] p-2">
      <span className="w-40 font-semibold">{placeText(place)}</span>
      <label className="flex items-center gap-1 text-sm">เงิน <input inputMode="numeric" value={cash} onChange={(e) => setCash(e.target.value.replace(/[^0-9]/g, ""))} className="min-h-11 w-28 rounded-lg border-2 border-[var(--gt-line)] px-2 text-right" /> บาท</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={trophy} onChange={(e) => setTrophy(e.target.checked)} className="h-5 w-5" /> ถ้วย</label>
      <button type="button" disabled={busy || !changed} onClick={() => onSave(Number(cash || 0), trophy)} className="gt-cta-btn min-h-11 px-4 font-semibold disabled:opacity-40">{rule ? "บันทึก" : "ตั้งรางวัล"}</button>
      {rule && <span className="text-xs text-[var(--gt-ok)]">✓ {rule.cash ? baht(rule.cash) : "ไม่มีเงิน"}{rule.trophy ? " + ถ้วย" : ""}</span>}
    </div>
  );
}
