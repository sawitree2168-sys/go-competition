import PublicPage from '@/components/PublicPage';
import {publicDb} from '@/app/tournaments/[id]/_ui/data';
import type {DirectoryAthlete} from '@/components/AthleteDirectory';
import type {HistoryProfile} from '@/lib/central-history';
import type {PairGoGame} from '@/lib/head-to-head';
import Meeting from './Meeting';
import './meeting.css';
export const metadata={title:'สถิติการพบกัน · GO TOURNAMENT'};
export default async function Page({searchParams}:{searchParams:Promise<{a?:string|string[];b?:string|string[];year?:string|string[]}>}){
 const params=await searchParams;const valid=(v:unknown)=>typeof v==='string'&&/^GO\d{6,20}$/.test(v)?v:'';
 const a=valid(params.a),b=valid(params.b);const db=publicDb();
 async function person(id:string){if(!id||!db)return null;const r=await db.rpc('gt_public_athlete_directory_v1',{p_query:id,p_page:1,p_size:30});if(r.error)throw new Error('โหลดรายชื่อนักกีฬาไม่สำเร็จ กรุณาลองใหม่');return (r.data?.rows as DirectoryAthlete[]??[]).find(x=>x.go_id===id)??null;}
 const [left,right]=await Promise.all([person(a),person(b)]);
 const pairPlayer=left??right;
 const [r,pair]=await Promise.all([
  left&&db?db.rpc('gt_history_profile_v1',{p_go_id:left.go_id,p_year:null}):null,
  pairPlayer&&db&&left?.go_id!==right?.go_id?db.rpc('gt_history_pair_meetings_v1',{
   p_player_go_id:pairPlayer.go_id,
   p_opponent_go_id:left&&right?right.go_id:null,
  }):null,
 ]);
 const year=typeof params.year==='string'&&/^\d{4}$/.test(params.year)?params.year:'all';
 return (
  <PublicPage icon="stats" title="สถิติการพบกัน" sub="เลือกนักกีฬาเพื่อดูประวัติการแข่งขันที่พบกัน" current="/head-to-head">
   <Meeting
    key={`${a}:${b}:${year}`}
    left={left}
    right={right}
    history={r?.data as HistoryProfile|null}
    error={r?.error?'โหลดประวัติไม่สำเร็จ กรุณาลองใหม่':(!db?'ยังเชื่อมต่อข้อมูลไม่ได้':'')}
    pairHistory={(pair?.data??[]) as PairGoGame[]}
    pairError={Boolean(pair?.error)}
    initialYear={year}
   />
  </PublicPage>
 );
}
