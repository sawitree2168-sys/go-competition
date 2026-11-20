"use client";

import EventSettings from "./EventSettings";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import Gate from "../_lib/Gate";
import { ErrorNote, staffDb, useAction, useStaff } from "../_lib/staff";
import { divisionKey, divisionLabel, divisionSortValue, thaiDate } from "@/lib/division-display";
import { mapEntrantsToDivisions } from "@/lib/competition-day.mjs";
import { OrganizerQueue } from "@/app/tournaments/[id]/_ui/RegisterPanel";
import PaymentSettings from "./PaymentSettings";
import { ChangePolicy, ChangeRequests } from "./ChangeRequests";
import IdentityMatches from "./IdentityMatches";
import ByeRuleSetting from "./ByeRuleSetting";
import DivisionBoard from "./DivisionBoard";

type Division = { id: string; name: string };
type Entrant = { source_row: number; full_name: string; institution: string; division_name: string };
type ImportResult = { source_row: number; outcome: string };
type Mode = "web" | "external" | "closed";

const MODE_LABEL: Record<Mode, string> = { web: "รับสมัครผ่านเว็บนี้ (ผู้จัดอนุมัติ)", external: "ฟอร์มภายนอก เช่น Google Form", closed: "ปิดรับสมัคร" };

type Notice = { id: string; title: string; body: string | null; created_at: string };

