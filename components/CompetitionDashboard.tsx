"use client";
/* eslint-disable @next/next/no-img-element -- existing public poster and decorative artwork */
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import AthletePhotoViewer from "./AthletePhotoViewer";
import MenuIcon from "./MenuIcon";
import CompetitionPanel from "./CompetitionPanel";
import { divisionKey, divisionLabel, thaiDate } from "@/lib/division-display";
import { roundsOf, resultLabel } from "@/lib/competition-day.mjs";
import { boardMode, standingsMode, divisionProgress, latestPairings } from "@/lib/competition-dashboard.mjs";
import type { EventInfo, Division, Match, Bye, Standing, Person, Entrant, Announcement } from "@/app/tournaments/[id]/_ui/data";

export type DashboardDivision = {
  division: Division; matches: Match[]; byes: Bye[]; standings: Standing[]; people: [string, Person][];
  boardAvailable: boolean; standingsAvailable: boolean; fingerprint: string | null; announcements: Announcement[];
};
type Tab = "overview" | "pairings" | "standings" | "entrants" | "announcements";
type Mode = "demo" | "live" | "error";
const TABS: { id: Tab; label: string; icon: "home" | "trophy" | "stats" | "entrants" | "news" }[] = [
  { id: "overview", label: "ภาพรวม", icon: "home" }, { id: "pairings", label: "จับคู่", icon: "trophy" },
  { id: "standings", label: "อันดับ", icon: "stats" }, { id: "entrants", label: "รายชื่อ", icon: "entrants" },
  { id: "announcements", label: "ประกาศ", icon: "news" },
];
const MOCK_PEOPLE: Person[] = Array.from({ length: 8 }, (_, i) => ({
  name: `นักกีฬาตัวอย่าง ${String(i + 1).padStart(2, "0")}`, institution: `สถาบันตัวอย่าง ${i % 2 ? "B" : "A"}`, rank: "5 คิว", photo: null,
}));
const MOCK_STANDINGS: Standing[] = MOCK_PEOPLE.map((p, i) => ({
  pos: i + 1, athlete_id: `demo-${i}`, display_name: p.name, institution: p.institution,
  current_rank: p.rank ?? null, wins: i < 2 ? 2 : i < 6 ? 1 : 0, losses: i < 2 ? 0 : i < 6 ? 1 : 2,
  byes: 0, score: i < 2 ? 2 : i < 6 ? 1 : 0, sos: 0, sosos: 0,
}));
const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

function ExampleTag() { return <span className="cd-example-tag">ตัวอย่างสำหรับเรียนรู้</span>; }
function Player({ person, colour }: { person?: Person; colour?: "black" | "white" }) {
  return <div className="cd-player"><span className="cd-avatar-wrap"><AthletePhotoViewer src={person?.photo} name={person?.name ?? "นักกีฬา"} />
    {colour && <span className={`cd-stone ${colour}`} aria-label={colour === "black" ? "หมากดำ" : "หมากขาว"} />}</span>
    <span><strong>{person?.name ?? "รอรายชื่อจากผู้จัด"}</strong><small>{person?.institution || "ไม่ระบุสถาบัน"}{person?.rank ? ` · ${person.rank}` : ""}</small></span></div>;
}
function PanelTitle({ title, demo, children }: { title: string; demo?: boolean; children?: React.ReactNode }) {
  return <div className="cd-panel-heading"><h2><span className="cd-heading-stones" aria-hidden="true">●○</span>{title}</h2>{demo && <ExampleTag />}{children}</div>;
}

