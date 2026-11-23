"use client";
/* eslint-disable @next/next/no-img-element -- certificate previews are canvas images */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { awardOf } from "@/lib/certificate.mjs";
import { divisionLabel, thaiDate } from "@/lib/division-display";
import { thaiYear } from "@/lib/event-list.mjs";
import { drawCertificate, downloadCertificate, type Cert } from "./certificate-draw";

const keyOf = (c: Cert) => `${c.tournament_id}|${c.division_id}`;
const CHIP: Record<string, string> = {
  gold: "bg-[#fff1c7] text-[#7a4f00] border-[#f0bf55]", silver: "bg-[#eef1f5] text-[#4a5566] border-[#b9c2cf]",
  bronze: "bg-[#fbe7d6] text-[#6b3a12] border-[#cd8a52]", blue: "bg-[var(--gt-cta-soft)] text-[var(--gt-cta)] border-[var(--gt-cta)]/30",
};

const DocIcon = ({ className = "h-12 w-12" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className={`${className} shrink-0 text-[var(--gt-cta)]`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round">
    <path d="M10 5h20l8 8v13" /><path d="M30 5v8h8" /><path d="M10 5v38h16" /><path d="M16 18h16M16 25h14M16 32h8" strokeLinecap="round" />
    <circle cx="35" cy="34" r="6" /><path d="m31.5 39-1.5 6 5-2.5 5 2.5-1.5-6" />
  </svg>
);
const Trophy = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor"><path d="M7 3h10v2h3v2a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 13.9V17h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 11H8a4 4 0 0 1-4-4V5h3Zm-1 4a2 2 0 0 0 1 1.7V7Zm12 0v1.7A2 2 0 0 0 19 7Z" /></svg>;
const Eye = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>;
const Down = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14" /></svg>;
const Check = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor"><circle cx="12" cy="12" r="10" /><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>;

function Status({ ready }: { ready: boolean }) {
  return ready
    ? <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gt-ok)]/40 bg-[var(--gt-win-bg)] px-3 py-0.5 text-sm font-semibold text-[var(--gt-win-ink)]"><Check />พร้อมดาวน์โหลด</span>
    : <span className="inline-flex items-center rounded-full bg-[var(--gt-surface-2)] px-3 py-0.5 text-sm text-[var(--gt-muted)]">ไม่มีไฟล์ให้ดาวน์โหลด</span>;
}

