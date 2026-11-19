import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import PublicPage from '@/components/PublicPage';
import CentralHistory from '@/components/CentralHistory';
import BackLink from '@/components/BackLink';
import AthleteAvatar from '@/components/AthleteAvatar';
import {loadHistoryProfile} from '@/lib/central-history';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{goId:string}>}):Promise<Metadata>{
 const p=await loadHistoryProfile((await params).goId);
 return {title:p?`${p.full_name} · ประวัติการแข่งขัน`:'ประวัติการแข่งขัน'};
}
export default async function HistoryPage({params,searchParams}:{params:Promise<{goId:string}>;searchParams:Promise<{view?:string;vs?:string}>}){
 const p=await loadHistoryProfile((await params).goId);if(!p)notFound();
 const sp=await searchParams;
 return <PublicPage icon="athlete" title={p.full_name} sub={`${p.go_id} · ประวัติการแข่งขันปี 2569`} current="/athletes">
  <BackLink className="text-blue-800 underline" href="/athletes" label="← ย้อนกลับ"/>
<section className="portrait-profile-masthead"><AthleteAvatar name={p.full_name} variant="portrait" zoom/><div><p className="portrait-profile-kicker">GO TOURNAMENT · นักกีฬา</p><h2>{p.full_name}</h2><p>{p.go_id}</p>{p.level_history?.current?.label&&<span className="portrait-profile-level">{p.level_history.current.label}</span>}<p>แตะรูปเพื่อดูภาพขนาดใหญ่</p></div></section>
  <CentralHistory profile={p} initialView={sp.view} initialOpponent={sp.vs}/>
 </PublicPage>;
}
