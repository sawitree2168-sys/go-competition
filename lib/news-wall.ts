import {publicDb, type BoardRow} from '@/app/tournaments/[id]/_ui/data';
import {loadCrowdGames} from './crowd-results';
import {divisionKey} from './division-display';
export type WallGame={division:string;round:number;blackId:string;whiteId:string|null;blackName:string;whiteName:string|null;winner:string|null;result:string|null;state:string|null;bye:boolean};
export async function loadNewsWall(event:string,date:string|null):Promise<{games:WallGame[];unavailable:boolean}> {
 const db=publicDb();if(!db)return {games:[],unavailable:true};
 const games:WallGame[]=[];
 let query=db.from('gt_tournaments').select('id').eq('published',true).eq('title',event);
 query=date?query.eq('event_date',date):query.is('event_date',null);
 const [events,crowd]=await Promise.all([query,loadCrowdGames(db)]);
 let unavailable=!!events.error;
 if(events.data?.length){
  const ds=await db.from('gt_divisions').select('id,name').in('tournament_id',events.data.map(e=>e.id));
  if(ds.error)unavailable=true;
  for(const d of ds.data??[]){
   const r=await db.rpc('gt_division_board_v1',{p_division:d.id});if(r.error){unavailable=true;continue;}
   for(const m of (r.data??[]) as BoardRow[])if(m.state!=='void')games.push({division:divisionKey(d.name),round:m.round_number,blackId:m.black_id,whiteId:m.white_id,blackName:m.black_name||'ไม่ระบุชื่อ',whiteName:m.white_name,winner:m.winner_id,result:m.result_code,state:m.state,bye:m.kind==='bye'});
  }
 }
 for(const m of crowd.filter(g=>g.event===event&&g.date===date)){
  if(games.some(g=>g.division===divisionKey(m.division)&&g.round===m.round&&g.blackId===m.black_id&&g.whiteId===m.white_id))continue;
  games.push({division:divisionKey(m.division),round:m.round,blackId:m.black_id,whiteId:m.white_id,blackName:m.black_name,whiteName:m.white_name,winner:m.result.startsWith('black_win')?m.black_id:m.result.startsWith('white_win')?m.white_id:null,result:m.result,state:'verified',bye:false});
 }
 return {games,unavailable};
}
