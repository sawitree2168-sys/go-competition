import Link from 'next/link';
import type { CSSProperties } from 'react';
import AthleteAvatar from './AthleteAvatar';
import type { HistoryWall, WallRow, WallToken } from '@/lib/history-walllist';
import styles from './HistoryWallTable.module.css';

export type WallView = 'overview' | 'cards';
const formatNumber = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 });
const score = (n: number | null) => n === null ? '—' : formatNumber.format(n);
const outcomes = {
  win: 'ชนะ',
  loss: 'แพ้',
  draw: 'เสมอ',
  bye: 'ได้บาย',
  not_played: 'ไม่ได้แข่งขัน',
};

function RoundResult({ result }: { result?: WallToken }) {
  if (!result) return <span className={styles.empty} aria-label="ไม่มีคู่ในรอบนี้">—</span>;
  const outcome = outcomes[result.outcome] + (result.walkover ? 'ผ่าน' : '');
  return (
    <span className={styles.result} data-outcome={result.outcome} title={outcome}>
      {result.token}{result.walkover && '*'}
    </span>
  );
}

function ResultRounds({ rounds, label, row }: { rounds: string[]; label: string; row: WallRow }) {
  const results = new Map(row.rounds?.map(result => [result.round, result]));
  return (
    <ul className={styles.rounds} role="list">
      {rounds.map(round => (
        <li key={round} className={styles.round}>
          <span className={styles.roundLabel}>{label} {round}</span>
          <RoundResult result={results.get(round)} />
        </li>
      ))}
    </ul>
  );
}

function Placing({ row, label }: { row: WallRow; label?: string }) {
  const place = row.place_label === undefined ? row.place : row.place_label;
  const medal = place !== null && row.place <= 3 ? row.place : undefined;
  return (
    <span className={styles.medal} data-medal={medal} title={place === null ? 'ไม่มีอันดับในชีตต้นทาง' : label}>
      {place ?? '—'}
    </span>
  );
}

function AthleteIdentity({ row }: { row: WallRow }) {
  return (
    <span className={styles.identity}>
      <span className={styles.avatar} data-athlete-photo="true">
        <AthleteAvatar name={row.full_name} src={row.photo} variant="portrait" className="h-full w-full" zoom />
      </span>
      {row.go_id ? <Link href={`/athletes/history/${row.go_id}`}>{row.full_name}</Link> : <span>{row.full_name}</span>}
    </span>
  );
}

function ResultStats({ row, className }: { row: WallRow; className: string }) {
  return (
    <dl className={className}>
      <div><dt>ชนะ</dt><dd>{row.wins}</dd></div>
      <div><dt>SOS</dt><dd>{score(row.sos)}</dd></div>
      <div><dt>SOSOS</dt><dd>{score(row.sosos)}</dd></div>
    </dl>
  );
}

export default function HistoryWallTable({ wall, rows, view }: { wall: HistoryWall; rows: WallRow[]; view: WallView }) {
  const rounds = [...new Set(wall.rows.flatMap(row => (row.rounds ?? []).map(result => result.round)))]
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const roundLabel = wall.has_rounds ? 'รอบ' : 'เกม';

  if (view === 'cards') {
    return (
      <ul className={styles.cards} role="list" aria-label={`การ์ดรายคน ${wall.division ?? ''}`}>
        {rows.map(row => (
          <li key={`${row.place}-${row.full_name}`} className={styles.card} data-export-break="true">
            <header className={styles.cardHeader}>
              <Placing row={row} label="อันดับ" />
              <AthleteIdentity row={row} />
              <div className={styles.cardScore}>
                <span>คะแนน</span>
                <strong className={styles.points}>{formatNumber.format(row.points)}</strong>
              </div>
            </header>
            {rounds.length > 0 && <ResultRounds rounds={rounds} label={roundLabel} row={row} />}
            <ResultStats row={row} className={styles.cardStats} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.layout}>
      <table className={styles.table} data-view="overview" style={{ "--wall-round-count": rounds.length } as CSSProperties} aria-label={`ตารางรวมวอลล์ลิสต์ ${wall.division ?? ''}`}>
        <thead>
          <tr>
            <th scope="col" className={styles.place}>ที่</th>
            <th scope="col" className={styles.name}>นักกีฬา</th>
            <th scope="col" className={styles.pointsCell}>คะแนน</th>
            {rounds.map(round => <th key={round} scope="col" className={styles.roundColumn} aria-label={`${roundLabel} ${round}`}>{round}</th>)}
            <th scope="col" className={styles.sos}>SOS</th>
            <th scope="col" className={styles.sosos}>SOSOS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const results = new Map(row.rounds?.map(result => [result.round, result]));
            return (
              <tr key={`${row.place}-${row.full_name}`}>
                <td className={styles.place}><Placing row={row} /></td>
                <th scope="row" className={styles.name}>
                  <AthleteIdentity row={row} />
                </th>
                <td className={styles.pointsCell}><span className={styles.points}>{formatNumber.format(row.points)}</span></td>
                {rounds.map(round => (
                  <td key={round} className={styles.roundColumn}><RoundResult result={results.get(round)} /></td>
                ))}
                <td className={styles.sos}>{score(row.sos)}</td>
                <td className={styles.sosos}>{score(row.sosos)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
