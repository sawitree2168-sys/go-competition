"use client";

import { useRef, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import PhotoCropper from "@/app/tournaments/[id]/_ui/PhotoCropper";
import AthleteAvatar from "@/components/AthleteAvatar";

const BUCKET = "gt-athlete-avatars";
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const MESSAGES: Record<string, string> = {
  LOGIN_REQUIRED: "กรุณาเข้าสู่ระบบก่อน",
  NOT_ALLOWED: "เปลี่ยนรูปได้เฉพาะโปรไฟล์ของตัวเอง (หรือแอดมิน)",
  REASON_REQUIRED: "แอดมินต้องใส่เหตุผลอย่างน้อย 4 ตัวอักษร",
  BAD_PATH: "ไฟล์รูปไม่ถูกต้อง กรุณาลองใหม่",
  PHOTO_MISSING: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่",
  NOT_FOUND: "ไม่พบนักกีฬารหัสนี้",
};
const explain = (msg: string) => Object.entries(MESSAGES).find(([k]) => msg.includes(k))?.[1] ?? "บันทึกไม่สำเร็จ: " + msg;

/**
 * Change or remove one athlete's profile photo: choose → crop (drag, zoom, rotate) → save.
 * mode "self": the signed-in athlete/parent, saved under self/<athlete id>/; needs the consent tick.
 * mode "admin": platform owner/admin fixing someone's photo, saved under admin/<GO ID>/; needs a reason.
 */
export default function PhotoEditor({ mode, goId, athleteId, name, photo, onSaved }: {
  mode: "self" | "admin"; goId: string; athleteId?: string; name: string; photo: string | null; onSaved: (url: string | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const ready = mode === "self" ? consent : reason.trim().length >= 4;

  function choose(f: File | undefined) {
    setMessage("");
    if (!f) return;
    if (f.type && !TYPES.includes(f.type)) { setMessage("รองรับรูป JPG, PNG, WebP หรือ HEIC"); return; }
    if (f.size > 15 * 1024 * 1024) { setMessage("ไฟล์ใหญ่เกิน 15 MB"); return; }
    setFile(f);
  }

  async function save(blob: Blob | null) {
    const db = staffDb();
    if (!db) { setMessage("ระบบยังไม่พร้อม"); return; }
    setBusy(true); setMessage("");
    try {
      let path: string | null = null;
      if (blob) {
        const folder = mode === "self" ? `self/${athleteId}` : `admin/${goId.replace(/[^A-Za-z0-9-]/g, "")}`;
        path = `${folder}/${crypto.randomUUID()}.jpg`;
        const up = await db.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw new Error(up.error.message);
      }
      const { data, error } = await db.rpc("gt_athlete_photo_set_v1", { p_go_id: goId, p_path: path, p_reason: mode === "admin" ? reason.trim() : "consent" });
      if (error) throw new Error(error.message);
      const url = (data as { avatar_url: string | null } | null)?.avatar_url ?? null;
      setMessage(blob ? "บันทึกรูปแล้ว รูปใหม่จะขึ้นบนหน้าเว็บภายในไม่กี่นาที" : "ลบรูปแล้ว จะแสดงเป็นอวตารแทน");
      setFile(null); setReason("");
      onSaved(url);
    } catch (e) {
      setMessage(explain(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <AthleteAvatar src={photo} name={name} className="h-24 w-24 ring-4 ring-[var(--gt-gold-soft)]" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{name}</p>
          <p className="text-sm text-[var(--gt-muted)]">{goId}</p>
          <p className="text-sm text-[var(--gt-muted)]">{photo ? "ใช้รูปถ่าย" : "ยังไม่มีรูป · แสดงเป็นอวตาร"}</p>
        </div>
      </div>

      {mode === "self" ? (
        <label className="flex items-start gap-3 rounded-xl bg-[var(--gt-surface-2)] p-3 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
          <span>ฉันเป็นนักกีฬาคนนี้ หรือเป็นผู้ปกครอง และยินยอมให้แสดงรูปนี้บนเว็บไซต์ GO TOURNAMENT (หน้าผลแข่ง โปรไฟล์ และประกาศดั้ง)</span>
        </label>
      ) : (
        <label className="block text-sm font-semibold">เหตุผลที่แก้ (บันทึกไว้ในประวัติ)
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="เช่น รูปผิดคน ผู้ปกครองแจ้งทาง LINE"
            className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 text-base font-normal" />
        </label>
      )}

      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!ready || busy} onClick={() => input.current?.click()} className="gt-cta-btn min-h-12 px-5 disabled:opacity-50">
          {busy ? "กำลังบันทึก…" : photo ? "เปลี่ยนรูป" : "เพิ่มรูป"}
        </button>
        {photo && (
          <button type="button" disabled={!ready || busy} onClick={() => { if (window.confirm("ลบรูปนี้และกลับไปใช้อวตาร?")) void save(null); }}
            className="gt-outline-btn min-h-12 px-5 font-semibold disabled:opacity-50">ลบรูป ใช้อวตาร</button>
        )}
      </div>
      {!ready && <p className="text-sm text-[var(--gt-muted)]">{mode === "self" ? "ติ๊กยินยอมก่อนเลือกรูป" : "ใส่เหตุผลก่อนเปลี่ยนหรือลบรูป"}</p>}
      {message && <p role="status" aria-live="polite" className="text-sm font-semibold">{message}</p>}
      <p className="text-xs text-[var(--gt-muted)]">เลือกรูปแล้วลากเพื่อจัดหน้าให้อยู่กลางวงกลม ซูมหรือหมุนได้ · บันทึกเป็นรูปสี่เหลี่ยม 400×400</p>

      {file && <PhotoCropper file={file} onCancel={() => setFile(null)} onDone={(blob) => { setFile(null); void save(blob); }} />}
    </div>
  );
}
