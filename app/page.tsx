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
 return <main className="min-h-screen bg-[#edf3fb] text-[#081f52]">
  <header className="bg-gradient-to-r from-[#031635] via-[#073477] to-[#061b43] text-white shadow-lg">
   <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
    <Link href="/" className="flex items-center gap-3" aria-label="GO TOURNAMENT หน้าแรก">
     <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#cda85b] bg-[#102b58] text-lg font-black tracking-tight text-[#e9bd65]" aria-hidden="true">GO</span>
     <span className="text-sm sm:text-base font-semibold tracking-[0.08em]">TOURNAMENT</span>
    </Link>
    <nav className="hidden md:flex items-center gap-5 text-sm font-semibold"><Link href="/tournaments">การแข่งขัน</Link><Link href="/athletes">นักกีฬา</Link><Link href="/schedule">ตารางแข่ง</Link><Link href="/results">ผลการแข่งขัน</Link><Link href="/go-fan">GO FAN</Link></nav>
    <Link href="/register" className="rounded-xl bg-[#0863f7] px-4 py-3 font-semibold">สมัครแข่งขัน</Link>
   </div>
  </header>
  <section className="bg-gradient-to-br from-[#082354] via-[#08428c] to-[#031734] text-white">
   <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
    <span className="inline-block rounded-full border border-[#e7c578] px-4 py-1 text-sm text-[#f4d58d]">GO TOURNAMENT</span>
    <h1 className="mt-4 max-w-3xl text-3xl sm:text-5xl font-extrabold leading-tight">ศูนย์รวมการแข่งขันหมากล้อม<br/><span className="text-[#f0ca76]">สำหรับนักกีฬาและผู้จัดงาน</span></h1>
    <p className="mt-5 max-w-2xl text-base sm:text-lg text-blue-100">ค้นหารายการแข่งขัน สมัครแข่งขัน ติดตามผล และดูประวัติการแข่งได้ในที่เดียว</p>
    <div className="mt-7 flex flex-wrap gap-3"><Link href="/tournaments" className="rounded-xl bg-[#0863f7] px-6 py-3 font-bold">ดูรายการแข่งขัน</Link><Link href="/register" className="rounded-xl border border-white/60 px-6 py-3 font-bold">สมัครแข่งขัน</Link></div>
   </div>
  </section>
  <section className="mx-auto max-w-7xl px-4 py-9">
   <h2 className="mb-5 text-2xl font-bold">เมนูหลัก</h2>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{links.map(x=><Link key={x.name} href={x.href} className="rounded-2xl border border-[#dce5f2] bg-white p-4 shadow-sm transition hover:shadow-md"><span className="text-3xl" aria-hidden="true">{x.icon}</span><h3 className="mt-3 font-bold">{x.name}</h3><p className="mt-1 text-xs text-slate-500">{x.desc}</p></Link>)}</div>
  </section>
  <section className="mx-auto max-w-7xl px-4 pb-16">
   <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">รายการแข่งขัน</h2><Link href="/tournaments" className="text-sm font-semibold text-blue-700">ดูทั้งหมด →</Link></div>
   {events.length===0?<div className="rounded-2xl border bg-white p-8 text-center"><p className="text-lg font-semibold">ยังไม่มีรายการแข่งขันที่เผยแพร่</p><p className="mt-2 text-slate-600">เมื่อผู้จัดงานประกาศรายการแข่งขัน ข้อมูลจะปรากฏที่นี่โดยอัตโนมัติ</p></div>:
   <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{events.map(e=><article key={e.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
    {e.poster_url?<img src={e.poster_url} alt={`โปสเตอร์ ${e.title}`} className="h-52 w-full object-cover"/>:<div className="flex h-40 items-center justify-center bg-gradient-to-br from-[#092453] to-[#1257a5] text-4xl text-[#e8c578]">GO ●</div>}
    <div className="p-5"><h3 className="text-lg font-bold">{e.title}</h3><p className="mt-2 text-sm text-slate-600">{e.event_date?new Date(e.event_date+"T12:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"}):"รอประกาศวันแข่งขัน"}</p><Link href={`/tournaments/${e.id}`} className="mt-4 inline-block rounded-lg bg-[#0863f7] px-5 py-3 font-semibold text-white">ดูรายละเอียด</Link></div>
   </article>)}</div>}
  </section>
  <footer className="bg-[#061b43] px-4 py-6 text-center text-sm text-blue-100">GO TOURNAMENT · ศูนย์รวมการแข่งขันหมากล้อม</footer>
 </main>;
}