/** Certificates tab of the athlete profile. */
export default function Certificates({ certs, name, athleteId }: { certs: Cert[]; name: string; athleteId: string }) {
  const years = useMemo(() => [...new Set(certs.map((c) => thaiYear(c.event_date)).filter((y): y is number => y !== null))].sort((a, b) => b - a), [certs]);
  const [year, setYear] = useState("all");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Cert | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const list = certs.filter((c) => year === "all" || String(thaiYear(c.event_date)) === year);
  const verify = typeof window === "undefined" ? "" : `${window.location.origin}/athletes/${athleteId}`;
  const featured = list.find((c) => awardOf(c).ready) ?? null;
  const rest = list.filter((c) => c !== featured);

  // Small previews for certificates that are ready.
  useEffect(() => {
    let live = true;
    (async () => {
      for (const c of certs.filter((x) => awardOf(x).ready)) {
        const cv = document.createElement("canvas");
        await drawCertificate(cv, c, name, `${window.location.origin}/athletes/${athleteId}`, 0.4);
        if (!live) return;
        const url = cv.toDataURL("image/jpeg", 0.85);
        setThumbs((t) => ({ ...t, [keyOf(c)]: url }));
      }
    })();
    return () => { live = false; };
  }, [certs, name, athleteId]);

  const download = async (c: Cert, kind: "pdf" | "png") => {
    setBusy(`${keyOf(c)}|${kind}`); setErr("");
    try { await downloadCertificate(c, name, verify, kind); } catch { setErr("สร้างไฟล์ไม่สำเร็จ กรุณาลองใหม่"); }
    setBusy("");
  };

  const buttons = (c: Cert, size: "lg" | "sm") => {
    const h = size === "lg" ? "min-h-12 whitespace-nowrap px-3 text-[15px] sm:px-5 sm:text-base" : "min-h-10 whitespace-nowrap px-2 text-sm sm:px-3";
    return (
      <div className={`grid gap-2 ${size === "lg" ? "sm:flex sm:flex-wrap" : "grid-cols-[1fr_1fr_1fr] sm:flex"}`}>
        <button type="button" onClick={() => setPreview(c)} className={`gt-cta-btn inline-flex items-center justify-center gap-2 ${h}`}><Eye />ดูตัวอย่าง</button>
        <div className={`grid grid-cols-2 gap-2 ${size === "lg" ? "sm:contents" : "col-span-2 sm:contents"}`}>
          {(["pdf", "png"] as const).map((k) => (
            <button key={k} type="button" onClick={() => download(c, k)} disabled={Boolean(busy)}
              className={`gt-outline-btn inline-flex items-center justify-center gap-1.5 font-medium disabled:opacity-60 ${h}`}>
              <Down />{busy === `${keyOf(c)}|${k}` ? "กำลังสร้าง…" : `ดาวน์โหลด ${k.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="gt-card relative overflow-hidden p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <DocIcon className="h-11 w-11 sm:h-14 sm:w-14" />
        <div className="mr-auto min-w-0">
          <h2 className="text-2xl font-bold sm:text-3xl">ใบประกาศนียบัตร</h2>
          <p className="text-sm text-[var(--gt-muted)] sm:text-base">ดาวน์โหลดใบประกาศจากรายการที่เข้าร่วม</p>
        </div>
        <label className="w-full sm:w-40">
          <span className="sr-only">ปี</span>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 font-semibold">
            <option value="all">ทุกปี</option>
            {years.map((y) => <option key={y} value={String(y)}>ปี {y}</option>)}
          </select>
        </label>
      </div>

      {!list.length && <p className="mt-5 rounded-xl bg-[var(--gt-surface-2)] px-4 py-8 text-center text-[var(--gt-muted)]">ยังไม่มีรายการแข่งขัน{year !== "all" ? "ในปีนี้" : ""}</p>}

      {featured && (() => {
        const a = awardOf(featured);
        return (
          <article className="mt-5 grid gap-4 rounded-2xl border border-[var(--gt-line)] p-3 sm:p-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-center lg:gap-7">
            <button type="button" onClick={() => setPreview(featured)} aria-label={`ดูตัวอย่างใบประกาศ ${featured.title}`}
              className="overflow-hidden rounded-lg border border-[var(--gt-line)] bg-white shadow-sm">
              {thumbs[keyOf(featured)] ? <img src={thumbs[keyOf(featured)]} alt="" className="block aspect-[2000/1414] w-full bg-white object-contain" />
                : <span className="grid aspect-[2000/1414] w-full place-items-center text-sm text-[#5a6e8f]">กำลังสร้างตัวอย่าง…</span>}
            </button>
            <div className="min-w-0">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 sm:text-lg">
                <dt className="font-medium">รายการแข่งขัน</dt><dd>{featured.title}</dd>
                <dt className="font-medium">วันที่</dt><dd>{thaiDate(featured.event_date) ?? "—"}</dd>
                <dt className="font-medium">รุ่นแข่งขัน</dt><dd>{divisionLabel(featured.division)}</dd>
                <dt className="font-medium">ประเภทใบประกาศ</dt>
                <dd className="flex flex-wrap items-center gap-2"><span className={a.award ? "hidden sm:inline" : ""}>{a.type}</span>{a.award && <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-sm font-semibold ${CHIP[a.tone]}`}><Trophy />{a.award}</span>}</dd>
                <dt className="font-medium">สถานะ</dt><dd><Status ready /></dd>
              </dl>
              <div className="mt-4 border-t border-[var(--gt-line)] pt-4">{buttons(featured, "lg")}</div>
            </div>
          </article>
        );
      })()}

      {rest.length > 0 && (
        <ul className="mt-4 space-y-3">
          {rest.map((c) => {
            const a = awardOf(c);
            return (
              <li key={keyOf(c)} className="grid gap-3 rounded-2xl border border-[var(--gt-line)] p-3 sm:p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <DocIcon className="hidden h-10 w-10 sm:block" />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-snug">{c.title}</p>
                    <p className="text-sm text-[var(--gt-muted)]">{[thaiDate(c.event_date), divisionLabel(c.division)].filter(Boolean).join("  |  ")}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm lg:border-l lg:border-[var(--gt-line)] lg:pl-4">
                  <dt>ประเภทใบประกาศ :</dt>
                  <dd className="flex flex-wrap items-center gap-1.5">{a.type}{a.award && <span className={`rounded-full border px-2 text-xs font-semibold ${CHIP[a.tone]}`}>{a.award}</span>}</dd>
                  <dt>สถานะ :</dt><dd><Status ready={a.ready} /></dd>
                </dl>
                {a.ready ? buttons(c, "sm")
                  : <span aria-disabled="true" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--gt-surface-2)] px-4 text-sm text-[var(--gt-muted)]">รอผู้จัดเปิดให้ดาวน์โหลด</span>}
              </li>
            );
          })}
        </ul>
      )}

      {err && <p role="alert" className="mt-3 text-sm text-[var(--gt-bad)]">{err}</p>}
      <div className="relative mt-5 flex min-h-20 items-start pr-28 sm:pr-72">
        <p className="text-sm text-[var(--gt-muted)]">ⓘ ดาวน์โหลดได้เมื่อผู้จัดเปิดให้ใช้งาน · ใบประกาศสร้างจากผลการแข่งขันที่บันทึกในระบบ</p>
        <picture>
          <source srcSet="/institution-deco.webp" type="image/webp" />
          <img src="/institution-deco.png" alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-6 w-36 select-none sm:w-80" />
        </picture>
      </div>

      {preview && <Preview c={preview} name={name} verify={verify} onClose={() => setPreview(null)} onDownload={download} busy={busy} />}
    </section>
  );
}

