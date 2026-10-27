import Link from "next/link";
import {visualGroups,visualImages} from "./visual-data";
import {VisualImage} from "./VisualImage";
import {SiteOfficialLogo} from "../components/SiteHeroMedia";
export default function VisualOverview(){
 return <main className="min-h-screen bg-[#eef3fb] text-[#102a53]">
  <header className="bg-[#09234d] px-4 py-7 text-white">
   <div className="mx-auto max-w-6xl">
    <Link href="/" className="font-bold text-[#f4cf80]">‹ กลับหน้าแรก</Link>
    <div className="mt-4 flex items-center gap-4">
     <div className="hidden sm:block"><SiteOfficialLogo/></div>
     <div><h1 className="text-3xl font-black tracking-wide sm:text-5xl">GO TOURNAMENT</h1>
     <p className="mt-2 text-blue-100">ภาพเว็บไซต์ที่ออกแบบไว้ — เลือกหน้าที่ต้องการดูได้เลย</p><Link href="/site-map" className="mt-3 inline-block rounded-lg border border-amber-200 px-4 py-2 text-sm font-bold text-amber-200">เปิดเมนูเว็บไซต์ที่ทำงานจริง ›</Link></div>
    </div>
   </div>
  </header>
  <div className="mx-auto max-w-6xl px-4 pb-16">
   <section className="mt-6 rounded-2xl border border-[#e4c27c] bg-[#fffaef] p-4 text-sm leading-relaxed">
    <strong>ภาพต้นแบบ / Visual Preview:</strong> แต่ละภาพคือแนวทางออกแบบ ไม่ใช่รายชื่อนักกีฬาหรือผลแข่งขันที่ยืนยันแล้ว
    หน้า Admin และหน้าข้อมูลจริงเดิมยังใช้งานแยกต่างหาก
   </section>
   <nav className="mt-5 flex flex-wrap gap-2" aria-label="หมวดภาพตัวอย่าง">
    {visualGroups.map(g=><a href={`#${g.id}`} key={g.id} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#123c73] shadow-sm">{g.title}</a>)}
   </nav>
   {visualGroups.map((g,i)=>{
    const image=visualImages[g.image];
    return <section id={g.id} key={g.id} className="mt-8 scroll-mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#123b74] p-5 text-white sm:p-7">
       <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f2ce80] text-xl font-black text-[#0c2c59]">{i+1}</span>
       <div><h2 className="text-xl font-extrabold sm:text-2xl">{g.title}</h2><p className="text-sm text-blue-100">{g.subtitle}</p></div></div>
      </div>
      <div className="p-3 sm:p-6">
       <VisualImage local={image.local} fallback={image.fallback} alt={g.title+" — ภาพต้นแบบเดิม"} className="h-auto w-full rounded-xl border border-blue-100 bg-blue-50 object-contain"/>
       <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {g.steps.map((step,index)=><Link key={step} href={`/visual-overview/${g.id}-${index+1}`} className="rounded-xl border border-blue-200 bg-[#f2f7ff] px-4 py-4 font-semibold text-blue-900 transition hover:bg-blue-100">
          <span className="text-xs text-blue-600">หน้า {index+1} / 5</span><p className="mt-1">{step}</p><span className="mt-2 inline-block text-sm text-blue-700">ดูภาพหน้าจอ ›</span>
         </Link>)}
       </div>
       <Link href={g.route} className="mt-5 block rounded-xl bg-[#0e3672] px-5 py-4 text-center font-bold text-white">เปิดหน้าเว็บไซต์ที่มีอยู่ตอนนี้</Link>
      </div>
     </section>;
   })}
  </div>
 </main>;
}