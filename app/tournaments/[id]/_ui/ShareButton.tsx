"use client";

import { useState } from "react";

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* user cancelled the share sheet */ }
  };
  return (
    <button type="button" onClick={share} className="gt-pill-gold inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm font-semibold">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><path d="M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4" />
      </svg>
      {copied ? "คัดลอกลิงก์แล้ว" : "แชร์"}
    </button>
  );
}
