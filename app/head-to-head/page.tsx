import PublicPage from '@/components/PublicPage';
import {publicDb} from '@/app/tournaments/[id]/_ui/data';
import type {HistoryProfile} from '@/lib/central-history';
import {isMeetingLevel,type MeetingAthlete,type PairGoGame} from '@/lib/head-to-head';
import Meeting from './Meeting';
import './meeting.css';
export const metadata={title:'สถิติการพบกัน · GO TOURNAMENT'};
export default async function Page({searchParams}:{searchParams:Promise<{a?:string|string[];b?:string|string[];year?:string|string[];level1?:string|string[];level2?:string|string[]}>}){
 const params=await searchParams;const valid=(v:unknown)=>typeof v==='string'&&/^GO\d{6,20}$/.test(v)?v:'';
 const a=valid(params.a),b=valid(params.b);const db=publicDb();
 const level1=isMeetingLevel(params.level1)?params.level1:'all';
 const level2=isMeetingLevel(params.level2)?params.level2:'all';
 async function person(id:string) {
  if (!id || !db) return null;
  const result = await db.rpc('gt_head_to_head_athletes_v1',{p_query:id});
  if (result.error) throw new Error('โหลดรายชื่อนักกีฬาไม่สำเร็จ กรุณาลองใหม่');
  const rows = (result.data?.rows ?? []) as MeetingAthlete[];
  return rows.find(athlete => athlete.go_id === id) ?? null;
 }
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
    initialLevels={{1:level1,2:level2}}
   />
  </PublicPage>
 );
}
