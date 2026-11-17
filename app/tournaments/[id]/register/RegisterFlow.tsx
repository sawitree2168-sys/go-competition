"use client";
/* eslint-disable @next/next/no-img-element -- local previews and storage URLs */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import PosterViewer from "@/components/PosterViewer";
import { registrationWindow } from "@/lib/competition-day.mjs";
import { divisionLabel, thaiDate } from "@/lib/division-display";
import {
  RANKS, SCHOOL_LEVELS, ageOn, nameKey, baht, checkStep1, checkStep2, divisionFit, firstStep, phoneDigits, reasonText, slipExt, slipProblem,
} from "@/lib/register-form.mjs";
import PhotoCropper from "../_ui/PhotoCropper";
import { AcademyPicker, Avatar, BirthPicker, Ico, Label, Note, Section, Sheet, inputCls } from "./parts";

type EventProps = {
  id: string; title: string; event_date: string | null; poster_url: string | null; venue: string | null;
  mode: "web" | "external" | "closed"; url: string | null; open: string | null; close: string | null;
};
type Div = { id: string; name: string; fee: number | null; seats: number | null };
type Found = { go_id: string; full_name: string; rank: string | null; photo: string | null; institution: string | null; events: number; wins: number; losses: number };
type Payment = { bank_name: string; account_name: string; account_number: string; qr_url: string | null };
type Done = { reference: string; name: string; fee: number | null; division: string };

const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const noop = () => () => {};
const uuid = () => crypto.randomUUID();

export default function RegisterFlow({ event, divisions, initialDivision, payReady, sheetNames }: {
  event: EventProps; divisions: Div[]; initialDivision?: string;
  /** Organiser confirmed the payment account (or every division is free). */
  payReady: boolean;
  /** Names already on the organiser's sheet (Google Form), by division id, as nameKey(). */
  sheetNames: Record<string, string[]>;
}) {
  const today = useSyncExternalStore(noop, bangkokToday, () => "");
  const win = today ? registrationWindow(event.open, event.close, today) : "open";
  const fees = divisions.map((d) => d.fee).filter((f): f is number => f !== null);

  const header = (
    <section className="gt-card flex gap-3 p-3 sm:gap-4 sm:p-4">
      {event.poster_url
        ? <PosterViewer src={event.poster_url} alt={`โปสเตอร์ ${event.title}`} sizes="160px" preload className="h-40 w-28 shrink-0 rounded-xl sm:h-52 sm:w-36" />
        : <div aria-hidden="true" className="grid h-40 w-28 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#0d3f8f,#1f6fe0)] text-4xl sm:h-52 sm:w-36">🏆</div>}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-[var(--gt-cta)]">สมัครแข่งขัน</p>
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">{event.title}</h1>
        <p className="flex items-start gap-2 text-sm"><Ico name="doc" className="mt-0.5 h-4 w-4 text-[var(--gt-cta)]" />วันที่จัดแข่ง: {thaiDate(event.event_date) ?? "รอประกาศ"}</p>
        <p className="flex items-start gap-2 text-sm"><Ico name="school" className="mt-0.5 h-4 w-4 text-[var(--gt-cta)]" />สถานที่: {event.venue ?? "รอประกาศ"}</p>
        <p className="flex items-start gap-2 text-sm"><Ico name="trophy" className="mt-0.5 h-4 w-4 text-[var(--gt-cta)]" />แข่งขันแบบเดี่ยว แบ่งตามระดับฝีมือ · {divisions.length} รุ่น</p>
        {fees.length > 0 && <p className="flex items-start gap-2 text-sm"><Ico name="card" className="mt-0.5 h-4 w-4 text-[var(--gt-cta)]" />ค่าสมัคร: {Math.min(...fees) === Math.max(...fees) ? baht(fees[0]) : `${baht(Math.min(...fees))} – ${baht(Math.max(...fees))}`} / คน</p>}
        {event.close && <p className="text-sm text-[var(--gt-muted)]">ปิดรับสมัคร {thaiDate(event.close)}</p>}
      </div>
    </section>
  );

  const waitPay = event.mode === "web" && win === "open" && divisions.length > 0 && !payReady;
  if (event.mode !== "web" || win !== "open" || divisions.length === 0 || waitPay) {
    const msg = waitPay
      ? event.url ? { t: "สมัครผ่าน Google Form ของผู้จัด", b: "การสมัครและชำระเงินผ่านเว็บนี้จะเปิดเมื่อผู้จัดยืนยันบัญชีรับเงินแล้ว ระหว่างนี้สมัครได้ที่แบบฟอร์มด้านล่าง รายชื่อจะขึ้นในหน้ารายชื่อผู้สมัครเช่นกัน" }
        : { t: "ยังไม่เปิดชำระเงินผ่านเว็บ", b: "ผู้จัดกำลังยืนยันบัญชีรับเงิน กรุณากลับมาอีกครั้ง หรือติดต่อผู้จัด" }
      : event.mode === "external" ? { t: "งานนี้รับสมัครผ่านช่องทางของผู้จัด", b: event.url ? "กดปุ่มด้านล่างเพื่อไปยังแบบฟอร์มสมัคร" : "ผู้จัดยังไม่ได้ใส่ลิงก์แบบฟอร์มสมัคร กรุณาติดต่อผู้จัด" }
      : event.mode === "closed" ? { t: "ปิดรับสมัครแล้ว", b: "ติดต่อผู้จัดหากมีข้อสงสัย" }
      : win === "not_yet" ? { t: "ยังไม่เปิดรับสมัคร", b: `เปิดรับสมัคร ${thaiDate(event.open) ?? event.open}` }
      : win === "ended" ? { t: "ปิดรับสมัครแล้ว", b: `ปิดรับสมัครเมื่อ ${thaiDate(event.close) ?? event.close}` }
      : { t: "ยังไม่มีรุ่นให้สมัคร", b: "ผู้จัดยังไม่ประกาศรุ่นการแข่งขัน" };
    return (
      <div className="space-y-4 pb-6">
        {header}
        <section className="gt-card space-y-3 p-5 text-center">
          <h2 className="text-lg font-bold">{msg.t}</h2>
          <p className="text-[var(--gt-muted)]">{msg.b}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {(event.mode === "external" || waitPay) && event.url && <a href={event.url} target="_blank" rel="noopener noreferrer" className="gt-cta-btn inline-flex min-h-12 items-center px-5">สมัครผ่าน Google Form →</a>}
            <Link href={`/tournaments/${event.id}`} className="gt-outline-btn inline-flex min-h-12 items-center px-5 font-semibold">รายละเอียดงาน</Link>
          </div>
        </section>
      </div>
    );
  }
  return (
    <>
      {event.url && (
        <p className="gt-card mb-3 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          <span>สมัครได้ 2 ทาง: กรอกในหน้านี้ หรือผ่าน Google Form ของผู้จัด · รายชื่อจากทั้งสองทางรวมอยู่ในหน้ารายชื่อผู้สมัคร</span>
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--gt-cta)] underline">สมัครผ่าน Google Form →</a>
        </p>
      )}
      <Flow event={event} divisions={divisions} today={today} header={header} initialDivision={initialDivision} sheetNames={sheetNames} />
    </>
  );
}

