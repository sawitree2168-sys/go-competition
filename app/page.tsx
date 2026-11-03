import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Tournament = { id:string; title:string; event_date:string|null; start_at:string|null; poster_url:string|null; status:string|null };
async function tournaments():Promise<Tournament[]>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return [];
 try {
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from("gt_tournaments").select("id,title,event_date,start_at,poster_url,status").eq("published",true).order("start_at",{ascending:false}).limit(12);
  if(error)return [];
  return (data??[]) as Tournament[];
 } catch {return [];}
}
export default async function Home(){
 const events=await tournaments();
 const featured=events[0];
 return <main className="min-h-screen bg-[#f3f7fc] pb-20 text-[#09265b] md:pb-0">
  <header className="sticky top-0 z-30 bg-[#041b41] text-white shadow-md">
   <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
    <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="GO TOURNAMENT หน้าแรก">
     <span className="relative flex h-9 w-11 shrink-0 items-center justify-center text-2xl font-black tracking-tighter text-[#eac576]">G<span className="ml-[-2px] inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#d8b777] bg-gradient-to-br from-white via-[#e6e7eb] to-[#131a2d] text-[8px] text-[#061b43]">●</span></span>
     <span className="truncate text-sm font-semibold tracking-wide sm:text-lg">TOURNAMENT</span>
    </Link>
    <nav className="hidden items-center gap-4 text-xs font-semibold lg:flex"><Link href="/">หน้าแรก</Link><Link href="/tournaments">รายการแข่งขัน</Link><Link href="/stats">อันดับ/สถิติ</Link><Link href="/news">ข่าวสาร</Link><Link href="/gallery">แกลเลอรี</Link><Link href="/documents">เอกสาร</Link><Link href="/faq">FAQ</Link></nav>
    <Link href="/register" className="shrink-0 rounded-lg bg-gradient-to-b from-[#ffe3a0] to-[#e9b44e] px-3 py-2 text-xs font-bold text-[#0b2552] sm:text-sm">สมัครแข่งขัน</Link>
   </div>
  </header>
  <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5">
   <section className="relative isolate overflow-hidden rounded-xl border border-[#b8cce4] bg-[#071e43] shadow-md">
    {featured?.poster_url?<img src={featured.poster_url} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70"/>:<div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_20%,#c99d55_0%,transparent_30%),radial-gradient(ellipse_at_20%_95%,#3261a4_0%,transparent_50%),linear-gradient(125deg,#04132d,#123b71_65%,#071a3b)]"><div className="absolute -bottom-8 right-3 text-[140px] leading-none opacity-30 sm:right-20 sm:text-[200px]">🏆</div><div className="absolute bottom-0 left-0 right-0 h-12 bg-[radial-gradient(ellipse_at_15%_80%,#f1f3f5_0%,#1b2638_30%,transparent_60%)] opacity-50"/></div>}
    <div className="bg-gradient-to-r from-[#04142e]/95 via-[#061d43]/85 to-[#051b3c]/35 px-5 py-7 text-white sm:px-10 sm:py-12">
     <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e7c778]">GO TOURNAMENT · รายการแข่งขันล่าสุด</p>
     <h1 className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight drop-shadow-md sm:text-4xl">{featured?featured.title:"การแข่งขันหมากล้อม GO TOURNAMENT"}</h1>
     <p className="mt-3 text-sm text-blue-100 sm:text-base">{featured?.event_date?new Date(featured.event_date+"T12:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"}):"ค้นหารายการและติดตามการแข่งขันหมากล้อม"}</p>
     <div className="mt-6 flex flex-wrap gap-2"><Link href="/register" className="rounded-lg bg-gradient-to-b from-[#ffe4a1] to-[#e5ad45] px-5 py-3 text-sm font-extrabold text-[#08204a] shadow-md">สมัครแข่งขัน</Link><Link href={featured?`/tournaments/${featured.id}`:"/tournaments"} className="rounded-lg border border-white/80 bg-[#061d43]/65 px-5 py-3 text-sm font-bold text-white">ดูรายละเอียด</Link></div>
    </div>
   </section>
   <section aria-label="เมนูด่วน" className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
    {[{name:"สมัครแข่งขัน",href:"/register",icon:"▣"},{name:"รายชื่อผู้สมัคร",href:"/tournaments",icon:"☷"},{name:"ผลการแข่งขัน",href:"/results",icon:"🏆"},{name:"อันดับ/สถิติ",href:"/stats",icon:"▥"},{name:"ข่าวสาร",href:"/news",icon:"▤"},{name:"เอกสาร",href:"/documents",icon:"▧"},{name:"GO FAN",href:"/go-fan",icon:"★"}].map(x=><Link key={x.name} href={x.href} className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-lg border border-[#d7e2f1] bg-white p-2 text-center shadow-sm transition hover:border-blue-400"><span className="text-lg font-bold text-[#0d4a9a]">{x.icon}</span><span className="text-[11px] font-semibold leading-tight sm:text-xs">{x.name}</span></Link>)}
   </section>
   <section className="mt-7">
    <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold sm:text-xl">รายการแข่งขันทั้งหมด</h2><Link href="/tournaments" className="text-sm font-semibold text-blue-700">ดูทั้งหมด →</Link></div>
    {events.length>0?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{events.map(e=><Link key={e.id} href={`/tournaments/${e.id}`} className="flex overflow-hidden rounded-xl border border-[#dce5f2] bg-white shadow-sm transition hover:shadow-md">
     {e.poster_url?<img src={e.poster_url} alt="" className="h-28 w-28 shrink-0 object-cover"/>:<div className="flex h-28 w-24 shrink-0 items-center justify-center bg-[#0c2b5e] text-xs font-bold text-[#eac576]">GO</div>}
     <div className="min-w-0 p-3"><h3 className="line-clamp-2 font-bold">{e.title}</h3><p className="mt-2 text-xs text-slate-600">{e.event_date?new Date(e.event_date+"T12:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"}):"รอประกาศวันแข่งขัน"}</p><span className="mt-2 inline-block text-xs font-semibold text-blue-700">รายละเอียด →</span></div>
    </Link>)}</div>:<div className="rounded-xl border bg-white p-5 text-sm text-slate-600">ยังไม่มีรายการแข่งขันที่เผยแพร่ในฐานข้อมูล</div>}
   </section>
   <section className="mt-7 grid gap-4 pb-9 md:grid-cols-2"><div className="rounded-xl border border-[#dce5f2] bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold">ข่าวสารล่าสุด</h2><Link href="/news" className="text-xs font-semibold text-blue-700">ดูทั้งหมด →</Link></div><p className="mt-3 text-sm text-slate-500">ติดตามประกาศและข่าวสารการแข่งขัน</p></div><div className="rounded-xl border border-[#dce5f2] bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold">อันดับนักกีฬาและสถิติ</h2><Link href="/stats" className="text-xs font-semibold text-blue-700">ดูทั้งหมด →</Link></div><p className="mt-3 text-sm text-slate-500">ดูอันดับและสถิติจากผลการแข่งขันที่ยืนยันแล้ว</p></div></section>
  </div>
  <nav aria-label="เมนูหลักบนมือถือ" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_15px_rgba(0,0,0,0.08)] md:hidden">
   {[{label:"หน้าแรก",href:"/",icon:"⌂"},{label:"แข่งขัน",href:"/tournaments",icon:"🏆"},{label:"GO FAN",href:"/go-fan",icon:"★"},{label:"นักกีฬา",href:"/athletes",icon:"♟"},{label:"เมนู",href:"/menu",icon:"☰"}].map(x=><Link key={x.label} href={x.href} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[#09265b]"><span className="text-xl leading-none">{x.icon}</span><span className="text-[11px] font-semibold">{x.label}</span></Link>)}
  </nav>
 </main>;
}
