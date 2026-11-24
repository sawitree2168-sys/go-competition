"use client";

import { useState } from "react";

/** Share this page's link (LINE, Facebook…) or copy it. */
export default function ShareLink({ title }: { title: string }) {
  const [note, setNote] = useState("");
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setNote("คัดลอกลิงก์แล้ว"); }
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setNote("แชร์ไม่สำเร็จ"); }
  }
  return <div className="space-y-1"><button type="button" onClick={() => void share()} className="gt-cta-btn min-h-12 w-full px-5 sm:w-auto">แชร์หน้าสถาบันนี้ ↗</button>{note && <p role="status" className="text-sm text-[var(--gt-muted)]">{note}</p>}</div>;
}
