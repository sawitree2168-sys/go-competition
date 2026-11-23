"use client";
/* eslint-disable @next/next/no-img-element -- private signed images */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { divisionLabel, thaiDate } from "@/lib/division-display";

type Prize = { tournament_id: string; title: string; event_date: string | null; division_id: string; division: string; pool: string | null; place: number;
  cash: number; trophy: boolean; proof_path: string | null; trophy_given_at: string | null; paid_at: string | null; paid_amount: number | null; slip_path: string | null };
type Payout = { bank_name: string | null; account_name: string | null; account_no: string | null; promptpay: string | null; qr_path: string | null; updated_at: string } | null;
type Mine = { athlete: { id: string; name: string } | null; prizes: Prize[]; payout: Payout };

const BUCKET = "gt-payment-slips";
const BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงเทพ", "กรุงไทย", "กรุงศรีอยุธยา", "ทหารไทยธนชาต (ttb)", "ออมสิน", "ธ.ก.ส.", "ยูโอบี", "ซีไอเอ็มบี", "เกียรตินาคินภัทร", "แลนด์ แอนด์ เฮ้าส์", "อื่น ๆ"];
const baht = (n: number) => `${n.toLocaleString("th-TH")} บาท`;
const placeText = (p: number) => (p === 1 ? "ชนะเลิศ" : `รองชนะเลิศอันดับ ${p - 1}`);
const extOf = (f: File) => (f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg");

function Signed({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    staffDb()?.storage.from(BUCKET).createSignedUrl(path, 600).then(({ data }) => { if (live) setUrl(data?.signedUrl ?? null); });
    return () => { live = false; };
  }, [path]);
  if (!url) return null;
  return path.endsWith(".pdf")
    ? <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--gt-cta)] underline">เปิด{label}</a>
    : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="h-24 w-24 rounded-lg border border-[var(--gt-line)] object-cover" /></a>;
}

