import {publicDb} from '@/app/tournaments/[id]/_ui/data';
export type HistoryStats={games:number;wins:number;losses:number;draws:number;events:number;win_percent:number|null};
export type HistoryGame={id:string;event_id:string;title:string;event_year:number;event_date:string|null;date_status:string;division:string;round_label:string|null;board_label:string|null;kind:string;outcome:string;opponent_key:string;opponent_go_id:string|null;opponent_name:string|null;source_url:string};
export type HistoryOpponent={opponent_key:string;opponent_go_id:string|null;opponent_name:string;games:number;wins:number;losses:number;draws:number};
export type Placing={event_id:string;division:string;place:number;players:number;points:number;wins:number;losses:number};
export type LevelHistoryItem={placings?:Placing[]|null;kind:'event'|'dan';event_id:string|null;title:string;event_year:number;event_date:string|null;date_status:string;divisions:string[]|null;level:string|null;level_at_time:string|null;dan_number:number|null;level_changed:boolean};
export type LevelHistory={current:{label:string|null;dan_number:number;diamond:boolean;source:string}|null;items:LevelHistoryItem[];note:string};
export type HistoryProfile={go_id:string;full_name:string;photo?:string|null;stats:HistoryStats;games:HistoryGame[];opponents:HistoryOpponent[];level_history?:LevelHistory;placings?:Placing[];coverage:{year:number;status:string;note:string}};
export type AthleteHistoryProfile = Omit<HistoryProfile, 'games'> & {
 games: Omit<HistoryGame, 'source_url'>[];
};

export async function loadHistoryProfile(goId:string): Promise<AthleteHistoryProfile | null> {
 if(!/^GO\d{6,20}$/.test(goId))return null;
 const db=publicDb();if(!db)return null;
 const [result, photo] = await Promise.all([
  db.rpc('gt_history_profile_v1', {p_go_id:goId,p_year:2026}),
  loadHistoryPhotos([goId]),
 ]);
 if(result.error)throw new Error('โหลดประวัติการแข่งขันไม่สำเร็จ กรุณาลองใหม่');
 if (!result.data) return null;
 const profile = result.data as HistoryProfile;
 // Pass only public match fields to the athlete history page.
 const games = profile.games.map(({
  id, event_id, title, event_year, event_date, date_status, division, round_label,
  board_label, kind, outcome, opponent_key, opponent_go_id, opponent_name,
 }) => ({
  id, event_id, title, event_year, event_date, date_status, division, round_label,
  board_label, kind, outcome, opponent_key, opponent_go_id, opponent_name,
 }));
 return { ...profile, games, photo: photo[goId] ?? null };
}
export async function loadHistoryPhotos(goIds: string[]): Promise<Record<string, string>> {
 const db = publicDb();
 if (!db || !goIds.length) return {};
 const batches = Array.from({length:Math.ceil(goIds.length/100)}, (_,i) => goIds.slice(i*100,(i+1)*100));
 const results = await Promise.all(batches.map(ids => db.rpc('gt_history_primary_photos_v1', {p_go_ids:ids})));
 return Object.assign({}, ...results.map(result => result.error ? {} : result.data ?? {}));
}
export async function loadHistoryStats(goIds:string[]){
 const db=publicDb();if(!db)return null;
 const chunks=Array.from({length:Math.ceil(goIds.length/60)},(_,i)=>goIds.slice(i*60,(i+1)*60));
 const results=await Promise.all(chunks.map(ids=>db.rpc('gt_history_stats_v1',{p_go_ids:ids,p_year:2026})));
 if(results.some(r=>r.error))return null;
 return Object.assign({},...results.map(r=>r.data??{})) as Record<string,HistoryStats>;
}
