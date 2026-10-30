import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {SiteSectionBanner} from "../../components/SiteSectionBanner";
import {findPreview,previewPages} from "../page-catalog";
export function generateStaticParams(){return previewPages.map(x=>({slug:x.slug}))}
export default async function OverviewDetail({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;if(slug==="results")redirect("/results");const item=findPreview(slug);if(!item)notFound();
 const related=previewPages.filter(x=>x.section===item.section&&x.slug!==item.slug).slice(0,5);
 const staff=["เจ้าหน้าที่","สถาบัน"].includes(item.section);
 const isRegistration=item.section==="สมัครแข่งขัน";
 const status=staff?"เจ้าหน้าที่เท่านั้นเมื่อระบบเชื่อมสมบูรณ์":isRegistration?"ยังไม่เปิดรับสมัครหรือชำระเงินจริง":"รอเชื่อมข้อมูลที่ผ่านการตรวจสอบ";
 return <main className="min-h-screen bg-[#eff5fc] text-[#0f305f]">
  <header className="bg-[#082756] px-4 py-4 text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><Link href="/overview" className="font-extrabold text-amber-200">‹ ภาพรวมทุกหน้า</Link><Link href="/" className="rounded-xl border border-white/40 px-4 py-2 font-semibold">หน้าแรก</Link></div></header>
  <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
   <SiteSectionBanner slot={item.slug} compact={staff} eyebrow={"GO TOURNAMENT · "+item.section} title={item.title} description={item.description}/>
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-[#fff8e6] px-4 py-3 text-sm"><span className="font-extrabold text-amber-900">สถานะ: โครงหน้าเว็บสำหรับตรวจภาพรวม</span><span className="text-amber-900">ต้นแบบอ้างอิง {item.designRefs}</span></div>
   <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">พื้นที่ข้อมูล{item.title}</h2><p className="mt-1 text-sm text-slate-600">เมื่อเชื่อมข้อมูลจริง ส่วนนี้จะแสดงรายละเอียดตามสิทธิ์ของผู้ใช้</p></div><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">ยังไม่มีข้อมูลที่ยืนยันสำหรับแสดง</span></div>
    <div className="mt-5 overflow-x-auto rounded-xl border border-[#d9e5f5]">
     <table className="w-full min-w-[540px] border-collapse text-left text-sm">
      <thead className="bg-[#113d7b] text-white"><tr>{item.columns.map((c,i)=><th scope="col" key={i} className="px-4 py-4 font-bold">{c}</th>)}</tr></thead>
      <tbody><tr><td colSpan={item.columns.length} className="px-5 py-12 text-center text-slate-600"><div className="mx-auto max-w-md space-y-2"><p className="text-lg font-bold">ยังไม่มีรายการสำหรับแสดง</p><p>{status}</p></div></td></tr></tbody>
     </table>
    </div>
    {item.liveHref&&<Link href={item.liveHref} className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-blue-800 px-5 py-3 font-bold text-white">เปิดระบบที่เชื่อมข้อมูลแล้ว ›</Link>}
   </section>
   <section className="grid gap-4 sm:grid-cols-2">
    <div className="rounded-2xl border border-blue-100 bg-white p-5"><h2 className="font-black">ภาพรวมหน้านี้</h2><p className="mt-2 text-sm leading-7 text-slate-700">{item.description}</p><p className="mt-2 text-sm text-slate-600">จัดรูปแบบให้รองรับมือถือและคอมพิวเตอร์ โดยใช้ข้อความไทยจริงและข้อมูลจากระบบเมื่อผ่านการตรวจแล้ว</p></div>
    <div className="rounded-2xl border border-blue-100 bg-white p-5"><h2 className="font-black">สิ่งที่จะเชื่อมต่อ</h2><p className="mt-2 text-sm leading-7 text-slate-700">{item.next}</p><p className="mt-2 text-xs text-amber-800">หน้านี้ยังไม่ดำเนินการเกี่ยวกับเงิน บัญชี หรือผลแข่งขัน</p></div>
   </section>
   <div className="flex flex-wrap gap-3"><Link href="/overview" className="inline-flex min-h-12 items-center rounded-xl bg-[#0a3470] px-5 py-3 font-black text-white">ดูทุกหน้าในระบบ</Link><Link href="/site-map" className="inline-flex min-h-12 items-center rounded-xl border border-blue-300 bg-white px-5 py-3 font-bold text-blue-800">เมนูที่เชื่อมระบบแล้ว</Link></div>
   {related.length>0&&<section className="space-y-3"><h2 className="text-lg font-black">หน้าอื่นในหมวด {item.section}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{related.map(x=><Link key={x.slug} href={"/overview/"+x.slug} className="flex min-h-16 items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-3 font-bold text-[#124487]">{x.title}<span aria-hidden="true">›</span></Link>)}</div></section>}
  </div>
 </main>;
}
