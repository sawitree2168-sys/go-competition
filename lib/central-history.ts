import {publicDb} from '@/app/tournaments/[id]/_ui/data';
export type HistoryStats={games:number;wins:number;losses:number;draws:number;events:number;win_percent:number|null};
export type HistoryGame={id:string;event_id:string;title:string;event_year:number;event_date:string|null;date_status:string;division:string;round_label:string|null;board_label:string|null;kind:string;outcome:string;opponent_key:string;opponent_go_id:string|null;opponent_name:string|null;source_url:string};
export type HistoryOpponent={opponent_key:string;opponent_go_id:string|null;opponent_name:string;games:number;wins:number;losses:number;draws:number};
export type Placing={event_id:string;division:string;place:number;players:number;points:number;wins:number;losses:number};
export type LevelHistoryItem={placings?:Placing[]|null;kind:'event'|'dan';event_id:string|null;title:string;event_year:number;event_date:string|null;date_status:string;divisions:string[]|null;level:string|null;level_at_time:string|null;dan_number:number|null;level_changed:boolean};
export type LevelHistory={current:{label:string|null;dan_number:number;diamond:boolean;source:string}|null;items:LevelHistoryItem[];note:string};
export type HistoryProfile={go_id:string;full_name:string;stats:HistoryStats;games:HistoryGame[];opponents:HistoryOpponent[];level_history?:LevelHistory;placings?:Placing[];coverage:{year:number;status:string;note:string}};
export async function loadHistoryProfile(goId:string){
 if(!/^GO\d{6,20}$/.test(goId))return null;
 const db=publicDb();if(!db)return null;
 const result=await db.rpc('gt_history_profile_v1',{p_go_id:goId,p_year:2026});
 if(result.error)throw new Error('โหลดประวัติการแข่งขันไม่สำเร็จ กรุณาลองใหม่');
 return result.data as HistoryProfile|null;
}
export async function loadHistoryStats(goIds:string[]){
 const db=publicDb();if(!db)return null;
 const result=await db.rpc('gt_history_stats_v1',{p_go_ids:goIds.slice(0,60),p_year:2026});
 return result.error?null:result.data as Record<string,HistoryStats>;
}
