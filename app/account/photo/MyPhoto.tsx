"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import PhotoEditor from "@/components/PhotoEditor";
import AthleteProfileHelp from "@/components/AthleteProfileHelp";
import MyKyuLevel from "./MyKyuLevel";

type Mine = { athlete_id: string; go_id: string; full_name: string; rank: string | null; photo: string | null };

/** Signed-in athlete (or parent) changes the photo of the athlete linked to this account. */
export default function MyPhoto() {
  const [me, setMe] = useState<Mine | null | "out" | "none" | "error">(null);

  useEffect(() => {
    const db = staffDb();
    if (!db) { queueMicrotask(() => setMe("out")); return; }
    db.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setMe("out"); return; }
      const { data: mine, error } = await db.rpc("gt_my_photo_v1");
      setMe(error ? "error" : mine ? (mine as Mine) : "none");
    });
  }, []);

  if (me === null) return <p className="py-16 text-center text-[var(--gt-muted)]" role="status">กำลังโหลด…</p>;
  if (me === "out") {
    return (
      <div className="gt-card space-y-4 p-6 text-center">
        <h1 className="text-2xl font-bold">เข้าสู่ระบบเพื่อแก้รูปและระดับฝีมือ</h1>
        <p className="text-[var(--gt-muted)]">ใช้รหัส GO เลขดั้ง หรือชื่อ-นามสกุล พร้อมรหัสผ่าน</p>
        <Link href="/login?next=/account/photo" className="gt-cta-btn flex min-h-12 items-center justify-center">เข้าสู่ระบบ</Link>
      </div>
    );
  }
  if (me === "none") {
    return <AthleteProfileHelp signedIn photo />;
  }
  if (me === "error") return <div className="gt-card space-y-3 p-4" role="alert">
    <h1 className="text-xl font-bold">โหลดข้อมูลนักกีฬาไม่สำเร็จ</h1>
    <p>กรุณาลองโหลดหน้าใหม่อีกครั้งค่ะ</p>
    <button type="button" onClick={() => window.location.reload()} className="gt-outline-btn min-h-11 px-4">โหลดหน้าใหม่</button>
  </div>;
  return (
    <div className="space-y-3 sm:space-y-4">
      <Link href="/account" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--gt-brand)]">← โปรไฟล์ของฉัน</Link>
      <section className="gt-card border-t-4 border-t-[var(--gt-cta)] p-3 sm:p-5">
        <h1 className="mb-3 text-xl font-bold sm:text-2xl">รูปโปรไฟล์นักกีฬา</h1>
        <PhotoEditor mode="self" goId={me.go_id} athleteId={me.athlete_id} name={me.full_name} photo={me.photo}
          onSaved={(url) => setMe({ ...me, photo: url })} />
      </section>
      <MyKyuLevel />
      <p className="text-sm text-[var(--gt-muted)]">รูปหลักจะปรากฏในโปรไฟล์และทำเนียบนักกีฬา หากต้องการใช้รูปที่เก็บไว้ ให้กด “ตั้งเป็นรูปหลัก” ที่รูปนั้น · <Link href="/account/photo/guide" className="font-semibold text-[var(--gt-brand)] underline">ดูวิธีเปลี่ยนรูปทีละขั้น</Link></p>
    </div>
  );
}
