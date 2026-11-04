import Link from "next/link";
import { Header, Icon, Shell, STONES_IMAGE, Thumb } from "../../_ui/chrome";
import { loadEntrants, loadEvent, publicDb } from "../../_ui/data";
import { boardSize, divisionKey, divisionLabel, thaiDate } from "@/lib/division-display";

export const dynamic = "force-dynamic";

type Tab = "list" | "pairs" | "results" | "standings";
const TABS: { id: Tab; label: string }[] = [
  { id: "list", label: "รายชื่อ" }, { id: "pairs", label: "จับคู่" }, { id: "results", label: "ผลแข่ง" }, { id: "standings", label: "อันดับ" },
];
type Match = {
  id: string; round_number: number; board_number: number | null; black_athlete_id: string; white_athlete_id: string;
  winner_athlete_id: string | null; result_code: string | null; result_margin: string | null; state: string;
};
type Bye = { round_number: number; athlete_id: string };
type Standing = {
  pos: number; athlete_id: string | null; display_name: string | null; current_rank: string | null;
  wins: number; losses: number; byes: number; score: number; sos: number; sosos: number;
};

const resultText = (m: Match) => {
  if (m.result_code === "double_forfeit") return "ไม่มีผู้ชนะ (สละสิทธิ์ทั้งคู่)";
  const side = m.result_code === "black_win" ? "ดำชนะ" : m.result_code === "white_win" ? "ขาวชนะ" : null;
  if (!side) return "รอผล";
  if (!m.result_margin) return side;
  return m.result_margin === "R" ? `${side} (ยอมแพ้)` : m.result_margin === "T" ? `${side} (หมดเวลา)` : `${side} ${m.result_margin} แต้ม`;
};

const payBadge = (s: string) =>
  s === "ชำระเงินแล้ว" ? { text: "ชำระเงินแล้ว", cls: "text-[var(--gt-ok)]", ok: true }
  : s.includes("รอตรวจ") ? { text: s, cls: "text-[var(--gt-warn)]", ok: false }
  : { text: s || "รอตรวจสอบ", cls: "text-[var(--gt-muted)]", ok: false };

function Stone({ color }: { color: "b" | "w" }) {
  return <span aria-hidden="true" className={`inline-block h-4 w-4 shrink-0 rounded-full ${color === "b" ? "bg-[radial-gradient(circle_at_35%_30%,#5b6170,#111_65%)]" : "border border-[var(--gt-muted)] bg-[radial-gradient(circle_at_35%_30%,#fff,#dfe3ea)]"}`} />;
}

function Notice({ title, body, icon = "clock" }: { title: string; body: string; icon?: "clock" | "info" }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-4 py-3">
      <Icon name={icon} className="h-7 w-7 shrink-0 text-[var(--gt-brand)]" />
      <div><p className="font-semibold">{title}</p><p className="text-xs text-[var(--gt-muted)]">{body}</p></div>
    </div>
  );
}

