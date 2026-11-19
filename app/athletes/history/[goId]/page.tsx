import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import PublicPage from '@/components/PublicPage';
import CentralHistory from '@/components/CentralHistory';
import {loadHistoryProfile} from '@/lib/central-history';
export const revalidate=30;
export async function generateMetadata({params}:{params:Promise<{goId:string}>}):Promise<Metadata>{
 const p=await loadHistoryProfile((await params).goId);
 return {title:p?`${p.full_name} · ประวัติการแข่งขัน`:'ประวัติการแข่งขัน'};
}
export default async function HistoryPage({params}:{params:Promise<{goId:string}>}){
 const p=await loadHistoryProfile((await params).goId);if(!p)notFound();
 return <PublicPage icon="athlete" title={p.full_name} sub={`${p.go_id} · ประวัติการแข่งขันปี 2569`} current="/athletes">
  <Link className="text-blue-800 underline" href="/athletes">← กลับรายชื่อนักกีฬา</Link>
  <CentralHistory profile={p}/>
 </PublicPage>;
}
