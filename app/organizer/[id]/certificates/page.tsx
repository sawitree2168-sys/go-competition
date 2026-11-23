"use client";
/* eslint-disable @next/next/no-img-element -- certificate previews are canvas images */

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import Gate from "../../_lib/Gate";
import { ErrorNote, staffDb, useAction, useStaff } from "../../_lib/staff";
import { thaiDate } from "@/lib/division-display";
import { DEFAULT_TEMPLATE, drawCertificate, type Cert, type Template } from "@/app/athletes/[id]/certificate-draw";

type Signer = { name: string; title: string };
type Event = {
  title: string; event_date: string | null; venue: string | null; certificates_open: boolean;
  certificate_signers: Signer[] | null; certificate_template: Template | null;
};

const SAMPLES = [
  { key: "1", label: "ชนะเลิศ", kind: "placement", pos: 1 },
  { key: "2", label: "รองฯ 1", kind: "placement", pos: 2 },
  { key: "3", label: "รองฯ 2", kind: "placement", pos: 3 },
  { key: "p", label: "เข้าร่วม", kind: "participation", pos: null },
] as const;
const COLORS = ["#0b2a5b", "#111111", "#7a4f00", "#9b1c1c", "#ffffff"];

export default function CertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Gate><Certificates id={id} /></Gate>;
}

function Certificates({ id }: { id: string }) {
  const staff = useStaff();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [pending, setPending] = useState(0);

  const load = useCallback(async () => {
    const db = staffDb()!;
    const [ev, dv, mt] = await Promise.all([
      db.from("gt_tournaments").select("title,event_date,venue,certificates_open,certificate_signers,certificate_template").eq("id", id).maybeSingle(),
      db.from("gt_divisions").select("name").eq("tournament_id", id),
      db.from("gt_matches").select("id", { count: "exact", head: true }).eq("tournament_id", id).neq("state", "void").neq("state", "verified"),
    ]);
    setEvent((ev.data as Event | null) ?? null);
    setDivisions(((dv.data ?? []) as { name: string }[]).map((d) => d.name));
    setPending(mt.count ?? 0);
  }, [id]);
  useEffect(() => { if (staff.status === "staff") queueMicrotask(load); }, [staff.status, load]);

  if (event === undefined) return <p className="py-10 text-center text-[var(--gt-muted)]">กำลังโหลด…</p>;
  if (!event) return <p className="py-10 text-center">ไม่พบรายการนี้ หรือไม่มีสิทธิ์จัดการ</p>;
  return (
    <div className="space-y-5">
      <div>
        <Link href={`/organizer/${id}`} className="text-sm text-[var(--gt-muted)] underline-offset-2 hover:underline">← กลับหน้ารายการ</Link>
        <h1 className="mt-1 text-xl font-bold">📜 ใบประกาศ · {event.title}</h1>
        <p className="text-sm text-[var(--gt-muted)]">{thaiDate(event.event_date)}</p>
      </div>
      <section className="space-y-3 rounded-2xl border-2 border-[var(--gt-gold)] bg-[var(--gt-surface)] p-4">
        <h2 className="text-lg font-bold">1. รูปใบประกาศของงานนี้</h2>
        <TemplateEditor id={id} event={event} division={divisions[0] ?? "รุ่นทั่วไป"} onSaved={load} />
      </section>
      <section className="space-y-3 rounded-2xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-4">
        <h2 className="text-lg font-bold">2. เปิดให้นักกีฬาดาวน์โหลด</h2>
        <OpenSettings id={id} open={event.certificates_open} signers={event.certificate_signers ?? []} hasTemplate={Boolean(event.certificate_template)} pending={pending} onSaved={load} />
      </section>
    </div>
  );
}

