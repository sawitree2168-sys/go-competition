import Link from "next/link";

const modules = [
 {title:"ปฏิทินการแข่งขัน",detail:"อ่านรายการแข่งขันที่ประกาศเผยแพร่จากฐานข้อมูลจริง",href:"/schedule",symbol:"▦",state:"เชื่อมข้อมูลแล้ว"},
 {title:"ค้นหานักกีฬา",detail:"ตรวจโปรไฟล์ที่ผูกกับบัญชีหลังยืนยันตัวตน",href:"/athletes/search",symbol:"◎",state:"เปิดใช้แบบจำกัดสิทธิ์"},
 {title:"ขอผูก GO ID เดิม",detail:"ส่งคำขอและติดตามสถานะ โดยยังไม่ผูกบัญชีอัตโนมัติ",href:"/athletes/claim",symbol:"♟",state:"ส่งคำขอได้"},
 {title:"สถิติ Head to Head",detail:"หน้าเปรียบเทียบเตรียมไว้แล้ว รอเชื่อมผลแข่งที่ยืนยัน",href:"/athletes/head-to-head",symbol:"◫",state:"กำลังพัฒนา"},
];
const admin = [
 {title:"รายการคำขอ GO ID",detail:"เข้าสู่ระบบ Owner เพื่อตรวจรายการและกรองสถานะ",href:"/admin/athlete-claims"},
 {title:"บันทึกผลตรวจ GO ID",detail:"เช็กลิสต์ของเจ้าหน้าที่พร้อมประวัติการตรวจ (ไม่ใช่การอนุมัติ)",href:"/admin/claim-review"},
];
export default function Home(){
 return <main className="min-h-screen bg-[#f4f7fc] text-[#10294b]">
   <header className="bg-[#09264e] text-white">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5">
     <Link href="/" className="flex items-center gap-3 font-black tracking-widest text-[#f1cb75] sm:text-xl"><img src="/visual/logo.jpg" alt="GO TOURNAMENT" className="h-12 w-16 rounded bg-white object-contain"/>GO TOURNAMENT</Link>
     <span className="rounded-full border border-amber-200/40 bg-amber-100/10 px-3 py-2 text-xs font-semibold text-[#f1cb75]">เวอร์ชันทดสอบระบบจริง</span>
    </div>
   </header>
   <div className="mx-auto max-w-6xl px-4 pt-5"><Link href="/visual-overview" className="flex min-h-14 items-center justify-center rounded-2xl border border-[#c9a661] bg-[#fff8e7] px-5 py-4 text-center font-extrabold text-[#163c71]">ดูผังภาพรวมเว็บไซต์ทั้งระบบ (7 หมวด) ›</Link></div>
   <section className="mx-auto max-w-6xl px-4 pt-7 sm:pt-12">
    <div className="mb-5 overflow-hidden rounded-2xl border border-[#d2ad62] bg-white shadow-lg">
     <img src="/visual/overview.jpg" alt="ภาพรวมเว็บไซต์ GO TOURNAMENT ที่ออกแบบไว้" className="h-auto w-full object-contain"/>
     <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div><h2 className="font-extrabold text-[#0c3166]">ชมภาพเว็บไซต์ที่ออกแบบไว้</h2><p className="mt-1 text-sm text-slate-600">ดูต้นแบบ 25 หน้าจอ ครบการสมัคร แข่งขัน ผลงาน และ Admin</p></div>
      <Link href="/visual-overview" className="rounded-xl bg-[#0f3874] px-5 py-3 font-bold text-white">เปิดดูทุกหน้า ›</Link>
     </div>
    </div>
    <div className="rounded-3xl bg-gradient-to-br from-[#174782] via-[#0d3263] to-[#091b38] p-6 text-white shadow-lg sm:p-12">
     <p className="text-sm font-extrabold tracking-[0.2em] text-[#f4cc76]">GO TOURNAMENT</p>
     <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">ระบบจัดการแข่งขันหมากล้อม และข้อมูลนักกีฬา</h1>
     <p className="mt-4 max-w-2xl text-base leading-relaxed text-blue-100 sm:text-lg">ค้นหาข้อมูล ติดตามปฏิทิน ส่งคำขอผูก GO ID เดิม และเข้าสู่พื้นที่เจ้าหน้าที่ได้จากหน้าเดียว</p>
     <div className="mt-6 rounded-xl border border-amber-200/40 bg-[#153b69] p-4 text-sm leading-relaxed">
       <strong className="text-[#f3cd7b]">สถานะการเปิดใช้งาน</strong>
       <p className="mt-1 text-white">เว็บไซต์เชื่อม Supabase แล้ว แต่ยังไม่เปิดรับสมัครแข่งขันหรือยืนยันชำระเงินจริง ระบบอนุมัติ GO ID ยังปิดอยู่เพื่อป้องกันข้อมูลผิดคน</p>
     </div>
     <div className="mt-6 flex flex-wrap gap-3">
      <Link href="/schedule" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f3cb75] px-6 py-3 font-extrabold text-[#09264e]">ดูรายการแข่งขัน</Link>
      <Link href="/athletes/search" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/60 px-6 py-3 font-semibold text-white">ค้นหานักกีฬา</Link>
     </div>
    </div>
   </section>
   <section className="mx-auto max-w-6xl px-4 py-9">
    <div className="mb-5"><h2 className="text-2xl font-black">ระบบสำหรับนักกีฬาและผู้ปกครอง</h2><p className="mt-1 text-slate-600">เลือกเมนูเพื่อเปิดหน้าใช้งานจริง</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
     {modules.map(m=><Link key={m.href} href={m.href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-400 hover:shadow-md">
       <div className="flex items-center justify-between gap-2"><span className="text-3xl text-blue-800" aria-hidden="true">{m.symbol}</span><span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{m.state}</span></div>
       <h3 className="mt-4 text-xl font-bold">{m.title}</h3>
       <p className="mt-2 leading-relaxed text-slate-600">{m.detail}</p>
       <p className="mt-4 font-semibold text-blue-800">เปิดหน้าใช้งาน ›</p>
      </Link>)}
    </div>
   </section>
   <section className="mx-auto max-w-6xl px-4 pb-12">
    <div className="rounded-3xl border border-blue-200 bg-[#eaf0fa] p-5 sm:p-8">
     <p className="text-sm font-bold tracking-wider text-blue-800">STAFF AREA</p>
     <h2 className="mt-1 text-2xl font-black">สำหรับผู้จัดการแข่งขัน / Admin</h2>
     <p className="mt-2 leading-relaxed text-slate-600">ต้องเข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์ Owner, Admin หรือ Reviewer</p>
     <Link href="/admin/tournaments" className="mt-5 block rounded-xl bg-[#0c3473] px-5 py-4 text-center font-bold text-white">เปิดศูนย์จัดการรายการแข่งขันรายปี ›</Link>
     <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {admin.map(a=><Link key={a.href} href={a.href} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
       <h3 className="font-bold text-[#0b3676]">{a.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{a.detail}</p><p className="mt-3 font-semibold text-blue-800">เข้าสู่ระบบจัดการ ›</p>
      </Link>)}
     </div>
    </div>
   </section>
   <footer className="border-t border-slate-200 bg-white px-5 py-7 text-center text-sm text-slate-500">GO TOURNAMENT · ระบบทดสอบ ยังไม่เปิดรับสมัครแข่งขันจริง</footer>
 </main>;
}