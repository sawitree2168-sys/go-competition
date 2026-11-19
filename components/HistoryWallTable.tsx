import Link from 'next/link';
import AthleteAvatar from './AthleteAvatar';
import type { HistoryWall, WallToken } from '@/lib/history-walllist';
import styles from './HistoryWallTable.module.css';

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
    <span
      className={styles.result}
      data-outcome={result.outcome}
      title={outcome}
    >
      {result.token}{result.walkover && '*'}
    </span>
  );
}

export default function HistoryWallTable({ wall }: { wall: HistoryWall }) {
  const rounds = [...new Set(wall.rows.flatMap(row => (row.rounds ?? []).map(result => result.round)))]
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  return (
    <div className={styles.scroll} tabIndex={0} role="region" aria-label={`วอลล์ลิสต์ ${wall.division ?? ''} เลื่อนแนวนอนเพื่อดูทุกคอลัมน์`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.place} scope="col">ที่</th>
            <th className={styles.name} scope="col">นักกีฬา</th>
            <th scope="col">คะแนน</th>
            {rounds.map(round => <th key={round} className={styles.round} scope="col">{wall.has_rounds ? 'รอบ' : 'เกม'} {round}</th>)}
            <th scope="col">ชนะ</th>
            <th scope="col">SOS</th>
            <th scope="col">SOSOS</th>
          </tr>
        </thead>
        <tbody>
          {wall.rows.map(row => {
            const place = row.place_label === undefined ? row.place : row.place_label;
            const medal = place !== null && row.place <= 3 ? row.place : undefined;
            return (
              <tr key={`${row.place}-${row.full_name}`}>
                <td className={styles.place}>
                  <span className={styles.medal} data-medal={medal} title={place === null ? 'ไม่มีอันดับในชีตต้นทาง' : undefined}>
                    {place ?? '—'}
                  </span>
                </td>
                <th scope="row" className={styles.name}>
                  <span className={styles.identity}>
                    <span className={styles.avatar}><AthleteAvatar name={row.full_name} src={row.photo} variant="portrait" className="h-full w-full" zoom /></span>
                    {row.go_id
                      ? <Link href={`/athletes/history/${row.go_id}`}>{row.full_name}</Link>
                      : <span>{row.full_name}</span>}
                  </span>
                </th>
                <td><span className={styles.points}>{formatNumber.format(row.points)}</span></td>
                {rounds.map(round => (
                  <td key={round} className={styles.round}><RoundResult result={row.rounds?.find(result => result.round === round)} /></td>
                ))}
                <td>{row.wins}</td>
                <td>{score(row.sos)}</td>
                <td>{score(row.sosos)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
