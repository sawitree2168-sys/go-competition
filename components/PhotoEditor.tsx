"use client";

import { useEffect, useRef, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import PhotoCropper from "@/app/tournaments/[id]/_ui/PhotoCropper";
import AthleteAvatar from "@/components/AthleteAvatar";
import { DEFAULT_ATHLETE_PHOTO, athletePhotoSource } from "@/lib/athlete-photo.mjs";
import { athletePortrait } from "@/lib/athlete-portraits";

const BUCKET = "gt-athlete-avatars";
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const SLOTS = [0, 1, 2] as const;
type Slot = typeof SLOTS[number];
type Action = "add" | "remove" | "promote";
type Photos = { primary: string | null; extras: Partial<Record<1 | 2, string>> };

const MESSAGES: Record<string, string> = {
  LOGIN_REQUIRED: "กรุณาเข้าสู่ระบบก่อน",
  NOT_ALLOWED: "จัดการรูปได้เฉพาะเจ้าของโปรไฟล์และแอดมิน",
  REASON_REQUIRED: "แอดมินต้องใส่เหตุผลอย่างน้อย 4 ตัวอักษร",
  BAD_PATH: "ไฟล์รูปไม่ถูกต้อง กรุณาลองใหม่",
  PHOTO_MISSING: "ไม่พบไฟล์รูป กรุณาลองใหม่",
  NOT_FOUND: "ไม่พบนักกีฬารหัสนี้",
  SLOT_OCCUPIED: "ช่องนี้มีรูปแล้ว กรุณาลบรูปเดิมก่อนเพิ่มรูปใหม่",
  PHOTO_CHANGED: "รูปมีการเปลี่ยนแปลง ระบบโหลดรูปปัจจุบันให้แล้ว",
  PHOTO_DUPLICATE: "รูปนี้อยู่ในโปรไฟล์แล้ว",
};
const explain = (message: string) =>
  Object.entries(MESSAGES).find(([code]) => message.includes(code))?.[1] ?? "บันทึกรูปไม่สำเร็จ กรุณาลองใหม่";

export default function PhotoEditor({ mode, goId, athleteId, name, photo, onSaved }: {
  mode: "self" | "admin"; goId: string; athleteId?: string; name: string; photo: string | null; onSaved: (url: string | null) => void;
}) {
  const [photos, setPhotos] = useState<Photos | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const pickedSlot = useRef<Slot>(0);
  const saving = useRef(false);
  const permitted = mode === "self" ? consent : reason.trim().length >= 4;

  useEffect(() => {
    let active = true;
    const db = staffDb();
    if (db) void db.rpc("gt_manage_athlete_photos_v1", { p_go_id: goId }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) setMessage("โหลดรูปไม่สำเร็จ กรุณาเปิดหน้านี้ใหม่");
      else setPhotos(data as Photos);
    });
    return () => { active = false; };
  }, [goId]);

  const displayedPrimary = (photos ? photos.primary : photo) ?? athletePortrait(name, goId);
  const primaryIsPhoto = athletePhotoSource(displayedPrimary) !== DEFAULT_ATHLETE_PHOTO;
  const legacyPrimary = primaryIsPhoto && !photos?.primary;

  function choose(f: File | undefined) {
    setMessage("");
    if (!f) return;
    if (f.type && !TYPES.includes(f.type)) { setMessage("รองรับรูป JPG, PNG, WebP หรือ HEIC"); return; }
    if (f.size > 15 * 1024 * 1024) { setMessage("ไฟล์ใหญ่เกิน 15 MB"); return; }
    setFile(f);
  }

  async function save(slot: Slot, action: Action, blob?: Blob) {
    const db = staffDb();
    if (!db || !photos || !permitted || saving.current) return;
    saving.current = true;
    setBusy(true);
    setMessage("");
    try {
      let path: string | null = null;
      if (blob) {
        const folder = mode === "self" ? `self/${athleteId}` : `admin/${goId.replace(/[^A-Za-z0-9-]/g, "")}`;
        path = `${folder}/${crypto.randomUUID()}.jpg`;
        const upload = await db.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upload.error) throw new Error(upload.error.message);
      }
      const { data, error } = await db.rpc("gt_change_athlete_photo_slot_v1", {
        p_go_id: goId, p_slot: slot, p_action: action,
        p_expected: slot === 0 ? photos.primary : photos.extras[slot] ?? null,
        p_expected_primary: photos.primary, p_path: path,
        p_reason: mode === "admin" ? reason.trim() : "consent",
      });
      if (error) {
        if (error.message.includes("PHOTO_CHANGED") || error.message.includes("SLOT_OCCUPIED")) {
          const current = await db.rpc("gt_manage_athlete_photos_v1", { p_go_id: goId });
          if (!current.error && current.data) setPhotos(current.data as Photos);
        }
        throw new Error(error.message);
      }
      const saved = data as Photos;
      setPhotos(saved);
      setReason("");
      setMessage(action === "promote" ? "ตั้งรูปหลักแล้ว" : action === "remove" ? "นำรูปออกแล้ว" : "บันทึกรูปแล้ว");
      onSaved(saved.primary);
    } catch (error) {
      setMessage(explain(error instanceof Error ? error.message : String(error)));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const disabled = !photos || !permitted || busy;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-bold">{name}</p>
        <p className="text-sm text-[var(--gt-muted)]">{goId}</p>
      </div>
      {mode === "self" ? (
        <label className="flex items-start gap-3 rounded-xl bg-[var(--gt-surface-2)] p-3 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
          <span>ฉันเป็นนักกีฬาคนนี้หรือผู้ปกครอง และยินยอมให้แสดงรูปที่เลือกเป็นรูปหลักบนเว็บไซต์ GO TOURNAMENT</span>
        </label>
      ) : (
        <label className="block text-sm font-semibold">เหตุผลที่จัดการรูป
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="เช่น ผู้ปกครองขอเปลี่ยนรูป"
            className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base font-normal" />
        </label>
      )}
      <p className="text-sm text-[var(--gt-muted)]">รูปหลักใช้แสดงบนเว็บ ช่องรูปเพิ่มเติมเก็บได้ 2 รูป หากช่องเต็มให้นำรูปเดิมออกก่อนเพิ่มรูปใหม่</p>
      <input ref={input} type="file" accept="image/*" className="sr-only" aria-label="เลือกรูปนักกีฬา"
        onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="grid gap-3 sm:grid-cols-3">
        {SLOTS.map(slot => {
          const title = slot === 0 ? "รูปหลัก" : `รูปเพิ่มเติม ${slot}`;
          const url = slot === 0 ? displayedPrimary : photos?.extras[slot];
          const filled = slot === 0 ? primaryIsPhoto : Boolean(url);
          return (
            <section key={slot} aria-label={title} className="flex min-w-0 flex-col items-center gap-3 rounded-xl border border-[var(--gt-line)] p-3 text-center">
              <h3 className="text-sm font-bold">{title}</h3>
              {slot === 0 || filled ? (
                <AthleteAvatar src={url ?? DEFAULT_ATHLETE_PHOTO} name={name} className="h-20 w-20" />
              ) : <div className="grid h-20 w-20 place-items-center rounded-lg bg-[var(--gt-surface-2)] text-sm text-[var(--gt-muted)]">ว่าง</div>}
              {slot === 0 && !filled && <p className="text-xs text-[var(--gt-muted)]">ใช้อวตาร</p>}
              <div className="mt-auto flex flex-wrap justify-center gap-2">
                {!filled ? (
                  <button type="button" disabled={disabled} className="gt-cta-btn min-h-11 px-3 text-sm disabled:opacity-50"
                    onClick={() => { pickedSlot.current = slot; input.current?.click(); }}>เพิ่ม{title}</button>
                ) : <>
                  {slot !== 0 && <button type="button" disabled={disabled || legacyPrimary} className="gt-cta-btn min-h-11 px-3 text-sm disabled:opacity-50"
                    onClick={() => void save(slot, "promote")}>ตั้งเป็นรูปหลัก</button>}
                  <button type="button" disabled={disabled} className="gt-outline-btn min-h-11 px-3 text-sm disabled:opacity-50"
                    onClick={() => { if (window.confirm(slot === 0 ? "นำรูปหลักออกและใช้อวตาร?" : `นำ${title}ออก?`)) void save(slot, "remove"); }}>นำรูปออก</button>
                </>}
              </div>
            </section>
          );
        })}
      </div>
      {photos && legacyPrimary && <p className="text-sm text-[var(--gt-muted)]">นำรูปหลักเดิมออกก่อนตั้งรูปเพิ่มเติมเป็นรูปหลัก</p>}
      {(busy || message) && <p role="status" aria-live="polite" className="text-sm font-semibold">{busy ? "กำลังบันทึก…" : message}</p>}
      {file && <PhotoCropper file={file} onCancel={() => setFile(null)} onDone={(blob) => { setFile(null); void save(pickedSlot.current, "add", blob); }} />}
    </div>
  );
}
