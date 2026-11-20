import EventOrganizer from "@/components/EventOrganizer";
import "./division-refresh.css";
import "./division-premium.css";
import Link from "next/link";
import { Header, Icon, Shell } from "../../_ui/chrome";
import SiteBar from "../../_ui/SiteBar";
import { byeRule, roundsOf } from "@/lib/competition-day.mjs";
import { loadDivisionPage, publicDb, type Match } from "../../_ui/data";
import DivisionTabs from "../../_ui/DivisionTabs";
import AthleteGrid, { type AthleteCard } from "../../_ui/AthleteGrid";
import { boardSize, divisionKey, divisionLabel, thaiDate } from "@/lib/division-display";
import { friendshipAward, resultLabel } from "@/lib/competition-day.mjs";
import CrossTable from "../../_ui/CrossTable";
import PairingsBoard from "../../_ui/PairingsBoard";
import RoundReportButtons from "@/components/RoundReport";
import CompetitionPanel from "@/components/CompetitionPanel";
import RegisterPanel from "../../_ui/RegisterPanel";
import NewsPanel, { type RoundItem } from "../../_ui/NewsPanel";
import { roundNews } from "@/lib/round-news.mjs";
import LiveRefresh from "../../_ui/LiveRefresh";
import { loadResults } from "@/lib/public-site";

// Served from cache and refreshed in the background at most every 30 s (see PUBLIC_CACHE_SECONDS).
export const revalidate = 30;

const resultText = (m: Match) => resultLabel(m) || "รอผล";

function Stone({ color }: { color: "b" | "w" }) {
  return <span aria-hidden="true" className={`inline-block h-4 w-4 shrink-0 rounded-full ${color === "b" ? "bg-[radial-gradient(circle_at_35%_30%,#5b6170,#111_65%)]" : "border border-[var(--gt-muted)] bg-[radial-gradient(circle_at_35%_30%,#fff,#dfe3ea)]"}`} />;
}

function Notice({ title, body, icon = "clock" }: { title: string; body: string; icon?: "clock" | "info" }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-4 py-3">
      <Icon name={icon} className="h-7 w-7 shrink-0 text-[var(--gt-brand)]" />
      <div className="min-w-0"><p className="font-semibold">{title}</p><p className="text-xs text-[var(--gt-muted)]">{body}</p></div>
    </div>
  );
}

