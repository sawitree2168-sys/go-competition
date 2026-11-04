import Link from "next/link";
import { Header, Icon, Shell, STONES_IMAGE, Thumb } from "../../_ui/chrome";
import { loadDivisionPage, publicDb, type Match } from "../../_ui/data";
import DivisionTabs from "../../_ui/DivisionTabs";
import RosterList from "../../_ui/RosterList";
import PosterViewer from "../../_ui/PosterViewer";
import { boardSize, divisionKey, divisionLabel, posterThumb, thaiDate } from "@/lib/division-display";

// Served from cache and refreshed in the background at most every 30 s (see PUBLIC_CACHE_SECONDS).
export const revalidate = 30;

const resultText = (m: Match) => {
  if (m.result_code === "double_forfeit") return "ไม่มีผู้ชนะ (สละสิทธิ์ทั้งคู่)";
  const side = m.result_code === "black_win" ? "ดำชนะ" : m.result_code === "white_win" ? "ขาวชนะ" : null;
  if (!side) return "รอผล";
  if (!m.result_margin) return side;
  return m.result_margin === "R" ? `${side} (ยอมแพ้)` : m.result_margin === "T" ? `${side} (หมดเวลา)` : `${side} ${m.result_margin} แต้ม`;
};

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
  const { event, divisions, entrants, matches, byes, standings } = await loadDivisionPage(publicDb(), id, divisionId);
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

  const names = new Map(standings.filter((s) => s.athlete_id && s.display_name).map((s) => [s.athlete_id as string, s.display_name as string]));
  const nameOf = (athleteId: string) => names.get(athleteId) ?? "ผู้เข้าแข่งขัน";
  const roster = entrants.filter((e) => divisionKey(e.division_name) === divisionKey(division.name))
    .map((e) => ({ key: e.source_row, name: `${e.title} ${e.full_name}`.trim(), institution: e.institution, payment: e.payment_status }));
  const rounds = [...new Set([...matches.map((m) => m.round_number), ...byes.map((b) => b.round_number)])].sort((a, b) => b - a);
  const lastRound = rounds[0] ?? 0;
  const label = divisionLabel(division.name);
  const size = boardSize(division.name, division.friendship_board_size);
  const byBoard = (a: Match, b: Match) => (a.board_number ?? 999) - (b.board_number ?? 999);

  const listPanel = (
    <>
      {!lastRound && <Notice title="ยังไม่ประกาศคู่แข่งขัน" body="คู่แข่งขันจะแสดงที่แท็บจับคู่เมื่อผู้จัดประกาศ" />}
      <RosterList rows={roster} />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--gt-muted)]"><Icon name="info" className="h-4 w-4 shrink-0" />รายชื่อตามที่ผู้จัดอนุญาตให้เผยแพร่ สถานะอาจเปลี่ยนแปลงภายหลัง</p>
    </>
  );

  const pairsPanel = rounds.length ? rounds.map((r) => (
    <section key={r} className="mt-4">
      <h2 className="text-lg font-bold">รอบที่ {r}</h2>
      <ol className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1.5">
        {matches.filter((m) => m.round_number === r).sort(byBoard).map((m) => (
          <li key={m.id} className="gt-card flex min-w-0 items-center gap-3 px-3 py-2.5">
            <span className="gt-num w-14 shrink-0 text-sm font-semibold text-[var(--gt-muted)]">โต๊ะ {m.board_number ?? "–"}</span>
            <span className="grid min-w-0 flex-1 gap-1 text-[15px]">
              <span className="flex min-w-0 items-center gap-2"><Stone color="b" /><span className="truncate">{nameOf(m.black_athlete_id)}</span></span>
              <span className="flex min-w-0 items-center gap-2"><Stone color="w" /><span className="truncate">{nameOf(m.white_athlete_id)}</span></span>
            </span>
          </li>
        ))}
        {byes.filter((b) => b.round_number === r).map((b) => (
          <li key={b.athlete_id} className="flex min-w-0 items-center gap-3 rounded-xl border border-dashed border-[var(--gt-line)] px-3 py-2.5">
            <span className="w-14 shrink-0 text-sm font-semibold text-[var(--gt-muted)]">บาย</span>
            <span className="min-w-0 flex-1 truncate">{nameOf(b.athlete_id)}</span>
            <span className="shrink-0 text-xs text-[var(--gt-muted)]">+1 คะแนน</span>
          </li>
        ))}
      </ol>
    </section>
  )) : <Notice title="ยังไม่ประกาศคู่แข่งขัน" body="ผู้ตัดสินจะจับคู่แบบสวิส: โต๊ะ 1 คือผู้มีคะแนนสูงสุด" />;

  const verified = matches.filter((m) => m.state === "verified");
  const resultsPanel = verified.length ? rounds.map((r) => {
    const done = verified.filter((m) => m.round_number === r).sort(byBoard);
    if (!done.length) return null;
    return (
      <section key={r} className="mt-4">
        <h2 className="text-lg font-bold">ผลรอบที่ {r}</h2>
        <ol className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1.5">
          {done.map((m) => (
            <li key={m.id} className="gt-card min-w-0 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--gt-muted)]"><span className="gt-num">โต๊ะ {m.board_number ?? "–"}</span><span className="font-semibold text-[var(--gt-gold-ink)]">{resultText(m)}</span></div>
              <div className="mt-1 grid gap-1 text-[15px]">
                {(["b", "w"] as const).map((c) => {
                  const pid = c === "b" ? m.black_athlete_id : m.white_athlete_id;
                  const won = m.winner_athlete_id === pid;
                  return <span key={c} className={`flex min-w-0 items-center gap-2 ${won ? "font-bold" : "text-[var(--gt-muted)]"}`}><Stone color={c} /><span className="truncate">{nameOf(pid)}</span>{won && <span className="ml-auto shrink-0 text-xs text-[var(--gt-ok)]">ชนะ</span>}</span>;
                })}
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }) : <Notice title="ยังไม่มีผลที่ยืนยันแล้ว" body="ผลจะแสดงเมื่อผู้ตัดสินยืนยันผลแต่ละโต๊ะ" icon="info" />;

  const standingsPanel = standings.some((s) => s.wins + s.losses + s.byes > 0) ? (
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
  ) : <Notice title="ยังไม่มีอันดับ" body="อันดับจะแสดงเมื่อผู้ตัดสินยืนยันผลรอบแรก" icon="info" />;

  return (
    <Shell
      bottomBar={<>
        <a href={`/tournaments/${id}#contact`} className="gt-outline-btn flex min-w-0 flex-1 items-center justify-center gap-2 py-3 text-[15px] font-semibold"><Icon name="chat" className="h-6 w-6 shrink-0 text-[var(--gt-brand)]" /><span className="truncate">ติดต่อผู้จัด</span></a>
        <Link href="/register" className="gt-gold-btn flex min-w-0 flex-1 items-center justify-center gap-2 py-3 text-base"><span className="truncate">สมัครรุ่นนี้</span> <Icon name="chevron" className="h-4 w-4 shrink-0" /></Link>
      </>}
    >
      <Header backHref={`/tournaments/${id}`} backLabel="กลับรายละเอียดงาน" />

      <main className="px-4">
        <nav aria-label="ตำแหน่งหน้า" className="mt-1 truncate text-[15px] font-bold">
          <Link href={`/tournaments/${id}`} className="hover:underline">รายละเอียดงาน</Link><span className="mx-1.5 text-[var(--gt-muted)]">/</span><span>{label}</span>
        </nav>

        <section className="gt-card mt-2 flex min-w-0 items-center gap-3 p-2.5">
          {event.poster_url
            ? <PosterViewer src={event.poster_url} thumb={posterThumb(event.poster_url)} alt={`โปสเตอร์ ${event.title}`} className="h-20 w-14 rounded-lg" />
            : <Thumb src={STONES_IMAGE} alt="" className="h-16 w-28 rounded-lg" />}
          <div className="min-w-0">
            <p className="truncate font-bold">{event.title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm"><Icon name="calendar" className="h-4 w-4 shrink-0 text-[var(--gt-gold)]" />{thaiDate(event.event_date) ?? "รอประกาศวันแข่งขัน"}</p>
          </div>
        </section>

        <section className="gt-card mt-3 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <Thumb src={STONES_IMAGE} alt="" shift={divisions.indexOf(division)} className="h-14 w-24 rounded-[10px]" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-tight sm:text-2xl">{label}</h1>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${lastRound ? "gt-pill-gold" : "border border-[var(--gt-line)] bg-[var(--gt-surface-2)] text-[var(--gt-brand)]"}`}>{lastRound ? `กำลังแข่ง · รอบ ${lastRound}` : "ก่อนแข่งขัน"}</span>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {[
              { icon: "users" as const, k: "ผู้สมัคร", v: `${roster.length} คน` },
              { icon: "grid" as const, k: "กระดาน", v: `${size}×${size}` },
              { icon: "trophy" as const, k: "แข่งแล้ว", v: `${lastRound} รอบ` },
            ].map((s) => (
              <div key={s.k} className="flex min-w-0 items-center gap-1.5 rounded-xl border border-[var(--gt-line)] px-2 py-2">
                <Icon name={s.icon} className="h-5 w-5 shrink-0 text-[var(--gt-gold)]" />
                <div className="min-w-0"><dt className="truncate text-[11px] text-[var(--gt-muted)]">{s.k}</dt><dd className="gt-num truncate font-bold">{s.v}</dd></div>
              </div>
            ))}
          </dl>
          {division.seats_limit != null && <p className="mt-2 text-right text-xs text-[var(--gt-muted)]">รับสูงสุด {division.seats_limit} คน{division.entry_fee_thb != null ? ` · ค่าสมัคร ${division.entry_fee_thb} บาท` : ""}</p>}
        </section>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <a href={`/tournaments/${id}#rules`} className="gt-outline-btn flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold"><Icon name="doc" className="h-5 w-5 shrink-0 text-[var(--gt-brand)]" /><span className="truncate">คุณสมบัติและกติกา</span></a>
          <a href={`/tournaments/${id}#schedule`} className="gt-outline-btn flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold"><Icon name="calendar" className="h-5 w-5 shrink-0 text-[var(--gt-brand)]" /><span className="truncate">กำหนดการ</span></a>
        </div>

        <DivisionTabs panels={{ list: listPanel, pairs: pairsPanel, results: resultsPanel, standings: standingsPanel }} />
      </main>
    </Shell>
  );
}