function TemplateEditor({ id, event, division, onSaved }: { id: string; event: Event; division: string; onSaved: () => void }) {
  const saved = event.certificate_template;
  const [t, setT] = useState<Template | null>(saved);
  const [sample, setSample] = useState<(typeof SAMPLES)[number]>(SAMPLES[0]);
  const [src, setSrc] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const action = useAction();
  const fileRef = useRef<HTMLInputElement>(null);
  const changed = JSON.stringify(t) !== JSON.stringify(saved);

  // live preview
  useEffect(() => {
    if (!t) { queueMicrotask(() => setSrc("")); return; }
    let live = true;
    const c: Cert = {
      tournament_id: id, title: event.title, event_date: event.event_date, venue: event.venue, organizer: null, division_id: "", division,
      open: true, kind: sample.kind, pos: sample.pos, medal: null, number: "GT-1A2B3C4D", signers: [], template: t,
    };
    const cv = document.createElement("canvas");
    const timer = setTimeout(() => drawCertificate(cv, c, "ชื่อ นามสกุล ตัวอย่าง", "", 0.5).then(() => { if (live) setSrc(cv.toDataURL("image/jpeg", 0.85)); }), 120);
    return () => { live = false; clearTimeout(timer); };
  }, [t, sample, id, event.title, event.event_date, event.venue, division]);

  const set = <K extends keyof Template>(k: K, v: Template[K]) => { setNote(""); setT((x) => (x ? { ...x, [k]: v } : x)); };

  const upload = async (f: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 8 * 1024 * 1024) return action.setError("รูปต้องเป็น JPG / PNG / WEBP ไม่เกิน 8 MB");
    const db = staffDb()!;
    setUploading(true); action.setError(""); setNote("");
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `certificate-bg/${id}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from("gt-site-assets").upload(path, f, { contentType: f.type, upsert: false });
    setUploading(false);
    if (up.error) return action.setError("อัปโหลดรูปไม่สำเร็จ");
    const bg = db.storage.from("gt-site-assets").getPublicUrl(path).data.publicUrl;
    setT((x) => ({ ...DEFAULT_TEMPLATE, ...(x ?? {}), bg }));
  };

  const save = async (next: Template | null) => {
    setNote("");
    const res = await action.run<{ ok: boolean; error?: string }>(() => staffDb()!.rpc("gt_staff_set_certificate_template_v1", { p_tournament: id, p_template: next }));
    if (!res) return;
    if (!res.data?.ok) return action.setError("บันทึกไม่สำเร็จ (รูปต้องอัปโหลดจากหน้านี้)");
    if (!next) setT(null);
    setNote(next ? "บันทึกแล้ว · ใบประกาศของงานนี้ใช้รูปนี้" : "กลับไปใช้แบบมาตรฐานของเว็บแล้ว");
    onSaved();
  };

  const range = "mt-1 block h-8 w-full accent-[var(--gt-cta)]";
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--gt-muted)]">อัปโหลดรูปใบประกาศที่ออกแบบไว้ (เว้นที่ว่างสำหรับชื่อ) ระบบจะเขียน <b>ชื่อนักกีฬา</b> และ <b>รางวัล</b> ให้เองจากผลแข่ง: อันดับ 1–3 = “ได้รับรางวัล ชนะเลิศ / รองชนะเลิศอันดับ 1 / 2” · คนอื่น = “เข้าร่วมการแข่งขัน”</p>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="gt-cta-btn min-h-12 w-full px-5 disabled:opacity-60 sm:w-auto">
        {uploading ? "กำลังอัปโหลด…" : t ? "เปลี่ยนรูปใบประกาศ" : "＋ อัปโหลดรูปใบประกาศ"}
      </button>

      {t && (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="ดูตัวอย่าง">
            {SAMPLES.map((s) => (
              <button key={s.key} type="button" aria-pressed={sample.key === s.key} onClick={() => setSample(s)}
                className={`min-h-10 rounded-full border px-3 text-sm ${sample.key === s.key ? "border-[var(--gt-cta)] bg-[var(--gt-cta)] text-white" : "border-[var(--gt-line)]"}`}>{s.label}</button>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--gt-line)] bg-white">
            {src ? <img src={src} alt="ตัวอย่างใบประกาศ" className="block h-auto w-full" /> : <p className="grid aspect-[2000/1414] place-items-center text-sm text-[#5a6e8f]">กำลังสร้างตัวอย่าง…</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">ตำแหน่งชื่อ (สูง–ต่ำ)<input type="range" min={5} max={95} step={0.5} value={t.name_y * 100} onChange={(e) => set("name_y", +e.target.value / 100)} className={range} /></label>
            <label className="text-sm">ตำแหน่งรางวัล (สูง–ต่ำ)<input type="range" min={5} max={97} step={0.5} value={t.award_y * 100} onChange={(e) => set("award_y", +e.target.value / 100)} className={range} /></label>
            <label className="text-sm">ขนาดตัวอักษร<input type="range" min={40} max={200} step={2} value={t.size} onChange={(e) => set("size", +e.target.value)} className={range} /></label>
            <div className="text-sm">สีตัวอักษร
              <div className="mt-1 flex items-center gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`สี ${c}`} aria-pressed={t.color === c} onClick={() => set("color", c)}
                    className={`h-9 w-9 rounded-full border-2 ${t.color === c ? "border-[var(--gt-cta)] ring-2 ring-[var(--gt-cta)]/40" : "border-[var(--gt-line)]"}`} style={{ background: c }} />
                ))}
                <input type="color" value={t.color} onChange={(e) => set("color", e.target.value)} aria-label="เลือกสีเอง" className="h-9 w-12 rounded border border-[var(--gt-line)]" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={t.division} onChange={(e) => set("division", e.target.checked)} className="h-5 w-5" />แสดงชื่อรุ่นใต้รางวัล</label>
            <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={t.number} onChange={(e) => set("number", e.target.checked)} className="h-5 w-5" />แสดงเลขที่ใบประกาศ (มุมล่างซ้าย)</label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => save(t)} disabled={action.busy || !changed} className="gt-gold-btn min-h-12 px-6 disabled:opacity-50">{changed ? "บันทึกรูปและตำแหน่ง" : "บันทึกแล้ว"}</button>
            {saved && <button type="button" onClick={() => { if (window.confirm("เลิกใช้รูปนี้ แล้วกลับไปใช้แบบมาตรฐานของเว็บ?")) save(null); }} disabled={action.busy} className="gt-outline-btn min-h-12 px-4 disabled:opacity-50">ใช้แบบมาตรฐานของเว็บ</button>}
            {!saved && changed && <button type="button" onClick={() => setT(null)} className="min-h-12 px-3 text-sm text-[var(--gt-muted)] underline">ยกเลิก</button>}
          </div>
        </>
      )}
      {note && <p role="status" className="text-sm text-[var(--gt-ok)]">{note}</p>}
      <ErrorNote text={action.error} />
    </div>
  );
}

function OpenSettings({ id, open, signers, hasTemplate, pending, onSaved }: { id: string; open: boolean; signers: Signer[]; hasTemplate: boolean; pending: number; onSaved: () => void }) {
  const [list, setList] = useState<Signer[]>([0, 1].map((i) => signers[i] ?? { name: "", title: i === 0 ? "ประธานจัดการแข่งขัน" : "" }));
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const edit = (i: number, k: keyof Signer, v: string) => { setSaved(false); setList((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x))); };
  const save = async (next: boolean) => {
    setSaved(false);
    const res = await action.run(() => staffDb()!.rpc("gt_staff_set_certificates_v1", { p_tournament: id, p_open: next, p_signers: list }));
    if (res) { setSaved(true); onSaved(); }
  };
  const field = "block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 font-normal";
  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        สถานะ: {open ? <span className="rounded-full bg-[var(--gt-win-bg)] px-3 py-0.5 font-semibold text-[var(--gt-win-ink)]">เปิดให้ดาวน์โหลดแล้ว</span>
          : <span className="rounded-full bg-[var(--gt-surface-2)] px-3 py-0.5 text-[var(--gt-muted)]">ยังไม่เปิด (นักกีฬาเห็น “รอออกใบประกาศ”)</span>}
      </p>
      <p className="text-sm text-[var(--gt-muted)]">นักกีฬาดาวน์โหลด PDF / PNG ได้ที่หน้าโปรไฟล์ของตัวเอง · อันดับคิดจากผลขณะดาวน์โหลด</p>
      {!hasTemplate && (
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold">ผู้ลงนาม (ใช้กับแบบมาตรฐานของเว็บเท่านั้น · ไม่บังคับ)</legend>
          {list.map((x, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border border-[var(--gt-line)] p-3">
              <label className="block text-sm">ชื่อผู้ลงนาม {i + 1}<input value={x.name} onChange={(e) => edit(i, "name", e.target.value)} maxLength={80} placeholder="เช่น นายสมชาย ใจดี" className={`${field} mt-1`} /></label>
              <label className="block text-sm">ตำแหน่ง<input value={x.title} onChange={(e) => edit(i, "title", e.target.value)} maxLength={80} placeholder="เช่น ผู้อำนวยการแข่งขัน" className={`${field} mt-1`} /></label>
            </div>
          ))}
        </fieldset>
      )}
      {!open && pending > 0 && <p className="rounded-xl bg-[var(--gt-warn-soft)] px-4 py-2 text-sm text-[var(--gt-warn)]">ยังมีโต๊ะรอผล {pending} โต๊ะ ควรเปิดเมื่อลงผลครบทุกรุ่นแล้ว</p>}
      <div className="flex flex-wrap items-center gap-2">
        {open ? (
          <>
            {!hasTemplate && <button type="button" onClick={() => save(true)} disabled={action.busy} className="gt-gold-btn min-h-12 px-5 disabled:opacity-60">บันทึกผู้ลงนาม</button>}
            <button type="button" onClick={() => save(false)} disabled={action.busy} className="min-h-12 rounded-xl border border-[var(--gt-bad)] px-4 text-[var(--gt-bad)] disabled:opacity-60">ปิดการดาวน์โหลด</button>
          </>
        ) : (
          <button type="button" onClick={() => save(true)} disabled={action.busy} className="gt-gold-btn min-h-12 px-5 disabled:opacity-60">เปิดให้ดาวน์โหลดใบประกาศ</button>
        )}
        {saved && <span className="text-sm text-[var(--gt-ok)]">บันทึกแล้ว · หน้าโปรไฟล์อัปเดตภายใน 30 วินาที</span>}
      </div>
      <ErrorNote text={action.error} />
    </div>
  );
}
