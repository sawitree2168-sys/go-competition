"use client";
/* eslint-disable @next/next/no-img-element -- local previews and signed storage URLs */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { staffDb } from "@/app/organizer/_lib/staff";
import { RANK_OPTIONS, applyErrorMessage, registrationWindow, staffErrorMessage } from "@/lib/competition-day.mjs";
import { thaiDate } from "@/lib/division-display";
import PhotoCropper from "./PhotoCropper";
import { DEFAULT_AVATAR } from "./MatchCard";

type Mode = "web" | "external" | "closed";
type Application = {
  id: string; division_id: string; division_name: string; full_name: string; rank_label: string; club: string | null;
  status: "pending" | "approved" | "rejected"; created_at: string; photo_path: string | null;
  // From the poster sign-up page (private: organisers only).
  mode?: "new" | "existing" | null; go_id?: string | null; birth_date?: string | null; phone?: string | null; school?: string | null;
  school_level?: string | null; academies?: string[]; show_in_academy?: boolean | null; rank_source?: "self" | "results" | null;
  fee?: number | null; slip_path?: string | null; slip_mime?: string | null; reference?: string;
};

const ageFrom = (birth: string | null | undefined) => {
  if (!birth) return null;
  const [y, m, d] = birth.split("-").map(Number), now = new Date();
  return now.getFullYear() - y - ((now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) ? 1 : 0);
};

/** Pending photos: private bucket, only the event's organisers can view. Approved copies: public avatar bucket. */
const PENDING_BUCKET = "gt-application-photos";
const SLIP_BUCKET = "gt-payment-slips";
const AVATAR_BUCKET = "gt-athlete-avatars";

const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const noop = () => () => {};

const STEPS = [
  { n: 1, title: "กรอกข้อมูล", short: "กรอกข้อมูล", body: "กรอกชื่อ-นามสกุล ระดับฝีมือ และชมรม / สังกัด" },
  { n: 2, title: "ผู้จัดตรวจสอบ", short: "ตรวจสอบ", body: "ผู้จัดตรวจสอบข้อมูลและความถูกต้อง" },
  { n: 3, title: "อนุมัติเข้าแข่งขัน", short: "อนุมัติ", body: "เมื่อข้อมูลถูกต้อง จะอนุมัติให้เข้าแข่งขัน" },
];

const field = "mt-1.5 block min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3.5 text-base text-[var(--gt-ink)] outline-none placeholder:text-[var(--gt-muted)] focus:border-[var(--gt-cta)] focus:ring-2 focus:ring-[var(--gt-cta)]/25";
const band = "flex items-center gap-2.5 border-b border-[var(--gt-line)] bg-[var(--gt-cta-soft)] px-4 py-3";

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 text-[var(--gt-cta)]" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeLinecap="round" /></svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 text-[var(--gt-cta)]" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" strokeLinecap="round" /></svg>
);

export default function RegisterPanel(props: {
  tournamentId: string; divisionId: string; divisionLabel: string;
  mode: Mode; url: string | null; openDate: string | null; closeDate: string | null;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="border-l-4 border-[var(--gt-cta)] pl-3">
        <h2 className="text-2xl font-bold leading-tight">สมัครแข่งขัน</h2>
        <p className="text-sm text-[var(--gt-muted)]">{props.divisionLabel}</p>
      </div>
      <ApplyArea {...props} />
      <OrganizerQueue tournamentId={props.tournamentId} divisionId={props.divisionId} />
    </div>
  );
}

