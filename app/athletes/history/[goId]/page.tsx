import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import PublicPage from '@/components/PublicPage';
import CentralHistory from '@/components/CentralHistory';
import BackLink from '@/components/BackLink';
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
  <CentralHistory profile={p} initialView={sp.view} initialOpponent={sp.vs}/>
 </PublicPage>;
}
