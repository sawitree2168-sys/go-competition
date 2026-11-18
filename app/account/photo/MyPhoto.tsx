"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import PhotoEditor from "@/components/PhotoEditor";

type Mine = { athlete_id: string; go_id: string; full_name: string; rank: string | null; photo: string | null };

/** Signed-in athlete (or parent) changes the photo of the athlete linked to this account. */
export default function MyPhoto() {
  const [me, setMe] = useState<Mine | null | "out" | "none">(null);

  useEffect(() => {
    const db = staffDb();
    if (!db) { queueMicrotask(() => setMe("out")); return; }
    db.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setMe("out"); return; }
      const { data: mine } = await db.rpc("gt_my_photo_v1");
      setMe(mine ? (mine as Mine) : "none");
    });
  }, []);

  if (me === null) return <p className="py-16 text-center text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>;
  if (me === "out") {
    return (
      <div className="gt-card space-y-4 p-6 text-center">
        <h1 className="text-2xl font-bold">เข้าสู่ระบบเพื่อเปลี่ยนรูป</h1>
        <p className="text-[var(--gt-muted)]">ใช้รหัส GO เลขดั้ง หรือชื่อ-นามสกุล พร้อมรหัสผ่าน</p>
        <Link href="/login?next=/account/photo" className="gt-cta-btn flex min-h-12 items-center justify-center">เข้าสู่ระบบ</Link>
      </div>
    );
  }
  if (me === "none") {
    return (
      <div className="gt-card space-y-3 p-6">
        <h1 className="text-xl font-bold">บัญชีนี้ยังไม่ได้ผูกกับนักกีฬา</h1>
        <p className="text-[var(--gt-muted)]">สมัครบัญชีนักกีฬาด้วยชื่อ-นามสกุลให้ตรงทะเบียน (และเลขดั้งสำหรับผู้เล่นดั้ง) แล้วกลับมาเปลี่ยนรูปที่หน้านี้ ถ้ารูปบนเว็บผิดคน แจ้งแอดมินให้แก้ไขได้</p>
        <Link href="/signup" className="gt-cta-btn inline-flex min-h-11 items-center px-5">สมัครบัญชีนักกีฬา</Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Link href="/account" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--gt-brand)]">← บัญชีของฉัน</Link>
      <section className="gt-card p-5">
        <h1 className="mb-4 text-xl font-bold">รูปโปรไฟล์นักกีฬา</h1>
        <PhotoEditor mode="self" goId={me.go_id} athleteId={me.athlete_id} name={me.full_name} photo={me.photo}
          onSaved={(url) => setMe({ ...me, photo: url })} />
      </section>
      <p className="text-sm text-[var(--gt-muted)]">รูปนี้จะใช้ทุกที่ที่ชื่อของคุณปรากฏ เช่น ผังคู่ ตารางคะแนน โปรไฟล์ และประกาศดั้งใหม่ ถ้าอัปโหลดผิด เปลี่ยนใหม่ได้ทุกเมื่อ หรือแจ้งแอดมินให้ช่วยแก้</p>
    </div>
  );
}