function Announcements({ id }: { id: string }) {
  const [list, setList] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const action = useAction();
  const load = useCallback(async () => {
    const { data } = await staffDb()!.from("gt_announcements").select("id,title,body,created_at").eq("tournament_id", id).order("created_at", { ascending: false }).limit(50);
    setList((data ?? []) as Notice[]);
  }, [id]);
  useEffect(() => { queueMicrotask(load); }, [load]);
  const post = async () => {
    if (!title.trim()) return action.setError("กรุณาใส่หัวข้อประกาศ");
    const res = await action.run(() => staffDb()!.rpc("gt_staff_post_announcement_v1", { p_tournament: id, p_title: title.trim(), p_body: body.trim() }));
    if (res) { setTitle(""); setBody(""); await load(); }
  };
  const remove = async (n: Notice) => {
    const res = await action.run(() => staffDb()!.rpc("gt_staff_delete_announcement_v1", { p_id: n.id }));
    if (res) await load();
  };
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold">หัวข้อ
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="เช่น เลื่อนเวลาเริ่มรอบที่ 3 เป็น 13:30 น." className="mt-1 block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 font-normal" />
      </label>
      <label className="block text-sm font-semibold">รายละเอียด (ไม่บังคับ)
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={3} className="mt-1 block w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 py-2 font-normal" />
      </label>
      <button type="button" onClick={post} disabled={action.busy} className="gt-gold-btn min-h-11 px-5 disabled:opacity-60">โพสต์ประกาศ</button>
      <ErrorNote text={action.error} />
      {list.length > 0 && (
        <ul className="divide-y divide-[var(--gt-line)] rounded-xl border border-[var(--gt-line)]">
          {list.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="whitespace-pre-line text-sm text-[var(--gt-muted)]">{n.body}</p>}
                <p className="text-xs text-[var(--gt-muted)]">{new Date(n.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <button type="button" onClick={() => remove(n)} disabled={action.busy} className="min-h-10 shrink-0 px-2 text-sm font-semibold text-[var(--gt-bad)] hover:underline">ลบ</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VenueField({ id, venue, onSaved }: { id: string; venue: string | null; onSaved: () => void }) {
  const [v, setV] = useState(venue ?? "");
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const save = async () => {
    setSaved(false);
    const res = await action.run(() => staffDb()!.rpc("gt_staff_set_venue_v1", { p_tournament: id, p_venue: v.trim() }));
    if (res) { setSaved(true); onSaved(); }
  };
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">สถานที่แข่งขัน
        <span className="mt-1 flex gap-2">
          <input value={v} onChange={(e) => { setV(e.target.value); setSaved(false); }} maxLength={160} placeholder="เช่น ศูนย์การค้า … ชั้น 3" className="block min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 font-normal" />
          <button type="button" onClick={save} disabled={action.busy} className="gt-gold-btn min-h-11 shrink-0 px-4 disabled:opacity-60">บันทึก</button>
        </span>
      </label>
      {saved && <p className="text-sm text-[var(--gt-ok)]">บันทึกแล้ว · แสดงในหน้ารวมการแข่งขันและหน้ารายละเอียดงาน</p>}
      <ErrorNote text={action.error} />
    </div>
  );
}

function RegistrationSettings({ id, mode, url, onSaved }: { id: string; mode: Mode; url: string | null; onSaved: () => void }) {
  const [m, setM] = useState<Mode>(mode);
  const [u, setU] = useState(url ?? "");
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const save = async () => {
    setSaved(false);
    const res = await action.run(() => staffDb()!.rpc("gt_staff_set_registration_mode_v1", { p_tournament: id, p_mode: m, p_url: m === "closed" ? null : u.trim() }));
    if (res) { setSaved(true); onSaved(); }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MODE_LABEL) as Mode[]).map((k) => (
          <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${m === k ? "border-[var(--gt-brand)] font-semibold" : "border-[var(--gt-line)]"}`}>
            <input type="radio" name="reg-mode" checked={m === k} onChange={() => { setM(k); setSaved(false); }} />{MODE_LABEL[k]}
          </label>
        ))}
      </div>
      {m !== "closed" && (
        <label className="block text-sm">{m === "web" ? "ลิงก์ Google Form เพิ่มเติม (ไม่บังคับ) · ผู้สมัครเลือกได้ว่าจะสมัครในเว็บหรือในฟอร์ม" : "ลิงก์แบบฟอร์ม (ไม่บังคับ)"}
          <input value={u} onChange={(e) => { setU(e.target.value); setSaved(false); }} placeholder="https://forms.gle/…" className="mt-1 block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3" />
        </label>
      )}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={action.busy} className="gt-gold-btn min-h-11 px-5 disabled:opacity-60">บันทึก</button>
        {saved && <span className="text-sm text-[var(--gt-ok)]">บันทึกแล้ว · หน้าสาธารณะอัปเดตภายใน 30 วินาที</span>}
      </div>
      <ErrorNote text={action.error} />
    </div>
  );
}

type Signer = { name: string; title: string };

function CertificateSettings({ id, open, signers, pending, onSaved }: { id: string; open: boolean; signers: Signer[]; pending: number; onSaved: () => void }) {
  const [on, setOn] = useState(open);
  const [list, setList] = useState<Signer[]>([0, 1].map((i) => signers[i] ?? { name: "", title: i === 0 ? "ประธานจัดการแข่งขัน" : "" }));
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const edit = (i: number, k: keyof Signer, v: string) => { setSaved(false); setList((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x))); };
  const save = async (next: boolean) => {
    setSaved(false);
    const res = await action.run(() => staffDb()!.rpc("gt_staff_set_certificates_v1", { p_tournament: id, p_open: next, p_signers: list }));
    if (res) { setOn(next); setSaved(true); onSaved(); }
  };
  const field = "block min-h-11 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 font-normal";
  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        สถานะ: {on ? <span className="rounded-full bg-[var(--gt-win-bg)] px-3 py-0.5 font-semibold text-[var(--gt-win-ink)]">เปิดให้ดาวน์โหลดแล้ว</span>
          : <span className="rounded-full bg-[var(--gt-surface-2)] px-3 py-0.5 text-[var(--gt-muted)]">ยังไม่เปิด (นักกีฬาเห็น “รอออกใบประกาศ”)</span>}
      </p>
      <p className="text-sm text-[var(--gt-muted)]">ระบบสร้างใบประกาศจากผล: รุ่นจัดอันดับ อันดับ 1–3 = ชนะเลิศ / รองชนะเลิศอันดับ 1 / อันดับ 2 · รุ่นเฟรนชิพ = เหรียญตามจำนวนชนะ · คนอื่น = เข้าร่วมการแข่งขัน · นักกีฬาดาวน์โหลด PDF / PNG ได้ที่หน้าโปรไฟล์</p>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold">ผู้ลงนามบนใบประกาศ (ไม่บังคับ ไม่เกิน 2 คน)</legend>
        {list.map((x, i) => (
          <div key={i} className="space-y-1.5 rounded-xl border border-[var(--gt-line)] p-3">
            <label className="block text-sm">ชื่อผู้ลงนาม {i + 1}<input value={x.name} onChange={(e) => edit(i, "name", e.target.value)} maxLength={80} placeholder="เช่น นายสมชาย ใจดี" className={`${field} mt-1`} /></label>
            <label className="block text-sm">ตำแหน่ง<input value={x.title} onChange={(e) => edit(i, "title", e.target.value)} maxLength={80} placeholder="เช่น ผู้อำนวยการแข่งขัน" className={`${field} mt-1`} /></label>
          </div>
        ))}
      </fieldset>
      {!on && pending > 0 && <p className="rounded-xl bg-[var(--gt-warn-soft)] px-4 py-2 text-sm text-[var(--gt-warn)]">ยังมีโต๊ะรอผล {pending} โต๊ะ ควรเปิดเมื่อลงผลครบทุกรุ่นแล้ว (อันดับบนใบประกาศคิดจากผลขณะดาวน์โหลด)</p>}
      <div className="flex flex-wrap items-center gap-2">
        {on ? (
          <>
            <button type="button" onClick={() => save(true)} disabled={action.busy} className="gt-gold-btn min-h-11 px-5 disabled:opacity-60">บันทึกผู้ลงนาม</button>
            <button type="button" onClick={() => save(false)} disabled={action.busy} className="min-h-11 rounded-xl border border-[var(--gt-bad)] px-4 text-[var(--gt-bad)] disabled:opacity-60">ปิดการดาวน์โหลด</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => save(true)} disabled={action.busy} className="gt-gold-btn min-h-11 px-5 disabled:opacity-60">เปิดให้ดาวน์โหลดใบประกาศ</button>
            <button type="button" onClick={() => save(false)} disabled={action.busy} className="gt-outline-btn min-h-11 px-4 disabled:opacity-60">บันทึกผู้ลงนาม (ยังไม่เปิด)</button>
          </>
        )}
        {saved && <span className="text-sm text-[var(--gt-ok)]">บันทึกแล้ว · หน้าโปรไฟล์อัปเดตภายใน 30 วินาที</span>}
      </div>
      <ErrorNote text={action.error} />
    </div>
  );
}

export default function OrganizerEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Gate><EventConsole id={id} /></Gate>;
}

function EventConsole({ id }: { id: string }) {
  const staff = useStaff();
  const [event, setEvent] = useState<{ title: string; event_date: string | null; registration_mode: Mode | null; registration_url: string | null; venue: string | null; certificates_open: boolean; certificate_signers: Signer[] | null; bye_sos_mode: string | null } | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [regCount, setRegCount] = useState<Map<string, number>>(new Map());
  const [status, setStatus] = useState<Map<string, { last: number; pending: number; checked: number; seats: number }>>(new Map());
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [rosterOpen,setRosterOpen]=useState(false);
  const [rosterQuery,setRosterQuery]=useState("");
  const [loaded, setLoaded] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const action = useAction();

  const load = useCallback(async () => {
    const db = staffDb()!;
    const access=await db.rpc("gt_can_manage_tournament_v1",{p_tournament:id});
    if(access.error||access.data!==true){setEvent(null);setLoaded(true);return;}
    const [ev, dv, en, rg, mt] = await Promise.all([
      db.from("gt_tournaments").select("title,event_date,registration_mode,registration_url,venue,certificates_open,certificate_signers,bye_sos_mode").eq("id", id).maybeSingle(),
      db.from("gt_divisions").select("id,name").eq("tournament_id", id),
      db.from("gt_public_entrants").select("source_row,full_name,institution,division_name").eq("tournament_id", id).order("source_row").limit(2000),
      db.from("gt_registrations").select("division_id").eq("tournament_id", id).eq("registration_status", "confirmed").limit(5000),
      db.from("gt_matches").select("division_id,round_number,state,black_checkin_at,white_checkin_at").eq("tournament_id", id).neq("state", "void").limit(10000),
    ]);
    const st = new Map<string, { last: number; pending: number; checked: number; seats: number }>();
    type M = { division_id: string; round_number: number; state: string; black_checkin_at: string | null; white_checkin_at: string | null };
    for (const m of (mt.data ?? []) as M[]) {
      const cur = st.get(m.division_id) ?? { last: 0, pending: 0, checked: 0, seats: 0 };
      if (m.round_number > cur.last) Object.assign(cur, { last: m.round_number, checked: 0, seats: 0 });
      if (m.round_number === cur.last) { cur.seats += 2; cur.checked += (m.black_checkin_at ? 1 : 0) + (m.white_checkin_at ? 1 : 0); }
      if (m.state !== "verified") cur.pending += 1;
      st.set(m.division_id, cur);
    }
    setStatus(st);
    setEvent(ev.data);
    setDivisions(((dv.data ?? []) as Division[]).sort((a, b) => divisionSortValue(a.name) - divisionSortValue(b.name)));
    setEntrants((en.data ?? []) as Entrant[]);
    const counts = new Map<string, number>();
    for (const r of (rg.data ?? []) as { division_id: string }[]) counts.set(r.division_id, (counts.get(r.division_id) ?? 0) + 1);
    setRegCount(counts);
    setLoaded(true);
  }, [id]);

  useEffect(() => { if (staff.status === "staff") queueMicrotask(load); }, [staff.status, load]);

  const mapping = useMemo(() => mapEntrantsToDivisions(entrants, divisions, divisionKey), [entrants, divisions]);
  const sheetCount = useMemo(() => {
    const byDiv = new Map<string, number>();
    for (const r of mapping.rows) byDiv.set(r.division_id, (byDiv.get(r.division_id) ?? 0) + 1);
    return byDiv;
  }, [mapping]);

  const runImport = async () => {
    if (!mapping.rows.length) return;
    if (!window.confirm(`นำเข้ารายชื่อจากใบสมัคร ${mapping.rows.length} รายการเข้าสู่ทะเบียนนักกีฬาสำหรับจัดคู่จริง? ระบบจะพยายามเชื่อมกับประวัติเดิม และแจ้งรายการที่ต้องตรวจสอบชื่อซ้ำ ไม่ใช่การยืนยันผลการแข่งขัน`)) return;
    setSummary("");
    const res = await action.run<ImportResult[]>(() =>
      staffDb()!.rpc("gt_staff_import_entrants_v1", { p_tournament: id, p_rows: mapping.rows }));
    if (!res) return;
    const result = res.data ?? [];
    const tally = new Map<string, number>();
    for (const r of result) { const k = r.outcome.startsWith("error") ? "error" : r.outcome; tally.set(k, (tally.get(k) ?? 0) + 1); }
    const label: Record<string, string> = { created: "สร้างนักกีฬาใหม่", linked_existing: "ผูกกับนักกีฬาเดิม", needs_review: "ต้องตรวจสอบชื่อซ้ำ", entrant_not_found: "ไม่พบแถว", division_not_in_tournament: "รุ่นไม่ตรง", error: "ผิดพลาด" };
    setSummary([...tally].map(([k, n]) => `${label[k] ?? k} ${n} คน`).join(" · "));
    const problems = result.filter((r) => r.outcome !== "created" && r.outcome !== "linked_existing");
    if (problems.length) action.setError(`มี ${problems.length} แถวที่นำเข้าไม่ได้ (แถวที่ ${problems.map((p) => p.source_row).join(", ")})`);
    await load();
  };

  const readyToImport = mapping.rows.length > 0 && mapping.rows.some(r => (regCount.get(r.division_id) ?? 0) < (sheetCount.get(r.division_id) ?? 0));
  const searchRoster = rosterQuery.trim().toLocaleLowerCase("th");
  const rosterRows = entrants.filter(r => !searchRoster || [r.full_name,r.institution,r.division_name].some(x => (x||"").toLocaleLowerCase("th").includes(searchRoster)));
  if (!loaded) return <p className="py-10 text-center text-[var(--gt-muted)]">กำลังโหลด…</p>;
  if (!event) return <p className="py-10 text-center">ไม่พบรายการนี้</p>;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/organizer" className="text-sm text-[var(--gt-muted)] underline-offset-2 hover:underline">← รายการทั้งหมด</Link>
        <h1 className="mt-1 text-xl font-bold">{event.title}</h1>
        <p className="text-sm text-[var(--gt-muted)]">{thaiDate(event.event_date)}</p>
      </div>

      <nav aria-label="ศูนย์ควบคุมรายการแข่งขัน" className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-[var(--gt-gold)] bg-[var(--gt-surface)] p-2 shadow-sm sm:grid-cols-4">
        <a href="#event-divisions" className="flex min-h-16 items-center justify-center rounded-xl border-2 border-[var(--gt-cta)] bg-[var(--gt-cta)] px-2 text-center text-sm font-bold text-white">▦ จับคู่ / ลงผล</a>
        <Link href={`/organizer/${id}/referees`} className="flex min-h-16 items-center justify-center rounded-xl border-2 border-[var(--gt-cta)] px-2 text-center text-sm font-bold">✓ จัดการกรรมการ</Link>
        <Link href={`/tournaments/${id}`} className="flex min-h-16 items-center justify-center rounded-xl border-2 border-[var(--gt-cta)] px-2 text-center text-sm font-bold">◉ หน้าสาธารณะ</Link>
        <button type="button" aria-pressed={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)} className="min-h-16 rounded-xl border-2 border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] px-2 text-sm font-bold">⚙ ตั้งค่างาน</button>
      </nav>
      {settingsOpen && <EventSettings id={id} onSaved={load}/>}
      <section id="event-readiness" aria-label="ภาพรวมเตรียมแข่งขัน" className="rounded-2xl border-[3px] border-[#d4a63d] bg-[var(--gt-surface)] p-4 shadow-sm">
        <div className="mb-3 rounded-xl bg-[linear-gradient(110deg,#0d67c9,#073e8e)] p-4 text-white">
          <h2 className="text-xl font-bold">ศูนย์เตรียมการแข่งขัน · ข้อมูลจริง</h2>
          <p className="mt-1 text-sm text-white/90">รายชื่อจากใบสมัคร กับรายชื่อที่ผูกทะเบียนนักกีฬาเพื่อจับคู่ เป็นข้อมูลคนละขั้นตอน</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border-2 border-[#82afe2] p-3"><p className="text-xs text-[var(--gt-muted)]">รายชื่อในใบสมัคร</p><strong className="gt-num block text-3xl text-[var(--gt-cta)]">{entrants.length}</strong><small>รายการ · ยังไม่ใช่ยอดยืนยัน</small></div>
          <div className="rounded-xl border-2 border-[#82afe2] p-3"><p className="text-xs text-[var(--gt-muted)]">จับคู่รุ่นได้</p><strong className="gt-num block text-3xl text-[var(--gt-cta)]">{mapping.rows.length}</strong><small>รายการพร้อมตรวจนำเข้า</small></div>
          <div className="rounded-xl border-2 border-[#82afe2] p-3"><p className="text-xs text-[var(--gt-muted)]">นักกีฬายืนยันในระบบ</p><strong className="gt-num block text-3xl text-[var(--gt-cta)]">{[...regCount.values()].reduce((a,b)=>a+b,0)}</strong><small>ทะเบียนสำหรับจับคู่</small></div>
          <div className="rounded-xl border-2 border-[#82afe2] p-3"><p className="text-xs text-[var(--gt-muted)]">โต๊ะรอผล</p><strong className="gt-num block text-3xl text-[var(--gt-cta)]">{[...status.values()].reduce((a,b)=>a+b.pending,0)}</strong><small>จากรอบที่ประกาศแล้ว</small></div>
        </div>
        {readyToImport && <div className="mt-3 rounded-xl border-2 border-[#e2b44e] bg-[#fff8df] p-3 text-[#533e12]">
          <strong>มีรายชื่อใบสมัครที่ยังไม่ได้เข้าสู่ระบบจับคู่</strong>
          <p className="mt-1 text-sm">ตรวจรายชื่อและระดับฝีมือก่อนนำเข้า · หลังนำเข้าอาจมีรายการชื่อซ้ำต้องตรวจอีกครั้ง และสามารถแก้ข้อมูลผู้สมัครก่อนออกคู่ได้</p>
        </div>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" aria-expanded={rosterOpen} onClick={()=>setRosterOpen(v=>!v)} className="min-h-12 rounded-xl border-2 border-[#d4a63d] bg-[var(--gt-cta)] px-4 font-bold text-white">{rosterOpen?"ซ่อนใบสมัคร":"ตรวจรายชื่อจากใบสมัคร"}</button>
          <button type="button" onClick={runImport} disabled={action.busy || mapping.rows.length===0} className="min-h-12 rounded-xl border-2 border-[#d4a63d] bg-[var(--gt-gold-soft)] px-4 font-bold disabled:opacity-50">{action.busy?"กำลังนำเข้า…":`ตรวจยืนยันและนำเข้า ${mapping.rows.length} รายการ`}</button>
        </div>
        <ErrorNote text={action.error}/>
        {summary && <p role="status" className="mt-3 rounded-lg border border-[var(--gt-line)] p-3 text-sm">{summary}</p>}
        {mapping.unmatched.length>0 && <p className="mt-2 text-sm text-[var(--gt-warn)]">จับคู่รุ่นไม่ได้ {mapping.unmatched.length} รายการ กรุณาตรวจชื่อรุ่นก่อนนำเข้า</p>}
        {rosterOpen && <div className="mt-4 space-y-2">
          <label className="block text-sm font-semibold">ค้นหารายชื่อ สถาบัน หรือรุ่น
            <input value={rosterQuery} onChange={e=>setRosterQuery(e.target.value)} type="search" placeholder="พิมพ์ชื่อนักกีฬา / สถาบัน / รุ่น" className="mt-1 min-h-12 w-full rounded-xl border-2 border-[#87b3e6] bg-[var(--gt-surface)] px-3"/>
          </label>
          <p className="text-xs text-[var(--gt-muted)]">แสดง {rosterRows.length} จาก {entrants.length} รายการในใบสมัคร · ยังไม่ได้ใช้จับคู่</p>
          <div className="max-h-[28rem] overflow-auto rounded-xl border-2 border-[#87b3e6]">
            <table className="w-full min-w-[540px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[#095ab6] text-white"><tr><th className="p-3">แถว</th><th className="p-3">นักกีฬา</th><th className="p-3">สถาบัน</th><th className="p-3">รุ่นที่สมัคร</th></tr></thead>
              <tbody>{rosterRows.map((r,i)=><tr key={r.source_row} className={i%2?"bg-[var(--gt-surface-2)]":""}>
                <td className="border-b border-[var(--gt-line)] p-3">{r.source_row}</td><td className="border-b border-[var(--gt-line)] p-3 font-semibold">{r.full_name}</td><td className="border-b border-[var(--gt-line)] p-3">{r.institution||"—"}</td><td className="border-b border-[var(--gt-line)] p-3">{r.division_name}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>}
      </section>
      <section id="event-divisions" className="space-y-2">
        <h2 className="text-lg font-bold">โต๊ะกรรมการ · ทุกรุ่น</h2>
        <p className="text-sm text-[var(--gt-muted)]">รุ่นที่ลงผลครบแล้วขึ้นก่อน ระบบไม่จับคู่เอง แอดมินตรวจผลแล้วกดจับคู่ทีละรุ่น</p>
        {settingsOpen && <ByeRuleSetting key={event.bye_sos_mode ?? "none"} id={id} mode={event.bye_sos_mode} onSaved={load} />}
        <DivisionBoard eventId={id} players={regCount} sheet={sheetCount} />
      </section>

      {settingsOpen && <>
      <section className="gt-card p-4">
        <VenueField key={event.venue ?? ""} id={id} venue={event.venue} onSaved={load} />
      </section>

      <section className="gt-card flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto min-w-0">
          <h2 className="font-bold">3. กรรมการ</h2>
          <p className="text-sm text-[var(--gt-muted)]">สร้างลิงก์ + รหัส 6 หลัก ให้กรรมการเช็คอินและลงผลจากมือถือ ไม่ต้องสมัครบัญชี</p>
        </div>
        <Link href={`/organizer/${id}/referees`} className="gt-gold-btn inline-flex min-h-12 items-center px-5">จัดการกรรมการ</Link>
      </section>


      </>}
    </div>
  );
}
