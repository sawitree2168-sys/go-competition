import Link from "next/link";
import {SiteSectionBanner} from "../components/SiteSectionBanner";
import {previewGroups,previewPages} from "./page-catalog";
export default function OverviewPage(){
 return <main className="min-h-screen bg-[#eff5fd] text-[#12305d]">
 <header className="bg-[#092b61] px-5 py-4 text-white"><nav aria-label="นำทาง" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><Link href="/" className="font-black text-amber-200">‹ GO TOURNAMENT</Link><Link href="/site-map" className="rounded-xl border border-white/50 px-4 py-3 text-sm font-bold">หน้ารวมระบบ</Link></nav></header>
 <div className="mx-auto max-w-7xl space-y-7 px-4 py-7">
  <SiteSectionBanner slot="home" eyebrow="COMPLETE SITE OVERVIEW" title="ภาพรวมทุกหน้าของ GO TOURNAMENT" description="เปิดดูทุกส่วนงานได้ในหน้าเดียว แม้ระบบบางส่วนยังรอเชื่อมข้อมูล"/>
  <div role="note" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950"><strong>พื้นที่สแตนด์บายสำหรับตรวจภาพรวม:</strong> หน้าที่ระบุว่า “โครงหน้า” มีหน้าเว็บกดเปิดดูได้ แต่ยังไม่รับสมัคร ไม่รับชำระเงิน ไม่บันทึกผลแข่งขัน และไม่แสดงข้อมูลจำลองเป็นข้อมูลจริง ระบบที่เสร็จแล้วจะค่อยเชื่อมเข้าหน้าเดิมโดยไม่เปลี่ยนแนวออกแบบหลัก</div>
  <nav aria-label="เลือกหมวด" className="flex flex-wrap gap-2">{previewGroups.map((g,i)=><a key={g} href={"#group-"+i} className="min-h-11 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-800">{g}</a>)}</nav>
  {previewGroups.map((section,i)=><section key={section} id={"group-"+i} className="scroll-mt-5 space-y-4">
   <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black sm:text-2xl">{section}</h2><span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-blue-700">{previewPages.filter(x=>x.section===section).length} หน้า</span></div>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{previewPages.filter(x=>x.section===section).map(p=><Link key={p.slug} href={"/overview/"+p.slug} className="group flex min-h-44 flex-col justify-between rounded-2xl border border-[#d8e5f6] bg-white p-5 shadow-sm transition hover:border-[#1a62b0] hover:shadow-md focus-visible:outline-4 focus-visible:outline-blue-600">
    <div><p className="text-xs font-bold text-[#ad8127]">หน้าต้นแบบ {p.designRefs}</p><h3 className="mt-2 text-lg font-black text-[#123a76]">{p.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{p.description}</p></div><span className="mt-4 self-end text-sm font-extrabold text-blue-800">เปิดดูโครงหน้า ›</span>
   </Link>)}</div>
  </section>)}
  <p className="rounded-xl bg-[#0d356e] p-5 text-sm leading-relaxed text-white">ต้นแบบหมายเลข 1–105 มีหลายรูปแบบสำหรับ Desktop/Mobile และหลายสถานะของหน้าเดียวกัน จึงไม่ได้แปลว่าต้องมี 105 URL แยกกัน แผนผังนี้เน้นให้ครบตามหน้าที่ใช้งาน ไม่ใช่นับจำนวนภาพให้เท่าจำนวนลิงก์</p>
 </div></main>;
}
