"use client";
/* eslint-disable @next/next/no-img-element -- local previews and approved illustration */

import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SectionHeading } from "@/components/SiteDesign";
import { historyWallHref } from "@/lib/history-wall-href";

type Evidence = { id: string; file: File; url: string };
type Receipt = { id: string; token: string; status: string };
type Pending = { id: string; token: string; files: { id: string; path: string; name: string }[] };
type Context = { id: string; title: string; division: string; divisions: string[]; athletes: string[] };
const FORMATS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const statusLabels: Record<string, string> = {
  uploading: "ยังส่งภาพไม่ครบ",
  pending: "รับภาพแล้ว • รอผู้ดูแลตรวจสอบ",
  draft: "กำลังตรวจข้อมูลฉบับร่าง",
  approved: "อนุมัติผลแล้ว",
  rejected: "ผู้ดูแลไม่อนุมัติ",
};
const control = "mt-1 block min-h-12 w-full rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3";
const UUID = /^[a-f0-9-]{36}$/;

function db(token?: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: token ? { "x-gt-upload-token": token } : {} },
  });
}

export default function ResultSubmit({ context, initialAthlete }: { context: Context | null; initialAthlete: string }) {
  const [files, setFiles] = useState<Evidence[]>([]);
  const [athlete, setAthlete] = useState(initialAthlete);
  const [event, setEvent] = useState("");
  const [division, setDivision] = useState(context?.division ?? "");
  const [scope, setScope] = useState<"athlete" | "division">("athlete");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const pending = useRef<Pending | null>(null);
  const urls = useRef(new Set<string>());

  useEffect(() => {
    const activeUrls = urls.current;
    return () => activeUrls.forEach(URL.revokeObjectURL);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    const id = params.get("receipt");
    const token = params.get("key");
    if (!id || !token || !UUID.test(id) || !UUID.test(token)) return;
    void db().rpc("gt_photo_receipt_v1", { p_id: id, p_token: token }).then(({ data }) => {
      if (data) {
        setReceipt({ id, token, status: data.status });
        setStatusNote(data.admin_note ?? "");
      } else setError("ไม่พบข้อมูลรับเรื่อง หรือลิงก์ไม่ถูกต้อง");
    });
  }, []);

  function add(list: FileList | null) {
    if (!list) return;
    setError("");
    const next: Evidence[] = [];
    for (const file of Array.from(list)) {
      if (!Object.hasOwn(FORMATS, file.type)) {
        setError("รองรับภาพ JPG PNG และ WebP กรุณาแปลงภาพ HEIC ก่อนส่ง");
        continue;
      }
      if (!file.size || file.size > 10 * 1024 * 1024) {
        setError("แต่ละภาพต้องมีขนาดไม่เกิน 10 MB");
        continue;
      }
      if (files.length + next.length >= 12) {
        setError("แนบได้ครั้งละไม่เกิน 12 ภาพ");
        break;
      }
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      next.push({ id: crypto.randomUUID(), file, url });
    }
    setFiles([...files, ...next]);
  }

  function remove(file: Evidence) {
    URL.revokeObjectURL(file.url);
    urls.current.delete(file.url);
    setFiles(files.filter(row => row.id !== file.id));
    if (pending.current?.files.some(row => row.id === file.id)) pending.current = null;
  }

  async function send(form: React.FormEvent) {
    form.preventDefault();
    if (!files.length || (context && scope === "athlete" && !athlete.trim())) {
      setError(files.length ? "กรุณากรอกชื่อนักกีฬา" : "กรุณาแนบภาพอย่างน้อย 1 ภาพ");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let submission = pending.current;
      if (!submission) {
        const token = crypto.randomUUID();
        const result = context
          ? await db().rpc("gt_photo_intake_history_v1", {
              p_token: token, p_event_id: context.id, p_division: division, p_scope: scope, p_athlete: scope === "athlete" ? athlete : "", p_note: note,
            })
          : await db().rpc("gt_photo_intake_start_v1", { p_token: token, p_athlete: athlete, p_event: event, p_note: note });
        if (result.error || !result.data) throw new Error(result.error?.message);
        submission = { id: result.data, token, files: [] };
        pending.current = submission;
      }
      const client = db(submission.token);
      for (const [index, file] of files.entries()) {
        if (submission.files.some(saved => saved.id === file.id)) continue;
        setProgress(`กำลังส่งภาพ ${index + 1}/${files.length}…`);
        const extension = FORMATS[file.file.type as keyof typeof FORMATS];
        const path = `${submission.id}/${file.id}.${extension}`;
        const { error } = await client.storage.from("gt-result-intake").upload(path, file.file, { contentType: file.file.type, upsert: false });
        if (error && !["409", "Duplicate"].includes(error.statusCode ?? "")) throw error;
        submission.files.push({ id: file.id, path, name: file.file.name.slice(0, 200) });
      }
      const { id, token } = submission;
      const result = await client.rpc("gt_photo_intake_finish_v1", {
        p_id: id, p_token: token, p_files: submission.files.map(({ path, name }) => ({ path, name })),
      });
      if (result.error) {
        const check = await db().rpc("gt_photo_receipt_v1", { p_id: id, p_token: token });
        if (!check.data || check.data.status === "uploading") throw result.error;
      }
      setReceipt({ id, token, status: "pending" });
      history.replaceState(null, "", `#receipt=${id}&key=${token}`);
      try { localStorage.setItem(`gt-photo-receipt:${id}`, token); } catch {}
      pending.current = null;
    } catch (cause) {
      const message = (cause as { message?: string }).message ?? "";
      setError(message.includes("TOO_MANY")
        ? "มีการส่งจำนวนมาก กรุณารอสักครู่แล้วลองอีกครั้ง"
        : "ส่งยังไม่สำเร็จ ภาพที่เลือกยังอยู่ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  if (receipt) return (
    <section className="gt-card mx-auto max-w-2xl space-y-5 p-6 text-center">
      <img src="/design/thank-you.webp" width="240" height="220" alt="เด็กชายและเด็กหญิงชิบิไหว้ขอบคุณ" className="mx-auto h-auto w-52" />
      <h2 className="text-2xl font-bold">ขอบคุณสำหรับข้อมูลการแข่งขัน</h2>
      <p role="status" className="rounded-xl bg-blue-50 p-4">{statusLabels[receipt.status] ?? "รอตรวจสอบ"}</p>
      <p>ผู้ดูแลจะตรวจสอบหลักฐานก่อนนำข้อมูลไปเพิ่มในสถิติ</p>
      <p className="text-sm">รหัสรับข้อมูล {receipt.id}</p>
      {statusNote && <p>{statusNote}</p>}
      <p className="text-sm text-[var(--gt-muted)]">เก็บลิงก์หน้านี้ไว้เพื่อตรวจสถานะ ลิงก์มีรหัสส่วนตัวสำหรับใบรับเรื่องนี้</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button className="gt-outline-btn min-h-12 px-5" onClick={async () => {
          const result = await db().rpc("gt_photo_receipt_v1", { p_id: receipt.id, p_token: receipt.token });
          if (result.data) {
            setReceipt({ ...receipt, status: result.data.status });
            setStatusNote(result.data.admin_note ?? "");
          }
        }}>ตรวจสถานะ</button>
        <button className="gt-cta-btn min-h-12 px-5" onClick={() => {
          urls.current.forEach(URL.revokeObjectURL);
          urls.current.clear();
          setReceipt(null);
          setFiles([]);
          setStatusNote("");
          setNote(`ส่งภาพเพิ่มเติมจากรหัส ${receipt.id}`);
          history.replaceState(null, "", location.pathname + location.search);
        }}>ส่งภาพเพิ่มเติม</button>
      </div>
    </section>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <form onSubmit={send} className="gt-card space-y-5 p-5">
        <SectionHeading icon="upload">แนบภาพผลการแข่งขัน</SectionHeading>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          {context && (
            <div className="space-y-3 rounded-xl border border-[var(--gt-line)] p-3">
              <p className="break-words font-semibold">{context.title}</p>
              <label className="block text-sm font-semibold">รุ่นแข่งขัน
                <select className={control} value={division} onChange={e => {
                  pending.current = null;
                  setDivision(e.target.value);
                  setAthlete("");
                }}>{context.divisions.map(name => <option key={name}>{name}</option>)}</select>
              </label>
              <fieldset className="space-y-1">
                <legend className="font-semibold">ข้อมูลที่ต้องการส่ง</legend>
                {([["athlete", "ข้อมูลนักกีฬารายบุคคล"], ["division", "ผลของทั้งรุ่น"]] as const).map(([value, label]) => (
                  <label key={value} className="flex min-h-10 items-center gap-2">
                    <input type="radio" name="scope" checked={scope === value} onChange={() => { pending.current = null; setScope(value); }} />
                    {label}
                  </label>
                ))}
              </fieldset>
            </div>
          )}
          {(!context || scope === "athlete") && (
            <label className="block text-sm font-semibold">
              {context ? "ชื่อนักกีฬา" : "ชื่อนักกีฬา (ไม่บังคับ)"}
              <input className={control} maxLength={160} value={athlete} required={Boolean(context)}
                list={context?.division === division ? "known-athletes" : undefined}
                onChange={e => { pending.current = null; setAthlete(e.target.value); }} />
              {context?.division === division && <datalist id="known-athletes">{[...new Set(context.athletes)].map(name => <option key={name} value={name} />)}</datalist>}
              {context && <span className="mt-1 block font-normal text-[var(--gt-muted)]">พิมพ์ชื่อเต็มได้หากชื่อตกหล่นในวอลล์ลิสต์</span>}
            </label>
          )}
          {!context && <label className="block text-sm font-semibold">รายการ / รุ่นแข่งขัน (ถ้าทราบ)
            <input className={control} maxLength={200} value={event} onChange={e => { pending.current = null; setEvent(e.target.value); }} />
          </label>}
          <div className="space-y-3 rounded-xl border-2 border-dashed border-blue-400 bg-[var(--gt-surface-2)] p-4 text-center">
            <p>ถ่ายรูปหรือแคปหน้าจอตารางผล อันดับ หรือใบประกาศ</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => camera.current?.click()} className="gt-cta-btn min-h-12 px-4">ถ่ายรูป</button>
              <button type="button" onClick={() => picker.current?.click()} className="gt-outline-btn min-h-12 px-4">เลือกรูปจากเครื่อง</button>
            </div>
            <p className="text-xs text-[var(--gt-muted)]">สูงสุด 12 ภาพ ภาพละ 10 MB • JPG / PNG / WebP</p>
          </div>
          <input ref={camera} className="hidden" type="file" accept={Object.keys(FORMATS).join(",")} capture="environment" onChange={e => { add(e.target.files); e.target.value = ""; }} />
          <input ref={picker} className="hidden" type="file" accept={Object.keys(FORMATS).join(",")} multiple onChange={e => { add(e.target.files); e.target.value = ""; }} />
          {files.length > 0 && <div className="grid grid-cols-3 gap-3">{files.map(file => (
            <div className="relative" key={file.id}>
              <img src={file.url} alt={file.file.name} className="h-28 w-full rounded-xl border object-contain" />
              <button type="button" aria-label={`ลบภาพ ${file.file.name}`} className="absolute right-0 top-0 min-h-9 min-w-9 rounded-full bg-red-700 text-white" onClick={() => remove(file)}>×</button>
            </div>
          ))}</div>}
          <label className="block text-sm font-semibold">ข้อความเพิ่มเติม (ไม่บังคับ)
            <textarea className={`${control} py-2`} maxLength={1400} rows={3} value={note} onChange={e => { pending.current = null; setNote(e.target.value); }} />
          </label>
        </fieldset>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={busy || !files.length} className="gt-cta-btn min-h-14 w-full text-xl disabled:opacity-50">{busy ? progress || "กำลังส่ง…" : "ส่งข้อมูล"}</button>
      </form>
      <aside className="space-y-4">
        <section className="gt-card p-5">
          <SectionHeading icon="documents">หลังส่งข้อมูล</SectionHeading>
          <p>เก็บลิงก์ใบรับเรื่องไว้ตรวจสถานะ ภาพจะเก็บเป็นส่วนตัว ผู้ดูแลจะตรวจสอบและอนุมัติก่อนเพิ่มเข้าสถิติค่ะ</p>
        </section>
        {context && <Link href={historyWallHref(context.id, division)} className="inline-flex min-h-11 items-center underline underline-offset-4">← กลับไปดูวอลล์ลิสต์</Link>}
      </aside>
    </div>
  );
}
