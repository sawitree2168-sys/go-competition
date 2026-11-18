"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Gate from "../_lib/Gate";
import PhotoAdmin from "./PhotoAdmin";
import ActivityAdmin from "./ActivityAdmin";
import PhotoInbox from "./PhotoInbox";
import ResultsAdmin from "./ResultsAdmin";
import { ErrorNote, isPlatformAdmin, staffDb, useAction, useStaff } from "../_lib/staff";
import { callAthlete, identifierKind } from "@/lib/athlete-auth.mjs";

type Member = { user_id: string; email: string; role: "owner" | "admin"; active: boolean };
type Org = { id: string; name: string; status: "active" | "suspended"; note: string | null; members: Member[]; tournaments: { id: string; title: string; published: boolean }[] };
type Event = { id: string; title: string; organizer_id: string | null };

const input = "min-h-12 w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-3 text-base";

export default function PlatformPage() {
  return <Gate><Platform /></Gate>;
}

function Platform() {
  const staff = useStaff();
  const allowed = isPlatformAdmin(staff);
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [newName, setNewName] = useState("");
  const action = useAction();
  const { setError } = action;

  const load = useCallback(async () => {
    const db = staffDb()!;
    const [o, e] = await Promise.all([
      db.rpc("gt_platform_list_organizers_v1"),
      db.from("gt_tournaments").select("id,title,organizer_id").order("created_at", { ascending: false }),
    ]);
    if (o.error) setError("โหลดรายชื่อผู้จัดไม่ได้: " + o.error.message);
    setOrgs((o.data ?? []) as Org[]);
    setEvents((e.data ?? []) as Event[]);
  }, [setError]);

  useEffect(() => { if (allowed) queueMicrotask(load); }, [allowed, load]);

  if (!allowed) return <p className="gt-card mt-6 p-6 text-center">หน้านี้สำหรับเจ้าของระบบเท่านั้น</p>;

  const save = async (o: Pick<Org, "name" | "status" | "note"> & { id: string | null }) => {
    const ok = await action.run(() => staffDb()!.rpc("gt_platform_save_organizer_v1", { p_id: o.id, p_name: o.name, p_status: o.status, p_note: o.note ?? "" }));
    if (ok) await load();
    return Boolean(ok);
  };
  const assign = async (eventId: string, orgId: string) => {
    const ok = await action.run(() => staffDb()!.rpc("gt_platform_assign_tournament_v1", { p_tournament: eventId, p_organizer: orgId || null }));
    if (ok) await load();
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/organizer" className="text-sm text-[var(--gt-muted)] underline-offset-2 hover:underline">← รายการแข่งขัน</Link>
        <h1 className="mt-1 text-xl font-bold">ภาพรวมผู้ดูแลระบบ</h1>
        <p className="text-sm text-[var(--gt-muted)]">ผู้จัดแต่ละรายเห็นและจัดการได้เฉพาะงานของตัวเอง ถ้าระงับ ทีมงานของผู้จัดรายนั้นจะเข้าหน้าผู้จัดไม่ได้ทันที (หน้าเว็บสาธารณะยังแสดงตามปกติ)</p>
      </div>
      <ErrorNote text={action.error} />

      <div className="site-metrics"><div>รายการแข่งขัน<b>{events.length}</b></div><div>ผู้จัด<b>{orgs?.length??0}</b></div><div><a href="#photo-inbox">ตรวจภาพผลที่ส่งมา →</a></div><div><a href="/news">ข่าวสารและสรุปผล →</a></div></div>
      <PhotoInbox/>
      <AthleteAccounts />

      <PhotoAdmin />

      <ActivityAdmin />

      <ResultsAdmin />

      <TeacherRequests run={action.run} busy={action.busy} />

      {orgs?.map((o) => <OrgCard key={o.id} org={o} busy={action.busy} onSave={save} reload={load} run={action.run} />)}

      <form onSubmit={async (e) => { e.preventDefault(); if (await save({ id: null, name: newName, status: "active", note: "" })) setNewName(""); }} className="gt-card space-y-3 p-4">
        <h2 className="font-bold">เพิ่มผู้จัดรายใหม่</h2>
        <input required minLength={2} maxLength={120} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อชมรม / สถาบัน / บริษัท" aria-label="ชื่อผู้จัด" className={input} />
        <button type="submit" disabled={action.busy || newName.trim().length < 2} className="gt-gold-btn min-h-12 px-5 disabled:opacity-60">เพิ่มผู้จัด</button>
      </form>

      <section className="gt-card space-y-3 p-4">
        <h2 className="font-bold">งานแข่งขันเป็นของผู้จัดรายไหน</h2>
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{ev.title}</span>
              <select value={ev.organizer_id ?? ""} disabled={action.busy} onChange={(e) => assign(ev.id, e.target.value)} aria-label={`ผู้จัดของ ${ev.title}`}
                className="min-h-11 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-2 text-sm">
                <option value="">— ยังไม่ระบุ —</option>
                {orgs?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function OrgCard({ org, busy, onSave, reload, run }: {
  org: Org; busy: boolean;
  onSave: (o: Pick<Org, "name" | "status" | "note"> & { id: string | null }) => Promise<boolean>;
  reload: () => Promise<void>;
  run: ReturnType<typeof useAction>["run"];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "admin">("admin");
  const [help, setHelp] = useState(false);
  const suspended = org.status === "suspended";

  const setMember = async (mail: string, r: string, active: boolean) => {
    const ok = await run(() => staffDb()!.rpc("gt_platform_set_organizer_member_v1", { p_organizer: org.id, p_email: mail, p_role: r, p_active: active }));
    if (ok) { setEmail(""); await reload(); }
  };

  return (
    <section className={`gt-card space-y-3 p-4 ${suspended ? "border-[var(--gt-bad)]" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-bold">{org.name}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${suspended ? "bg-[var(--gt-bad)] text-white" : "gt-pill-gold"}`}>{suspended ? "ระงับอยู่" : "ใช้งานได้"}</span>
        <button type="button" disabled={busy} onClick={() => {
          const note = suspended ? "" : window.prompt("เหตุผลที่ระงับ (เช่น ค้างชำระค่าบริการ)", org.note ?? "") ?? null;
          if (note === null) return;
          onSave({ id: org.id, name: org.name, status: suspended ? "active" : "suspended", note });
        }} className={`min-h-11 rounded-xl border px-3 text-sm ${suspended ? "border-[var(--gt-ok)] text-[var(--gt-ok)]" : "border-[var(--gt-bad)] text-[var(--gt-bad)]"}`}>
          {suspended ? "เปิดใช้งาน" : "ระงับ"}
        </button>
      </div>
      {org.note && <p className="text-sm text-[var(--gt-muted)]">หมายเหตุ: {org.note}</p>}
      <p className="text-sm text-[var(--gt-muted)]">งาน {org.tournaments.length} รายการ{org.tournaments.length ? `: ${org.tournaments.map((t) => t.title).join(", ")}` : ""}</p>

      <div className="space-y-2">
        <h3 className="font-semibold">ทีมงานผู้จัด</h3>
        <ul className="space-y-1">
          {org.members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`min-w-0 flex-1 truncate ${m.active ? "" : "text-[var(--gt-muted)] line-through"}`}>{m.email}</span>
              <span className="text-[var(--gt-muted)]">{m.role === "owner" ? "เจ้าของ" : "ผู้ช่วย"}</span>
              <button type="button" disabled={busy} onClick={() => setMember(m.email, m.role, !m.active)} className="min-h-9 rounded-lg border border-[var(--gt-line)] px-2 text-xs">{m.active ? "ปิดสิทธิ์" : "คืนสิทธิ์"}</button>
            </li>
          ))}
          {!org.members.length && <li className="text-sm text-[var(--gt-muted)]">ยังไม่มีทีมงาน</li>}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); setMember(email.trim(), role, true); }} className="flex flex-wrap gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="อีเมลของบัญชีผู้จัด" aria-label="อีเมล" className={`${input} min-w-0 flex-1`} />
          <select value={role} onChange={(e) => setRole(e.target.value as "owner" | "admin")} aria-label="บทบาท" className="min-h-12 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-2">
            <option value="admin">ผู้ช่วย</option><option value="owner">เจ้าของ</option>
          </select>
          <button type="submit" disabled={busy || !email.trim()} className="gt-outline-btn min-h-12 px-4 disabled:opacity-60">เพิ่ม</button>
        </form>
        <button type="button" onClick={() => setHelp((h) => !h)} className="text-xs text-[var(--gt-muted)] underline">ผู้จัดยังไม่มีบัญชี?</button>
        {help && (
          <ol className="list-decimal space-y-1 rounded-xl bg-[var(--gt-surface-2)] py-2 pl-8 pr-3 text-sm">
            <li>เปิด Supabase → Authentication → Users → <strong>Add user</strong> → Create new user</li>
            <li>ใส่อีเมลและรหัสผ่านชั่วคราว ติ๊ก <strong>Auto Confirm User</strong></li>
            <li>กลับมาที่หน้านี้ ใส่อีเมลแล้วกด “เพิ่ม” จากนั้นส่งอีเมล + รหัสผ่านให้ผู้จัด (เข้าที่ /organizer)</li>
          </ol>
        )}
      </div>
    </section>
  );
}