/** Signed-in athlete (or parent): prizes won, proof photo, and the account to receive prize money (entered once, used for every event). */
export default function MyPrizes() {
  const [state, setState] = useState<"loading" | "out" | Mine>("loading");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ bank: "", account_name: "", account_no: "", promptpay: "" });
  const [uid, setUid] = useState("");

  const load = useCallback(async () => {
    const db = staffDb();
    if (!db) { setState("out"); return; }
    const { data } = await db.auth.getSession();
    if (!data.session) { setState("out"); return; }
    setUid(data.session.user.id);
    const r = await db.rpc("gt_my_prizes_v1");
    if (r.error) { setMsg("โหลดข้อมูลไม่ได้: " + r.error.message); setState({ athlete: null, prizes: [], payout: null }); return; }
    const mine = r.data as Mine;
    setState(mine);
    if (mine.payout) setForm({ bank: mine.payout.bank_name ?? "", account_name: mine.payout.account_name ?? "", account_no: mine.payout.account_no ?? "", promptpay: mine.payout.promptpay ?? "" });
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const upload = async (file: File, kind: "qr" | "proof") => {
    const path = `${uid}/prize/${kind}-${crypto.randomUUID()}.${extOf(file)}`;
    const up = await staffDb()!.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) throw new Error("อัปโหลดรูปไม่สำเร็จ: " + up.error.message);
    return path;
  };
  const saveAccount = async (qr?: File) => {
    setBusy(true); setMsg("");
    try {
      const qrPath = qr ? await upload(qr, "qr") : null;
      const r = await staffDb()!.rpc("gt_set_my_payout_v1", { p_bank: form.bank, p_account_name: form.account_name, p_account_no: form.account_no, p_promptpay: form.promptpay, p_qr_path: qrPath });
      if (r.error) throw new Error(r.error.message);
      setMsg("✓ บันทึกบัญชีรับเงินแล้ว ผู้จัดของรายการที่คุณได้เงินรางวัลจะเห็นบัญชีนี้");
      await load();
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const sendProof = async (p: Prize, file: File) => {
    setBusy(true); setMsg("");
    try {
      const path = await upload(file, "proof");
      const r = await staffDb()!.rpc("gt_set_my_prize_proof_v1", { p_division: p.division_id, p_path: path });
      if (r.error) throw new Error(r.error.message);
      setMsg("✓ ส่งรูปยืนยันแล้ว");
      await load();
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  if (state === "loading") return <p className="py-16 text-center text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>;
  if (state === "out") return (
    <div className="gt-card space-y-4 p-6 text-center">
      <h1 className="text-2xl font-bold">เข้าสู่ระบบเพื่อดูรางวัล</h1>
      <p className="text-[var(--gt-muted)]">ใช้รหัส GO เลขดั้ง หรือชื่อ-นามสกุล พร้อมรหัสผ่าน</p>
      <Link href="/login?next=/account/prizes" className="gt-cta-btn flex min-h-12 items-center justify-center">เข้าสู่ระบบ</Link>
    </div>
  );
  if (!state.athlete) return (
    <div className="gt-card space-y-3 p-6">
      <h1 className="text-xl font-bold">บัญชีนี้ยังไม่ได้ผูกกับนักกีฬา</h1>
      <p className="text-[var(--gt-muted)]">เข้าสู่ระบบด้วยรหัส GO / เลขดั้ง / ชื่อ-นามสกุลของนักกีฬา แล้วกลับมาที่หน้านี้</p>
      {msg && <p role="alert" className="text-sm text-[var(--gt-bad)]">{msg}</p>}
    </div>
  );

  const needsMoney = state.prizes.some((p) => p.cash > 0 && !p.paid_at);
  const hasAccount = !!(state.payout?.account_no || state.payout?.promptpay || state.payout?.qr_path);
  return (
    <div className="space-y-4">
      <Link href="/account" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--gt-brand)]">← บัญชีของฉัน</Link>
      <h1 className="text-2xl font-bold">🏆 รางวัลของ {state.athlete.name}</h1>
      {msg && <p role="status" className={`rounded-xl border p-3 text-sm ${msg.startsWith("✓") ? "border-[var(--gt-ok)] text-[var(--gt-ok)]" : "border-[var(--gt-bad)] text-[var(--gt-bad)]"}`}>{msg}</p>}

      {!state.prizes.length ? (
        <p className="gt-card p-6 text-center text-[var(--gt-muted)]">ยังไม่มีรางวัลที่ประกาศ · เมื่อผู้จัดประกาศรางวัล รางวัลของคุณจะขึ้นที่นี่เอง<br /><Link href={`/athletes/${state.athlete.id}`} className="font-semibold text-[var(--gt-cta)] underline">ดาวน์โหลดใบประกาศที่โปรไฟล์ →</Link></p>
      ) : state.prizes.map((p) => (
        <article key={p.division_id} className="gt-card space-y-3 p-4">
          <div>
            <p className="text-sm text-[var(--gt-muted)]">{p.title}{p.event_date ? ` · ${thaiDate(p.event_date)}` : ""}</p>
            <p className="text-lg font-bold">{placeText(p.place)} · {divisionLabel(p.division)}{p.pool ? ` สาย ${p.pool}` : ""}</p>
            <p>{p.trophy ? "🏆 ถ้วย · " : ""}📜 ใบประกาศ{p.cash > 0 ? <> · 💰 <b>{baht(p.cash)}</b></> : ""}</p>
          </div>
          <ul className="space-y-1 text-sm">
            {p.trophy && <li>{p.trophy_given_at ? "✓ รับถ้วยแล้ว" : "⏳ รอรับถ้วยจากผู้จัด"}</li>}
            {p.cash > 0 && <li className="flex flex-wrap items-center gap-2">{p.paid_at ? <>✓ ผู้จัดโอนแล้ว {baht(p.paid_amount ?? p.cash)} · {thaiDate(p.paid_at.slice(0, 10))}{p.slip_path && <Signed path={p.slip_path} label="สลิป" />}</> : hasAccount ? "⏳ รอผู้จัดโอนเงิน" : "⚠ กรอกบัญชีรับเงินด้านล่างก่อน ผู้จัดจึงโอนได้"}</li>}
            <li><Link href={`/athletes/${state.athlete!.id}`} className="font-semibold text-[var(--gt-cta)] underline">📜 ดาวน์โหลดใบประกาศ (ที่โปรไฟล์)</Link></li>
          </ul>
          <div className="rounded-xl border border-[var(--gt-line)] p-3">
            <p className="text-sm font-semibold">รูปยืนยันรางวัล (ถือถ้วยหรือใบประกาศ)</p>
            {p.proof_path ? <div className="mt-2 flex items-center gap-3"><Signed path={p.proof_path} label="รูปยืนยัน" /><span className="text-sm text-[var(--gt-ok)]">✓ ส่งแล้ว</span></div> : <p className="mt-1 text-sm text-[var(--gt-warn)]">ยังไม่ได้ส่งรูป</p>}
            <label className="gt-outline-btn mt-2 inline-flex min-h-11 cursor-pointer items-center px-4 font-semibold">📷 {p.proof_path ? "เปลี่ยนรูป" : "ถ่าย/เลือกรูป"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void sendProof(p, f); }} />
            </label>
          </div>
        </article>
      ))}

      <section className={`gt-card space-y-3 p-4 ${needsMoney && !hasAccount ? "border-[var(--gt-warn)]" : ""}`}>
        <h2 className="text-lg font-bold">💳 บัญชีรับเงินรางวัล</h2>
        <p className="text-sm text-[var(--gt-muted)]">กรอกครั้งเดียว ใช้ได้ทุกรายการ · เห็นได้เฉพาะคุณ และผู้จัดของรายการที่คุณได้เงินรางวัล · บัญชีผู้ปกครองได้</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">ธนาคาร
            <select value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} className="mt-1 min-h-12 w-full rounded-xl border-2 border-[var(--gt-line)] bg-[var(--gt-surface)] px-3">
              <option value="">เลือกธนาคาร</option>{BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">ชื่อบัญชี
            <input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="เช่น ชื่อผู้ปกครอง" className="mt-1 min-h-12 w-full rounded-xl border-2 border-[var(--gt-line)] px-3" />
          </label>
          <label className="text-sm font-semibold">เลขที่บัญชี
            <input inputMode="numeric" value={form.account_no} onChange={(e) => setForm({ ...form, account_no: e.target.value.replace(/[^0-9-]/g, "") })} className="mt-1 min-h-12 w-full rounded-xl border-2 border-[var(--gt-line)] px-3" />
          </label>
          <label className="text-sm font-semibold">พร้อมเพย์ (เบอร์โทร/เลขบัตร ไม่บังคับ)
            <input inputMode="numeric" value={form.promptpay} onChange={(e) => setForm({ ...form, promptpay: e.target.value.replace(/[^0-9]/g, "") })} className="mt-1 min-h-12 w-full rounded-xl border-2 border-[var(--gt-line)] px-3" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {state.payout?.qr_path && <Signed path={state.payout.qr_path} label="QR รับเงิน" />}
          <label className="gt-outline-btn inline-flex min-h-11 cursor-pointer items-center px-4 font-semibold">🖼 {state.payout?.qr_path ? "เปลี่ยนรูป QR" : "แนบรูป QR รับเงิน (ไม่บังคับ)"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void saveAccount(f); }} />
          </label>
        </div>
        <button type="button" disabled={busy || !(form.account_no || form.promptpay)} onClick={() => void saveAccount()} className="gt-cta-btn min-h-12 w-full font-bold disabled:opacity-40">{busy ? "กำลังบันทึก…" : "บันทึกบัญชีรับเงิน"}</button>
      </section>
    </div>
  );
}
