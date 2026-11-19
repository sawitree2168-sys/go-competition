import type {Metadata} from 'next';
import {Shell} from '@/app/tournaments/[id]/_ui/chrome';
import SiteBar from '@/app/tournaments/[id]/_ui/SiteBar';
import {SiteFooter} from '@/components/SiteDesign';
import MenuCards from './MenuCards';
import './menu.css';
export const metadata:Metadata={title:'เมนูทั้งหมด · GO TOURNAMENT'};
export default function MenuPage(){
 return <Shell wide><div className="menu-page relative left-1/2 w-screen -translate-x-1/2"><SiteBar current="/menu"/><main className="menu-content"><MenuCards/></main><SiteFooter/></div></Shell>;
}