export default async function DivisionPage({ params }: { params: Promise<{ id: string; divisionId: string }> }) {
  const { id, divisionId } = await params;
  const db = publicDb();
  const [{ event, divisions, entrants, matches, byes, standings, people, announcements }, live, historicalResults] = await Promise.all([
    loadDivisionPage(db, id, divisionId),
    db ? db.rpc("gt_division_live_v1", { p_division: divisionId }).then((r) => (r.error ? null : (r.data as string | null)), () => null) : Promise.resolve(null),
    loadResults(db),
  ]);
  const division = divisions.find((d) => d.id === divisionId);

  if (!event || !division) {
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

  for (const s of standings) if (s.athlete_id && s.display_name && !people.has(s.athlete_id)) people.set(s.athlete_id, { name: s.display_name, institution: s.institution ?? "" });
  const nameOf = (athleteId: string) => people.get(athleteId)?.name ?? "ผู้เข้าแข่งขัน";
  const instOf = (athleteId: string) => people.get(athleteId)?.institution ?? "";
  const Who = ({ id: aid }: { id: string }) => (
    <span className="min-w-0"><span className="block truncate">{nameOf(aid)}</span>{instOf(aid) && <span className="block truncate text-xs font-normal text-[var(--gt-muted)]">{instOf(aid)}</span>}</span>
  );
  const roster = entrants.filter((e) => divisionKey(e.division_name) === divisionKey(division.name))
    .map((e) => ({ key: e.source_row, name: `${e.title} ${e.full_name}`.trim(), institution: e.institution, payment: e.payment_status }));
  const rounds = [...new Set([...matches.map((m) => m.round_number), ...byes.map((b) => b.round_number)])].sort((a, b) => b - a);
  const lastRound = rounds[0] ?? 0;
  const label = divisionLabel(division.name);
  const size = boardSize(division.name, division.friendship_board_size);
  const byBoard = (a: Match, b: Match) => (a.board_number ?? 999) - (b.board_number ?? 999);

  // นักกีฬา tab: imported registrations (standings rows: id, rank, photo) once the event is set up; the sign-up sheet before that.
  const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
  const paymentByName = new Map(entrants.filter((e) => divisionKey(e.division_name) === divisionKey(division.name)).map((e) => [norm(e.full_name), e.payment_status]));
  const institutionByName = new Map(entrants.filter((e) => divisionKey(e.division_name) === divisionKey(division.name)).map((e) => [norm(e.full_name), e.institution]));
  const athleteCards: AthleteCard[] = standings.length
    ? [...standings].filter((s) => s.athlete_id).sort((x, y) => (x.display_name ?? "").localeCompare(y.display_name ?? "", "th")).map((s) => ({
        key: s.athlete_id!, id: s.athlete_id, name: s.display_name ?? "ผู้เข้าแข่งขัน", institution: institutionByName.get(norm(s.display_name ?? "")) ?? s.institution ?? "", rank: s.current_rank,
        photo: people.get(s.athlete_id!)?.photo ?? null, payment: paymentByName.get(norm(s.display_name ?? "")) ?? null,
      }))
    : roster.map((r) => ({ key: String(r.key), id: null, name: r.name, institution: r.institution, rank: null, photo: null, payment: r.payment }));
  const listPanel = (
    <>
      {!lastRound && <Notice title="ยังไม่ประกาศคู่แข่งขัน" body="คู่แข่งขันจะแสดงที่แท็บจับคู่เมื่อผู้จัดประกาศ" />}
      <div className="relative lg:left-1/2 lg:w-[min(64rem,calc(100vw-2rem))] lg:-translate-x-1/2">
        <AthleteGrid athletes={athleteCards} historicalResults={historicalResults} matches={matches} byes={byes} people={Object.fromEntries(people)} />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--gt-muted)]"><Icon name="info" className="h-4 w-4 shrink-0" />รายชื่อตามที่ผู้จัดอนุญาตให้เผยแพร่ สถานะอาจเปลี่ยนแปลงภายหลัง</p>
    </>
  );


  const pools = [...new Set([...standings.map((x) => x.pool_label ?? ""), ...matches.map((m) => m.pool_label ?? ""), ...byes.map((b) => b.pool_label ?? "")])].sort();
  const multi = pools.length > 1;
  const PoolTitle = ({ pool }: { pool: string }) => multi ? <h2 className="mt-5 rounded-xl bg-[var(--gt-surface-2)] px-3 py-1.5 text-base font-bold">สาย {pool || "–"}</h2> : null;
  const inPool = <T extends { pool_label?: string | null }>(rows: T[], pool: string) => rows.filter((x) => (x.pool_label ?? "") === pool);

  const pairsPanel = rounds.length
    ? <div className="relative lg:left-1/2 lg:w-[min(64rem,calc(100vw-2rem))] lg:-translate-x-1/2"><PairingsBoard matches={matches} byes={byes} people={Object.fromEntries(people)} tournamentId={id} divisionId={divisionId} eventTitle={event.title} divisionName={label} /></div>
    : <Notice title="ยังไม่ประกาศคู่แข่งขัน" body="ผู้ตัดสินจะจับคู่แบบสวิส: โต๊ะ 1 คือผู้มีคะแนนสูงสุด" />;

  const verified = matches.filter((m) => m.state === "verified");
  const resultsPanel = verified.length ? pools.map((pool) => {
    const pv = inPool(verified, pool);
    const pr = [...new Set(pv.map((m) => m.round_number))].sort((a, b) => b - a);
    if (!pv.length) return null;
    return (
      <div key={pool || "all"}>
        <PoolTitle pool={pool} />
        {pr.map((r) => (
          <section key={r} className="mt-4">
            <div className="flex flex-wrap items-center gap-2"><h2 className="mr-auto text-lg font-bold">ผลรอบที่ {r}</h2></div>
            <RoundReportButtons className="mt-2" eventTitle={event.title} divisionName={label} round={r} pool={multi ? pool : null} matches={matches} byes={byes} people={Object.fromEntries(people)} />
            <ol className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1.5">
              {pv.filter((m) => m.round_number === r).sort(byBoard).map((m) => (
                <li key={m.id} className="gt-card min-w-0 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--gt-muted)]"><span className="gt-num">โต๊ะ {m.board_number ?? "–"}</span><span className="font-semibold text-[var(--gt-gold-ink)]">{resultText(m)}</span></div>
                  <div className="mt-1 grid gap-1 text-[15px]">
                    {(["b", "w"] as const).map((c) => {
                      const pid = c === "b" ? m.black_athlete_id : m.white_athlete_id;
                      const won = m.winner_athlete_id === pid;
                      return <span key={c} className={`flex min-w-0 items-center gap-2 ${won ? "font-bold" : "text-[var(--gt-muted)]"}`}><Stone color={c} /><Who id={pid} />{won && <span className="ml-auto shrink-0 text-xs text-[var(--gt-ok)]">ชนะ</span>}</span>;
                    })}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    );
  }) : <Notice title="ยังไม่มีผลที่ยืนยันแล้ว" body="ผลจะแสดงเมื่อผู้ตัดสินยืนยันผลแต่ละโต๊ะ" icon="info" />;

  const friendshipDiv = divisionKey(division.name).startsWith("friendship:");
  const MEDAL: Record<string, string> = { gold: "🥇 ทอง", silver: "🥈 เงิน", bronze: "🥉 ทองแดง" };
  const medals: Record<string, string> = {};
  if (friendshipDiv) for (const s of standings) {
    const a = s.athlete_id && !s.withdrawn ? friendshipAward(s.wins + s.byes, { award_scheme: "friendship_wins" }) : null;
    if (a && s.athlete_id) medals[s.athlete_id] = MEDAL[a];
  }
  const standingsPanel = standings.some((s) => s.wins + s.losses + s.byes > 0) ? (
    <div className="relative mt-4 space-y-4 lg:left-1/2 lg:w-[min(64rem,calc(100vw-2rem))] lg:-translate-x-1/2">
      {pools.map((pool) => (
        <CompetitionPanel key={pool || "all"} title={`ตารางอันดับ ${label}${pool ? ` · สาย ${pool}` : ""}`} context={`${event.title} · ตารางอันดับ ${label}${pool ? ` · สาย ${pool}` : ""}`}>
        <CrossTable title={`ตารางอันดับ ${label}${pool ? ` · สาย ${pool}` : ""}`}
          rows={inPool(standings, pool)} matches={inPool(matches, pool)} byes={inPool(byes, pool)} medals={medals} rounds={roundsOf(division)}
          photos={Object.fromEntries([...people].map(([k, v]) => [k, v.photo ?? null]))} />
        </CompetitionPanel>
      ))}
      <p className="text-xs text-[var(--gt-muted)]">คะแนน = ชนะ + บาย (เสมอ ½) · คะแนนเท่ากันดู SOS แล้ว SOSOS (นับคู่ที่ได้เล่นจริง · {byeRule(event.bye_sos_mode).short}) · นับเฉพาะผลที่ยืนยันแล้ว{multi ? " · อันดับแยกตามสาย" : ""}</p>
    </div>
  ) : <Notice title="ยังไม่มีอันดับ" body="อันดับจะแสดงเมื่อผู้ตัดสินยืนยันผลรอบแรก" icon="info" />;

  // ข่าว tab: one automatic summary per finished round (per pool), newest first.
  const newsPeople = Object.fromEntries([...people].map(([k, v]) => [k, { name: v.name, rank: v.rank ?? null }]));
  const roundItems: RoundItem[] = pools.flatMap((pool) =>
    roundNews({ matches: inPool(matches, pool), byes: inPool(byes, pool), people: newsPeople })
      .map((it) => ({ ...it, pool, key: `${pool}-${it.round}` })))
    .sort((a, b) => b.round - a.round || a.pool.localeCompare(b.pool));
  const newsPanel = (
    <div className="relative lg:left-1/2 lg:w-[min(64rem,calc(100vw-2rem))] lg:-translate-x-1/2">
      <NewsPanel rounds={roundItems} notices={announcements} multiPool={multi} />
    </div>
  );

  return (
    <Shell
      bottomBar={<>
        <a href={`/tournaments/${id}#contact`} className="gt-outline-btn flex min-w-0 flex-1 items-center justify-center gap-2 py-3 text-[15px] font-semibold"><Icon name="chat" className="h-6 w-6 shrink-0 text-[var(--gt-brand)]" /><span className="truncate">ติดต่อผู้จัด</span></a>
        <a href={`/tournaments/${id}/register?division=${divisionId}`} className="gt-gold-btn flex min-w-0 flex-1 items-center justify-center gap-2 py-3 text-base"><span className="truncate">สมัครรุ่นนี้</span> <Icon name="chevron" className="h-4 w-4 shrink-0" /></a>
      </>}
    >
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <SiteBar current="/tournaments" />
        {/* Banner (design 16 Nov 2026): always dark, picture from the site owner on the right. */}
        <section className="gt-division-hero relative overflow-hidden text-white">
          <div aria-hidden="true" className="gt-division-hero-image absolute inset-0 bg-[url(/division-go-premium.svg)] bg-cover bg-[position:right_center]" />
          <div aria-hidden="true" className="gt-division-hero-shade absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-4 py-5 sm:py-7">
            <Link href={`/tournaments/${id}`} className="inline-flex min-h-9 items-center gap-1 text-sm text-white/80 hover:text-white hover:underline">‹ รายละเอียดงาน</Link>
            <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
              <div className="min-w-0 lg:border-r lg:border-white/25 lg:pr-8">
                <span className="gt-division-eyebrow">✦ GO TOURNAMENT · COMPETITION DIVISION</span>
                <h1 className="gt-division-title text-[1.75rem] font-extrabold leading-tight sm:text-4xl">{event.title}</h1>
                <EventOrganizer title={event.title} onDark />
                <p className="gt-division-subtitle mt-1 text-[15px] sm:text-lg">{label} • ระบบจับคู่สวิส • กระดาน {size}×{size}</p>
                <p className="gt-division-date mt-0.5 flex items-center gap-1.5 text-sm"><Icon name="calendar" className="h-4 w-4 shrink-0" />{thaiDate(event.event_date) ?? "รอประกาศวันแข่งขัน"}</p>
              </div>
              <ul className="gt-division-stat-list flex flex-wrap gap-2">
                {[
                  { icon: "users" as const, t: `นักกีฬา ${athleteCards.length || roster.length} คน` },
                  { icon: "trophy" as const, t: lastRound ? `รอบ ${lastRound} / ${Math.max(roundsOf(division), lastRound)}` : "ยังไม่เริ่ม" },
                  { icon: "grid" as const, t: `แข่งขันแล้ว ${matches.filter((m) => m.state === "verified").length} เกม`, wide: true },
                ].map((c) => (
                  <li key={c.t} className={`${"wide" in c ? "inline-flex" : "inline-flex"} gt-division-stat min-h-9 items-center gap-2 rounded-full px-3 text-sm font-medium sm:min-h-10 sm:px-4 sm:text-[15px]`}>
                    <Icon name={c.icon} className="h-5 w-5 shrink-0" />{c.t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Light mode: soft board picture behind the top of the content (hidden in dark mode). */}
      <div aria-hidden="true" className="gt-division-page-art pointer-events-none absolute left-1/2 w-screen -translate-x-1/2" />
      <main className="gt-division-main relative px-4">
        <LiveRefresh divisionId={divisionId} fingerprint={live} />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <a href={`/tournaments/${id}#rules`} className="gt-outline-btn flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold"><Icon name="doc" className="h-5 w-5 shrink-0 text-[var(--gt-brand)]" /><span className="truncate">คุณสมบัติและกติกา</span></a>
          <a href={`/tournaments/${id}#schedule`} className="gt-outline-btn flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold"><Icon name="calendar" className="h-5 w-5 shrink-0 text-[var(--gt-brand)]" /><span className="truncate">กำหนดการ</span></a>
        </div>

        <DivisionTabs panels={{
          list: listPanel, pairs: pairsPanel, results: resultsPanel, standings: standingsPanel, news: newsPanel,
          register: (
            <div className="relative lg:left-1/2 lg:w-[min(64rem,calc(100vw-2rem))] lg:-translate-x-1/2">
              <RegisterPanel tournamentId={id} divisionId={divisionId} divisionLabel={label}
                mode={event.registration_mode ?? "web"} url={event.registration_url ?? null}
                openDate={event.registration_open_date} closeDate={event.registration_close_date} />
            </div>
          ),
        }} />
      </main>
    </Shell>
  );
}
