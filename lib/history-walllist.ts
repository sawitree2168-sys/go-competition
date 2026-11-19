import {loadHistoryPhotos} from '@/lib/central-history';
import {publicDb} from '@/app/tournaments/[id]/_ui/data';
export type WallToken={round:string;token:string;outcome:'win'|'loss'|'draw'|'bye'|'not_played';walkover:boolean;opponent:string|null;opponent_go_id:string|null};
export type WallRow={place:number;source_place:number|null;full_name:string;go_id:string|null;photo?:string|null;wins:number;losses:number;draws:number;byes:number;walkovers:number;points:number;sos:number;sosos:number;rounds:WallToken[]|null};
export type WallDivision={name:string;games:number;players:number;has_rounds:boolean};
export type HistoryWall={event:{id:string;title:string;event_date:string|null;date_status:string};divisions:WallDivision[];division:string|null;ranking_mode?:'source'|'calculated';has_rounds:boolean|null;rounds:number;rows:WallRow[]};
export type HistoryEventItem={id:string;title:string;event_date:string|null;event_year:number;divisions:number;games:number};
export async function loadHistoryWall(eventId:string,division?:string|null){
 if(!/^[a-z0-9]+:[A-Za-z0-9_-]{1,40}$/.test(eventId))return null;
 const db=publicDb();if(!db)return null;
 const r=await db.rpc('gt_history_walllist_v1',{p_event_id:eventId,p_division:division??null});
 if(r.error)throw new Error('โหลดวอลล์ลิสต์ไม่สำเร็จ กรุณาลองใหม่');
 const wall = r.data as HistoryWall|null;
 if(!wall)return null;
 const photos=await loadHistoryPhotos(wall.rows.flatMap(row=>row.go_id?[row.go_id]:[]));
 return {...wall,rows:wall.rows.map(row=>({...row,photo:row.go_id?photos[row.go_id]??null:null}))};
}
export async function loadHistoryEvents(){
 const db=publicDb();if(!db)return [];
 const r=await db.rpc('gt_history_event_list_v1');
 return r.error?[]:(r.data??[]) as HistoryEventItem[];
}
export {historyWallHref} from './history-wall-href';
