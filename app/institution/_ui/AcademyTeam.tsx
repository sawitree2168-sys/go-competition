"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { staffDb } from "@/app/organizer/_lib/staff";
import { Avatar } from "./bits";
import { DisplayModeToggle, useInstitutionDisplayMode } from "./DisplayMode";

type Member = {
  user_id: string; role: "manager" | "teacher"; name: string; go_id: string | null; athlete_id: string | null; photo: string | null;
  rank: string | null; students: number; stats: { events: number; games: number; wins: number; losses: number } | null;
};
type Team = { ok: boolean; can_manage: boolean; me: string; team: Member[] };
type Found = { go_id: string; name: string; rank: string | null };

const ERR: Record<string, string> = {
  LAST_OWNER: "สถาบันต้องมีเจ้าของอย่างน้อย 1 คน ตั้งคนอื่นเป็นเจ้าของก่อน",
  NOT_ALLOWED: "เฉพาะเจ้าของสถาบันเท่านั้น", GO_ID_NOT_FOUND: "ไม่พบรหัส GO นี้",
};
const profileHref = (m: Member) => m.athlete_id ? `/athletes/${m.athlete_id}` : m.go_id ? `/athletes/history/${encodeURIComponent(m.go_id)}` : null;

/**
 * Owners and teachers of the institution: several owners are allowed, nobody has to play Go, and teachers who do
 * play can link their GO ID so their own results show here.
 */
