"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import Gate from "../_lib/Gate";
import { ErrorNote, staffDb, useAction, useStaff } from "../_lib/staff";
import { divisionKey, divisionLabel, divisionSortValue, thaiDate } from "@/lib/division-display";
import { mapEntrantsToDivisions } from "@/lib/competition-day.mjs";
import { OrganizerQueue } from "@/app/tournaments/[id]/_ui/RegisterPanel";

type Division = { id: string; name: string };
type Entrant = { source_row: number; full_name: string; institution: string; division_name: string };
type ImportResult = { source_row: number; outcome: string };
type Mode = "web" | "external" | "closed";

const MODE_LABEL: Record<Mode, string> = { web: "รับสมัครผ่านเว็บนี้ (ผู้จัดอนุมัติ)", external: "ฟอร์มภายนอก เช่น Google Form", closed: "ปิดรับสมัคร" };

function RegistrationSettings({ id, mode, url, onSaved }: { id: string; mode: Mode; url: string | null; onSaved: () => void }) {
  const [m, setM] = useState<Mode>(mode);
  const [u, setU] = useState(url ?? "");
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const save = async () => {
    setSaved(false);
    const res = await action.run(() => staffDb()!.rpc("gt_staff_set_registration_mode_v1", { p_tournament: id, p_mode: m, p_url: m === "external" ? u.trim() : null }));
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
      {m === "external" && (
        <label className="block text-sm">ลิงก์แบบฟอร์ม (ไม่บังคับ)
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

export default function OrganizerEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Gate><EventConsole id={id} /></Gate>;
}

function EventConsole({ id }: { id: string }) {
  const staff = useStaff();
  const [event, setEvent] = useState<{ title: string; event_date: string | null; registration_mode: Mode | null; registration_url: string | null } | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [regCount, setRegCount] = useState<Map<string, number>>(new Map());
  const [status, setStatus] = useState<Map<string, { last: number; pending: number; checked: number; seats: number }>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const action = useAction();

  const load = useCallback(async () => {
    const db = staffDb()!;
    const [ev, dv, en, rg, mt] = await Promise.all([
      db.from("gt_tournaments").select("title,event_date,registration_mode,registration_url").eq("id", id).maybeSingle(),
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

  if (!loaded) return <p className="py-10 text-center text-[var(--gt-muted)]">กำลังโหลด…</p>;
  if (!event) return <p className="py-10 text-center">ไม่พบรายการนี้</p>;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/organizer" className="text-sm text-[var(--gt-muted)] underline-offset-2 hover:underline">← รายการทั้งหมด</Link>
        <h1 className="mt-1 text-xl font-bold">{event.title}</h1>
        <p className="text-sm text-[var(--gt-muted)]">{thaiDate(event.event_date)}</p>
      </div>

      <section className="gt-card space-y-3 p-4">
        <h2 className="font-bold">1. นำเข้ารายชื่อจาก Google Form</h2>
        <p className="text-sm text-[var(--gt-muted)]">
          พบ {entrants.length} แถวในชีต · จับคู่รุ่นได้ {mapping.rows.length} แถว
          {mapping.unmatched.length > 0 && <> · <span className="text-[var(--gt-warn)]">ไม่รู้จักรุ่น {mapping.unmatched.length} แถว</span></>}
        </p>
        {mapping.unmatched.length > 0 && (
          <ul className="rounded-xl bg-[var(--gt-warn-soft)] px-4 py-2 text-sm">
            {mapping.unmatched.slice(0, 10).map((e) => <li key={e.source_row}>แถว {e.source_row}: {e.full_name} — “{e.division_name}”</li>)}
          </ul>
        )}
        <p className="text-sm">กดซ้ำได้เมื่อมีผู้สมัครเพิ่ม คนที่นำเข้าแล้วจะไม่ถูกเพิ่มซ้ำ ควรนำเข้าให้ครบ<strong>ก่อนจับสาย</strong></p>
        <ErrorNote text={action.error} />
        {summary && <p className="rounded-xl bg-[var(--gt-surface-2)] px-4 py-2 text-sm">นำเข้าเสร็จ: {summary}</p>}
        <button type="button" onClick={runImport} disabled={action.busy || mapping.rows.length === 0} className="gt-gold-btn min-h-12 w-full px-4 sm:w-auto disabled:opacity-60">
          {action.busy ? "กำลังนำเข้า…" : `นำเข้า ${mapping.rows.length} รายชื่อ`}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">2. เลือกรุ่นเพื่อจับสาย ออกคู่ และกรอกผล</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {divisions.map((d) => {
            const inDb = regCount.get(d.id) ?? 0, inSheet = sheetCount.get(d.id) ?? 0;
            return (
              <li key={d.id}>
                <Link href={`/organizer/${id}/${d.id}`} className="gt-card gt-row flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">{divisionLabel(d.name)}</span>
                    {(() => {
                      const x = status.get(d.id);
                      if (!x) return <span className="text-xs text-[var(--gt-muted)]">ยังไม่ออกคู่</span>;
                      return (
                        <span className="text-xs">
                          รอบ {x.last} · {x.pending ? <span className="text-[var(--gt-warn)]">รอผล {x.pending} โต๊ะ</span> : <span className="text-[var(--gt-ok)]">ผลครบ</span>}
                          {x.pending > 0 && <span className="text-[var(--gt-muted)]"> · เช็คอิน {x.checked}/{x.seats}</span>}
                        </span>
                      );
                    })()}
                  </span>
                  <span className="text-right text-sm">
                    <span className="gt-num block">{inDb} คน</span>
                    {inSheet !== inDb && <span className="block text-xs text-[var(--gt-warn)]">ในชีต {inSheet}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="gt-card flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto min-w-0">
          <h2 className="font-bold">3. กรรมการ</h2>
          <p className="text-sm text-[var(--gt-muted)]">สร้างลิงก์ + รหัส 6 หลัก ให้กรรมการเช็คอินและลงผลจากมือถือ ไม่ต้องสมัครบัญชี</p>
        </div>
        <Link href={`/organizer/${id}/referees`} className="gt-gold-btn inline-flex min-h-12 items-center px-5">จัดการกรรมการ</Link>
      </section>

      <section className="gt-card space-y-4 p-4">
        <div>
          <h2 className="font-bold">4. การรับสมัคร</h2>
          <p className="text-sm text-[var(--gt-muted)]">เลือกวิธีรับสมัครของงานนี้ ผู้สมัครกรอกที่แท็บ “สมัคร” ของแต่ละรุ่น แล้วอนุมัติหรือปฏิเสธได้ที่นี่</p>
        </div>
        <RegistrationSettings key={`${event.registration_mode}|${event.registration_url}`} id={id} mode={event.registration_mode ?? "web"} url={event.registration_url} onSaved={load} />
        {(event.registration_mode ?? "web") === "web" && <OrganizerQueue tournamentId={id} bare />}
      </section>
    </div>
  );
}