function Flow({ event, divisions, today, header, initialDivision, sheetNames }: { event: EventProps; divisions: Div[]; today: string; header: React.ReactNode; initialDivision?: string; sheetNames: Record<string, string[]> }) {
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [step, setStep] = useState<1 | 2>(1);
  const [done, setDone] = useState<Done | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // new athlete
  const [firstName, setFirst] = useState(""); const [lastName, setLast] = useState("");
  const [birth, setBirth] = useState(""); const [phone, setPhone] = useState("");
  const [school, setSchool] = useState(""); const [level, setLevel] = useState("");
  const [academies, setAcademies] = useState<string[]>([]); const [showInAcademy, setShowInAcademy] = useState(true);
  const [rank, setRank] = useState(""); const [rankSource, setRankSource] = useState<"self" | "results">("self");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null); const [photoConsent, setPhotoConsent] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  // existing athlete
  const [found, setFound] = useState<Found | null>(null);
  // both
  const [division, setDivision] = useState(initialDivision ?? (divisions.length === 1 ? divisions[0].id : ""));
  const [slip, setSlip] = useState<{ file: File; url: string } | null>(null);
  const [accept, setAccept] = useState(false);
  const uploaded = useRef<{ photo?: string; photoBlob?: Blob; slip?: string; slipFile?: File }>({});

  const [names, setNames] = useState<string[] | null>(null);
  const [payment, setPayment] = useState<Payment | null | undefined>(undefined);
  useEffect(() => {
    const db = staffDb();
    if (!db) { queueMicrotask(() => { setNames([]); setPayment(null); }); return; }
    db.rpc("gt_academy_names_v1").then(({ data }) => setNames(((data ?? []) as unknown[]).map(String)), () => setNames([]));
    db.rpc("gt_event_payment_public_v1", { p_tournament: event.id }).then(({ data }) => setPayment((data as Payment | null) ?? null), () => setPayment(null));
  }, [event.id]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => () => { if (slip) URL.revokeObjectURL(slip.url); }, [slip]);

  const div = divisions.find((d) => d.id === division) ?? null;
  const fee = div?.fee ?? 0;
  const paymentReady = Boolean(payment);
  const effRank = rank || (tab === "existing" ? found?.rank ?? "" : "");
  const form = { mode: tab, firstName, lastName, birth, phone, rank: effRank, photo: Boolean(photo), photoConsent, academies, goId: found?.go_id, division, slip: Boolean(slip), accept };
  const fit = div ? divisionFit(div.name, effRank) : "unknown";
  const name = tab === "new" ? `${firstName.trim()} ${lastName.trim()}`.trim() : found?.full_name ?? "";
  const shownPhoto = tab === "new" ? photo?.url ?? null : found?.photo ?? null;
  const inst = tab === "new" ? academies.join(" • ") : found?.institution ?? "";
  // Already entered for this division through the organiser's Google Form.
  const onSheet = Boolean(name && division && (sheetNames[division] ?? []).includes(nameKey(name)));

  const jumpTop = () => requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  const fail = (codes: string[]) => { setErrors(codes); setStep(firstStep(codes) as 1 | 2); jumpTop(); };
  // Items fixed since the last try drop off the list; reasons only the server knows stay until the next try.
  const live = new Set([...checkStep1(form), ...(step === 2 ? checkStep2(form, { fee, paymentReady }) : []), ...(onSheet ? ["SHEET_DUPLICATE"] : [])]);
  const CLIENT = ["SHEET_DUPLICATE", "NAME", "BIRTH", "PHOTO_CONSENT", "ACADEMY", "ATHLETE", "MODE", "RANK", "PHONE", "DIVISION", "SLIP", "ACCEPT", "PAYMENT_NOT_READY"];
  const shown = errors.filter((c) => !CLIENT.includes(c) || live.has(c));
  const has = (c: string) => shown.includes(c);

  const next = () => {
    const e = checkStep1(form);
    if (onSheet) e.push("SHEET_DUPLICATE");
    if (e.length) return fail(e);
    setErrors([]); setStep(2); jumpTop();
  };

  const submit = async () => {
    const e = [...checkStep1(form), ...checkStep2(form, { fee, paymentReady })];
    if (onSheet) e.push("SHEET_DUPLICATE");
    if (e.length) return fail(e);
    const db = staffDb();
    if (!db) return fail(["NETWORK"]);
    setBusy(true); setErrors([]);
    try {
      const up = uploaded.current;
      if (tab === "new" && photo && (!up.photo || up.photoBlob !== photo.blob)) {
        const path = `pending/${uuid()}.jpg`;
        const r = await db.storage.from("gt-application-photos").upload(path, photo.blob, { contentType: "image/jpeg", upsert: false });
        if (r.error) return fail(["PHOTO"]);
        up.photo = path; up.photoBlob = photo.blob;
      }
      if (fee > 0 && slip && (!up.slip || up.slipFile !== slip.file)) {
        const path = `web/${uuid()}.${slipExt(slip.file.type)}`;
        const r = await db.storage.from("gt-payment-slips").upload(path, slip.file, { contentType: slip.file.type, upsert: false });
        if (r.error) return fail(["UPLOAD"]);
        up.slip = path; up.slipFile = slip.file;
      }
      const payload = tab === "new"
        ? { mode: "new", division, first_name: firstName, last_name: lastName, birth_date: birth, phone: phoneDigits(phone), school, school_level: level,
            academies, show_in_academy: showInAcademy, rank, rank_source: rankSource, photo: photo ? up.photo : null, photo_consent: photoConsent }
        : { mode: "existing", division, go_id: found?.go_id, full_name: found?.full_name, phone: phoneDigits(phone), rank: effRank, rank_source: "self" };
      const { data, error } = await db.rpc("gt_register_v1", {
        p: { ...payload, slip: fee > 0 ? up.slip : null, slip_mime: fee > 0 ? slip?.file.type : null, accept },
      });
      if (error) return fail(["NETWORK"]);
      if (!data?.ok) {
        const codes = (data?.errors ?? []) as string[];
        if (codes.includes("PHOTO")) { up.photo = undefined; }
        if (codes.includes("SLIP_INVALID")) { up.slip = undefined; }
        return fail(codes.length ? codes : ["NETWORK"]);
      }
      setDone({ reference: data.reference, name: data.name, fee: data.fee ?? null, division: div ? divisionLabel(div.name) : "" });
      jumpTop();
    } catch {
      fail(["NETWORK"]);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDone(null); setStep(1); setErrors([]); setFound(null); setFirst(""); setLast(""); setBirth(""); setPhone(""); setSchool(""); setLevel("");
    setAcademies([]); setRank(""); setPhoto(null); setPhotoConsent(false); setSlip(null); setAccept(false); uploaded.current = {}; jumpTop();
  };

  if (done) {
    return (
      <div ref={topRef} className="scroll-mt-4 space-y-4 pb-8">
        {header}
        <section role="status" className="gt-card overflow-hidden border-2 border-[var(--gt-ok)]">
          <div className="flex items-center gap-3 bg-[var(--gt-win-bg)] px-4 py-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--gt-ok)] text-white"><Ico name="check" className="h-7 w-7" /></span>
            <div>
              <h2 className="text-xl font-bold text-[var(--gt-win-ink)]">สมัครแข่งขันเรียบร้อย</h2>
              <p className="text-[var(--gt-win-ink)]">{(done.fee ?? 0) > 0 ? "รอตรวจสอบการชำระเงิน" : "รอผู้จัดตรวจสอบข้อมูล"}</p>
            </div>
          </div>
          <dl className="grid gap-2 p-4 text-[15px]">
            <div className="flex justify-between gap-3"><dt className="text-[var(--gt-muted)]">เลขอ้างอิง</dt><dd className="gt-num text-lg font-bold tracking-wider">{done.reference}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--gt-muted)]">ผู้สมัคร</dt><dd className="text-right font-semibold">{done.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--gt-muted)]">รุ่นแข่งขัน</dt><dd className="text-right font-semibold">{done.division}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--gt-muted)]">ค่าสมัคร</dt><dd className="text-right font-semibold">{(done.fee ?? 0) > 0 ? `${baht(done.fee)} · แนบสลิปแล้ว` : "ไม่มีค่าสมัคร"}</dd></div>
          </dl>
          <p className="mx-4 mb-4 rounded-xl bg-[var(--gt-surface-2)] px-3 py-2.5 text-sm">จดเลขอ้างอิงไว้ใช้ติดต่อผู้จัด · เมื่อผู้จัดอนุมัติแล้ว ชื่อจะขึ้นในรายชื่อนักกีฬาของรุ่น และใบเสร็จจะออกเมื่อผู้จัดยืนยันรับชำระ</p>
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            <Link href={`/tournaments/${event.id}`} className="gt-cta-btn inline-flex min-h-12 flex-1 items-center justify-center px-5">กลับหน้ารายการแข่งขัน</Link>
            <button type="button" onClick={reset} className="gt-outline-btn min-h-12 flex-1 px-5 font-semibold">สมัครอีกคน</button>
            <Link href={`/my-applications?ref=${done.reference}`} className="gt-outline-btn inline-flex min-h-12 basis-full items-center justify-center px-5 font-semibold">ดูสถานะ / ขอถอนตัว เปลี่ยนคน เปลี่ยนรุ่น</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-4 space-y-4 pb-8">
      {header}

      <ol className="grid grid-cols-2 gap-2" aria-label="ขั้นตอนการสมัคร">
        {[{ n: 1, t: "ข้อมูลนักกีฬาและรุ่น" }, { n: 2, t: "ชำระเงินและยืนยัน" }].map((s) => (
          <li key={s.n} aria-current={step === s.n ? "step" : undefined}
            className={`flex min-h-12 items-center gap-2 rounded-2xl px-3 text-[15px] font-semibold ${step === s.n ? "bg-[var(--gt-cta)] text-white" : "bg-[var(--gt-surface)] text-[var(--gt-muted)] ring-1 ring-[var(--gt-line)]"}`}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm ${step === s.n ? "bg-white text-[var(--gt-cta)]" : "bg-[var(--gt-surface-2)]"}`}>{step > s.n ? "✓" : s.n}</span>{s.t}
          </li>
        ))}
      </ol>

      {shown.length > 0 && (
        <div role="alert" className="gt-card flex gap-3 border-2 border-[var(--gt-bad)] p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--gt-bad)] text-white"><Ico name="x" className="h-6 w-6" /></span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-[var(--gt-bad)]">สมัครไม่สำเร็จ</p>
            <p className="text-sm">กรุณาแก้ไขรายการต่อไปนี้ แล้วกดอีกครั้ง</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[15px]">{shown.map((c) => <li key={c}>{reasonText(c)}</li>)}</ul>
          </div>
        </div>
      )}

      {step === 1 ? (
        <>
          <div role="tablist" aria-label="วิธีสมัคร" className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-1">
            {([["new", "สมัครใหม่"], ["existing", "มีข้อมูลแล้ว"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setErrors([]); }}
                className={`min-h-12 rounded-xl text-[17px] font-bold ${tab === k ? "bg-[var(--gt-cta)] text-white shadow" : "text-[var(--gt-ink)]"}`}>{l}</button>
            ))}
          </div>

          {tab === "new" ? (
            <>
              <Section icon="person" title="ข้อมูลนักกีฬา">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex shrink-0 flex-col items-center gap-1.5 sm:w-32">
                    <button type="button" onClick={() => document.getElementById("photo-file")?.click()} className="relative rounded-full" aria-label={photo ? "เปลี่ยนรูปนักกีฬา" : "เพิ่มรูปนักกีฬา"}>
                      <Avatar src={photo?.url ?? null} className="h-24 w-24" />
                      <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--gt-surface)] bg-[var(--gt-cta)] text-white"><Ico name="camera" className="h-5 w-5" /></span>
                    </button>
                    <span className="text-sm font-semibold">{photo ? "เปลี่ยนรูป" : "เพิ่มรูปนักกีฬา"}</span>
                    <span className="text-center text-xs text-[var(--gt-muted)]">(JPG/PNG ไม่เกิน 25 MB · ไม่บังคับ)</span>
                    {photo && <button type="button" onClick={() => { setPhoto(null); setPhotoConsent(false); }} className="min-h-9 text-sm text-[var(--gt-bad)] underline">ลบรูป</button>}
                    <input id="photo-file" type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; e.target.value = "";
                      if (f && f.type.startsWith("image/") && f.size <= 25 * 1024 * 1024) setCropFile(f);
                    }} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><Label text="ชื่อ" required htmlFor="fn" /><input id="fn" value={firstName} onChange={(e) => setFirst(e.target.value)} maxLength={60} autoComplete="given-name" className={inputCls} aria-invalid={has("NAME") && !firstName.trim()} /></div>
                      <div><Label text="นามสกุล" required htmlFor="ln" /><input id="ln" value={lastName} onChange={(e) => setLast(e.target.value)} maxLength={60} autoComplete="family-name" className={inputCls} aria-invalid={has("NAME") && !lastName.trim()} /></div>
                    </div>
                    <div><Label text="วันเดือนปีเกิด" required /><BirthPicker value={birth} onChange={setBirth} today={today} invalid={has("BIRTH")} /></div>
                    <div>
                      <Label text="เบอร์ติดต่อ" required htmlFor="ph" />
                      <input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} placeholder="08x-xxx-xxxx" className={inputCls} aria-invalid={has("PHONE")} />
                      {has("PHONE") ? <Note tone="bad">กรุณากรอกเบอร์ติดต่อ</Note> : <Note>เบอร์โทรและวันเกิดเห็นเฉพาะผู้จัดงานนี้ ไม่แสดงบนเว็บ</Note>}
                    </div>
                  </div>
                </div>
                {photo && (
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gt-cta)]" />
                    <span>ยินยอมให้แสดงรูปนี้บนเว็บไซต์ (รายชื่อ คู่แข่งขัน และผลการแข่งขัน) · อายุต่ำกว่า 18 ปี ผู้ปกครองเป็นผู้ยินยอม</span>
                  </label>
                )}
              </Section>

              <Section icon="school" title="ข้อมูลการศึกษา">
                <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                  <div><Label text="โรงเรียน / มหาวิทยาลัย" htmlFor="sc" /><input id="sc" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={160} placeholder="เช่น โรงเรียนตัวอย่าง" className={inputCls} /></div>
                  <div><Label text="ชั้นเรียน" htmlFor="lv" />
                    <select id="lv" value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}><option value="">เลือกชั้นเรียน</option>{SCHOOL_LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
                  </div>
                </div>
                <Note>แก้ไขได้ทุกครั้งที่สมัคร เมื่อย้ายโรงเรียน ขึ้น ม.ปลาย หรือเข้ามหาวิทยาลัย</Note>
              </Section>

              <Section icon="users" title="สถาบันที่เรียนหมากล้อม" aside="เลือกได้มากกว่า 1 สถาบัน">
                <AcademyPicker names={names} value={academies} onChange={setAcademies} />
                <label className="flex items-start gap-2.5 rounded-xl bg-[var(--gt-surface-2)] p-3">
                  <input type="checkbox" checked={showInAcademy} onChange={(e) => setShowInAcademy(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gt-cta)]" />
                  <span><span className="block font-semibold">แสดงในรายชื่อนักเรียนของสถาบัน</span><span className="block text-sm text-[var(--gt-muted)]">ครูของสถาบันที่เลือกจะเห็นชื่อ และดูผลการแข่งขันออนไลน์ได้แบบเรียลไทม์</span></span>
                </label>
              </Section>

              <Section icon="chart" title="ระดับฝีมือ">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label text="ระดับฝีมือ" required htmlFor="rk" />
                    <select id="rk" value={rank} onChange={(e) => setRank(e.target.value)} className={inputCls} aria-invalid={has("RANK")}><option value="">เลือกระดับฝีมือ</option>{RANKS.map((r) => <option key={r}>{r}</option>)}</select>
                  </div>
                  <fieldset><legend className="mb-1.5 block font-semibold">แหล่งข้อมูลระดับฝีมือ</legend>
                    <div className="flex flex-col gap-1.5">
                      {([["self", "ระบุเอง"], ["results", "อัปเดตตามผลที่ผู้จัดรับรอง"]] as const).map(([v, l]) => (
                        <label key={v} className="flex min-h-10 items-center gap-2"><input type="radio" name="rsrc" checked={rankSource === v} onChange={() => setRankSource(v)} className="h-5 w-5 accent-[var(--gt-cta)]" />{l}</label>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <Note>รุ่นแข่งขันกับระดับฝีมือแยกกัน (เช่น ลงรุ่น 5–6 คิว ระดับ 5 คิว) · เมื่อลงแข่งเปลี่ยนรุ่น ระบบอัปเดตระดับให้ตามที่ผู้จัดรับรอง</Note>
              </Section>
            </>
          ) : (
            <ExistingAthlete found={found} onFound={(f) => { setFound(f); setRank(f?.rank ?? ""); setErrors([]); }}
              rank={effRank} setRank={setRank} phone={phone} setPhone={setPhone} errors={shown} />
          )}

          <Section icon="trophy" title="เลือกรุ่นแข่งขัน">
            <div>
              <Label text="รุ่นแข่งขัน" required htmlFor="dv" />
              <select id="dv" value={division} onChange={(e) => setDivision(e.target.value)} className={inputCls} aria-invalid={has("DIVISION") || has("FULL")}>
                <option value="">เลือกรุ่นแข่งขัน</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{divisionLabel(d.name)}{d.fee !== null ? ` · ${baht(d.fee)}` : ""}</option>)}
              </select>
            </div>
            {div && effRank && fit === "out" && <Note tone="warn">ระดับ {effRank} ไม่อยู่ในช่วงของรุ่น {divisionLabel(div.name)} · ส่งได้ แต่ผู้จัดจะตรวจสอบก่อนอนุมัติ</Note>}
            {div && effRank && fit === "fit" && <Note tone="ok">ระดับ {effRank} ตรงกับรุ่นนี้</Note>}
            <Note>ข้อมูลระดับฝีมือปรับตามเกณฑ์ที่ผู้จัดกำหนด</Note>
          </Section>

          <button type="button" onClick={next} className="gt-cta-btn flex min-h-14 w-full items-center justify-center gap-2 text-lg">
            {tab === "new" ? "บันทึกและไปชำระเงิน" : "ไปชำระเงิน"} <span aria-hidden="true">→</span>
          </button>
        </>
      ) : (
        <PayStep
          event={event} div={div} fee={fee} payment={payment} name={name} photo={shownPhoto} rank={effRank} inst={inst}
          tab={tab} birth={birth} today={today} phone={phone} school={school} level={level}
          slip={slip} setSlip={(f) => setSlip(f ? { file: f, url: URL.createObjectURL(f) } : null)}
          accept={accept} setAccept={setAccept} errors={shown} busy={busy}
          onBack={() => { setStep(1); setErrors([]); jumpTop(); }} onSubmit={submit}
        />
      )}

      {cropFile && (
        <PhotoCropper file={cropFile} onCancel={() => setCropFile(null)}
          onDone={(blob) => { setPhoto({ blob, url: URL.createObjectURL(blob) }); setCropFile(null); }} />
      )}
    </div>
  );
}

function ExistingAthlete({ found, onFound, rank, setRank, phone, setPhone, errors }: {
  found: Found | null; onFound: (f: Found | null) => void; rank: string; setRank: (r: string) => void;
  phone: string; setPhone: (p: string) => void; errors: string[];
}) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Found[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const search = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const s = q.trim().replace(/\s+/g, " ");
    if (s.length < 2) return setMsg("พิมพ์ชื่อจริงเต็ม หรือ ชื่อ-นามสกุล");
    setBusy(true); setMsg("");
    const { data, error } = await staffDb()!.rpc("gt_register_search_v1", { p_query: s });
    setBusy(false);
    if (error) return setMsg("ค้นหาไม่สำเร็จ กรุณาลองใหม่");
    const rows = (data ?? []) as Found[];
    setList(rows);
    if (rows.length === 1) onFound(rows[0]);
    if (!rows.length) setMsg("ไม่พบชื่อนี้ ลองพิมพ์ชื่อ-นามสกุลให้ตรงกับที่เคยสมัครแข่ง หรือใช้แท็บ “สมัครใหม่”");
  }, [q, onFound]);
  const err = (c: string) => errors.includes(c);
  return (
    <>
      <Section icon="search" title="ค้นหาข้อมูลนักกีฬา">
        <form onSubmit={search} className="flex gap-2">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อจริง หรือ ชื่อ-นามสกุล" aria-label="ค้นหาชื่อนักกีฬา" className={`${inputCls} min-w-0 flex-1`} aria-invalid={err("ATHLETE")} />
          <button type="submit" disabled={busy} className="gt-cta-btn min-h-12 shrink-0 px-5 disabled:opacity-60">{busy ? "…" : "ค้นหา"}</button>
        </form>
        <Note>ค้นด้วยชื่อจริงเต็มคำ (เช่น ธนวัฒน์) หรือชื่อ-นามสกุล · ข้อมูลส่วนตัวต้องยืนยันตัวตนก่อนดูหรือแก้ไข</Note>
        {msg && <Note tone="warn">{msg}</Note>}
        {list && list.length > 0 && (
          <div>
            <p className="mb-2 font-semibold">ผลการค้นหา ({list.length} รายการ)</p>
            <div role="radiogroup" aria-label="ผลการค้นหา" className="space-y-2">
              {list.map((f) => (
                <label key={f.go_id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 ${found?.go_id === f.go_id ? "border-[var(--gt-cta)] bg-[var(--gt-cta-soft)]" : "border-[var(--gt-line)]"}`}>
                  <input type="radio" name="who" checked={found?.go_id === f.go_id} onChange={() => onFound(f)} className="h-5 w-5 shrink-0 accent-[var(--gt-cta)]" />
                  <Avatar src={f.photo} className="h-12 w-12" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[17px] font-bold">{f.full_name}</span>
                    <span className="block truncate text-sm text-[var(--gt-muted)]">{[f.institution, f.rank].filter(Boolean).join(" • ") || f.go_id}</span></span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Section>

      {found && (
        <Section icon="person" title="ข้อมูลนักกีฬาที่เลือก">
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar src={found.photo} className="h-20 w-20 sm:h-24 sm:w-24" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex flex-wrap items-center gap-2 text-xl font-bold">{found.full_name}{found.rank && <span className="rounded-full bg-[var(--gt-cta)] px-2.5 py-0.5 text-sm font-semibold text-white">{found.rank}</span>}</p>
              <p className="text-sm">รหัส GO <span className="gt-num font-semibold">{found.go_id}</span></p>
              {found.institution && <p className="flex items-center gap-1.5 text-sm"><Ico name="users" className="h-4 w-4 text-[var(--gt-cta)]" />{found.institution}</p>}
            </div>
            <Link href="/login" className="gt-outline-btn inline-flex min-h-10 shrink-0 items-center gap-1 px-3 text-sm font-semibold"><Ico name="lock" className="h-4 w-4" />แก้ไขข้อมูล</Link>
          </div>
          <div className="rounded-2xl bg-[var(--gt-surface-2)] p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><Ico name="trophy" className="h-4 w-4 text-[var(--gt-cta)]" />สถิติการแข่งขัน</p>
            <div className="mt-2 grid grid-cols-3 divide-x divide-[var(--gt-line)] text-center">
              <p><span className="block text-xs text-[var(--gt-muted)]">แข่ง</span><span className="gt-num text-xl font-bold">{found.events}</span> <span className="text-sm">รายการ</span></p>
              <p><span className="block text-xs text-[var(--gt-muted)]">ชนะ</span><span className="gt-num text-xl font-bold text-[var(--gt-ok)]">{found.wins}</span> <span className="text-sm">ครั้ง</span></p>
              <p><span className="block text-xs text-[var(--gt-muted)]">แพ้</span><span className="gt-num text-xl font-bold text-[var(--gt-bad)]">{found.losses}</span> <span className="text-sm">ครั้ง</span></p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label text="ระดับฝีมือที่ใช้แข่งครั้งนี้" required htmlFor="rk2" />
              <select id="rk2" value={rank} onChange={(e) => setRank(e.target.value)} className={inputCls} aria-invalid={err("RANK")}><option value="">เลือกระดับฝีมือ</option>{RANKS.map((r) => <option key={r}>{r}</option>)}</select>
            </div>
            <div><Label text="เบอร์ติดต่อ (สำหรับงานนี้)" required htmlFor="ph2" />
              <input id="ph2" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} placeholder="08x-xxx-xxxx" className={inputCls} aria-invalid={err("PHONE")} />
            </div>
          </div>
          <Note>แก้ชื่อ รูป โรงเรียน หรือสถาบัน: กด “แก้ไขข้อมูล” แล้วเข้าสู่ระบบด้วยบัญชีนักกีฬา ผู้ปกครอง หรือครูสถาบัน</Note>
        </Section>
      )}
    </>
  );
}

