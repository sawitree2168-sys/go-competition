import PublicPage from '@/components/PublicPage';
import NewsBrowser from '@/components/NewsBrowser';
import {loadStories} from '@/lib/site-news';
export const revalidate=60;
export const metadata={title:'ข่าวสารและผลงานหมากล้อม | GO TOURNAMENT'};
export default async function Page(){return <PublicPage icon="news" title="ข่าวสารและผลงานหมากล้อม" sub="ติดตามข่าวและผลการแข่งขันจากข้อมูลที่ตรวจสอบแล้ว" current="/news"><NewsBrowser stories={await loadStories()}/></PublicPage>}
