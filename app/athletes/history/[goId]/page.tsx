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
 return <PublicPage fullWidth icon="athlete" title={p.full_name} sub={`${p.go_id} · ประวัติการแข่งขันปี 2569`} current="/athletes">
  <BackLink className="text-blue-800 underline" href="/athletes" label="← ย้อนกลับ"/>
  <section className="gt-card mt-3 flex items-center gap-3 p-3 sm:gap-5 sm:p-5">
   <AthleteAvatar src={p.photo} name={p.full_name} className="h-20 w-20 sm:h-28 sm:w-28" zoom/>
   <div className="min-w-0">
    <h2 className="break-words text-lg font-bold sm:text-2xl">{p.full_name}</h2>
    <p className="mt-1 break-all text-sm font-semibold text-[var(--gt-gold-ink)]">{p.go_id}</p>
    {p.level_history?.current?.label && <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-950">{p.level_history.current.label}</span>}
   </div>
  </section>
  <CentralHistory profile={p} initialView={sp.view} initialOpponent={sp.vs}/>
 </PublicPage>;
}