/** Poll only public fingerprints. A change invalidates the same route before requesting fresh server data. */
function useDashboardLive(divisions: DashboardDivision[]) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [notice, setNotice] = useState("");
  const snapshot = useRef(divisions);
  useEffect(() => { snapshot.current = divisions; }, [divisions]);
  const ids = divisions.map(d => d.division.id).join(",");
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || !ids) return;
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const known = new Map(snapshot.current.map(d => [d.division.id, d.fingerprint]));
    let stopped = false, busy = false, firstCheck = true;
    const tick = async () => {
      if (stopped || busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const fresh = await Promise.all(ids.split(",").map(async id => {
          const { data, error } = await db.rpc("gt_division_live_v1", { p_division: id });
          if (error || typeof data !== "string") throw new Error("public read failed");
          return { id, fp: data };
        }));
        if (stopped) return;
        const changed = fresh.filter(d => firstCheck || d.fp !== known.get(d.id));
        if (changed.length) {
          const responses = await Promise.all(changed.map(d => fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ division: d.id }) })));
          if (responses.some(r => !r.ok)) throw new Error("refresh failed");
          if (stopped) return;
          firstCheck = false;
          // Retry until the newly rendered page actually carries the new fingerprint (including cache races).
          fresh.forEach(d => { if (snapshot.current.find(s => s.division.id === d.id)?.fingerprint === d.fp && snapshot.current.find(s => s.division.id === d.id)?.boardAvailable && snapshot.current.find(s => s.division.id === d.id)?.standingsAvailable) known.set(d.id, d.fp); });
          if (fresh.some(d => d.fp !== known.get(d.id))) setNotice("มีการอัปเดตคู่แข่งขันหรือผลการแข่งขันแล้ว");
          startTransition(() => router.refresh());
        }
        setOffline(false);
        setCheckedAt(new Date().toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } catch { if (!stopped) setOffline(true); }
      finally { busy = false; }
    };
    void tick();
    const timer = window.setInterval(tick, 10000);
    const wake = () => { if (document.visibilityState === "visible") void tick(); };
    window.addEventListener("focus", wake); window.addEventListener("online", wake); document.addEventListener("visibilitychange", wake);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener("focus", wake); window.removeEventListener("online", wake); document.removeEventListener("visibilitychange", wake); };
  }, [ids, router]);
  const refresh = async () => {
    try {
      await Promise.all(snapshot.current.map(d => fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ division: d.division.id }) })));
    } finally { startTransition(() => router.refresh()); }
  };
  return { pending, checkedAt, offline, notice, refresh };
}

function Schedule({ event }: { event: EventInfo }) {
  const zeer = /zeer.*kyu.*war.*2026/i.test(event.title);
  return <section className="cd-panel" id="schedule"><PanelTitle title="ตารางเวลาและมอบรางวัล" />
    {zeer ? <div className="cd-schedule"><p className="cd-subtle">{thaiDate(event.event_date)} · แต่ละรุ่นแข่งแยกกัน</p>
      <div><strong>Friendship 9×9</strong><span>08:30–11:20 น. · 6 รอบ</span><b>มอบรางวัล 11:45 น.</b></div>
      <div><strong>Friendship 13×13</strong><span>เริ่ม 14:00 น. · 5 รอบ</span><b>มอบรางวัล 16:40 น.</b></div>
      <div><strong>รุ่น Kyu</strong><span>เริ่ม 08:30 น. ตามตารางแต่ละรุ่น</span><b>มอบรางวัล 18:00 น.</b></div>
    </div> : <p className="cd-message">รอผู้จัดประกาศตารางเวลาแข่งขันและมอบรางวัล</p>}
  </section>;
}