function Preview({ c, name, verify, onClose, onDownload, busy }: { c: Cert; name: string; verify: string; onClose: () => void; onDownload: (c: Cert, k: "pdf" | "png") => void; busy: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const cv = document.createElement("canvas");
    drawCertificate(cv, c, name, verify, 0.8).then(() => setSrc(cv.toDataURL("image/jpeg", 0.9)));
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [c, name, verify, onClose]);
  const target = (document.querySelector(".gt") as HTMLElement | null) ?? document.body;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`ใบประกาศ ${c.title}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div className="w-full max-w-5xl space-y-3 rounded-2xl bg-[var(--gt-surface)] p-3 shadow-2xl sm:p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <p className="mr-auto min-w-0 truncate font-semibold">{c.title} · {divisionLabel(c.division)}</p>
          <button type="button" onClick={onClose} aria-label="ปิด" className="grid h-11 w-11 place-items-center rounded-full border border-[var(--gt-line)] text-xl">×</button>
        </div>
        <div className="overflow-hidden rounded-lg border border-[var(--gt-line)] bg-white">
          {src ? <img src={src} alt={`ใบประกาศนียบัตรของ ${name}`} className="block aspect-[2000/1414] w-full bg-white object-contain" /> : <p className="grid aspect-[2000/1414] place-items-center text-[#5a6e8f]">กำลังสร้าง…</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          {(["pdf", "png"] as const).map((k) => (
            <button key={k} type="button" onClick={() => onDownload(c, k)} disabled={Boolean(busy)} className="gt-cta-btn inline-flex min-h-12 items-center justify-center gap-2 px-5 disabled:opacity-60">
              <Down />{busy.endsWith(`|${k}`) ? "กำลังสร้าง…" : `ดาวน์โหลด ${k.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>
    </div>, target);
}
