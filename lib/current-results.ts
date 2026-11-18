import type {SupabaseClient} from '@supabase/supabase-js';
import type {ResultEvent} from './public-site';
import {divisionProgress} from './competition-dashboard.mjs';
/** A final summary exists only after every active standing completed the configured rounds. */
export async function loadCurrentResults(db:SupabaseClient|null):Promise<ResultEvent[]>{
 if(!db)return [];
 type D={id:string;name:string;total_rounds:number|null;gt_tournaments:{id:string;title:string;event_date:string|null;published:boolean}};
 const dv=await db.from('gt_divisions').select('id,name,total_rounds,gt_tournaments!inner(id,title,event_date,published)').eq('gt_tournaments.published',true).limit(500);
 if(dv.error||!dv.data?.length)return [];
 const divisions=dv.data as unknown as D[];const ids=divisions.map(d=>d.id);
 const [mr,br]=await Promise.all([db.from('gt_matches').select('division_id,round_number,pool_label,state').in('division_id',ids).neq('state','void').limit(20000),db.from('gt_byes').select('division_id,round_number,pool_label').in('division_id',ids).limit(5000)]);
 if(mr.error||br.error||mr.data?.length===20000||br.data?.length===5000)return [];
 const out=new Map<string,ResultEvent>();
 for(const d of divisions){const matches=(mr.data||[]).filter(m=>m.division_id===d.id),byes=(br.data||[]).filter(m=>m.division_id===d.id);const rounds=d.total_rounds||5;
  if(!divisionProgress(matches,byes,rounds).complete)continue;
  const st=await db.rpc('gt_division_standings_v3',{p_division:d.id,p_pool:null});
  type S={athlete_id:string|null;pos:number;display_name:string;institution:string|null;wins:number;losses:number;draws:number;byes:number;score:number;sos:number;withdrawn:boolean};
  const standings=(st.data||[]) as S[];
  if(st.error||!standings.length||!standings.every(s=>s.withdrawn||Number(s.wins)+Number(s.losses)+Number(s.draws||0)+Number(s.byes)>=rounds))continue;
  const ev=d.gt_tournaments;let e=out.get(ev.id);if(!e){e={title:ev.title,date:ev.event_date,complete:true,divisions:[]};out.set(ev.id,e);}
  e.divisions.push({division:d.name,people:standings.map(s=>({placing:s.pos,go_id:'',full_name:s.display_name,institution:s.institution,athlete_id:s.athlete_id,wins:s.wins,losses:s.losses,byes:s.byes,points:s.score,sos:s.sos}))});
 }
 return [...out.values()];
}
