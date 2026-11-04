import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Event = { id:string;title:string;event_date:string|null;start_at:string|null;poster_url:string|null;status:string|null;registration_open_date:string|null;registration_close_date:string|null };

// Rebuilt from the database at most every 30 s, so new posters and tournaments appear without a redeploy.
export const revalidate = 30;

/** Thai status from the published dates (the raw DB status such as "draft" is internal). */
function statusLabel(e:Event):{text:string;cls:string}{
 const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"});
 if(e.event_date&&today>e.event_date)return {text:"จบการแข่งขันแล้ว",cls:"bg-slate-100 text-slate-700"};
 if(e.event_date&&today===e.event_date)return {text:"กำลังแข่งขันวันนี้",cls:"bg-rose-100 text-rose-800"};
 if(e.registration_open_date&&today<e.registration_open_date)return {text:"รอเปิดรับสมัคร",cls:"bg-blue-100 text-blue-800"};
 if(e.registration_close_date&&today>e.registration_close_date)return {text:"ปิดรับสมัครแล้ว",cls:"bg-amber-100 text-amber-900"};
 if(e.registration_open_date)return {text:"เปิดรับสมัคร",cls:"bg-green-100 text-green-800"};
 return {text:"รออัปเดต",cls:"bg-slate-100 text-slate-700"};
}
async function getEvents():Promise<Event[]> {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return [];
 try {const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await db.from("gt_tournaments").select("id,title,event_date,start_at,poster_url,status,registration_open_date,registration_close_date").eq("published",true).order("start_at",{ascending:false}).limit(30);if(error)return [];return data??[];}catch{return [];}
}
const demos=[{title:"ZEER GO KYU WAR 2026",date:"5 ธันวาคม 2569",place:"เซียร์ รังสิต",divisions:"1–2K · 3–4K · 5–6K · 7–8K · 9–12K · Friendship 9×9 / 13×13"},{title:"รายการแข่งขันตัวอย่าง",date:"รออัปเดต",place:"รออัปเดต",divisions:"รอประกาศรุ่นแข่งขัน"}];
const dateText=(s:string|null)=>s?new Date(s+"T12:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"}):"รออัปเดตวันแข่งขัน";
export default async function TournamentList(){
 const events=await getEvents();
 return <main className="min-h-screen bg-[#edf3fa] pb-24 text-[#09244e]">
 <header className="sticky top-0 z-30 bg-[#041b3c] text-white shadow-md"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4"><Link href="/" className="text-sm font-bold text-[#f2cf83]">‹ หน้าแรก</Link><span className="text-base font-extrabold tracking-wide">GO TOURNAMENT</span><Link href="/menu" className="text-sm">เมนู ☰</Link></div></header>
 <div className="mx-auto max-w-6xl px-4 py-6">
 <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#061a39] via-[#103d78] to-[#061a39] px-5 py-8 text-white shadow-lg sm:px-9"><p className="text-xs font-bold tracking-[.22em] text-[#f5d58d]">GO TOURNAMENT</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">รายการแข่งขันหมากล้อม</h1><p className="mt-3 max-w-xl text-sm text-blue-100">ค้นหางานแข่งขัน ดูรายละเอียด รุ่นที่เปิดรับสมัคร และติดตามสถานะการแข่งขันได้ในหน้าเดียว</p></div>
 <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">รายการแข่งขันทั้งหมด</h2><span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">{events.length?events.length+" รายการที่เผยแพร่":"กำลังเตรียมข้อมูลรายการจริง"}</span></div>
 <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {events.length?events.map(e=><article key={e.id} className="overflow-hidden rounded-xl border border-[#d8e2ee] bg-white shadow-sm"><Link href={`/tournaments/${e.id}`} aria-label={"ดูรายละเอียด "+e.title} className="relative flex h-72 items-center justify-center bg-gradient-to-br from-[#061c40] to-[#174b8b] sm:h-80">{e.poster_url?<img src={e.poster_url.replace(/^(\/posters\/.+)\.(jpe?g|png|webp)$/i,"$1-thumb.$2")} alt={"โปสเตอร์ "+e.title} className="h-full w-full object-cover object-top"/>:<div className="text-center text-[#f1d48b]"><div className="text-5xl">🏆</div><p className="mt-2 text-xs">รออัปเดตโปสเตอร์</p></div>}</Link><div className="p-4"><h3 className="min-h-12 text-lg font-extrabold">{e.title}</h3><p className="mt-2 text-sm text-slate-600">📅 {dateText(e.event_date)}</p><p className="mt-2"><span className={"rounded-full px-3 py-1 text-xs font-bold "+statusLabel(e).cls}>{statusLabel(e).text}</span></p><Link href={`/tournaments/${e.id}`} className="mt-4 block rounded-lg bg-[#0754bf] px-4 py-3 text-center text-sm font-bold text-white">ดูรายละเอียดการแข่งขัน →</Link></div></article>):demos.map((e,i)=><article key={i} className="overflow-hidden rounded-xl border border-[#d8e2ee] bg-white shadow-sm"><div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-[#061c40] via-[#123d75] to-[#061a39]"><span className="text-6xl" aria-hidden="true">🏆</span><span className="absolute right-3 top-3 rounded bg-[#ffe0a1] px-2 py-1 text-xs font-bold text-[#49340b]">โครงตัวอย่าง</span></div><div className="p-4"><h3 className="text-lg font-extrabold">{e.title}</h3><p className="mt-2 text-sm text-slate-600">📅 {e.date}</p><p className="mt-1 text-sm text-slate-600">📍 {e.place}</p><p className="mt-2 text-xs text-slate-500">{e.divisions}</p><div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900">รออัปเดตข้อมูลในระบบ · ยังไม่เปิดสมัครผ่านหน้านี้</div></div></article>)}
 </div>
 <section className="mt-8 rounded-xl border border-[#d9e4f0] bg-white p-5"><h2 className="text-lg font-extrabold">ข้อมูลในหน้ารายการแข่งขัน</h2><p className="mt-2 text-sm leading-7 text-slate-600">แต่ละรายการจะมีโปสเตอร์ วันและสถานที่แข่งขัน รุ่นแข่งขัน ค่าสมัคร กำหนดรับสมัคร รายชื่อผู้สมัคร และปุ่มสมัครแข่งขัน โดยข้อมูลที่ยังไม่เผยแพร่จะแสดงสถานะรออัปเดต</p></section>
 </div><nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t bg-white py-3 text-center text-xs font-bold shadow-lg sm:hidden"><Link href="/">⌂<span className="block">หน้าแรก</span></Link><Link href="/tournaments" className="text-[#b38326]">🏆<span className="block">แข่งขัน</span></Link><Link href="/go-fan">★<span className="block">GO FAN</span></Link><Link href="/menu">☰<span className="block">เมนู</span></Link></nav></main>;
}