function StepChips() {
  return (
    <ol className="flex items-center justify-between gap-1 lg:hidden" aria-label="ขั้นตอนการสมัคร">
      {STEPS.map((s, i) => (
        <li key={s.n} className="flex min-w-0 items-center gap-1">
          {i > 0 && <span aria-hidden="true" className="text-[var(--gt-muted)]">›</span>}
          <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-[var(--gt-cta-soft)] py-1 pl-1 pr-2.5 text-[13px] font-semibold">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--gt-cta)] text-xs font-bold text-white">{s.n}</span>
            <span className="truncate">{s.short}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function StepsCard() {
  return (
    <aside className="gt-card hidden overflow-hidden lg:block">
      <div className="flex items-center gap-2.5 border-b border-[var(--gt-line)] bg-[var(--gt-cta-soft)] px-4 py-3">
        <span aria-hidden="true" className="h-5 w-1 rounded bg-[var(--gt-cta)]" />
        <h3 className="text-lg font-bold">ขั้นตอนการสมัคร</h3>
      </div>
      <ol className="px-4 pt-4">
        {STEPS.map((s, i) => (
          <li key={s.n} className="relative flex gap-3 pb-5">
            {i < STEPS.length - 1 && <span aria-hidden="true" className="absolute left-[17px] top-10 h-[calc(100%-2.75rem)] w-0.5 bg-[var(--gt-line)]" />}
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--gt-cta)] font-bold text-white">{s.n}</span>
            <span className="min-w-0"><span className="block font-semibold">{s.title}</span><span className="block text-sm text-[var(--gt-muted)]">{s.body}</span></span>
          </li>
        ))}
      </ol>
      <p className="mx-4 mb-4 flex items-center gap-2.5 rounded-xl bg-[var(--gt-cta-soft)] px-3 py-3 text-sm"><InfoIcon />ตรวจสอบชื่อและระดับฝีมือให้ถูกต้องก่อนส่งใบสมัคร</p>
    </aside>
  );
}

function ApplyArea(props: Parameters<typeof RegisterPanel>[0]) {
  const { mode, url, openDate, closeDate } = props;
  const today = useSyncExternalStore(noop, bangkokToday, () => null);
  const win = today ? registrationWindow(openDate, closeDate, today) : "open";

  if (mode !== "web" || win !== "open") {
    const msg = mode === "external"
      ? { title: "งานนี้รับสมัครผ่านช่องทางของผู้จัด", body: url ? "กดปุ่มด้านล่างเพื่อไปยังแบบฟอร์มสมัคร" : "ดูช่องทางสมัครได้ที่รายละเอียดงาน หรือติดต่อผู้จัด" }
      : mode === "closed" ? { title: "ปิดรับสมัครแล้ว", body: "ติดต่อผู้จัดหากมีข้อสงสัย" }
      : win === "not_yet" ? { title: "ยังไม่เปิดรับสมัคร", body: `เปิดรับสมัคร ${thaiDate(openDate) ?? openDate}` }
      : { title: "ปิดรับสมัครแล้ว", body: `ปิดรับสมัครเมื่อ ${thaiDate(closeDate) ?? closeDate}` };
    return (
      <section className="gt-card space-y-3 p-4">
        <p className="flex items-start gap-2.5"><InfoIcon /><span><span className="block font-semibold">{msg.title}</span><span className="block text-sm text-[var(--gt-muted)]">{msg.body}</span></span></p>
        {mode === "external" && url && <a href={url} target="_blank" rel="noopener noreferrer" className="gt-cta-btn inline-flex min-h-12 items-center px-5">ไปที่แบบฟอร์มสมัคร →</a>}
      </section>
    );
  }

  // Sign-ups (with payment and slip) happen on the poster sign-up page; this division is pre-selected there.
  return (
    <section className="gt-card space-y-3 p-4">
      <p className="flex items-start gap-2.5"><InfoIcon /><span><span className="block font-semibold">เปิดรับสมัครรุ่นนี้</span>
        <span className="block text-sm text-[var(--gt-muted)]">กรอกข้อมูลนักกีฬา (หรือค้นหาชื่อถ้าเคยแข่งแล้ว) ชำระเงิน แนบสลิป แล้วกดยืนยัน</span></span></p>
      <a href={`/tournaments/${props.tournamentId}/register?division=${props.divisionId}`} className="gt-cta-btn inline-flex min-h-12 w-full items-center justify-center px-5 text-lg sm:w-auto">สมัครรุ่นนี้ →</a>
    </section>
  );
}

/** Older in-page form (kept for reference; the poster sign-up page replaced it). */
export function LegacyApply({ divisionId }: { divisionId: string }) {
  return (
    <>
      <StepChips />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <ApplyForm divisionId={divisionId} />
        <StepsCard />
      </div>
    </>
  );
}

function ApplyForm({ divisionId }: { divisionId: string }) {
  const [name, setName] = useState("");
  const [rank, setRank] = useState("");
  const [club, setClub] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [original, setOriginal] = useState<File | null>(null);   // re-crop from the full photo, not the cropped copy
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ name: string; reference: string; photo: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("กรุณาเลือกไฟล์รูปภาพ");
    if (f.size > 25 * 1024 * 1024) return setError("ไฟล์รูปใหญ่เกินไป (เกิน 25 MB)");
    setError(""); setOriginal(f); setCropFile(f);
  };
  const clearPhoto = () => { setPhoto(null); setOriginal(null); setConsent(false); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const n = name.replace(/\s+/g, " ").trim();
    if (n.length < 3 || !n.includes(" ")) return setError(applyErrorMessage("NAME"));
    if (!rank) return setError(applyErrorMessage("RANK"));
    if (photo && !consent) return setError(applyErrorMessage("CONSENT"));
    const db = staffDb();
    if (!db) return setError("ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
    setBusy(true);
    try {
      let path: string | null = null;
      if (photo) {
        path = `pending/${crypto.randomUUID()}.jpg`;
        const up = await db.storage.from(PENDING_BUCKET).upload(path, photo.blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) return setError(applyErrorMessage("PHOTO"));
      }
      const { data, error: err } = await db.rpc("gt_apply_v2", { p_division: divisionId, p_full_name: n, p_rank: rank, p_club: club.trim(), p_photo: path });
      if (err) return setError(applyErrorMessage(""));
      if (!data?.ok) return setError(applyErrorMessage(data?.error));
      setSent({ name: n, reference: data.reference, photo: Boolean(photo) });
      setName(""); setRank(""); setClub(""); clearPhoto();
    } catch {
      setError(applyErrorMessage(""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="gt-card overflow-hidden" aria-labelledby="apply-title">
      <div className={band}><PersonIcon /><h3 id="apply-title" className="text-lg font-bold">ข้อมูลผู้สมัคร</h3></div>
      {sent ? (
        <div role="status" className="space-y-3 p-4">
          <p className="text-lg font-bold text-[var(--gt-ok)]">ส่งใบสมัครแล้ว</p>
          <p>{sent.name} · เลขอ้างอิง <span className="gt-num font-bold">{sent.reference}</span>{sent.photo && " · แนบรูปแล้ว"}</p>
          <p className="text-sm text-[var(--gt-muted)]">ผู้จัดจะตรวจสอบข้อมูลก่อนอนุมัติ เมื่ออนุมัติแล้วรายชื่อจะแสดงในแท็บนักกีฬา</p>
          <button type="button" onClick={() => setSent(null)} className="gt-outline-btn min-h-11 px-4 text-sm font-semibold">สมัครอีกคน</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 p-4">
          <div>
            <span className="font-semibold">รูปนักกีฬา <span className="text-sm font-normal text-[var(--gt-muted)]">(ไม่บังคับ)</span></span>
            <div className="mt-1.5 flex items-center gap-3 sm:gap-4">
              <img src={photo?.url ?? DEFAULT_AVATAR} alt={photo ? "รูปที่เลือก" : ""} className={`h-[72px] w-[72px] shrink-0 sm:h-20 sm:w-20 ${photo ? "rounded-lg border-2 border-[var(--gt-line)] object-cover" : "object-contain"}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="gt-outline-btn min-h-10 px-3 text-sm font-semibold">{photo ? "เปลี่ยนรูป" : "เลือกรูป"}</button>
                  {photo && original && <button type="button" onClick={() => setCropFile(original)} className="gt-outline-btn min-h-10 px-3 text-sm font-semibold">ครอปใหม่</button>}
                  {photo && <button type="button" onClick={clearPhoto} className="min-h-10 px-1.5 text-sm font-semibold text-[var(--gt-bad)] underline-offset-2 hover:underline">ลบ</button>}
                </div>
                <p className="mt-1 text-xs text-[var(--gt-muted)]">รูปหน้าตรง เห็นหน้าชัด · ครอปเป็นสี่เหลี่ยมจัตุรัสก่อนส่ง</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" aria-label="เลือกรูปนักกีฬา" />
            </div>
            {photo && (
              <label className="mt-2.5 flex items-start gap-2 text-sm">
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(""); }} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gt-cta)]" />
                <span>ยินยอมให้แสดงรูปนี้บนเว็บไซต์ (รายชื่อ คู่แข่งขัน และผลการแข่งขัน) · กรณีอายุต่ำกว่า 18 ปี ผู้ปกครองเป็นผู้ยินยอม</span>
              </label>
            )}
          </div>
          <label className="block">
            <span className="font-semibold">ชื่อ-นามสกุล <span className="text-[var(--gt-bad)]">*</span></span>
            <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} maxLength={120} autoComplete="name" required placeholder="กรอกชื่อและนามสกุล" className={field} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-semibold">ระดับฝีมือ <span className="text-[var(--gt-bad)]">*</span></span>
              <select value={rank} onChange={(e) => { setRank(e.target.value); setError(""); }} required className={field}>
                <option value="">เลือกระดับฝีมือ</option>
                {RANK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <span className="mt-1 block text-xs text-[var(--gt-muted)]">กรุณาระบุระดับฝีมือปัจจุบัน</span>
            </label>
            <label className="block">
              <span className="font-semibold">ชมรม / สังกัด</span>
              <input value={club} onChange={(e) => setClub(e.target.value)} maxLength={120} placeholder="ระบุชมรม หรืออิสระ" className={field} />
            </label>
          </div>
          {error && <p role="alert" className="rounded-xl border border-[var(--gt-bad)] px-3 py-2 text-sm text-[var(--gt-bad)]">{error}</p>}
          <div className="border-t border-[var(--gt-line)] pt-4">
            <button type="submit" disabled={busy} className="gt-cta-btn flex min-h-12 w-full items-center justify-center text-lg disabled:opacity-60">{busy ? "กำลังส่ง…" : "ส่งใบสมัคร →"}</button>
            <p className="mt-2 text-center text-sm text-[var(--gt-muted)]">ผู้จัดจะตรวจสอบข้อมูลก่อนอนุมัติ</p>
          </div>
        </form>
      )}
      {cropFile && (
        <PhotoCropper file={cropFile} onCancel={() => setCropFile(null)}
          onDone={(blob) => { setPhoto({ blob, url: URL.createObjectURL(blob) }); setCropFile(null); setError(""); }} />
      )}
    </section>
  );
}

/** Shown only to an organiser of this event who is signed in on this browser. Without divisionId: every division of the event. */
export function OrganizerQueue({ tournamentId, divisionId, bare }: { tournamentId: string; divisionId?: string; bare?: boolean }) {
  const [rows, setRows] = useState<Application[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);
  const openSlip = async (r: Application) => {
    if (!r.slip_path) return;
    const { data } = await staffDb()!.storage.from(SLIP_BUCKET).createSignedUrl(r.slip_path, 600);
    if (!data?.signedUrl) return setError("เปิดสลิปไม่สำเร็จ กรุณาลองใหม่");
    if (r.slip_mime === "application/pdf") window.open(data.signedUrl, "_blank", "noopener");
    else setZoom({ src: data.signedUrl, name: `สลิป ${r.full_name}` });
  };
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const db = staffDb();
    if (!db) return;
    const { data: s } = await db.auth.getSession();
    if (!s.session) return;
    const { data, error: err } = await db.rpc("gt_staff_list_applications_v2", { p_tournament: tournamentId, p_division: divisionId ?? null });
    if (err) return;
    const list = (data ?? []) as Application[];
    setRows(list);
    const paths = list.filter((r) => r.status === "pending" && r.photo_path).map((r) => r.photo_path!);
    if (paths.length) {
      const { data: signed } = await db.storage.from(PENDING_BUCKET).createSignedUrls(paths, 600);
      const map: Record<string, string> = {};
      for (const x of signed ?? []) if (x.path && x.signedUrl) map[x.path] = x.signedUrl;
      setThumbs(map);
    }
  }, [tournamentId, divisionId]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  if (!rows) return null;
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  const decide = async (r: Application, approve: boolean) => {
    const db = staffDb();
    if (!db) return;
    setBusyId(r.id); setError("");
    try {
      if (approve && r.photo_path) {
        // Publish the photo first; approval then links it to the athlete.
        const dl = await db.storage.from(PENDING_BUCKET).download(r.photo_path);
        if (dl.error || !dl.data) throw new Error("PHOTO_COPY");
        const up = await db.storage.from(AVATAR_BUCKET).upload(`approved/${r.id}.jpg`, dl.data, { contentType: "image/jpeg", upsert: false });
        if (up.error && !/exist|duplicate/i.test(up.error.message)) throw new Error("PHOTO_COPY");
      }
      const { error: err } = await db.rpc("gt_staff_decide_application_v1", { p_id: r.id, p_approve: approve });
      if (err) setError(staffErrorMessage(err.message));
      else if (r.photo_path) await db.storage.from(PENDING_BUCKET).remove([r.photo_path]);
    } catch (e) {
      setError(e instanceof Error && e.message === "PHOTO_COPY" ? "คัดลอกรูปไม่สำเร็จ กรุณาลองอีกครั้ง" : staffErrorMessage(String(e)));
    } finally {
      setBusyId("");
      await load();
    }
  };

  return (
    <section className={bare ? "" : "gt-card overflow-hidden"} aria-label="รายการรออนุมัติ">
      {!bare && (
        <div className={band}>
          <LockIcon />
          <h2 className="text-lg font-bold">สำหรับผู้จัดการแข่งขัน</h2>
          <span className="rounded-full border border-[var(--gt-cta)]/30 bg-[var(--gt-surface)] px-2.5 py-0.5 text-xs font-semibold text-[var(--gt-cta)]">เฉพาะผู้จัด</span>
        </div>
      )}
      <div className={bare ? "" : "p-4"}>
        <div className="flex items-center gap-2">
          <p className="font-semibold">รายการรออนุมัติ</p>
          <span className="gt-pill-gold px-2.5 py-0.5 text-xs font-semibold">{pending.length} รายการ</span>
        </div>
        {error && <p role="alert" className="mt-2 rounded-xl border border-[var(--gt-bad)] px-3 py-2 text-sm text-[var(--gt-bad)]">{error}</p>}
        {pending.length ? (
          <ul className="mt-3 space-y-2">
            {pending.map((r) => {
              const thumb = r.photo_path ? thumbs[r.photo_path] : undefined;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--gt-line)] px-3 py-2.5">
                  {thumb
                    ? <button type="button" onClick={() => setZoom({ src: thumb, name: r.full_name })} aria-label={`ดูรูป ${r.full_name}`} className="shrink-0 rounded-full"><img src={thumb} alt="" className="h-11 w-11 rounded-lg object-cover" /></button>
                    : <img src={DEFAULT_AVATAR} alt="" className="h-11 w-11 shrink-0 object-contain" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold">{r.full_name}</span>
                      <span className="rounded-full bg-[var(--gt-cta-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--gt-cta)]">{r.rank_label}</span>
                      {!divisionId && <span className="text-xs text-[var(--gt-muted)]">{r.division_name}</span>}
                    </p>
                    <p className="truncate text-sm text-[var(--gt-muted)]">{r.academies?.length ? r.academies.join(" • ") : r.club ?? "อิสระ"}{r.photo_path ? " · มีรูป" : ""}</p>
                    {r.mode && (
                      <p className="text-sm">
                        {[
                          r.mode === "existing" ? `ข้อมูลเดิม ${r.go_id ?? ""}` : "สมัครใหม่",
                          ageFrom(r.birth_date) !== null && `อายุ ${ageFrom(r.birth_date)} ปี`,
                          [r.school, r.school_level].filter(Boolean).join(" "),
                          r.rank_source === "results" && "ระดับ: ตามผลที่ผู้จัดรับรอง",
                          r.reference && `อ้างอิง ${r.reference}`,
                        ].filter(Boolean).join(" · ")}
                        {r.phone && <> · <a href={`tel:${r.phone}`} className="font-semibold text-[var(--gt-cta)] underline">{r.phone}</a></>}
                      </p>
                    )}
                    {r.mode && (Number(r.fee) > 0 ? (
                      <p className="text-sm">ค่าสมัคร {Number(r.fee).toLocaleString("th-TH")} บาท · {r.slip_path
                        ? <button type="button" onClick={() => openSlip(r)} className="font-semibold text-[var(--gt-cta)] underline">ดูสลิป</button>
                        : <span className="text-[var(--gt-bad)]">ไม่มีสลิป</span>}</p>
                    ) : <p className="text-sm text-[var(--gt-muted)]">ไม่มีค่าสมัคร</p>)}
                  </div>
                  <span className="gt-pill-gold hidden px-2.5 py-0.5 text-xs font-semibold sm:inline">รอตรวจสอบ</span>
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                    <button type="button" disabled={!!busyId} onClick={() => decide(r, false)} className="gt-outline-btn min-h-11 px-4 text-sm font-semibold disabled:opacity-60">ปฏิเสธ</button>
                    <button type="button" disabled={!!busyId} onClick={() => decide(r, true)} className="gt-cta-btn min-h-11 px-5 text-sm disabled:opacity-60">{busyId === r.id ? "กำลังบันทึก…" : "อนุมัติ"}</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="mt-3 text-sm text-[var(--gt-muted)]">ไม่มีใบสมัครรออนุมัติ</p>}
        {decided.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-[var(--gt-muted)]">ตัดสินแล้ว {decided.length} รายการ</summary>
            <ul className="mt-2 space-y-1">
              {decided.map((r) => (
                <li key={r.id} className="flex justify-between gap-2"><span className="truncate">{r.full_name} · {r.rank_label}</span><span className={r.status === "approved" ? "text-[var(--gt-ok)]" : "text-[var(--gt-bad)]"}>{r.status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธ"}</span></li>
              ))}
            </ul>
          </details>
        )}
        <p className="mt-3 text-xs text-[var(--gt-muted)]">ตรวจสลิปแล้วกดอนุมัติ: ระบบเพิ่มชื่อ (และรูป ถ้ามี) เข้ารุ่นนี้ บันทึกว่าตรวจการชำระแล้ว และเพิ่มเข้ารายชื่อนักเรียนของสถาบันที่ผู้สมัครเลือก · เบอร์โทร วันเกิด และสลิป เห็นเฉพาะผู้จัด · หน้าสาธารณะอัปเดตภายใน 30 วินาที</p>
      </div>
      {zoom && createPortal(
        <div role="dialog" aria-modal="true" aria-label={`รูป ${zoom.name}`} onClick={() => setZoom(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6">
          <figure className="text-center text-white">
            <img src={zoom.src} alt={`รูป ${zoom.name}`} className="mx-auto max-h-[70vh] w-auto max-w-full rounded-2xl" />
            <figcaption className="mt-2 font-semibold">{zoom.name} · แตะเพื่อปิด</figcaption>
          </figure>
        </div>,
        (document.querySelector(".gt") as HTMLElement | null) ?? document.body,
      )}
    </section>
  );
}
