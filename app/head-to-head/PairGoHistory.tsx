import Link from 'next/link';
import type { PairGoGame, PairGoPlayer } from '@/lib/head-to-head';

const outcomeLabels = { win: 'ชนะ', loss: 'แพ้', draw: 'เสมอ' };
const dateFormat = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function PairSide({ label, players, selected }: {
  label: string;
  players: PairGoGame['players'];
  selected?: string;
}) {
  // Place the selected athlete first without changing the source team.
  const ordered = players[1].go_id === selected ? [players[1], players[0]] : players;
  function name(player: PairGoPlayer) {
    return player.go_id
      ? <Link href={`/athletes/history/${player.go_id}`}>{player.name}</Link>
      : player.name;
  }

  return (
    <div className="meeting-pair-go-side">
      <h4>{label}</h4>
      <ul>
        {ordered.map((player, index) => (
          <li key={index} className={player.go_id && player.go_id === selected ? 'selected' : undefined}>
            {name(player)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PairGoHistory({ games, playerName, playerGoId, opponentGoId, error }: {
  games: PairGoGame[];
  playerName: string;
  playerGoId: string;
  opponentGoId?: string;
  error: boolean;
}) {
  return (
    <section className="meeting-pair-go" aria-labelledby="pair-go-heading">
      <div className="meeting-history-title">
        <h2 id="pair-go-heading">การพบกันแบบคู่ · Pair Go</h2>
      </div>
      {error ? (
        <p className="meeting-note" role="alert">ยังโหลดผล Pair Go ไม่สำเร็จ กรุณาลองใหม่</p>
      ) : games.length === 0 ? (
        <p className="meeting-note">ยังไม่พบผล Pair Go ที่ยืนยันแล้วสำหรับนักกีฬาและปีที่เลือก</p>
      ) : (
        <ul className="meeting-pair-go-games">
          {games.map(game => (
            <li key={game.id} className="meeting-pair-go-game">
              <header className="meeting-pair-go-heading">
                <div>
                  <h3>{game.title}</h3>
                  <p>
                    {[
                      game.event_date ? dateFormat.format(new Date(`${game.event_date}T00:00:00+07:00`)) : `ปี ${game.event_year + 543}`,
                      game.division,
                      game.round_label && (/^\d+$/.test(game.round_label) ? `รอบ ${game.round_label}` : game.round_label),
                      game.board_label && (/^\d+$/.test(game.board_label) ? `โต๊ะ ${game.board_label}` : game.board_label),
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className={`meeting-result ${game.outcome}`}>{outcomeLabels[game.outcome]}</span>
              </header>
              <div className="meeting-pair-go-teams">
                <PairSide label={`คู่ของ ${playerName}`} players={game.players} selected={playerGoId} />
                <span aria-hidden="true" className="meeting-pair-go-vs">พบ</span>
                <PairSide label="คู่ฝั่งตรงข้าม" players={game.opponents} selected={opponentGoId} />
              </div>
              <a className="meeting-pair-go-source" href={game.source_url} target="_blank" rel="noopener noreferrer">
                ผลต้นทาง ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
