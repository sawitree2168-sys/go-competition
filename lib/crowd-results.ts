import type {SupabaseClient} from '@supabase/supabase-js';
import type {ResultEvent,ResultPerson} from './public-site';
export type CrowdGame={id:string;event:string;date:string;division:string;round:number;black_id:string;white_id:string;black_name:string;white_name:string;black_school:string|null;white_school:string|null;black_photo:string|null;white_photo:string|null;result:string;approved_at:string};
export async function loadCrowdGames(db:SupabaseClient|null,athlete:string|null=null):Promise<CrowdGame[]>{if(!db)return [];const r=await db.rpc('gt_crowd_games_public_v1',{p_athlete:athlete});return r.error?[]:r.data||[];}
export function crowdEvents(games:CrowdGame[]):ResultEvent[]{
 const events=new Map<string,ResultEvent>();
 for(const g of games){const k=g.event+'|'+g.date;let e=events.get(k);if(!e){e={title:g.event,date:g.date,complete:false,divisions:[]};events.set(k,e);}let d=e.divisions.find(x=>x.division===g.division);if(!d){d={division:g.division,people:[]};e.divisions.push(d);}for(const side of ['black','white'] as const){const id=g[`${side}_id`];let p=d.people.find(x=>x.athlete_id===id);if(!p){p={placing:null,go_id:'',full_name:g[`${side}_name`],institution:g[`${side}_school`],athlete_id:id,wins:0,losses:0,byes:0,points:0};d.people.push(p);}if(g.result.startsWith(side+'_win')){p.wins++;p.points=(p.points||0)+1;}else if(g.result==='draw'){p.points=(p.points||0)+.5;}else p.losses++;}}
 return [...events.values()];
}
