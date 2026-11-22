"use client";

import { useEffect, useState } from "react";
import TournamentPoster from "@/components/TournamentPoster";
import { SectionHeading } from "@/components/SiteDesign";
import { eventPoster } from "@/lib/event-organizers";
import { thaiDate } from "@/lib/division-display";
import { loadPosterSettings } from "@/lib/poster-settings";
import { POSTER_STYLES, resolvePoster, tournamentPosterKey, type PosterChoice, type PosterSetting } from "@/lib/tournament-posters";
import { staffDb } from "../_lib/staff";

type Item = { key: string; title: string; date: string | null; year: number | null; original: string | null; history: boolean };
type HistoryRow = { id: string; title: string; event_date: string | null; event_year: number };
type TournamentRow = { id: string; title: string; event_date: string | null; poster_url: string | null };
const ACCEPTED = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const FIELD = "min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3";

function randomStyle(current = 0) {
  const style = Math.floor(Math.random() * (POSTER_STYLES.length - Number(current > 0))) + 1;
  return current > 0 && style >= current ? style + 1 : style;
}

export default function PosterAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState(new Map<string, PosterSetting>());
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const db = staffDb();
    if (!db) return;
    async function load() {
      if (!db) return;
      try {
        const [history, tournaments, choices] = await Promise.all([
          db.rpc("gt_history_event_list_v1"),
          db.from("gt_tournaments").select("id,title,event_date,poster_url").order("event_date", { ascending: false }),
          loadPosterSettings(db),
        ]);
        if (!active) return;
        if (history.error || tournaments.error) throw new Error("Could not load events");
        setItems([
          ...((history.data ?? []) as HistoryRow[]).map(event => ({
            key: event.id, title: event.title, date: event.event_date, year: event.event_year + 543, original: eventPoster(event.title), history: true,
          })),
          ...((tournaments.data ?? []) as TournamentRow[]).map(event => ({
            key: tournamentPosterKey(event.id), title: event.title, date: event.event_date,
            year: event.event_date ? Number(event.event_date.slice(0, 4)) + 543 : null,
            original: event.poster_url ?? eventPoster(event.title), history: false,
          })),
        ]);
        setSettings(choices);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function choice(item: Item) {
    return resolvePoster(settings.get(item.key), item.original);
  }
  const pending = items.filter(item => choice(item).mode === "pending");
  const visible = filter ? pending : items;
  const item = visible.find(event => event.key === selected);
  return (
    <section id="poster-admin" className="gt-card scroll-mt-24 space-y-4 p-5">
      <SectionHeading icon="gallery">จัดการโปสเตอร์การแข่งขัน</SectionHeading>
      {loading && <p role="status">กำลังโหลดรายการ…</p>}
      {loadError && <p role="alert">โหลดรายการไม่ได้ กรุณาเปิดหน้านี้ใหม่</p>}
      {!loading && !loadError && (
        <>
          <label className="flex min-h-11 w-fit items-center gap-2">
            <input type="checkbox" checked={filter} onChange={e => { setFilter(e.target.checked); setSelected(""); }} />
            เฉพาะรายการที่รอเลือกภาพ ({pending.length})
          </label>
          <label className="block space-y-1">
            <span className="font-semibold">เลือกรายการแข่งขัน</span>
            <select className={FIELD} value={selected} onChange={e => setSelected(e.target.value)}>
              <option value="">เลือกรายการ</option>
              {[true, false].map(history => (
                <optgroup key={String(history)} label={history ? "รายการย้อนหลัง (วอลล์ลิสต์)" : "รายการในระบบแข่งขัน"}>
                  {visible.filter(event => event.history === history).map(event => (
                    <option key={event.key} value={event.key}>{event.title}{event.date ? ` · ${thaiDate(event.date, "short")}` : ""}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {item && <PosterEditor key={item.key} item={item} initial={choice(item)} onSave={setting => {
            setSettings(previous => new Map(previous).set(item.key, setting));
            setFilter(false);
          }} />}
        </>
      )}
    </section>
  );
}

function PosterEditor({ item, initial, onSave }: { item: Item; initial: PosterChoice; onSave: (setting: PosterSetting) => void }) {
  const [mode, setMode] = useState(initial.mode);
  const [style, setStyle] = useState(initial.mode === "stock" ? initial.style : 0);
  const [original, setOriginal] = useState(initial.mode === "original" ? initial.url : item.original ?? "");
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [lastUpload, setLastUpload] = useState<{ file: File; url: string } | null>(null);

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url);
  }, [image]);

  const file = image?.file;
  const originalPreview = image?.url ?? (original.startsWith("/") || original.startsWith("https://") ? original : "");
  const preview: PosterChoice = mode === "stock" && style ? { mode, style }
    : mode === "original" && originalPreview ? { mode, url: originalPreview }
    : { mode: "pending" };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError(false);
    const db = staffDb();
    if (!db) return;
    setBusy(true);
    try {
      let url = original.trim();
      if (mode === "original" && file) {
        const extension = ACCEPTED[file.type as keyof typeof ACCEPTED];
        if (!extension || file.size > 10 * 1024 * 1024) throw new Error("เลือกไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB");
        if (lastUpload?.file === file) {
          url = lastUpload.url;
        } else {
          const path = `tournament-posters/originals/${crypto.randomUUID()}.${extension}`;
          const bucket = db.storage.from("gt-site-assets");
          const result = await bucket.upload(path, file, { contentType: file.type, upsert: false });
          if (result.error) throw new Error("อัปโหลดโปสเตอร์ไม่ได้ กรุณาลองอีกครั้ง");
          url = bucket.getPublicUrl(path).data.publicUrl;
          setLastUpload({ file, url });
        }
      }
      if (mode === "original" && !/^https:\/\/\S+$/.test(url) && !(url === item.original && url.startsWith("/"))) {
        throw new Error("อัปโหลดรูปหรือใส่ลิงก์ภาพที่ขึ้นต้นด้วย https://");
      }
      const settings: PosterSetting = { event_key: item.key, mode, style: mode === "stock" ? style : null, original_url: mode === "original" ? url : null };
      const result = await db.from("gt_tournament_posters_v1").upsert(settings);
      if (result.error) throw new Error("บันทึกโปสเตอร์ไม่ได้ กรุณาลองอีกครั้ง");
      if (mode === "original") {
        setOriginal(url);
        setImage(null);
      }
      onSave(settings);
      setMessage("บันทึกแล้ว หน้าเว็บจะอัปเดตภายในประมาณ 1 นาที");
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "บันทึกโปสเตอร์ไม่ได้");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-5 lg:grid-cols-2" onSubmit={save}>
      <fieldset disabled={busy} className="min-w-0 space-y-3">
        <legend className="mb-2 font-semibold">รายการนี้มีโปสเตอร์จริงไหม?</legend>
        {([
          ["pending", "รอเลือกโปสเตอร์"],
          ["original", "มีโปสเตอร์จริง"],
          ["stock", "ไม่มีโปสเตอร์จริง ใช้ภาพจากคลัง"],
        ] as const).map(([value, label]) => (
          <label key={value} className="flex min-h-10 items-center gap-2">
            <input type="radio" name="poster-mode" checked={mode === value} onChange={() => {
              if (value === "stock" && !style) setStyle(randomStyle());
              setMode(value);
              setMessage("");
            }} />
            {label}
          </label>
        ))}
        {mode === "original" && (
          <div className="space-y-2">
            <label className="block">อัปโหลดโปสเตอร์จริง <input className="mt-1 block w-full text-sm" type="file" accept={Object.keys(ACCEPTED).join(",")} onChange={e => {
              const file = e.target.files?.[0];
              setImage(file ? { file, url: URL.createObjectURL(file) } : null);
            }} /></label>
            <label className="block">หรือใช้ลิงก์รูปโปสเตอร์
              <input className={FIELD} value={original} disabled={Boolean(file)} maxLength={2048} onChange={e => setOriginal(e.target.value)} />
            </label>
          </div>
        )}
        {mode === "stock" && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-40 flex-1">เลือกพื้นหลัง
              <select className={FIELD} value={style} onChange={e => setStyle(Number(e.target.value))}>
                <option value={0}>เลือกจาก 20 สไตล์</option>
                {POSTER_STYLES.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
              </select>
            </label>
            <button type="button" className="gt-outline-btn min-h-11 px-4" onClick={() => setStyle(randomStyle(style))}>สุ่มพื้นหลัง</button>
          </div>
        )}
        <button type="submit" className="gt-cta-btn min-h-11 px-4 disabled:opacity-50" disabled={busy || (mode === "stock" && !style)}>{busy ? "กำลังบันทึก…" : "บันทึกโปสเตอร์"}</button>
        {message && <p role={error ? "alert" : "status"}>{message}</p>}
      </fieldset>
      <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--gt-line)]">
        <TournamentPoster choice={preview} title={item.title} year={item.year} />
      </div>
    </form>
  );
}
