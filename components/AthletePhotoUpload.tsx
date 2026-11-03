"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const MAX_SIZE = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

type Props = { athleteId: string; onSaved?: (path: string) => void };

export default function AthletePhotoUpload({ athleteId, onSaved }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(next: File | undefined) {
    if (!next) return;
    if (!TYPES.includes(next.type)) { setMessage("รองรับ JPG, PNG และ WebP เท่านั้น"); return; }
    if (next.size > MAX_SIZE) { setMessage("ไฟล์ต้องมีขนาดไม่เกิน 5 MB"); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next); setPreview(URL.createObjectURL(next)); setZoom(1); setMessage("");
  }

  async function save() {
    if (!file || !preview || busy) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setMessage("ระบบจัดเก็บรูปภาพยังไม่พร้อม"); return; }
    setBusy(true);setMessage("");
    try {
      const db = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
      const { data: userData, error: authError } = await db.auth.getUser();
      if (authError || !userData.user) throw new Error("กรุณาเข้าสู่ระบบก่อนเปลี่ยนรูป");
      const { data: athlete, error: ownerError } = await db.from("gt_athletes")
        .select("id,claimed_by").eq("id", athleteId).eq("claimed_by", userData.user.id).single();
      if (ownerError || !athlete) throw new Error("เปลี่ยนรูปได้เฉพาะโปรไฟล์ของตนเอง");
      const img = new Image();
      img.src = preview;
      await img.decode();
      const size = 640, canvas = document.createElement("canvas");
      canvas.width = size;canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("อุปกรณ์นี้ไม่รองรับการปรับรูป");
      const crop = Math.min(img.naturalWidth,img.naturalHeight) / zoom;
      const sx = (img.naturalWidth-crop)/2,sy=(img.naturalHeight-crop)/2;
      ctx.drawImage(img,sx,sy,crop,crop,0,0,size,size);
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("แปลงรูปไม่สำเร็จ")),"image/webp",.86));
      const path = `${userData.user.id}/${athleteId}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await db.storage.from("gt-athlete-photos").upload(path,blob,{contentType:"image/webp",upsert:false});
      if (uploadError) throw new Error("อัปโหลดรูปไม่สำเร็จ: "+uploadError.message);
      const { data: saved, error: updateError } = await db.from("gt_athletes").update({photo_path:path})
        .eq("id",athleteId).eq("claimed_by",userData.user.id).select("id,photo_path").single();
      if (updateError || !saved) throw new Error("บันทึกโปรไฟล์ไม่สำเร็จ กรุณาติดต่อแอดมิน");
      setMessage("บันทึกรูปโปรไฟล์เรียบร้อยแล้ว");onSaved?.(path);
    } catch (e) { setMessage(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"); }
    finally { setBusy(false); }
  }
  return <section aria-label="เปลี่ยนรูปโปรไฟล์นักกีฬา" className="max-w-md space-y-4">
    <label className="block font-semibold text-lg">รูปโปรไฟล์นักกีฬา</label>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => choose(e.target.files?.[0])} />
    <button type="button" className="rounded-lg border px-5 py-3 text-base" onClick={() => input.current?.click()}>เลือกรูปจากเครื่อง</button>
    {preview && <>
      <div className="mx-auto w-64 h-64 rounded-full overflow-hidden border-2 bg-gray-100" aria-label="ตัวอย่างรูปโปรไฟล์">
        <img src={preview} alt="ตัวอย่างรูปโปรไฟล์ก่อนบันทึก" className="w-full h-full object-cover" style={{ transform:`scale(${zoom})` }} />
      </div>
      <label className="block">ขยายรูป {Math.round(zoom*100)}%
        <input type="range" min="1" max="2" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="block w-full" />
      </label>
      <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-black text-white px-6 py-3 disabled:opacity-50">
        {busy ? "กำลังบันทึก..." : "บันทึกรูปโปรไฟล์"}
      </button>
    </>}
    {message && <p role="status" aria-live="polite">{message}</p>}
    <p className="text-sm text-gray-600">JPG, PNG, WebP ไม่เกิน 5 MB • ภาพจะถูกปรับเป็นสี่เหลี่ยมจัตุรัส</p>
  </section>;
}
