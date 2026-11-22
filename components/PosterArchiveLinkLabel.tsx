"use client";

import { useLinkStatus } from "next/link";

export default function PosterArchiveLinkLabel({ className }: { className: string }) {
  const { pending } = useLinkStatus();

  return (
    <span className={className} data-poster-pending={pending || undefined} aria-live="polite">
      {pending ? "กำลังเปิด…" : "ดูวอลล์ลิสต์ →"}
    </span>
  );
}