type TeacherRow = { academy_id: string; academy: string; user_id: string; email: string; name: string | null; role: "manager" | "teacher"; status: "pending" | "active"; created_at: string };

/** Teachers using institution pages (they get in as soon as they confirm their institution): the owner can remove anyone. */
function TeacherRequests({ run, busy }: { run: ReturnType<typeof useAction>["run"]; busy: boolean }) {
  const [rows, setRows] = useState<TeacherRow[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await staffDb()!.rpc("gt_platform_academy_staff_v1");
    setRows((data ?? []) as TeacherRow[]);
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);
  const decide = async (r: TeacherRow, approve: boolean) => {
    if (!approve && !window.confirm(`ยกเลิกสิทธิ์ ${r.email} ที่ ${r.academy}?`)) return;
    const ok = await run(() => staffDb()!.rpc("gt_platform_decide_academy_staff_v1", { p_academy: r.academy_id, p_user: r.user_id, p_approve: approve }));
    if (ok) await load();
  };
  if (!rows) return null;
  const pending = rows.filter((r) => r.status === "pending");
  return (
    <section className="gt-card space-y-3 p-4" aria-labelledby="teach-h">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="teach-h" className="mr-auto font-bold">ครูและสถาบัน</h2>
        {pending.length > 0 && <span className="rounded-full bg-[var(--gt-gold-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--gt-warn)]">รออนุมัติ {pending.length}</span>}
        <Link href="/institution" className="text-sm text-[var(--gt-muted)] underline">หน้าสถาบัน</Link>
      </div>
      <p className="text-sm text-[var(--gt-muted)]">ครูยืนยันสถาบันของตัวเองแล้วใช้งานได้ทันที (ครูและเจ้าของสถาบันใช้ได้เหมือนกัน) — ถ้าเห็นคนที่ไม่ใช่ครูของสถาบันนั้น กด “ยกเลิกสิทธิ์” แล้วเขาจะเข้าสถาบันนั้นเองไม่ได้อีก</p>
      {rows.length ? (
        <ul className="divide-y divide-[var(--gt-line)]">
          {rows.map((r) => (
            <li key={`${r.academy_id}-${r.user_id}`} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="min-w-0 flex-1 basis-56">
                <span className="block font-semibold">{r.academy}</span>
                <span className="block truncate text-[var(--gt-muted)]">{r.name ? `${r.name} · ` : ""}{r.email} · {r.role === "manager" ? "เจ้าของสถาบัน" : "ครู"}</span>
              </span>
              {r.status === "pending" ? (
                <>
                  <button type="button" disabled={busy} onClick={() => decide(r, true)} className="gt-gold-btn min-h-10 px-4">อนุมัติ</button>
                  <button type="button" disabled={busy} onClick={() => decide(r, false)} className="min-h-10 rounded-xl border border-[var(--gt-bad)] px-3 text-[var(--gt-bad)]">ไม่อนุมัติ</button>
                </>
              ) : (
                <>
                  <span className="text-[var(--gt-ok)]">ใช้งานได้</span>
                  <button type="button" disabled={busy} onClick={() => decide(r, false)} className="min-h-10 rounded-xl border border-[var(--gt-line)] px-3 text-xs">ยกเลิกสิทธิ์</button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-[var(--gt-muted)]">ยังไม่มีครูยืนยันสถาบัน</p>}
    </section>
  );
}

type AthleteHit = { go_id: string; full_name: string; rank: string | null; dan: boolean; has_password: boolean };

/**
 * Athlete accounts (no e-mail): look an athlete up in the register and issue a one-time code (24 h) so they can
 * set a new password at /login/forgot → นักกีฬา. Also used when someone else signed up as this athlete:
 * the code lets the real athlete take the account back.
 */
function AthleteAccounts() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<AthleteHit[] | null>(null);
  const [pick, setPick] = useState<AthleteHit | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ code: string; go_id: string; full_name: string } | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setHits(null); setPick(null); setIssued(null);
    const k = identifierKind(q);
    if (k !== "name" && k !== "go" && k !== "dan") return setError("พิมพ์ชื่อ-นามสกุล รหัส GO หรือเลขดั้ง");
    setBusy(true);
    const r = await callAthlete("search", k === "name" ? { name: q.replace(/\s+/g, " ").trim() } : { identifier: q });
    setBusy(false);
    if (!r.ok) return setError(r.data?.message ?? "ค้นหาไม่สำเร็จ");
    setHits((r.data?.athletes ?? []) as AthleteHit[]);
  };
  const issue = async () => {
    if (!pick) return;
    if (note.trim().length < 12) return setError("กรุณาบันทึกเหตุผลอย่างน้อย 12 ตัวอักษร เช่น “ผู้ปกครองโทรมาขอ ยืนยันวันเกิดแล้ว”");
    const { data } = await staffDb()!.auth.getSession();
    setBusy(true); setError("");
    const r = await callAthlete("issue", { identifier: pick.go_id, confirmed: true, note: note.trim() }, { accessToken: data.session?.access_token });
    setBusy(false);
    if (!r.ok) return setError(r.data?.message ?? "ออกรหัสไม่สำเร็จ");
    setIssued({ code: r.data.code, go_id: r.data.go_id, full_name: r.data.full_name ?? pick.full_name }); setNote("");
  };

  return (
    <section className="gt-card space-y-3 p-4" aria-labelledby="ath-h">
      <h2 id="ath-h" className="font-bold">บัญชีนักกีฬา (ไม่ใช้อีเมล)</h2>
      <p className="text-sm text-[var(--gt-muted)]">นักกีฬาสมัครเองด้วยชื่อ-นามสกุล (ดั้งยืนยันเลขดั้ง) แล้วเข้าระบบด้วยรหัส GO / เลขดั้ง / ชื่อ · ถ้าลืมรหัสผ่าน หรือมีคนสมัครแทนเด็ก ให้ออก “รหัสชั่วคราว” ให้เจ้าตัวตั้งรหัสผ่านใหม่ (บัญชีจะกลับมาเป็นของเจ้าตัว)</p>
      <form onSubmit={search} className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อ-นามสกุล / รหัส GO / เลขดั้ง" aria-label="ค้นหานักกีฬา" className={`${input} min-w-0 flex-1`} />
        <button type="submit" disabled={busy} className="gt-outline-btn min-h-12 px-4 disabled:opacity-60">ค้นหา</button>
      </form>
      {hits && !hits.length && <p className="text-sm text-[var(--gt-muted)]">ไม่พบในทะเบียน</p>}
      {hits && hits.length > 0 && (
        <ul className="divide-y divide-[var(--gt-line)]">
          {hits.map((h) => (
            <li key={h.go_id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="min-w-0 flex-1 basis-56"><span className="block font-semibold">{h.full_name}</span>
                <span className="block text-[var(--gt-muted)]">{h.go_id}{h.rank ? ` · ${h.rank}` : ""}{h.dan ? " · มีเลขดั้ง" : ""}</span></span>
              <span className={h.has_password ? "text-[var(--gt-ok)]" : "text-[var(--gt-muted)]"}>{h.has_password ? "มีบัญชีแล้ว" : "ยังไม่สมัคร"}</span>
              <button type="button" onClick={() => { setPick(h); setIssued(null); setError(""); }} className="gt-outline-btn min-h-10 px-3 text-xs">ออกรหัสชั่วคราว</button>
            </li>
          ))}
        </ul>
      )}
      {pick && !issued && (
        <div className="space-y-2 rounded-xl bg-[var(--gt-surface-2)] p-3 text-sm">
          <p>ออกรหัสชั่วคราวให้ <strong>{pick.full_name}</strong> ({pick.go_id}) — ตรวจว่าเป็นตัวจริงก่อน (เช่น โทรคุยกับผู้ปกครอง)</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="เหตุผล / วิธีที่ยืนยันตัว (อย่างน้อย 12 ตัวอักษร)" className="w-full rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3 py-2" />
          <div className="flex gap-2">
            <button type="button" onClick={issue} disabled={busy} className="gt-gold-btn min-h-11 px-4 disabled:opacity-60">ออกรหัส (ใช้ได้ 24 ชม.)</button>
            <button type="button" onClick={() => setPick(null)} className="min-h-11 px-3 text-[var(--gt-muted)] underline">ยกเลิก</button>
          </div>
        </div>
      )}
      {issued && (
        <div className="space-y-1 rounded-xl border-2 border-[var(--gt-gold)] bg-[var(--gt-gold-soft)] p-3 text-sm text-[var(--gt-gold-ink)]">
          <p>รหัสชั่วคราวของ <strong>{issued.full_name}</strong> ({issued.go_id})</p>
          <p className="gt-num select-all break-all text-2xl font-bold tracking-wider">{issued.code}</p>
          <p>แจ้งเจ้าตัวให้ไปที่ หน้าเข้าสู่ระบบ → ลืมรหัสผ่าน → นักกีฬา · ใช้ได้ครั้งเดียวภายใน 24 ชั่วโมง · รหัสนี้แสดงครั้งเดียว</p>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-[var(--gt-bad)]">{error}</p>}
    </section>
  );
}
