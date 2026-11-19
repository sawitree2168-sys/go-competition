import type {HistoryGame} from './central-history';

export type PairGoPlayer = { name: string; go_id: string | null };
export type PairGoGame = {
 id: string;
 title: string;
 event_date: string | null;
 event_year: number;
 division: string;
 round_label: string | null;
 board_label: string | null;
 source_url: string;
 outcome: 'win' | 'loss' | 'draw';
 players: [PairGoPlayer, PairGoPlayer];
 opponents: [PairGoPlayer, PairGoPlayer];
};

export function pairGoGames(games: PairGoGame[], year: string) {
 return games.filter(game => year === 'all' || String(game.event_year) === year);
}

/** One canonical history, keyed by match ID. Never merge mirrored player histories. */
export function meetingGames(games:HistoryGame[],opponent:string,year:string){
 return [...new Map(games.filter(g=>g.opponent_go_id===opponent&&(year==='all'||String(g.event_year)===year)).map(g=>[g.id,g])).values()];
}
export function meetingStats(games:HistoryGame[]){
 const played=games.filter(g=>g.kind==='played'&&['win','loss','draw'].includes(g.outcome));
 const wins=played.filter(g=>g.outcome==='win').length,losses=played.filter(g=>g.outcome==='loss').length,draws=played.filter(g=>g.outcome==='draw').length;
 return {played:played.length,wins,losses,draws,excluded:games.length-played.length};
}
export const meetingPercent=(n:number,total:number)=>total?`${(100*n/total).toLocaleString('th-TH',{maximumFractionDigits:2})}%`:'—';
