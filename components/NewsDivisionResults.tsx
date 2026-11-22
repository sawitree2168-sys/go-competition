"use client";

import { useState } from 'react';
import Link from 'next/link';
import AthleteAvatar from './AthleteAvatar';
import type { Story } from '@/lib/site-news';
import type { WallGame } from '@/lib/news-wall';
import { wallDivisionKey } from '@/lib/wall-division';
import { athleteNameKey as nameKey } from '@/lib/athlete-results.mjs';
import { placingLabel } from '@/lib/placing-label.mjs';
import { wallResult } from '@/lib/news-wall-result.mjs';
import styles from './HistoryWallTable.module.css';

const labels = { win: 'ชนะ', loss: 'แพ้', draw: 'เสมอ', bye: 'บาย', pending: 'รอผล', not_played: 'ไม่ได้แข่งขัน' };
type Player = Story['people'][number];

function PlayerIdentity({ player }: { player: Player }) {
  return (
    <div className="portrait-report-identity">
      <AthleteAvatar name={player.full_name} variant="portrait" zoom />
      <div>
        <strong>
          {player.athlete_id
            ? <Link className="underline underline-offset-2" href={`/athletes/${player.athlete_id}`}>{player.full_name}</Link>
            : player.full_name}
        </strong>
        <small className="block">{player.institution}</small>
        {!!player.upcoming?.length && <small className="block">★ สมัคร {player.upcoming.join(' / ')}</small>}
      </div>
    </div>
  );
}

function DivisionRound({ player, round, games }: { player: Player; round: number; games: WallGame[] }) {
  const playerName = nameKey(player.full_name);
  const matches = games.filter(game => (player.athlete_id && (player.athlete_id === game.blackId || player.athlete_id === game.whiteId))
    || playerName === nameKey(game.blackName) || playerName === nameKey(game.whiteName || ''));
  const label = <span className={styles.roundLabel}>รอบ {round}</span>;
  if (matches.length !== 1) {
    return <li className={styles.round}>{label}<span className={styles.empty}>{matches.length > 1 ? 'ข้อมูลซ้ำ รอตรวจสอบ' : 'ยังไม่มีข้อมูล'}</span></li>;
  }

  const game = matches[0];
  const black = player.athlete_id === game.blackId || playerName === nameKey(game.blackName);
  const result = wallResult(game, black ? game.blackId : game.whiteId);
  const opponent = black ? game.whiteName : game.blackName;

  return (
    <li className={styles.round}>
      {label}
      <div className={styles.opponentResult}>
        <strong className={styles.result} data-outcome={result}>{labels[result as keyof typeof labels]}</strong>
        <span>{game.notPlayed ? 'ไม่ได้ลงแข่งขันในรอบนี้' : game.bye ? 'ไม่มีคู่แข่ง' : opponent || 'ไม่ระบุคู่แข่ง'}</span>
        {!game.bye && !game.notPlayed && game.colourKnown !== false && <small>{black ? 'หมากดำ' : 'หมากขาว'}</small>}
      </div>
    </li>
  );
}

