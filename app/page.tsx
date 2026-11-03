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
const links=[
 {name:"รายการแข่งขัน",href:"/tournaments",icon:"🏆",desc:"ดูรายการและรายละเอียด"},
 {name:"สมัครแข่งขัน",href:"/register",icon:"📝",desc:"ลงทะเบียนเข้าร่วม"},
 {name:"นักกีฬา",href:"/athletes",icon:"👥",desc:"ค้นหานักกีฬา"},
 {name:"ตารางแข่งขัน",href:"/schedule",icon:"▦",desc:"ตารางและรอบการแข่งขัน"},
 {name:"GO FAN",href:"/go-fan",icon:"⭐",desc:"ติดตามนักกีฬาที่ชื่นชอบ"},
 {name:"ผลการแข่งขัน",href:"/results",icon:"📊",desc:"ดูผลและสถิติ"},
];
export default async function Home(){
 const events=await tournaments();
 const featured=events[0];
 return <main className="min-h-screen bg-[#edf3fb] pb-20 text-[#09265b] md:pb-0">
  <header className="sticky top-0 z-30 bg-[#041b41] text-white shadow-md">
   <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
    <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="GO TOURNAMENT หน้าแรก">
     <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d3ae62] bg-[#123361] text-sm font-extrabold text-[#eac576]">GO</span>
     <span className="truncate text-sm font-semibold tracking-wide sm:text-lg">TOURNAMENT</span>
    </Link>
    <nav className="hidden items-center gap-5 text-sm md:flex"><Link href="/tournaments">การแข่งขัน</Link><Link href="/athletes">นักกีฬา</Link><Link href="/schedule">ตารางแข่ง</Link><Link href="/results">ผลการแข่งขัน</Link><Link href="/go-fan">GO FAN</Link></nav>
    <Link href="/register" className="shrink-0 rounded-lg bg-[#0863f7] px-3 py-2 text-xs font-bold sm:text-sm">สมัครแข่งขัน</Link>
   </div>
  </header>
  <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-6 sm:pt-7">
   <section className="overflow-hidden rounded-2xl border border-[#dbe5f2] bg-white shadow-sm">
    <div className="bg-gradient-to-r from-[#05204b] via-[#0a3c80] to-[#07204b] px-4 py-4 text-white sm:px-6">
     <p className="text-xs font-semibold tracking-wide text-[#eac576]">GO TOURNAMENT</p>
     <h1 className="mt-1 text-xl font-bold sm:text-2xl">รายการแข่งขันหมากล้อม</h1>
     <p className="mt-1 text-xs text-blue-100 sm:text-sm">ค้นหารายการ สมัครแข่งขัน และติดตามผลได้ในที่เดียว</p>
    </div>
    {featured?<div className="grid gap-0 sm:grid-cols-[240px_1fr]">
     {featured.poster_url?<img src={featured.poster_url} alt={`โปสเตอร์ ${featured.title}`} className="h-44 w-full object-cover sm:h-full"/>:<div className="flex h-28 items-center justify-center bg-[#102e60] text-2xl font-bold text-[#eac576]">GO TOURNAMENT</div>}
     <div className="p-4 sm:p-6"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">รายการแข่งขันล่าสุด</span><h2 className="mt-3 text-lg font-bold sm:text-xl">{featured.title}</h2><p className="mt-2 text-sm text-slate-600">{featured.event_date?new Date(featured.event_date+"T12:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"}):"รอประกาศวันแข่งขัน"}</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/tournaments/${featured.id}`} className="rounded-lg bg-[#0863f7] px-4 py-3 text-sm font-semibold text-white">ดูรายละเอียดการแข่งขัน</Link><Link href="/register" className="rounded-lg border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-700">สมัครแข่งขัน</Link></div></div>
    </div>:<div className="p-5"><p className="font-semibold">รายการแข่งขันที่เผยแพร่จะปรากฏตรงนี้</p><p className="mt-1 text-sm text-slate-600">ระหว่างนี้สามารถเข้าดูรายการแข่งขันและระบบสมัครได้จากเมนูด้านล่าง</p><Link href="/tournaments" className="mt-4 inline-block rounded-lg bg-[#0863f7] px-5 py-3 text-sm font-semibold text-white">ดูรายการแข่งขัน</Link></div>}
   </section>
   <section className="mt-6">
    <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold sm:text-xl">รายการแข่งขันทั้งหมด</h2><Link href="/tournaments" className="text-sm font-semibold text-blue-700">ดูทั้งหมด →</Link></div>
    {events.length>0?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{events.map(e=><Link key={e.id} href={`/tournaments/${e.id}`} className="flex overflow-hidden rounded-xl border border-[#dce5f2] bg-white shadow-sm transition hover:shadow-md">
     {e.poster_url?<img src={e.poster_url} alt="" className="h-28 w-28 shrink-0 object-cover"/>:<div className="flex h-28 w-24 shrink-0 items-center justify-center bg-[#0c2b5e] text-xs font-bold text-[#eac576]">GO</div>}
     <div className="min-w-0 p-3"><h3 className="line-clamp-2 font-bold">{e.title}</h3><p className="mt-2 text-xs text-slate-600">{e.event_date?new Date(e.event_date+"T12:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"}):"รอประกาศวันแข่งขัน"}</p><span className="mt-2 inline-block text-xs font-semibold text-blue-700">รายละเอียด →</span></div>
    </Link>)}</div>:<div className="rounded-xl border bg-white p-5 text-sm text-slate-600">ยังไม่มีรายการแข่งขันที่เผยแพร่ในฐานข้อมูล</div>}
   </section>
   <section className="mt-7 pb-9"><h2 className="mb-3 text-lg font-bold sm:text-xl">บริการอื่น ๆ</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{links.map(x=><Link key={x.name} href={x.href} className="rounded-xl border border-[#dce5f2] bg-white p-3 shadow-sm"><span className="text-xl" aria-hidden="true">{x.icon}</span><h3 className="mt-1 text-sm font-bold">{x.name}</h3><p className="mt-1 text-xs text-slate-500">{x.desc}</p></Link>)}</div></section>
  </div>
  <nav aria-label="เมนูหลักบนมือถือ" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_15px_rgba(0,0,0,0.08)] md:hidden">
   {[{label:"หน้าแรก",href:"/",icon:"⌂"},{label:"แข่งขัน",href:"/tournaments",icon:"🏆"},{label:"GO FAN",href:"/go-fan",icon:"★"},{label:"นักกีฬา",href:"/athletes",icon:"♟"},{label:"เมนู",href:"/schedule",icon:"☰"}].map(x=><Link key={x.label} href={x.href} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[#09265b]"><span className="text-xl leading-none">{x.icon}</span><span className="text-[11px] font-semibold">{x.label}</span></Link>)}
  </nav>
 </main>;
}
