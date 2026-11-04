import Link from "next/link";
import Image from "next/image";
import PosterViewer from "@/components/PosterViewer";
import { createClient } from "@supabase/supabase-js";

// Rebuilt from the database at most every 60 s, so new tournaments and posters appear without a redeploy.
export const revalidate = 60;

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
    {featured?.poster_url?<Image src={featured.poster_url} alt="" fill sizes="100vw" className="-z-10 scale-110 object-cover opacity-60 blur-md"/>:<div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_20%,#c99d55_0%,transparent_30%),radial-gradient(ellipse_at_20%_95%,#3261a4_0%,transparent_50%),linear-gradient(125deg,#04132d,#123b71_65%,#071a3b)]"><div className="absolute -bottom-8 right-3 text-[140px] leading-none opacity-30 sm:right-20 sm:text-[200px]">🏆</div><div className="absolute bottom-0 left-0 right-0 h-12 bg-[radial-gradient(ellipse_at_15%_80%,#f1f3f5_0%,#1b2638_30%,transparent_60%)] opacity-50"/></div>}
    <div className="flex items-center gap-4 bg-gradient-to-r from-[#04142e]/95 via-[#061d43]/85 to-[#051b3c]/35 px-5 py-7 text-white sm:gap-8 sm:px-10 sm:py-12"><div className="min-w-0 flex-1">
     <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e7c778]">GO TOURNAMENT · รายการแข่งขันล่าสุด</p>
     <h1 className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight drop-shadow-md sm:text-4xl">{featured?featured.title:"การแข่งขันหมากล้อม GO TOURNAMENT"}</h1>
     <p className="mt-3 text-sm text-blue-100 sm:text-base">{featured?.event_date?new Date(featured.event_date+"T12:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"}):"ค้นหารายการและติดตามการแข่งขันหมากล้อม"}</p>
     <div className="mt-6 flex flex-wrap gap-2"><Link href="/register" className="rounded-lg bg-gradient-to-b from-[#ffe4a1] to-[#e5ad45] px-5 py-3 text-sm font-extrabold text-[#08204a] shadow-md">สมัครแข่งขัน</Link><Link href={featured?`/tournaments/${featured.id}`:"/tournaments"} className="rounded-lg border border-white/80 bg-[#061d43]/65 px-5 py-3 text-sm font-bold text-white">ดูรายละเอียด</Link></div>
    </div>{featured?.poster_url&&<PosterViewer src={featured.poster_url} alt={"โปสเตอร์ "+featured.title} sizes="(min-width: 640px) 176px, 112px" preload className="h-[10.5rem] w-28 rounded-lg shadow-xl ring-2 ring-[#e7c778]/70 sm:h-64 sm:w-44"/>}</div></section>
   <section aria-label="เมนูด่วน" className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
    {[{name:"สมัครแข่งขัน",href:"/register",icon:"▣"},{name:"รายชื่อผู้สมัคร",href:"/tournaments",icon:"☷"},{name:"ผลการแข่งขัน",href:"/results",icon:"🏆"},{name:"อันดับ/สถิติ",href:"/stats",icon:"▥"},{name:"ข่าวสาร",href:"/news",icon:"▤"},{name:"เอกสาร",href:"/documents",icon:"▧"},{name:"GO FAN",href:"/go-fan",icon:"★"}].map(x=><Link key={x.name} href={x.href} className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-lg border border-[#d7e2f1] bg-white p-2 text-center shadow-sm transition hover:border-blue-400"><span className="text-lg font-bold text-[#0d4a9a]">{x.icon}</span><span className="text-[11px] font-semibold leading-tight sm:text-xs">{x.name}</span></Link>)}
   </section>
   <section className="mt-7">
    <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold sm:text-xl">รายการแข่งขันทั้งหมด</h2><Link href="/tournaments" className="text-sm font-semibold text-blue-700">ดูทั้งหมด →</Link></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
     {(events.length?events: [{id:"",title:"ZEER GO KYU WAR 2026",event_date:"2026-12-05",start_at:null,poster_url:null,status:null},{id:"",title:"รายการแข่งขันตัวอย่าง 02",event_date:null,start_at:null,poster_url:null,status:null},{id:"",title:"รายการแข่งขันตัวอย่าง 03",event_date:null,start_at:null,poster_url:null,status:null},{id:"",title:"รายการแข่งขันตัวอย่าง 04",event_date:null,start_at:null,poster_url:null,status:null}]).map((e,i)=><div key={e.id||i} className="overflow-hidden rounded-xl border border-[#dce5f2] bg-white shadow-sm">
      <div className={"relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#071b3d] via-[#174d8d] to-[#09214c] text-[#f6d384] "+(e.poster_url?"h-60":"h-32")}>
       {e.poster_url?<PosterViewer src={e.poster_url} alt={"โปสเตอร์ "+e.title} sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw" className="absolute inset-0 h-full w-full"/>:<><span className="text-5xl opacity-80" aria-hidden="true">🏆</span><span className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-[#0a2855]">รออัปเดตโปสเตอร์</span></>}
       {!e.id&&<span className="absolute right-2 top-2 rounded bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">ข้อมูลตัวอย่าง</span>}
      </div>
      <div className="p-3"><h3 className="min-h-11 text-sm font-bold">{e.title}</h3><p className="mt-1 text-xs text-slate-600">{e.event_date?new Date(e.event_date+"T12:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"}):"วันแข่งขัน: รออัปเดต"}</p><p className="mt-1 text-xs text-slate-500">สถานที่และรุ่นแข่งขัน: {e.id?"ดูรายละเอียด":"รออัปเดต"}</p>{e.id?<Link href={`/tournaments/${e.id}`} className="mt-3 block rounded-lg bg-[#0758c8] px-3 py-2 text-center text-xs font-bold text-white">ดูรายละเอียดการแข่งขัน</Link>:<div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-900">ตัวอย่างโครงสร้าง · ยังไม่เปิดสมัคร</div>}</div>
     </div>)}
    </div>
   </section>
   <section className="mt-7 grid gap-4 pb-9 lg:grid-cols-2">
    <div className="rounded-xl border border-[#dce5f2] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold">ข่าวสารล่าสุด</h2><Link href="/news" className="text-xs font-semibold text-blue-700">ดูทั้งหมด →</Link></div><div className="mt-3 space-y-3">{["ประกาศเปิดรับสมัครแข่งขัน","สรุปผลการแข่งขันล่าสุด","ภาพบรรยากาศการแข่งขัน"].map((title,i)=><div key={title} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0"><div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#123d79] to-[#06172f] text-2xl text-[#f5d080]">{["📣","🏆","▧"][i]}</div><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs text-slate-500">ข้อมูลตัวอย่าง · ยังไม่อัปเดตข่าวจริง</p></div></div>)}</div></div>
    <div className="rounded-xl border border-[#dce5f2] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold">อันดับนักกีฬาประจำปี (Top 5)</h2><Link href="/stats" className="text-xs font-semibold text-blue-700">ดูทั้งหมด →</Link></div><p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">ตัวอย่างตำแหน่งแสดงผล · รอข้อมูลคะแนนที่ยืนยันแล้ว</p><div className="mt-3 grid grid-cols-5 gap-2">{[1,2,3,4,5].map(n=><div key={n} className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f0fc] text-lg text-[#174a88]">♟</div><p className="mt-1 text-xs font-bold">อันดับ {n}</p><p className="text-[10px] text-slate-500">รออัปเดต</p></div>)}</div><div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center">{["รายการแข่งขัน","นักกีฬา","ผลการแข่งขัน"].map(t=><div key={t} className="rounded bg-[#f2f6fc] p-2"><p className="text-lg font-bold text-[#0b3c7d]">—</p><p className="text-[10px] text-slate-600">{t}</p></div>)}</div></div>
   </section>
  </div>
  <nav aria-label="เมนูหลักบนมือถือ" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_15px_rgba(0,0,0,0.08)] md:hidden">
   {[{label:"หน้าแรก",href:"/",icon:"⌂"},{label:"แข่งขัน",href:"/tournaments",icon:"🏆"},{label:"GO FAN",href:"/go-fan",icon:"★"},{label:"นักกีฬา",href:"/athletes",icon:"♟"},{label:"เมนู",href:"/menu",icon:"☰"}].map(x=><Link key={x.label} href={x.href} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[#09265b]"><span className="text-xl leading-none">{x.icon}</span><span className="text-[11px] font-semibold">{x.label}</span></Link>)}
  </nav>
 </main>;
}