function DivisionWall({ story, games }: { story: Story; games: WallGame[] }) {
  const roundCount = Math.max(0, ...games.map(game => game.round), ...story.people.map(player => player.wins + player.losses + player.byes));
  const rounds = Array.from({ length: roundCount }, (_, i) => i + 1);
  const byRound = new Map<number, WallGame[]>();
  for (const game of games) {
    const group = byRound.get(game.round);
    if (group) group.push(game);
    else byRound.set(game.round, [game]);
  }

  return (
    <div className={styles.layout}>
      <table className={styles.table} data-rounds="opponents" data-ranked={Boolean(story.complete)} role="table" aria-label={`วอลล์ลิสต์ ${story.division ?? ''}`}>
        <thead role="rowgroup">
          <tr role="row">
            {story.complete && <th className={styles.place} scope="col" role="columnheader">ผลรางวัล</th>}
            <th className={styles.name} scope="col" role="columnheader">นักกีฬา / สถาบัน</th>
            <th scope="col" role="columnheader">ผลรายรอบ</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {story.people.map(player => (
            <tr key={player.go_id || player.athlete_id || player.full_name} role="row">
              {story.complete && <td className={styles.place} role="cell">{placingLabel(player.placing)}</td>}
              <th className={styles.name} scope="row" role="rowheader"><PlayerIdentity player={player} /></th>
              <td className={styles.roundsCell} role="cell">
                {rounds.length > 0 ? (
                  <ul className={styles.rounds} role="list">
                    {rounds.map(round => <DivisionRound key={round} player={player} round={round} games={byRound.get(round) ?? []} />)}
                  </ul>
                ) : <span className={styles.empty}>ยังไม่มีข้อมูล</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function NewsDivisionResults({ story, games, unavailable, showAwards = true }: {
  story: Story;
  games: WallGame[];
  unavailable: boolean;
  showAwards?: boolean;
}) {
  const [view, setView] = useState<'summary' | 'wall'>('summary');
  const rounds = games.filter(game => game.division === wallDivisionKey(story.division || ''));
  const sourceUrls = [...new Set(rounds.flatMap(game => game.sourceUrl ? [game.sourceUrl] : []))];

  return (
    <section className="news-division space-y-5 rounded-2xl border border-blue-200 p-4">
      <h2 className="site-section-title">{story.division}</h2>
      <div className="site-operation-nav" role="group" aria-label={`รูปแบบผล ${story.division}`} data-export-ignore="true">
        <button type="button" aria-pressed={view === 'summary'} onClick={() => setView('summary')}>สรุปผล</button>
        <button type="button" aria-pressed={view === 'wall'} onClick={() => setView('wall')}>ผลรายรอบ (วอลล์ลิสต์)</button>
      </div>
      <p className={`rounded-xl p-3 ${story.complete ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}>
        {story.complete ? 'ผลครบทั้งรุ่น • สรุปจากข้อมูลที่บันทึกครบ' : 'ข้อมูลบางส่วน • แสดงเฉพาะผลที่ตรวจสอบแล้ว ยังไม่สรุปอันดับทั้งรุ่น'}
      </p>
      {view === 'summary' && story.complete && showAwards && (
        <section>
          <h3 className="text-xl font-bold">ผู้ได้รับรางวัล / อันดับสูงสุด</h3>
          <div className="site-athlete-grid">
            {story.people.filter(player => player.placing !== null && player.placing <= 3).map(player => (
              <div className="gt-card p-5 text-center" key={player.go_id || player.athlete_id || player.full_name}>
                <div className="portrait-award-image"><AthleteAvatar name={player.full_name} variant="portrait" zoom /></div>
                <strong className="block text-3xl">{player.placing === 1 ? '🥇' : player.placing === 2 ? '🥈' : '🥉'}</strong>
                <strong className="mt-2 block text-lg">{placingLabel(player.placing)}</strong>
                <h4 className="mt-3 text-lg font-bold">{player.full_name}</h4>
                <p>{player.institution}</p>
                <p>{player.points ?? player.wins} คะแนน</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {view === 'wall' ? (
        <>
          <p className="rounded-xl bg-blue-50 p-3 text-blue-900">
            แสดงคู่แข่งและผลในแต่ละรอบ • ชนะสีเขียว / แพ้สีชมพู
            {unavailable && ' • โหลดผลรายรอบบางส่วนไม่สำเร็จ กรุณาลองใหม่'}
            {!rounds.length && ' • งานนี้ยังไม่มีข้อมูลคู่แข่งรายรอบในระบบ มีเฉพาะสรุปอันดับ'}
          </p>
          {sourceUrls.length > 0 && (
            <p className="text-sm text-blue-800">
              แหล่งข้อมูล {sourceUrls.map((url, i) => <a key={url} className="mr-3 underline" href={url} target="_blank" rel="noreferrer">ตารางผลต้นทาง {i + 1}</a>)}
            </p>
          )}
          <DivisionWall story={story} games={rounds} />
        </>
      ) : (
        <div className="news-results-scroll">
          <table className="news-results-table">
            <colgroup>
              {story.complete && <col className="news-place-col" />}
              <col className="news-name-col" />
              {Array.from({ length: 4 }, (_, i) => <col key={i} className="news-number-col" />)}
            </colgroup>
            <thead>
              <tr>
                {story.complete && <th scope="col">ผลรางวัล</th>}
                <th scope="col" className="news-player-cell">นักกีฬา / สถาบัน</th>
                <th scope="col">คะแนน</th>
                <th scope="col">ชนะ</th>
                <th scope="col">แพ้</th>
                <th scope="col">SOS</th>
              </tr>
            </thead>
            <tbody>
              {story.people.map(player => (
                <tr key={player.go_id || player.athlete_id || player.full_name}>
                  {story.complete && <td className="news-placing-label">{placingLabel(player.placing)}</td>}
                  <td className="news-player-cell"><PlayerIdentity player={player} /></td>
                  <td>{player.points ?? player.wins}</td>
                  <td>{player.wins}</td>
                  <td>{player.losses}</td>
                  <td>{player.sos ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
