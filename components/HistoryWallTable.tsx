import Link from 'next/link';
import AthleteAvatar from './AthleteAvatar';
import type { HistoryWall, WallRow, WallToken } from '@/lib/history-walllist';
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
    <span className={styles.result} data-outcome={result.outcome} title={outcome}>
      {result.token}{result.walkover && '*'}
    </span>
  );
}

export default function HistoryWallTable({ wall, rows = wall.rows }: { wall: HistoryWall; rows?: WallRow[] }) {
  const rounds = [...new Set(wall.rows.flatMap(row => (row.rounds ?? []).map(result => result.round)))]
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const roundLabel = wall.has_rounds ? 'รอบ' : 'เกม';

  return (
    <div className={styles.layout}>
      <table role="table" className={styles.table} aria-label={`วอลล์ลิสต์ ${wall.division ?? ''}`}>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader" className={styles.place}>ที่</th>
            <th scope="col" role="columnheader" className={styles.name}>นักกีฬา</th>
            <th scope="col" role="columnheader" className={styles.pointsCell}>คะแนน</th>
            {rounds.length > 0 && <th scope="col" role="columnheader">ผลราย{roundLabel}</th>}
            <th scope="col" role="columnheader" className={styles.wins}>ชนะ</th>
            <th scope="col" role="columnheader" className={styles.sos}>SOS</th>
            <th scope="col" role="columnheader" className={styles.sosos}>SOSOS</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map(row => {
            const place = row.place_label === undefined ? row.place : row.place_label;
            const medal = place !== null && row.place <= 3 ? row.place : undefined;
            const results = new Map(row.rounds?.map(result => [result.round, result]));
            return (
              <tr key={`${row.place}-${row.full_name}`} role="row">
                <td className={styles.place} role="cell">
                  <span className={styles.medal} data-medal={medal} title={place === null ? 'ไม่มีอันดับในชีตต้นทาง' : undefined}>
                    {place ?? '—'}
                  </span>
                </td>
                <th scope="row" role="rowheader" className={styles.name}>
                  <span className={styles.identity}>
                    <span className={styles.avatar}><AthleteAvatar name={row.full_name} src={row.photo} variant="portrait" className="h-full w-full" zoom /></span>
                    {row.go_id
                      ? <Link href={`/athletes/history/${row.go_id}`}>{row.full_name}</Link>
                      : <span>{row.full_name}</span>}
                  </span>
                </th>
                <td role="cell" className={styles.pointsCell}>
                  <span className={styles.compactLabel} aria-hidden="true">คะแนน</span>
                  <span className={styles.points}>{formatNumber.format(row.points)}</span>
                </td>
                {rounds.length > 0 && (
                  <td role="cell" className={styles.roundsCell}>
                    <ul className={styles.rounds} role="list">
                      {rounds.map(round => (
                        <li key={round} className={styles.round}>
                          <span className={styles.roundLabel}>{roundLabel} {round}</span>
                          <RoundResult result={results.get(round)} />
                        </li>
                      ))}
                    </ul>
                  </td>
                )}
                <td role="cell" className={styles.wins}><span className={styles.compactLabel} aria-hidden="true">ชนะ</span>{row.wins}</td>
                <td role="cell" className={styles.sos}><span className={styles.compactLabel} aria-hidden="true">SOS</span>{score(row.sos)}</td>
                <td role="cell" className={styles.sosos}><span className={styles.compactLabel} aria-hidden="true">SOSOS</span>{score(row.sosos)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