function PayStep(p: {
  event: EventProps; div: Div | null; fee: number; payment: Payment | null | undefined; name: string; photo: string | null; rank: string; inst: string;
  tab: "new" | "existing"; birth: string; today: string; phone: string; school: string; level: string;
  slip: { file: File; url: string } | null; setSlip: (f: File | null) => void; accept: boolean; setAccept: (v: boolean) => void;
  errors: string[]; busy: boolean; onBack: () => void; onSubmit: () => void;
}) {
  const [slipErr, setSlipErr] = useState("");
  const [sheet, setSheet] = useState<"form" | "slip" | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const age = ageOn(p.birth, p.today);
  const ready = Boolean(p.payment);
  const needPay = p.fee > 0;
  const err = (c: string) => p.errors.includes(c);
  const kb = useMemo(() => (p.slip ? `${Math.max(1, Math.round(p.slip.file.size / 1024))} KB` : ""), [p.slip]);

  return (
    <>
      <Section icon="doc" title="ตรวจสอบข้อมูลการสมัคร">
        <div className="flex items-start gap-3">
          <Avatar src={p.photo} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-lg font-bold">{p.name}{p.rank && <span className="rounded-full bg-[var(--gt-cta)] px-2.5 py-0.5 text-sm font-semibold text-white">{p.rank}</span>}</p>
            {p.inst && <p className="text-sm text-[var(--gt-muted)]">สถาบัน: {p.inst}</p>}
            {p.tab === "new" && (p.school || age !== null) && <p className="text-sm text-[var(--gt-muted)]">{[p.school && `โรงเรียน: ${p.school}`, age !== null && `อายุ: ${age} ปี`].filter(Boolean).join(" | ")}</p>}
          </div>
          <button type="button" onClick={p.onBack} className="gt-outline-btn min-h-10 shrink-0 px-3 text-sm font-semibold">แก้ไข</button>
        </div>
        <dl className="grid gap-1.5 rounded-2xl bg-[var(--gt-surface-2)] p-3 text-[15px]">
          <div className="flex justify-between gap-3"><dt className="text-[var(--gt-muted)]">รุ่นแข่งขัน</dt><dd className="text-right font-semibold">{p.div ? divisionLabel(p.div.name) : "–"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--gt-muted)]">รายการ</dt><dd className="text-right font-semibold">{p.event.title}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--gt-muted)]">ค่าสมัคร</dt><dd className="text-right text-lg font-bold text-[var(--gt-cta)]">{needPay ? baht(p.fee) : "ไม่มีค่าสมัคร"}</dd></div>
        </dl>
      </Section>

      {needPay && (
        <Section icon="card" title="ชำระเงิน">
          {p.payment === undefined ? <p className="text-[var(--gt-muted)]" role="status">กำลังโหลดข้อมูลการชำระเงิน…</p> : !ready ? (
            <div role="alert" className="rounded-2xl border border-[var(--gt-warn)] bg-[var(--gt-warn-soft)] p-4">
              <p className="font-bold text-[var(--gt-warn)]">ผู้จัดยังไม่เปิดรับชำระเงินออนไลน์</p>
              <p className="text-sm">ยังสมัครผ่านเว็บไม่ได้จนกว่าผู้จัดจะยืนยันบัญชีรับเงิน กรุณาติดต่อผู้จัด</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
                {p.payment!.qr_url ? (
                  <img src={p.payment!.qr_url} alt="QR สำหรับชำระเงิน" className="h-48 w-48 shrink-0 rounded-2xl border border-[var(--gt-line)] bg-white object-contain p-2" />
                ) : null}
                <div className="w-full min-w-0 flex-1 space-y-2">
                  <p className="text-sm text-[var(--gt-muted)]">จำนวนเงินที่ต้องชำระ</p>
                  <p className="gt-num rounded-2xl bg-[var(--gt-cta-soft)] px-4 py-2 text-center text-3xl font-bold text-[var(--gt-cta)]">{baht(p.fee)}</p>
                  <dl className="grid gap-1 text-[15px]">
                    <div className="flex justify-between gap-3"><dt className="text-[var(--gt-muted)]">ธนาคาร</dt><dd className="text-right font-semibold">{p.payment!.bank_name}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-[var(--gt-muted)]">ชื่อบัญชี</dt><dd className="text-right font-semibold">{p.payment!.account_name}</dd></div>
                    <div className="flex items-center justify-between gap-3"><dt className="text-[var(--gt-muted)]">เลขบัญชี</dt>
                      <dd className="flex items-center gap-2"><span className="gt-num font-bold">{p.payment!.account_number}</span>
                        <button type="button" onClick={() => { navigator.clipboard?.writeText(p.payment!.account_number.replace(/\D/g, "")).then(() => setCopied(true), () => {}); }} className="min-h-9 rounded-lg border border-[var(--gt-line)] px-2 text-xs font-semibold">{copied ? "คัดลอกแล้ว" : "คัดลอก"}</button></dd></div>
                  </dl>
                </div>
              </div>
              <div>
                <Label text="แนบสลิปชำระเงิน" required />
                {p.slip ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--gt-line)] p-2.5">
                    <span className="relative shrink-0">
                      {p.slip.file.type === "application/pdf"
                        ? <span className="grid h-16 w-16 place-items-center rounded-xl bg-[var(--gt-surface-2)] text-sm font-bold">PDF</span>
                        : <img src={p.slip.url} alt="สลิปที่แนบ" className="h-16 w-16 rounded-xl object-cover" />}
                      <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--gt-ok)] text-white"><Ico name="check" className="h-4 w-4" /></span>
                    </span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold">สลิปที่แนบแล้ว</span><span className="block truncate text-sm text-[var(--gt-muted)]">{p.slip.file.name} ({kb})</span></span>
                    <button type="button" onClick={() => fileRef.current?.click()} className="gt-outline-btn min-h-10 shrink-0 px-3 text-sm font-semibold">เปลี่ยนรูป</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} data-invalid={err("SLIP") || err("SLIP_INVALID")}
                    className="flex min-h-20 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--gt-cta)] bg-[var(--gt-cta-soft)] font-semibold text-[var(--gt-cta)] data-[invalid=true]:border-[var(--gt-bad)] data-[invalid=true]:text-[var(--gt-bad)]">
                    <Ico name="camera" className="h-6 w-6" />แนบรูปสลิป (JPG / PNG / PDF ไม่เกิน 10 MB)
                  </button>
                )}
                {slipErr && <Note tone="bad">{slipErr}</Note>}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" aria-label="เลือกไฟล์สลิป" onChange={(e) => {
                  const f = e.target.files?.[0]; e.target.value = "";
                  if (!f) return;
                  const prob = slipProblem(f); setSlipErr(prob);
                  if (!prob) p.setSlip(f);
                }} />
              </div>
            </>
          )}
        </Section>
      )}

      <Section icon="doc" title={needPay ? "พรีวิวใบสมัคร / หลักฐานชำระเงิน" : "พรีวิวใบสมัคร"}>
        <div className={`grid gap-3 ${needPay ? "grid-cols-2" : ""}`}>
          <button type="button" onClick={() => setSheet("form")} className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--gt-line)] p-3 hover:bg-[var(--gt-surface-2)]">
            <Ico name="doc" className="h-8 w-8 text-[var(--gt-cta)]" /><span className="font-semibold">ใบสมัคร</span><span className="text-sm text-[var(--gt-cta)] underline">ดูตัวอย่าง</span>
          </button>
          {needPay && (
            <button type="button" onClick={() => setSheet("slip")} disabled={!p.slip} className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--gt-line)] p-3 hover:bg-[var(--gt-surface-2)] disabled:opacity-50">
              <Ico name="camera" className="h-8 w-8 text-[var(--gt-cta)]" /><span className="font-semibold">หลักฐานชำระเงิน</span><span className="text-sm text-[var(--gt-cta)] underline">{p.slip ? "ดูตัวอย่าง" : "ยังไม่แนบ"}</span>
            </button>
          )}
        </div>
        <Note>ใบเสร็จจะออกเมื่อผู้จัดยืนยันรับชำระ (ยังไม่ออกใบเสร็จในขั้นตอนนี้)</Note>
      </Section>

      <label className="gt-card flex items-start gap-3 p-4">
        <input type="checkbox" checked={p.accept} onChange={(e) => p.setAccept(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--gt-cta)]" aria-invalid={err("ACCEPT")} />
        <span>ตรวจสอบข้อมูลแล้ว และยอมรับกติกาการแข่งขันของรายการนี้ · <Link href={`/tournaments/${p.event.id}#rules`} target="_blank" className="font-semibold text-[var(--gt-cta)] underline">อ่านกติกา</Link></span>
      </label>

      <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
        <button type="button" onClick={p.onBack} className="gt-outline-btn min-h-14 px-6 font-semibold">← ย้อนกลับ</button>
        <button type="button" onClick={p.onSubmit} disabled={p.busy || (needPay && p.payment === null)} className="gt-cta-btn flex min-h-14 items-center justify-center text-lg disabled:opacity-60">
          {p.busy ? "กำลังส่งใบสมัคร…" : "ยืนยันสมัครแข่งขัน"}
        </button>
      </div>
      {needPay && <p className="flex items-center justify-center gap-2 text-sm text-[var(--gt-muted)]"><Ico name="info" className="h-4 w-4" />หลังยืนยัน สถานะจะเป็น “รอตรวจสอบการชำระเงิน”</p>}

      {sheet === "form" && (
        <Sheet title="ใบสมัคร (ตัวอย่าง)" onClose={() => setSheet(null)}>
          <div className="space-y-3 rounded-2xl border border-[var(--gt-line)] p-4">
            <div className="text-center"><p className="text-sm text-[var(--gt-muted)]">ใบสมัครแข่งขัน</p><p className="text-lg font-bold">{p.event.title}</p><p className="text-sm text-[var(--gt-muted)]">{thaiDate(p.event.event_date) ?? ""}</p></div>
            <div className="flex justify-center"><Avatar src={p.photo} className="h-20 w-20" /></div>
            <dl className="grid gap-1.5 text-[15px]">
              {([
                ["ชื่อ-นามสกุล", p.name], ["ระดับฝีมือ", p.rank], ["รุ่นแข่งขัน", p.div ? divisionLabel(p.div.name) : ""],
                ["สถาบัน", p.inst || "ไม่สังกัด"], ...(p.tab === "new" ? [["อายุ", age !== null ? `${age} ปี` : ""], ["โรงเรียน", [p.school, p.level].filter(Boolean).join(" · ")]] : []),
                ["เบอร์ติดต่อ", p.phone ? `${p.phone.replace(/\D/g, "").slice(0, 3)}-xxx-${p.phone.replace(/\D/g, "").slice(-4)}` : ""],
                ["ค่าสมัคร", needPay ? baht(p.fee) : "ไม่มีค่าสมัคร"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-[var(--gt-line)] pb-1.5 last:border-0"><dt className="text-[var(--gt-muted)]">{k}</dt><dd className="text-right font-semibold">{v || "–"}</dd></div>
              ))}
            </dl>
            <p className="text-center text-xs text-[var(--gt-muted)]">เลขอ้างอิงจะออกหลังกดยืนยันสมัคร</p>
          </div>
        </Sheet>
      )}
      {sheet === "slip" && p.slip && (
        <Sheet title="หลักฐานชำระเงิน" onClose={() => setSheet(null)}>
          {p.slip.file.type === "application/pdf"
            ? <p className="text-center">ไฟล์ PDF: {p.slip.file.name} ({kb})</p>
            : <img src={p.slip.url} alt="สลิปที่แนบ" className="mx-auto max-h-[70vh] rounded-xl" />}
        </Sheet>
      )}
    </>
  );
}