function StandingsTable({ row, mode, compact = false, search = "", pool = "*" }: { row: DashboardDivision; mode: Mode; compact?: boolean; search?: string; pool?: string }) {
  if (mode === "error") return <p className="cd-message" role="status">ยังโหลดตารางอันดับไม่ได้ กรุณากดรีเฟรชเพื่อลองอีกครั้ง</p>;
  const demo = mode === "demo";
  const people = new Map(row.people);
  const recorded = row.standings.some(s => s.wins + s.losses + (s.draws ?? 0) + s.byes > 0);
  const source = (demo ? MOCK_STANDINGS : row.standings).filter(s => !s.withdrawn && (pool === "*" || (s.pool_label ?? "") === pool)
    && `${s.display_name ?? ""} ${s.institution ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const rows = compact ? source.filter(s => (s.pos ?? 99) <= 8) : source;
  return <>{demo ? <p className="cd-teach">ตัวอย่างวิธีอ่านอันดับและคะแนน ข้อมูลจริงจะแทนที่เมื่อประกาศคู่แข่งขัน</p> : !recorded && <p className="cd-message">ประกาศคู่แข่งขันแล้ว · ยังไม่มีผลยืนยัน จึงยังไม่จัดอันดับ</p>}
    <div className="cd-table-scroll"><table className={`cd-rank-table ${compact ? "cd-rank-compact" : "cd-rank-full"}`}><colgroup><col className="cd-col-place" /><col className="cd-col-player" /><col className="cd-col-number" span={compact ? 1 : 5} /></colgroup><thead><tr><th scope="col">#</th><th scope="col">นักกีฬา / สถาบัน</th><th scope="col">คะแนน</th>{!compact && <><th scope="col">ชนะ</th><th scope="col">แพ้</th><th scope="col">SOS</th><th scope="col">SOSOS</th></>}</tr></thead><tbody>
      {rows.map((s, i) => <tr key={`${s.pool_label}-${s.athlete_id ?? i}`}><td><span className={`cd-place p${demo || recorded ? s.pos : 0}`}>{demo || recorded ? s.pos : "–"}</span></td><td><Player person={{ name: s.display_name ?? "นักกีฬา", institution: s.institution ?? "", rank: s.current_rank, photo: people.get(s.athlete_id ?? "")?.photo }} />{s.pool_label && <small className="cd-pool-note">สาย {s.pool_label}</small>}</td><td><strong>{fmt(s.score)}</strong></td>{!compact && <><td className="cd-wins">{s.wins}</td><td className="cd-losses">{s.losses}</td><td>{s.sos}</td><td>{s.sosos}</td></>}</tr>)}
    </tbody></table></div>{!rows.length && <p className="cd-message">{search ? "ไม่พบรายชื่อที่ค้นหา" : "รอข้อมูลอันดับจากการแข่งขัน"}</p>}</>;
}

function MatchTable({ row, mode, round, pool, search, compact }: { row: DashboardDivision; mode: Mode; round: number | "latest"; pool: string; search: string; compact: boolean }) {
  if (mode === "error") return <p className="cd-message" role="status">ยังโหลดคู่แข่งขันไม่ได้ กรุณากดรีเฟรชเพื่อลองอีกครั้ง</p>;
  const demo = mode === "demo";
  const people = new Map(row.people);
  const chosen = round === "latest" ? latestPairings(row.matches, row.byes, pool) : {
    matches: row.matches.filter(m => m.state !== "void" && m.round_number === round && (pool === "*" || (m.pool_label ?? "") === pool)),
    byes: row.byes.filter(b => b.round_number === round && (pool === "*" || (b.pool_label ?? "") === pool)),
  };
  const demoRound = round === "latest" ? 1 : round;
  const matches: { key: string; board: number | null; round: number; pool: string | null; black?: Person; white?: Person; status: string; done: boolean }[] = demo
    ? Array.from({ length: 6 }, (_, i) => ({ key: `example-${i}`, board: i + 1, round: demoRound, pool: null,
      black: MOCK_PEOPLE[(i * 2 + demoRound - 1) % 8], white: MOCK_PEOPLE[(i * 2 + demoRound) % 8],
      status: i === 2 ? "ตัวอย่าง: รอผล" : i === 3 ? "ตัวอย่าง: ดำชนะ" : "ตัวอย่าง: รอเริ่ม", done: i === 3 }))
    : chosen.matches.map((m: Match) => ({ key: m.id, board: m.board_number, round: m.round_number, pool: m.pool_label ?? null,
      black: people.get(m.black_athlete_id), white: people.get(m.white_athlete_id), status: resultLabel(m) || "รอผลการแข่งขัน", done: m.state === "verified" }));
  const filtered = matches.filter(m => `${m.black?.name ?? ""} ${m.white?.name ?? ""} ${m.black?.institution ?? ""} ${m.white?.institution ?? ""} ${m.board ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const shown = compact ? filtered.slice(0, 6) : filtered;
  const byes = chosen.byes.filter((b: Bye) => `${people.get(b.athlete_id)?.name ?? ""} ${people.get(b.athlete_id)?.institution ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <>{demo && <p className="cd-teach">ลองเลือกรอบ ค้นหาชื่อ และอ่านหมายเลขโต๊ะ · ทั้งหมดเป็นข้อมูลตัวอย่าง เมื่อมีคู่จริงตัวอย่างจะหายไปอัตโนมัติ</p>}
    <div className="cd-table-scroll"><table className="cd-match-table"><thead><tr><th scope="col">โต๊ะ / รอบ</th><th scope="col">ผู้เล่นฝ่ายดำ ●</th><th scope="col">ผู้เล่นฝ่ายขาว ○</th><th scope="col">สถานะ</th></tr></thead><tbody>
      {shown.map(m => <tr key={m.key}><td className="cd-board"><strong>โต๊ะ {m.board ?? "–"}</strong><small>รอบ {m.round}{m.pool ? ` · สาย ${m.pool}` : ""}</small></td><td><Player person={m.black} colour="black" /></td><td><Player person={m.white} colour="white" /></td><td className="cd-match-status"><span className={`cd-pill ${m.done ? "done" : "waiting"}`}>{m.status}</span></td></tr>)}
    </tbody></table></div>
    {!demo && byes.map((b: Bye) => <div className="cd-bye" key={`${b.pool_label}-${b.round_number}-${b.athlete_id}`}><Player person={people.get(b.athlete_id)} /><span className="cd-pill done">ได้บาย · รอบ {b.round_number}{b.pool_label ? ` · สาย ${b.pool_label}` : ""}</span></div>)}
    {!shown.length && !byes.length && <p className="cd-message">{search ? "ไม่พบคู่แข่งขันที่ค้นหา" : "ยังไม่มีคู่แข่งขันในรอบหรือสายที่เลือก"}</p>}
    {compact && filtered.length > 6 && <p className="cd-subtle cd-padding">แสดง 6 โต๊ะจาก {filtered.length} โต๊ะ · เลือกเมนูจับคู่เพื่อดูทั้งหมด</p>}
  </>;
}

function CompetitionWorkspace({ row, event, entrants, active, selectTab }: { row: DashboardDivision; event: EventInfo; entrants: Entrant[]; active: Tab; selectTab: (t: Tab) => void }) {
  const mode = boardMode(row.boardAvailable, row.matches, row.byes) as Mode;
  const ranksMode = standingsMode(row.standingsAvailable, mode, row.standings) as Mode;
  const [search, setSearch] = useState("");
  const [matchView, setMatchView] = useState<"auto" | "cards" | "table">("auto");
  const [round, setRound] = useState<number | "latest">("latest");
  const [pool, setPool] = useState("*");
  const published = [...new Set([...row.matches.filter(m => m.state !== "void"), ...row.byes].map(m => m.round_number))].sort((a, b) => a - b);
  const rounds = mode === "demo" ? [1, 2, 3].filter(n => n <= roundsOf(row.division)) : published;
  const selectedRound = round === "latest" || rounds.includes(round) ? round : "latest";
  const pools = mode === "demo" ? [] : [...new Set([...row.matches, ...row.byes, ...row.standings].map(m => m.pool_label ?? ""))];
  const selectedPool = pools.includes(pool) ? pool : "*";
  const names = entrants.filter(e => divisionKey(e.division_name) === divisionKey(row.division.name)
    && `${e.full_name} ${e.institution}`.toLowerCase().includes(search.toLowerCase()));
  const showBoard = active === "overview" || active === "pairings";
  const showRanks = active === "overview" || active === "standings";
  return <>
    {(showBoard || active === "standings" || active === "entrants") && <div className="cd-tools">
      <label className="cd-search"><span>ค้นหา{active === "pairings" || active === "overview" ? "ชื่อ / สถาบัน / โต๊ะ" : "ชื่อ / สถาบัน"}</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="พิมพ์คำค้นหา…" /></label>
      {pools.some(p => p !== "") && active !== "entrants" && <label className="cd-filter"><span>สายการแข่งขัน</span><select value={selectedPool} onChange={e => setPool(e.target.value)}><option value="*">ทุกสาย</option>{pools.map(p => <option key={p} value={p}>{p ? `สาย ${p}` : "ไม่ระบุสาย"}</option>)}</select></label>}
      {showBoard && <div className="cd-rounds" aria-label="เลือกรอบการแข่งขัน"><button type="button" aria-pressed={selectedRound === "latest"} onClick={() => setRound("latest")}>ล่าสุด</button>{rounds.map(n => <button type="button" key={n} aria-pressed={selectedRound === n} onClick={() => setRound(n)}>รอบ {n}</button>)}</div>}
    </div>}
    <div className={active === "overview" ? "cd-work-grid" : "cd-work-single"}>
      <div className="cd-work-main">
        {showBoard && <CompetitionPanel className={`cd-match-view-${matchView}`} title="คู่แข่งขัน" context={`${event.title} · ${divisionLabel(row.division.name)} · ${selectedRound === "latest" ? "รอบล่าสุด" : `รอบ ${selectedRound}`}${selectedPool !== "*" ? ` · สาย ${selectedPool}` : ""}${search ? ` · ค้นหา: ${search}` : ""}`}><PanelTitle title="รอบแข่งขันล่าสุด" demo={mode === "demo"} />
          <div className="cd-view-switch" role="group" aria-label="มุมมองคู่แข่งขัน" data-export-ignore="true">
            <button type="button" className={matchView === "auto" ? "cd-auto-cards" : ""} aria-pressed={matchView === "cards"} onClick={() => setMatchView("cards")}>▦ แบบการ์ด</button>
            <button type="button" className={matchView === "auto" ? "cd-auto-table" : ""} aria-pressed={matchView === "table"} onClick={() => setMatchView("table")}>☷ แบบตาราง</button>
          </div>
          <MatchTable row={row} mode={mode} round={selectedRound} pool={selectedPool} search={search} compact={active === "overview"} />
          {active === "overview" && <button className="cd-panel-link" type="button" onClick={() => selectTab("pairings")}>ดูตารางจับคู่ทั้งหมด →</button>}
        </CompetitionPanel>}
        {active === "standings" && <CompetitionPanel className="cd-full-standings" title="ตารางอันดับ" context={`${event.title} · ${divisionLabel(row.division.name)}${selectedPool !== "*" ? ` · สาย ${selectedPool}` : ""}${search ? ` · ค้นหา: ${search}` : ""}`}><PanelTitle title={`ตารางอันดับ : ${divisionLabel(row.division.name)}`} demo={ranksMode === "demo"} />
          <div className="cd-rank-summary"><span><MenuIcon name="entrants" />ผู้เข้าแข่งขัน <b>{mode === "demo" ? MOCK_PEOPLE.length : names.length} คน</b></span><span><MenuIcon name="trophy" />แข่งขัน <b>{roundsOf(row.division)} รอบ</b></span><span className={divisionProgress(row.matches, row.byes, roundsOf(row.division)).complete ? "complete" : ""}>{mode === "demo" ? "ข้อมูลตัวอย่าง" : divisionProgress(row.matches, row.byes, roundsOf(row.division)).complete ? "✓ จบการแข่งขันแล้ว" : "ติดตามผลการแข่งขัน"}</span></div>
          <StandingsTable row={row} mode={ranksMode} search={search} pool={selectedPool} />
          <p className="cd-rank-key">คะแนน = คะแนนจากผลการแข่งขัน · SOS = ผลรวมคะแนนของคู่แข่ง · SOSOS = ผลรวม SOS ของคู่แข่ง</p></CompetitionPanel>}
        {active === "entrants" && <section className="cd-panel"><PanelTitle title={`รายชื่อผู้สมัคร · ${names.length} คน`} /><p className="cd-subtle cd-padding">รายชื่อจากการสมัครจริง · ยังไม่ใช่ผลจับคู่</p>
          <div className="cd-entrant-grid">{names.map((e, i) => <div key={`${e.source}-${e.source_row}-${i}`}><span className="cd-entry-number">{i + 1}</span><Player person={{ name: `${e.title ?? ""}${e.full_name}`, institution: e.institution }} /></div>)}</div>{!names.length && <p className="cd-message">{search ? "ไม่พบรายชื่อที่ค้นหา" : "รอข้อมูลรายชื่อผู้สมัคร"}</p>}
        </section>}
        {(active === "overview" || active === "announcements") && <section className="cd-panel"><PanelTitle title="ประกาศจากผู้จัด" />
          {row.announcements.length ? row.announcements.map(a => <article className="cd-announcement" key={a.id}><h3>{a.title}</h3><p>{a.body}</p><small>{new Date(a.created_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })}</small></article>)
            : <div className="cd-preparation"><h3>เตรียมพร้อมก่อนแข่งขัน</h3><ol><li>เลือกชื่อรุ่นของตัวเอง แล้วเปิดเมนูจับคู่</li><li>ค้นหาชื่อตัวเอง ตรวจหมายเลขโต๊ะ คู่แข่งขัน และสีหมาก</li><li>วันแข่งขันให้นั่งตามโต๊ะและรอกรรมการเช็กชื่อก่อนเริ่ม</li><li>ติดตามผลและอันดับได้จากหน้าเดียวกัน</li></ol><p>ผู้จัดยังไม่มีประกาศเพิ่มเติมสำหรับงานนี้</p></div>}
        </section>}
      </div>
      <aside className="cd-work-side">
        {active === "overview" && showRanks && <section className="cd-panel"><PanelTitle title="อันดับล่าสุด (Top 8 ต่อสาย)" demo={ranksMode === "demo"} /><StandingsTable row={row} mode={ranksMode} compact search={search} pool={selectedPool} /><button className="cd-panel-link" type="button" onClick={() => selectTab("standings")}>ดูอันดับทั้งหมด →</button></section>}
        {(active === "overview" || active === "announcements") && <Schedule event={event} />}
      </aside>
    </div>
  </>;
}

export default function CompetitionDashboard({ event, divisions, entrants, initialTab = "overview" }: { event: EventInfo; divisions: DashboardDivision[]; entrants: Entrant[]; initialTab?: Tab }) {
  const [selectedId, setSelectedId] = useState(divisions[0]?.division.id ?? "");
  const [active, setActive] = useState<Tab>(initialTab);
  const selected = divisions.find(d => d.division.id === selectedId) ?? divisions[0];
  const live = useDashboardLive(divisions);
  const hasPairings = divisions.some(d => boardMode(d.boardAvailable, d.matches, d.byes) === "live");
  const hasDemo = divisions.some(d => boardMode(d.boardAvailable, d.matches, d.byes) === "demo");
  const hasResults = divisions.some(d => d.matches.some(m => m.state === "verified"));
  const boards = divisions.reduce((sum, d) => sum + latestPairings(d.matches, d.byes).matches.length, 0);
  const announcements = divisions.flatMap(d => d.announcements).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const selectTab = (tab: Tab) => { setActive(tab); document.getElementById("competition-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const selectedMode = selected ? boardMode(selected.boardAvailable, selected.matches, selected.byes) : "error";
  const workspaceMode = active === "entrants" ? "live" : active === "announcements" ? "none" : active === "standings" && selected
    ? standingsMode(selected.standingsAvailable, selectedMode, selected.standings) : selectedMode;
  return <div className={`competition-page cd-dashboard cd-view-${active}`}><SiteBar current="/tournaments" />
    <header className="cd-event-hero"><img src="/event-hero-board.webp" alt="" className="cd-hero-art" /><div className="cd-hero-inner">
      {event.poster_url && <Link href={`/tournaments/${event.id}`} className="cd-poster-link"><img src={event.poster_url} alt={`โปสเตอร์ ${event.title}`} /></Link>}
      <div className="cd-hero-copy"><span className={`cd-event-status ${hasResults ? "live" : ""}`}><span />{hasResults ? "ติดตามผลการแข่งขัน" : hasPairings ? "ประกาศคู่แข่งขันแล้ว" : "เตรียมพร้อมก่อนแข่งขัน"}</span>
        <h1>{event.title}</h1><p>{thaiDate(event.event_date) ?? "รอประกาศวันแข่งขัน"} <span>│</span> {event.venue ?? "รอประกาศสถานที่"}</p>
        <p className="cd-hero-caption">ค้นหาคู่แข่งขัน ตรวจโต๊ะ และติดตามอันดับได้ในหน้าเดียว</p>
        <Link href={`/tournaments/${event.id}`}>รายละเอียดงานและการสมัคร →</Link>
      </div></div></header>
    <main className="competition-content cd-content">
      <div className="cd-stat-grid">
        <div><MenuIcon name="entrants" /><span><small>ผู้สมัครแข่งขัน</small><strong>{entrants.length} <em>สิทธิ์</em></strong></span></div>
        <div><MenuIcon name="trophy" /><span><small>รอบแข่งขัน · รุ่นที่เลือก</small><strong>{selected ? `${divisionProgress(selected.matches, selected.byes, roundsOf(selected.division)).lastRound || "–"} / ${roundsOf(selected.division)}` : "–"} <em>รอบ</em></strong></span></div>
        <div><MenuIcon name="stats" /><span><small>โต๊ะที่ประกาศ · รอบล่าสุด</small><strong>{boards || "–"} <em>{boards ? "โต๊ะ" : "รอจับคู่"}</em></strong></span></div>
        <button type="button" onClick={() => selectTab("announcements")}><MenuIcon name="news" /><span><small>ประกาศล่าสุด</small><strong className="cd-stat-announcement">{announcements[0]?.title ?? "เตรียมพร้อมก่อนแข่งขัน"}</strong></span><span aria-hidden="true">›</span></button>
      </div>
      {hasDemo && <aside className="cd-learning-banner"><span className="cd-learning-icon"><MenuIcon name="faq" /></span><div><strong>ทดลองเรียนรู้หน้าแข่งขันได้ก่อนวันงาน</strong><p>เลือกรุ่น ลองค้นหาชื่อ ดูหมายเลขโต๊ะ สีหมาก และอันดับในข้อมูลตัวอย่าง เมื่อผู้จัดจับคู่จริง ระบบจะแสดงข้อมูลจริงแทนให้เอง</p></div><ExampleTag /></aside>}
      <div className="cd-section-line"><h2>สถานะการแข่งขันแยกตามรุ่น</h2><div className="cd-live-status"><span>{live.offline ? "ขาดการเชื่อมต่อ · กำลังลองใหม่" : live.pending ? "กำลังอัปเดต…" : "อัปเดตอัตโนมัติทุก 10 วินาที"}{live.checkedAt ? ` · ${live.checkedAt}` : ""}</span><button type="button" disabled={live.pending} onClick={() => void live.refresh()}>↻ รีเฟรช</button></div></div>
        <nav className="cd-tabs" aria-label="เมนูหน้าแข่งขัน">{TABS.map(tab => <button type="button" key={tab.id} aria-current={active === tab.id ? "page" : undefined} onClick={() => setActive(tab.id)}><MenuIcon name={tab.icon} />{tab.label}</button>)}</nav>
      <div className="cd-body-layout">
      <aside className="cd-division-selector"><h2><MenuIcon name="entrants" />เลือกรุ่นการแข่งขัน</h2><div className="cd-division-strip">{divisions.map(d => {
        const state = divisionProgress(d.matches, d.byes, roundsOf(d.division));
        const mode = boardMode(d.boardAvailable, d.matches, d.byes);
        const label = mode === "error" ? "กำลังรอข้อมูล" : state.complete ? "จบการแข่งขันแล้ว" : state.played ? "กำลังแข่งขัน" : state.lastRound ? "ประกาศคู่แข่งขันแล้ว" : "รอการแข่งขัน";
        return <button type="button" key={d.division.id} className={`cd-division-card ${selected?.division.id === d.division.id ? "selected" : ""}`} aria-pressed={selected?.division.id === d.division.id} onClick={() => setSelectedId(d.division.id)}>
          <MenuIcon name={/friendship|เฟรน/i.test(d.division.name) ? "entrants" : "trophy"} /><strong>{divisionLabel(d.division.name)}</strong>
          <span className={`cd-pill ${state.complete ? "done" : state.played ? "live" : "waiting"}`}>{label}</span><small>{state.lastRound ? `ประกาศคู่ถึงรอบ ${state.lastRound} / ${roundsOf(d.division)}` : "รอประกาศคู่รอบแรก"}</small><span className="cd-division-action">{mode === "demo" ? "ลองดูหน้าแข่งขัน" : "ดูคู่แข่งขันและผล"} →</span>
        </button>;
      })}</div><img className="cd-selector-art" src="/event-hero-board.webp" alt="" /></aside>
      <div className="cd-workspace" id="competition-workspace">
        {selected ? <CompetitionWorkspace key={`${selected.division.id}-${selectedMode}`} row={selected} event={event} entrants={entrants} active={active} selectTab={selectTab} /> : <p className="cd-message">รอผู้จัดประกาศรุ่นการแข่งขัน</p>}
      </div>
      </div>
      <p className="cd-update-notice" role="status" aria-live="polite">{live.notice}</p>
      <aside className="cd-footnote">การแข่งขันแต่ละรุ่นดำเนินการแยกกัน สามารถดูผลของรุ่นที่จบแล้วได้ทันที · ข้อมูลตัวอย่างใช้เพื่อเรียนรู้เท่านั้น ไม่มีผลต่อคะแนนหรืออันดับจริง</aside>
    </main>
    <footer className="cd-footer"><strong>●○ GO TOURNAMENT</strong><span>ระบบจัดการแข่งขันหมากล้อม (Go)<br />สำหรับการแข่งขันในประเทศไทย</span><Link href="/tournaments">รายการแข่งขันทั้งหมด →</Link></footer>
  </div>;
}
