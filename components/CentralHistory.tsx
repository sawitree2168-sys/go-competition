'use client';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { AthleteHistoryProfile } from '@/lib/central-history';
import CompetitionPanel from './CompetitionPanel';
import LevelTimeline from './LevelTimeline';
import { markInAppNav } from './BackLink';
import { historyWallHref } from '@/lib/history-wall-href';
const percent = (wins: number, games: number) =>
  games ? `${((wins / games) * 100).toLocaleString('th-TH', { maximumFractionDigits: 2 })}%` : '—';
const outcome = (v: string, kind: string) =>
  kind === 'bye'
    ? 'บาย'
    : kind === 'walkover'
      ? v === 'win'
        ? 'ชนะผ่าน'
        : 'แพ้ผ่าน'
      : kind === 'not_played'
        ? 'ไม่ได้แข่งขัน'
        : v === 'win'
          ? 'ชนะ'
          : v === 'loss'
            ? 'แพ้'
            : v === 'draw'
              ? 'เสมอ'
              : 'ยังไม่มีผล';
export default function CentralHistory({
  profile: p,
  initialView = 'summary',
  initialOpponent = '',
}: {
  profile: AthleteHistoryProfile;
  initialView?: string;
  initialOpponent?: string;
}) {
  const sp = useSearchParams();
  const viewParam = sp ? sp.get('view') : initialView,
    oppParam = (sp ? sp.get('vs') : initialOpponent) ?? '';
  const view = viewParam === 'wall' || viewParam === 'cards' ? viewParam : 'summary';
  const opponent = p.opponents.some((o) => o.opponent_key === oppParam) ? oppParam : '';
  const remember = (v: string, o: string) => {
    const q = new URLSearchParams(sp?.toString() ?? '');
    if (v !== 'summary') q.set('view', v);
    else q.delete('view');
    if (o) q.set('vs', o);
    else q.delete('vs');
    const qs = q.toString();
    window.history.replaceState(
      null,
      '',
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  };
  const setView = (v: string) => remember(v, opponent);
  const setOpponent = (o: string) => remember(view, o);
  const visible = p.games.filter((g) => !opponent || g.opponent_key === opponent);
  const selected = p.opponents.find((o) => o.opponent_key === opponent);
  const events = useMemo(
    () =>
      Array.from(new Set(visible.map((g) => g.event_id))).map((id) => ({
        id,
        games: visible.filter((g) => g.event_id === id),
      })),
    [visible],
  );
  return (
    <div className="mt-4 space-y-5">
      <section aria-labelledby="history-stats" className="gt-card space-y-3 p-4 sm:p-5">
        <div>
          <h2 id="history-stats" className="text-xl font-bold">
            สถิติการแข่งขัน
          </h2>
          <p className="mt-1 text-sm text-[var(--gt-muted)]">ปี 2569 · จากผลที่ตรวจสอบแล้ว</p>
        </div>
        <HistoryStats stats={p.stats} />
        <details className="space-y-1 border-t border-[var(--gt-line)] pt-2 text-sm text-[var(--gt-muted)]">
          <summary className="cursor-pointer py-1 font-semibold">ข้อมูลที่ใช้คำนวณ</summary>
          <p>{p.coverage.note} • ยังไม่ใช่ประวัติการแข่งขันทั้งหมด</p>
          <p>นับเปอร์เซ็นต์จากเกมที่เล่นจริง: ชนะ ÷ (ชนะ + แพ้ + เสมอ) ไม่รวมบายและการปรับคะแนน GAT</p>
          <GameExceptions games={p.games} />
        </details>
      </section>
      <section aria-labelledby="history-opponents" className="gt-card space-y-3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="flex min-w-0 flex-col gap-1.5 font-semibold">
            <span id="history-opponents">สถิติการพบกัน</span>
            <select
              className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-2 text-base font-normal"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            >
              <option value="">คู่แข่งทั้งหมด</option>
              {p.opponents
                .filter((o) => o.opponent_key)
                .map((o) => (
                  <option key={o.opponent_key} value={o.opponent_key}>
                    {o.opponent_name} · {o.games} เกม{o.opponent_go_id ? '' : ' · ยังไม่เชื่อม GO ID'}
                  </option>
                ))}
            </select>
          </label>
          <Link
            className="gt-outline-btn inline-flex min-h-11 items-center justify-center px-4"
            href={`/head-to-head?a=${p.go_id}${selected?.opponent_go_id ? `&b=${selected.opponent_go_id}` : ''}`}
          >
            ดูการ์ด VS →
          </Link>
        </div>
        {selected && (
          <div className="space-y-2">
            <HistoryStats stats={selected} />
            <GameExceptions games={visible} />
            {selected?.opponent_go_id && (
              <Link
                className="inline-block text-[var(--gt-brand)] underline"
                href={`/athletes/history/${selected.opponent_go_id}`}
                onClick={markInAppNav}
              >
                ดูประวัติ {selected.opponent_name} →
              </Link>
            )}
          </div>
        )}
      </section>
      <CompetitionPanel
        className="athlete-history-panel"
        title="ประวัติการแข่งขัน"
        context={`${p.full_name} · ปี 2569${selected ? ` · พบ ${selected.opponent_name}` : ''}`}
      >
        <div className="space-y-3 p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2" role="group" aria-label="มุมมองผลการแข่งขัน">
            {[
              ['summary', 'สรุปรายการ'],
              ['cards', 'การ์ดรายรอบ'],
              ['wall', 'ตารางรายรอบ'],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                className={`${view === id ? 'gt-cta-btn' : 'gt-outline-btn'} min-h-11 px-1 text-sm leading-snug sm:px-4`}
                aria-pressed={view === id}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={view === 'summary' ? 'grid gap-3 md:grid-cols-2' : 'grid gap-3'}>
            {!visible.length ? (
              <p className="gt-card p-6 md:col-span-2">ยังไม่มีแมตช์ที่ผ่านการตรวจสอบในชุดนำเข้าปี 2569</p>
            ) : (
              events.map((event) => {
                const first = event.games[0],
                  played = event.games.filter((g) => g.kind === 'played'),
                  wins = played.filter((g) => g.outcome === 'win').length,
                  losses = played.filter((g) => g.outcome === 'loss').length,
                  draws = played.filter((g) => g.outcome === 'draw').length;
                return (
                  <article
                    className="gt-card flex min-w-0 flex-col overflow-hidden"
                    data-export-break="true"
                    key={event.id}
                  >
                    <header className="space-y-1 border-b border-[var(--gt-line)] bg-[var(--gt-surface-2)] px-4 py-3">
                      <h2 className="break-words text-base font-bold leading-snug sm:text-lg">
                        {first.title}
                      </h2>
                      <Link
                        className="inline-block py-1 text-sm font-semibold text-[var(--gt-brand)] underline"
                        href={historyWallHref(event.id, first.division)}
                        onClick={markInAppNav}
                      >
                        ดูวอลล์ลิสต์ทั้งรุ่น →
                      </Link>
                      {(p.placings ?? [])
                        .filter((x) => x.event_id === event.id)
                        .map((x) => (
                          <p
                            key={x.division}
                            className="w-fit rounded-lg bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-950"
                          >
                            {x.place <= 3 ? ['🥇', '🥈', '🥉'][x.place - 1] + ' ' : ''}ได้ที่ {x.place} จาก{' '}
                            {x.players} คน · {x.division}
                          </p>
                        ))}
                      <p className="text-sm text-[var(--gt-muted)]">
                        {first.event_date
                          ? new Date(first.event_date + 'T00:00:00+07:00').toLocaleDateString('th-TH', {
                              timeZone: 'Asia/Bangkok',
                              dateStyle: 'long',
                            })
                          : `ปี ${first.event_year + 543} · ยังไม่ยืนยันวันแข่งขัน`}
                      </p>
                    </header>
                    {view === 'summary' ? (
                      <div className="space-y-1 px-4 py-3 text-sm leading-relaxed">
                        <p>
                          แข่งจริง {played.length} เกม ·{' '}
                          <strong className="text-[var(--gt-win-ink)]">ชนะ {wins}</strong> ·{' '}
                          <strong className="text-[var(--gt-loss-ink)]">แพ้ {losses}</strong>
                          {draws > 0 && ` · เสมอ ${draws}`} · อัตราชนะ {percent(wins, played.length)}
                        </p>
                        <p className="text-sm">
                          รุ่น: {Array.from(new Set(event.games.map((g) => g.division))).join(' / ')}
                        </p>
                        <button
                          type="button"
                          className="min-h-11 text-left font-semibold text-[var(--gt-brand)] underline"
                          onClick={() => setView('cards')}
                        >
                          ดูคู่แข่งและผลแต่ละรอบ →
                        </button>
                      </div>
                    ) : (
                      <RoundResults games={event.games} asCards={view === 'cards'} />
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>
      </CompetitionPanel>
      {!opponent && <LevelTimeline history={p.level_history} />}
    </div>
  );
}

type HistoryGame = AthleteHistoryProfile['games'][number];

function RoundResults({ games, asCards }: { games: HistoryGame[]; asCards: boolean }) {
  return asCards ? (
    <ul className="grid list-none gap-2 p-3 md:grid-cols-2">
      {games.map((game) => (
        <li key={game.id} data-export-break="true" className="rounded-xl border border-[var(--gt-line)] bg-[var(--gt-surface)] p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="font-semibold text-[var(--gt-muted)]"><RoundLabel game={game} /></span>
            <ResultLabel game={game} />
          </div>
          <p className="mt-1 break-words text-base"><OpponentName game={game} /></p>
          <p className="mt-1 break-words text-[var(--gt-muted)]">{game.division}</p>
        </li>
      ))}
    </ul>
  ) : (
    <div className="min-w-0 px-2 py-3 sm:px-4">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-[30%] text-left">รุ่น / รอบ</th>
            <th scope="col" className="text-left">คู่แข่ง</th>
            <th scope="col" className="w-[24%] sm:w-[20%]">ผล</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id}>
              <td className="break-words text-left">{game.division}<small className="block"><RoundLabel game={game} /></small></td>
              <td className="break-words text-left"><OpponentName game={game} /></td>
              <td className="break-words text-center"><ResultLabel game={game} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoundLabel({ game }: { game: HistoryGame }) {
  return <>รอบ {game.round_label || 'ยังไม่ระบุ'}{game.board_label && ` · กระดาน ${game.board_label}`}</>;
}

function OpponentName({ game }: { game: HistoryGame }) {
  return game.opponent_go_id ? (
    <Link className="font-semibold text-[var(--gt-brand)] underline" href={`/athletes/history/${game.opponent_go_id}`} onClick={markInAppNav}>
      {game.opponent_name}
    </Link>
  ) : (
    <>
      <strong>{game.opponent_name}</strong>
      <small className="block text-[var(--gt-muted)]">ยังไม่เชื่อม GO ID</small>
    </>
  );
}

function ResultLabel({ game }: { game: HistoryGame }) {
  const color = game.outcome === 'win' ? 'bg-emerald-100 text-emerald-900'
    : game.outcome === 'loss' ? 'bg-pink-100 text-pink-900' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-block max-w-full break-words rounded-lg px-1.5 py-1 text-xs font-semibold ${color}`}>{outcome(game.outcome, game.kind)}</span>;
}

function HistoryStats({
  stats,
}: {
  stats: Pick<AthleteHistoryProfile['stats'], 'games' | 'wins' | 'losses' | 'draws'>;
}) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['แข่งจริง', stats.games],
          ['ชนะ', stats.wins],
          ['แพ้', stats.losses],
          ['อัตราชนะ', percent(stats.wins, stats.games)],
        ].map(([label, value]) => (
          <div
            className="rounded-xl border border-[var(--gt-line)] bg-[var(--gt-cta-soft)] px-2 py-2 text-center sm:py-3"
            key={label}
          >
            <dt className="text-sm text-[var(--gt-muted)]">{label}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{value}</dd>
          </div>
        ))}
      </dl>
      {stats.draws > 0 && <p className="text-sm text-[var(--gt-muted)]">เสมอ {stats.draws} เกม</p>}
    </>
  );
}

function GameExceptions({ games }: { games: AthleteHistoryProfile['games'] }) {
  return (
    <p className="text-sm text-[var(--gt-muted)]">
      รายการแยกจากเกมที่เล่นจริง: บาย {games.filter((g) => g.kind === 'bye').length} · ชนะ/แพ้ผ่าน{' '}
      {games.filter((g) => g.kind === 'walkover').length} · ไม่ได้แข่งขัน{' '}
      {games.filter((g) => g.kind === 'not_played').length}
    </p>
  );
}
