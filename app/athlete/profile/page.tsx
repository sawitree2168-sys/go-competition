"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { submitAthletePhoto } from "@/lib/storage/athlete-photos";

export default function AthleteProfilePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setMessage("");

    try {
      await submitAthletePhoto(file);
      setMessage("ส่งรูปใหม่แล้ว รูปเดิมจะแสดงต่อจนกว่ารูปใหม่จะผ่านการตรวจสอบ");
      setFile(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถอัปโหลดรูปได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section-shell page-section">
      <div className="page-title compact">
        <span className="eyebrow">ATHLETE PROFILE</span>
        <h1>แก้ไขรูปโปรไฟล์</h1>
        <p>นักกีฬาแก้ไขได้เฉพาะรูปของบัญชีตัวเอง รูปใหม่จะผ่านการตรวจสอบก่อนเผยแพร่</p>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[220px_1fr] dark:border-slate-700 dark:bg-slate-900">
        <div
          className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100 bg-cover bg-center dark:bg-slate-800"
          style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}
          aria-label={previewUrl ? "ตัวอย่างรูปที่เลือก" : "ยังไม่ได้เลือกรูป"}
        >
          {!previewUrl ? (
            <div className="grid h-full place-items-center px-5 text-center text-sm text-slate-500">
              รูปตัวอย่างอัตราส่วน 4:5
            </div>
          ) : null}
        </div>

        <form className="flex flex-col justify-center" onSubmit={submit}>
          <h2 className="text-2xl font-bold">เลือกรูปใหม่</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            ใช้ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB ควรเห็นใบหน้าชัดเจนและไม่มีข้อมูลส่วนตัวอื่นในภาพ
          </p>
          <label className="mt-5 flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 font-semibold text-blue-700">
            เลือกรูปจากโทรศัพท์หรือคอมพิวเตอร์
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectPhoto}
            />
          </label>
          {file ? <p className="mt-3 break-all text-sm text-slate-600">{file.name}</p> : null}
          <button
            className="mt-5 min-h-14 rounded-xl bg-blue-700 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={!file || submitting}
          >
            {submitting ? "กำลังส่งรูป..." : "ส่งรูปเพื่อตรวจสอบ"}
          </button>
          {message ? <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p> : null}
        </form>
      </div>
    </section>
  );
}