export default async function DivisionPage({ params, searchParams }: {
  params: Promise<{ id: string; divisionId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id, divisionId } = await params;
  const sp = await searchParams;
  const tab: Tab = (TABS.find((t) => t.id === sp.tab)?.id) ?? "list";
  const q = (typeof sp.q === "string" ? sp.q : "").trim();

  const db = publicDb();
  const [{ event, divisions }, entrants] = await Promise.all([loadEvent(db, id), loadEntrants(db, id)]);
  const division = divisions.find((d) => d.id === divisionId);

  if (!event || !division || !db) {
    return (
      <Shell>
        <Header backHref={`/tournaments/${id}`} backLabel="กลับรายละเอียดงาน" />
        <div className="gt-card mx-4 mt-6 p-8 text-center">
          <h1 className="text-xl font-bold">ไม่พบรุ่นการแข่งขันนี้</h1>
          <p className="mt-2 text-sm text-[var(--gt-muted)]">รุ่นนี้อาจยังไม่เผยแพร่ หรือลิงก์ไม่ถูกต้อง</p>
          <Link href={`/tournaments/${id}`} className="gt-gold-btn mt-5 inline-block px-5 py-3 text-sm">กลับรายละเอียดงาน</Link>
        </div>
      </Shell>
    );
  }

  // Public visibility follows the database rules: only verified games of athletes with public profiles.
  const [matchRes, byeRes, standRes] = await Promise.all([
    db.from("gt_matches").select("id,round_number,board_number,black_athlete_id,white_athlete_id,winner_athlete_id,result_code,result_margin,state")
      .eq("division_id", divisionId).neq("state", "void"),
    db.from("gt_byes").select("round_number,athlete_id").eq("division_id", divisionId),
    db.rpc("gt_division_standings_v1", { p_division: divisionId }),
  ]);
  const matches = (matchRes.data ?? []) as Match[];
  const byes = (byeRes.data ?? []) as Bye[];
  const standings = (standRes.data ?? []) as Standing[];
  const names = new Map(standings.filter((s) => s.athlete_id && s.display_name).map((s) => [s.athlete_id as string, s.display_name as string]));
  const nameOf = (athleteId: string) => names.get(athleteId) ?? "ผู้เข้าแข่งขัน";

  const roster = entrants.filter((e) => divisionKey(e.division_name) === divisionKey(division.name));
  const shown = q ? roster.filter((e) => `${e.title}${e.full_name} ${e.institution}`.toLowerCase().includes(q.toLowerCase())) : roster;
  const rounds = [...new Set([...matches.map((m) => m.round_number), ...byes.map((b) => b.round_number)])].sort((a, b) => b - a);
  const lastRound = rounds[0] ?? 0;
  const status = lastRound ? `กำลังแข่ง · รอบ ${lastRound}` : "ก่อนแข่งขัน";
  const label = divisionLabel(division.name);
  const tabHref = (t: Tab) => `/tournaments/${id}/divisions/${divisionId}?tab=${t}`;

  return (
    <Shell
      bottomBar={<>
        <a href={`/tournaments/${id}#contact`} className="gt-outline-btn flex flex-1 items-center justify-center gap-2 py-3 text-[15px] font-semibold"><Icon name="chat" className="h-6 w-6 text-[var(--gt-brand)]" />ติดต่อผู้จัด</a>
        <Link href="/register" className="gt-gold-btn flex flex-1 items-center justify-center gap-2 py-3 text-base">สมัครรุ่นนี้ <Icon name="chevron" className="h-4 w-4" /></Link>
      </>}
    >
      <Header backHref={`/tournaments/${id}`} backLabel="กลับรายละเอียดงาน" />

      <main className="px-4">
        <nav aria-label="ตำแหน่งหน้า" className="mt-1 text-[15px] font-bold">
          <Link href={`/tournaments/${id}`} className="hover:underline">รายละเอียดงาน</Link><span className="mx-1.5 text-[var(--gt-muted)]">/</span><span>{label.replace(/^รุ่น\s?/, "รุ่น ")}</span>
        </nav>

        <section className="gt-card mt-2 flex items-center gap-3 p-2.5">
          <Thumb src={event.poster_url || STONES_IMAGE} alt="" className="h-16 w-28 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate font-bold">{event.title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm"><Icon name="calendar" className="h-4 w-4 text-[var(--gt-gold)]" />{thaiDate(event.event_date) ?? "รอประกาศวันแข่งขัน"}</p>
          </div>
        </section>

        <section className="gt-card mt-3 p-3">
          <div className="flex items-center gap-3">
            <Thumb src={STONES_IMAGE} alt="" shift={divisions.indexOf(division)} className="h-14 w-24 rounded-[10px]" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-tight sm:text-2xl">{label}</h1>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${lastRound ? "gt-pill-gold" : "border border-[var(--gt-line)] bg-[var(--gt-surface-2)] text-[var(--gt-brand)]"}`}>{status}</span>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {[
              { icon: "users" as const, k: "ผู้สมัคร", v: `${roster.length} คน` },
              { icon: "grid" as const, k: "กระดาน", v: `${boardSize(division.name, division.friendship_board_size)}×${boardSize(division.name, division.friendship_board_size)}` },
              { icon: "trophy" as const, k: "แข่งแล้ว", v: lastRound ? `${lastRound} รอบ` : "รอประกาศ" },
            ].map((s) => (
              <div key={s.k} className="flex items-center gap-1.5 rounded-xl border border-[var(--gt-line)] px-2 py-2">
                <Icon name={s.icon} className="h-5 w-5 shrink-0 text-[var(--gt-gold)]" />
                <div className="min-w-0"><dt className="truncate text-[11px] text-[var(--gt-muted)]">{s.k}</dt><dd className="gt-num truncate font-bold">{s.v}</dd></div>
              </div>
            ))}
          </dl>
          {division.seats_limit != null && <p className="mt-2 text-right text-xs text-[var(--gt-muted)]">รับสูงสุด {division.seats_limit} คน{division.entry_fee_thb != null ? ` · ค่าสมัคร ${division.entry_fee_thb} บาท` : ""}</p>}
        </section>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <a href={`/tournaments/${id}#rules`} className="gt-outline-btn flex items-center justify-center gap-2 py-3 text-[15px] font-semibold"><Icon name="doc" className="h-6 w-6 text-[var(--gt-brand)]" />คุณสมบัติและกติกา</a>
          <a href={`/tournaments/${id}#schedule`} className="gt-outline-btn flex items-center justify-center gap-2 py-3 text-[15px] font-semibold"><Icon name="calendar" className="h-6 w-6 text-[var(--gt-brand)]" />กำหนดการ</a>
        </div>

        <nav aria-label="ข้อมูลรุ่น" className="gt-tabs gt-card mt-4 grid grid-cols-4 gap-1 p-1">
          {TABS.map((t) => (
            <Link key={t.id} href={tabHref(t.id)} scroll={false} aria-current={tab === t.id ? "page" : undefined}
              className="rounded-[10px] py-2.5 text-center text-[15px] font-semibold text-[var(--gt-ink)]">{t.label}</Link>
          ))}
        </nav>

        {tab === "list" && (
          <>
            {!lastRound && <Notice title="ยังไม่ประกาศคู่แข่งขัน" body="คู่แข่งขันจะแสดงที่แท็บจับคู่เมื่อผู้จัดประกาศ" />}
            <form action={`/tournaments/${id}/divisions/${divisionId}`} className="mt-3">
              <input type="hidden" name="tab" value="list" />
              <label className="flex items-center gap-2 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3">
                <Icon name="search" className="h-5 w-5 text-[var(--gt-muted)]" />
                <span className="sr-only">ค้นหาชื่อหรือสถาบัน</span>
                <input id="q" name="q" defaultValue={q} placeholder="ค้นหาชื่อหรือสถาบัน" className="w-full bg-transparent py-3 text-[15px] outline-none placeholder:text-[var(--gt-muted)]" />
              </label>
            </form>
            <div className="mt-4 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">รายชื่อผู้สมัคร</h2>
              <span className="gt-num font-semibold">{q ? `${shown.length} จาก ${roster.length}` : roster.length} คน</span>
            </div>
            {shown.length ? (
              <ol className="mt-2 grid gap-1.5">
                {shown.map((e, i) => {
                  const b = payBadge(e.payment_status);
                  return (
                    <li key={e.source_row} className="gt-card flex items-center gap-3 px-3 py-2">
                      <span className="gt-num grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--gt-surface-2)] text-sm font-semibold">{i + 1}</span>
                      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--gt-surface-2)] text-[var(--gt-brand)]"><Icon name="users" className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{e.title} {e.full_name}</span>
                        <span className="block truncate text-xs text-[var(--gt-muted)]">{e.institution || "ไม่ระบุสถาบัน"}</span>
                      </span>
                      <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${b.cls}`}>
                        {b.ok && <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M7.5 12.5l3 3 6-6" fill="none" stroke="var(--gt-surface)" strokeWidth="2.4" strokeLinecap="round" /></svg>}
                        {b.text}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="gt-card mt-2 p-5 text-center text-sm text-[var(--gt-muted)]">{q ? "ไม่พบชื่อที่ค้นหาในรุ่นนี้" : "ยังไม่มีรายชื่อที่เผยแพร่ในรุ่นนี้"}</p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--gt-muted)]"><Icon name="info" className="h-4 w-4" />รายชื่อตามที่ผู้จัดอนุญาตให้เผยแพร่ สถานะอาจเปลี่ยนแปลงภายหลัง</p>
          </>
        )}

        {tab === "pairs" && (
          rounds.length ? rounds.map((r) => (
            <section key={r} className="mt-4">
              <h2 className="text-lg font-bold">รอบที่ {r}</h2>
              <ol className="mt-2 grid gap-1.5">
                {matches.filter((m) => m.round_number === r).sort((a, b) => (a.board_number ?? 999) - (b.board_number ?? 999)).map((m) => (
                  <li key={m.id} className="gt-card flex items-center gap-3 px-3 py-2.5">
                    <span className="gt-num w-14 shrink-0 text-sm font-semibold text-[var(--gt-muted)]">โต๊ะ {m.board_number ?? "–"}</span>
                    <span className="grid min-w-0 flex-1 gap-1 text-[15px]">
                      <span className="flex items-center gap-2"><Stone color="b" /><span className="truncate">{nameOf(m.black_athlete_id)}</span></span>
                      <span className="flex items-center gap-2"><Stone color="w" /><span className="truncate">{nameOf(m.white_athlete_id)}</span></span>
                    </span>
                  </li>
                ))}
                {byes.filter((b) => b.round_number === r).map((b) => (
                  <li key={b.athlete_id} className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--gt-line)] px-3 py-2.5">
                    <span className="w-14 shrink-0 text-sm font-semibold text-[var(--gt-muted)]">บาย</span>
                    <span className="flex-1 truncate">{nameOf(b.athlete_id)}</span>
                    <span className="text-xs text-[var(--gt-muted)]">+1 คะแนน</span>
                  </li>
                ))}
              </ol>
            </section>
          )) : <Notice title="ยังไม่ประกาศคู่แข่งขัน" body="ผู้ตัดสินจะจับคู่แบบสวิส: โต๊ะ 1 คือผู้มีคะแนนสูงสุด" />
        )}

        {tab === "results" && (
          matches.some((m) => m.state === "verified") ? rounds.map((r) => {
            const done = matches.filter((m) => m.round_number === r && m.state === "verified").sort((a, b) => (a.board_number ?? 999) - (b.board_number ?? 999));
            if (!done.length) return null;
            return (
              <section key={r} className="mt-4">
                <h2 className="text-lg font-bold">ผลรอบที่ {r}</h2>
                <ol className="mt-2 grid gap-1.5">
                  {done.map((m) => (
                    <li key={m.id} className="gt-card px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-[var(--gt-muted)]"><span className="gt-num">โต๊ะ {m.board_number ?? "–"}</span><span className="font-semibold text-[var(--gt-gold-ink)]">{resultText(m)}</span></div>
                      <div className="mt-1 grid gap-1 text-[15px]">
                        {(["b", "w"] as const).map((c) => {
                          const pid = c === "b" ? m.black_athlete_id : m.white_athlete_id;
                          const won = m.winner_athlete_id === pid;
                          return <span key={c} className={`flex items-center gap-2 ${won ? "font-bold" : "text-[var(--gt-muted)]"}`}><Stone color={c} /><span className="truncate">{nameOf(pid)}</span>{won && <span className="ml-auto text-xs text-[var(--gt-ok)]">ชนะ</span>}</span>;
                        })}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            );
          }) : <Notice title="ยังไม่มีผลที่ยืนยันแล้ว" body="ผลจะแสดงเมื่อผู้ตัดสินยืนยันผลแต่ละโต๊ะ" icon="info" />
        )}

        {tab === "standings" && (
          standings.some((s) => s.wins + s.losses + s.byes > 0) ? (
            <>
              <div className="gt-card mt-4 overflow-x-auto">
                <table className="gt-num w-full min-w-[340px] text-sm">
                  <thead className="text-xs text-[var(--gt-muted)]">
                    <tr className="border-b border-[var(--gt-line)]">
                      <th className="py-2.5 pl-2.5 pr-1 text-left font-semibold">#</th><th className="px-1 py-2.5 text-left font-semibold">ชื่อ</th>
                      <th className="px-1 py-2.5 text-center font-semibold">ชนะ–แพ้</th><th className="px-1 py-2.5 text-right font-semibold">คะแนน</th>
                      <th className="px-1 py-2.5 text-right font-semibold">SOS</th><th className="py-2.5 pl-1 pr-2.5 text-right font-semibold">SOSOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.athlete_id ?? `h${i}`} className="border-b border-[var(--gt-line)] last:border-0">
                        <td className="py-2.5 pl-2.5 pr-1"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${s.pos <= 3 ? "gt-pill-gold" : "bg-[var(--gt-surface-2)]"}`}>{s.pos}</span></td>
                        <td className="px-1 py-2.5"><span className={s.display_name ? "font-semibold" : "text-[var(--gt-muted)]"}>{s.display_name ?? "ไม่เปิดเผยชื่อ"}</span>{s.byes > 0 && <span className="ml-1.5 text-[11px] text-[var(--gt-muted)]">บาย {s.byes}</span>}</td>
                        <td className="px-1 py-2.5 text-center">{s.wins}–{s.losses}</td>
                        <td className="px-1 py-2.5 text-right text-base font-bold">{s.score}</td>
                        <td className="px-1 py-2.5 text-right">{s.sos}</td>
                        <td className="py-2.5 pl-1 pr-2.5 text-right">{s.sosos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-[var(--gt-muted)]">คะแนน = ชนะ + บาย · คะแนนเท่ากันดู SOS แล้ว SOSOS · นับเฉพาะผลที่ยืนยันแล้ว</p>
            </>
          ) : <Notice title="ยังไม่มีอันดับ" body="อันดับจะแสดงเมื่อผู้ตัดสินยืนยันผลรอบแรก" icon="info" />
        )}
      </main>
    </Shell>
  );
}
