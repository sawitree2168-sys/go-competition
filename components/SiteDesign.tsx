import Link from "next/link";
import MenuIcon, { type MenuIconName } from "./MenuIcon";

export function PageHero({ title, sub }: { title: string; sub?: string }) {
  return <section className="site-hero"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div></section>;
}
export function SiteFooter() {
  return <footer className="site-footer"><div><strong>⚫⚪ GO TOURNAMENT</strong><p>ร่วมสร้างฐานข้อมูลและติดตามผลงานนักกีฬาหมากล้อม</p><nav aria-label="ลิงก์ท้ายเว็บไซต์"><Link href="/about">เกี่ยวกับและติดต่อ</Link><Link href="/faq">วิธีใช้งาน</Link><Link href="/results/submit">ส่งภาพผลการแข่งขัน</Link></nav></div></footer>;
}
export function SectionHeading({ children, icon="trophy" }: { children: React.ReactNode; icon?: MenuIconName }) {
  return <h2 className="site-section-title"><MenuIcon name={icon}/>{children}</h2>;
}
export function SiteShortcuts() {
 const links = [{href:"/tournaments",label:"การแข่งขัน",icon:"trophy"},{href:"/results",label:"ผลการแข่งขัน",icon:"stats"},{href:"/athletes",label:"นักกีฬา",icon:"athlete"},{href:"/go-fan",label:"GO FAN",icon:"entrants"}] as const;
 return <nav className="site-shortcuts" aria-label="บริการหลัก">{links.map(x=><Link key={x.href} href={x.href}><MenuIcon name={x.icon}/><strong>{x.label}</strong><span>›</span></Link>)}</nav>;
}