export default function AcademyTeam({ academyId, onChanged }: { academyId: string; onChanged?: () => void }) {
  const [mode, setMode] = useInstitutionDisplayMode("team");
  const [data, setData] = useState<Team | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [linking, setLinking] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[] | null>(null);

  const load = useCallback(async () => {
    const db = staffDb(); if (!db) return;
    const { data: d, error } = await db.rpc("gt_academy_team_v1", { p_academy: academyId });
    if (!error && d?.ok) setData(d as Team);
  }, [academyId]);
  useEffect(() => {
    queueMicrotask(() => void load());
    const again = () => void load();
    window.addEventListener("gt-team-changed", again);
    return () => window.removeEventListener("gt-team-changed", again);
  }, [load]);

  async function setRole(m: Member, role: "manager" | "teacher" | "remove") {
    if (busy) return;
    if (role === "remove" && !window.confirm(`เอา ${m.name} ออกจากสถาบัน?`)) return;
    setBusy(true); setMsg("");
    const { data: r, error } = await staffDb()!.rpc("gt_academy_set_staff_role_v1", { p_academy: academyId, p_user: m.user_id, p_role: role });
    setBusy(false);
    setMsg(error || !r?.ok ? ERR[r?.error] ?? "ทำรายการไม่สำเร็จ" : role === "manager" ? `ตั้ง ${m.name} เป็นเจ้าของแล้ว` : role === "teacher" ? `เปลี่ยน ${m.name} เป็นครูแล้ว` : `เอา ${m.name} ออกแล้ว`);
    await load(); onChanged?.();
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const db = staffDb(); if (!db || q.trim().length < 2) return;
    const { data: d } = await db.rpc("gt_staff_profile_search_v1", { p_query: q.trim() });
    setFound((d ?? []) as Found[]);
  }

  async function link(goId: string | null) {
    if (busy) return;
    setBusy(true); setMsg("");
    const { data: r, error } = await staffDb()!.rpc("gt_set_my_staff_go_id_v1", { p_academy: academyId, p_go_id: goId });
    setBusy(false);
    setMsg(error || !r?.ok ? ERR[r?.error] ?? "บันทึกไม่สำเร็จ" : goId ? "เชื่อมประวัติการแข่งขันของคุณแล้ว" : "ยกเลิกการเชื่อมประวัติแล้ว");
    if (!error && r?.ok) { setLinking(false); setFound(null); setQ(""); }
    await load();
  }

  if (!data) return <p role="status" className="text-sm text-[var(--gt-muted)]">กำลังโหลดรายชื่อครู…</p>;
  const owners = data.team.filter((m) => m.role === "manager").length;
  const mine = data.team.find((m) => m.user_id === data.me);

  const Stats = ({ m }: { m: Member }) => {
    if (!m.stats || !m.stats.games) return <p className="text-xs text-[var(--gt-muted)]">{m.go_id ? "ยังไม่มีผลการแข่งขัน" : "ไม่ได้เชื่อมประวัติการแข่งขัน"}</p>;
    const rate = Math.round((m.stats.wins / m.stats.games) * 100);
    return (
      <span className="block w-full rounded-lg bg-[var(--gt-surface-2)] px-2 py-1.5 text-xs">
        <span className="block"><b className="gt-num text-sm text-[var(--gt-win-ink)]">ชนะ {m.stats.wins}</b> · <b className="gt-num text-sm text-[var(--gt-loss-ink)]">แพ้ {m.stats.losses}</b></span>
        <span className="block text-[var(--gt-muted)]">{m.stats.events} รายการ · อัตราชนะ <b className="text-[var(--gt-ink)]">{rate}%</b></span>
      </span>
    );
  };
  const Actions = ({ m }: { m: Member }) => !data.can_manage ? null : (
    <span className="flex flex-wrap justify-center gap-1.5" data-export-ignore="true">
      {m.role === "teacher"
        ? <button type="button" disabled={busy} onClick={() => void setRole(m, "manager")} className="min-h-10 rounded-lg border border-[#e0b453] bg-[#fff7df] px-2.5 text-xs font-bold text-[#76510b] disabled:opacity-50">ตั้งเป็นเจ้าของ</button>
        : <button type="button" disabled={busy || owners <= 1} title={owners <= 1 ? "ต้องมีเจ้าของอย่างน้อย 1 คน" : undefined} onClick={() => void setRole(m, "teacher")} className="min-h-10 rounded-lg border border-[#b8cde8] px-2.5 text-xs font-semibold disabled:opacity-40">เปลี่ยนเป็นครู</button>}
      {m.user_id !== data.me && <button type="button" disabled={busy || (m.role === "manager" && owners <= 1)} onClick={() => void setRole(m, "remove")} className="min-h-10 rounded-lg border border-[#efc0c0] px-2.5 text-xs font-semibold text-[#a42841] disabled:opacity-40">เอาออก</button>}
    </span>
  );
  const RoleBadge = ({ m }: { m: Member }) => (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${m.role === "manager" ? "bg-[#f5d784] text-[#5a3d05]" : "bg-[#e3efff] text-[#0b4f9e]"}`}>{m.role === "manager" ? "👑 เจ้าของ" : "ครูผู้สอน"}{m.user_id === data.me ? " · คุณ" : ""}</span>
  );

  return (
    <section className="gt-card space-y-4 border-2 border-[#b7cdeb] p-4 sm:p-5" aria-labelledby="team-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="team-h" className="text-lg font-bold sm:text-xl">เจ้าของและครูของสถาบัน <span className="text-base font-normal text-[var(--gt-muted)]">เจ้าของ {owners} · ครู {data.team.length - owners}</span></h2>
        <DisplayModeToggle mode={mode} onChange={setMode} />
      </div>
      <p className="text-sm text-[var(--gt-muted)]">มีเจ้าของได้หลายคน · เจ้าของและครูไม่จำเป็นต้องเล่นหมากล้อม ครูที่เคยแข่งเชื่อมรหัส GO เพื่อแสดงผลงานของตัวเองได้</p>

      {mode === "cards" ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {data.team.map((m) => { const href = profileHref(m); return (
            <li key={m.user_id} className={`gt-card flex flex-col items-center gap-2 border-2 p-3 text-center ${m.role === "manager" ? "border-[#e9bd55]" : "border-[#bcd1e9]"}`}>
              <Avatar src={m.photo} className="h-16 w-16 sm:h-20 sm:w-20" />
              <span className="w-full">
                {href ? <Link href={href} className="block break-words font-bold leading-snug hover:underline">{m.name}</Link> : <b className="block break-words leading-snug">{m.name}</b>}
                <span className="mt-1 block"><RoleBadge m={m} /></span>
                <span className="mt-1 block text-xs text-[var(--gt-muted)]">{[m.rank, m.students ? `ดูแลนักเรียน ${m.students} คน` : ""].filter(Boolean).join(" · ") || " "}</span>
              </span>
              <Stats m={m} />
              <Actions m={m} />
            </li>); })}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-xl border-2 border-[#bcd1e9] bg-white">
          <table className="w-full table-fixed text-left text-xs sm:text-sm">
            <thead className="bg-[#e8f2ff] text-[#123a76]"><tr><th className="px-2 py-3 sm:px-4">ชื่อ</th><th className="w-24 px-2 py-3 sm:w-32">ตำแหน่ง</th><th className="w-20 px-2 py-3 text-center sm:w-28">ชนะ–แพ้</th>{data.can_manage && <th className="hidden w-48 px-2 py-3 sm:table-cell">จัดการ</th>}</tr></thead>
            <tbody className="divide-y divide-[#d9e6f6]">{data.team.map((m) => { const href = profileHref(m); return (
              <tr key={m.user_id}>
                <td className="px-2 py-2.5 sm:px-4"><span className="flex items-center gap-2"><Avatar src={m.photo} className="h-9 w-9 shrink-0" /><span className="min-w-0">{href ? <Link href={href} className="block break-words font-semibold hover:underline">{m.name}</Link> : <b className="block break-words">{m.name}</b>}<span className="block truncate text-xs text-[var(--gt-muted)]">{m.rank ?? (m.go_id ? m.go_id : "ไม่ได้เชื่อมประวัติ")}</span></span></span></td>
                <td className="px-2"><RoleBadge m={m} /></td>
                <td className="gt-num px-2 text-center">{m.stats?.games ? <><span className="text-[var(--gt-win-ink)]">{m.stats.wins}</span>–<span className="text-[var(--gt-loss-ink)]">{m.stats.losses}</span></> : "—"}</td>
                {data.can_manage && <td className="hidden px-2 sm:table-cell"><Actions m={m} /></td>}
              </tr>); })}</tbody>
          </table>
          {data.can_manage && <p className="p-2 text-xs text-[var(--gt-muted)] sm:hidden">สลับเป็นแบบการ์ดเพื่อตั้งเจ้าของหรือเอาครูออก</p>}
        </div>
      )}

      {mine && (
        <div className="rounded-xl border-2 border-[#c9daf0] bg-[#f6faff] p-3 text-sm">
          {mine.go_id && !linking ? (
            <p className="flex flex-wrap items-center gap-2">ประวัติการแข่งของคุณ: <b>{mine.go_id}</b>
              <button type="button" onClick={() => setLinking(true)} className="min-h-10 font-semibold text-[var(--gt-cta)] underline">เปลี่ยน</button>
              <button type="button" disabled={busy} onClick={() => void link(null)} className="min-h-10 font-semibold text-[#a42841] underline">ยกเลิกการเชื่อม</button></p>
          ) : !linking ? (
            <p className="flex flex-wrap items-center gap-2">คุณเคยแข่งหมากล้อมไหม? <button type="button" onClick={() => setLinking(true)} className="min-h-10 font-semibold text-[var(--gt-cta)] underline">เชื่อมประวัติการแข่งขันของฉัน</button><span className="text-xs text-[var(--gt-muted)]">(ไม่บังคับ)</span></p>
          ) : (
            <div className="space-y-2">
              <form onSubmit={search} className="flex gap-2">
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อ-นามสกุล หรือรหัส GO ของคุณ" aria-label="ค้นหาประวัติการแข่งของฉัน" className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-[#bed3eb] bg-white px-3" />
                <button className="gt-cta-btn min-h-12 px-4">ค้นหา</button>
              </form>
              {found && (found.length ? <ul className="divide-y divide-[#d9e6f6] rounded-xl border border-[#c9daf0] bg-white">{found.map((f) => (
                <li key={f.go_id} className="flex items-center justify-between gap-2 px-3 py-2"><span><b>{f.name}</b><span className="block text-xs text-[var(--gt-muted)]">{[f.go_id, f.rank].filter(Boolean).join(" · ")}</span></span>
                  <button type="button" disabled={busy} onClick={() => void link(f.go_id)} className="min-h-10 shrink-0 rounded-lg bg-[#0b60c3] px-3 text-xs font-bold text-white disabled:opacity-50">นี่คือฉัน</button></li>))}</ul>
                : <p className="text-[var(--gt-muted)]">ไม่พบชื่อ ลองพิมพ์ชื่อเต็มหรือรหัส GO</p>)}
              <button type="button" onClick={() => { setLinking(false); setFound(null); }} className="min-h-10 text-sm font-semibold underline">ยกเลิก</button>
            </div>
          )}
        </div>
      )}
      {msg && <p role="status" className="rounded-xl bg-[#edf6ff] p-3 text-sm">{msg}</p>}
    </section>
  );
}
