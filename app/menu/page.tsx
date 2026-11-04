import Link from "next/link";

const entries = [
  {label:"หน้าแรก",href:"/",icon:"⌂",desc:"ภาพรวม GO TOURNAMENT"},
  {label:"รายการแข่งขัน",href:"/tournaments",icon:"🏆",desc:"ดูรายการแข่งขันทั้งหมด"},
  {label:"สมัครแข่งขัน",href:"/register",icon:"▣",desc:"ลงทะเบียนเข้าร่วมการแข่งขัน"},
  {label:"ผลการแข่งขัน",href:"/results",icon:"◈",desc:"ดูผลและคู่แข่งขัน"},
  {label:"อันดับและสถิติ",href:"/stats",icon:"▥",desc:"สถิติและอันดับนักกีฬา"},
  {label:"นักกีฬา",href:"/athletes",icon:"♟",desc:"ค้นหาและดูโปรไฟล์"},
  {label:"GO FAN",href:"/go-fan",icon:"★",desc:"ติดตามนักกีฬาที่ชื่นชอบ"},
  {label:"ข่าวสาร",href:"/news",icon:"▤",desc:"ข่าวประกาศและกิจกรรม"},
  {label:"แกลเลอรี",href:"/gallery",icon:"▧",desc:"ภาพกิจกรรมการแข่งขัน"},
  {label:"เอกสารดาวน์โหลด",href:"/documents",icon:"▤",desc:"ระเบียบและเอกสาร"},
  {label:"คำถามที่พบบ่อย",href:"/faq",icon:"?",desc:"คำแนะนำการใช้งาน"},
];

const tabs = [
  {label:"หน้าแรก",href:"/",icon:"⌂"},
  {label:"แข่งขัน",href:"/tournaments",icon:"🏆"},
  {label:"GO FAN",href:"/go-fan",icon:"★"},
  {label:"นักกีฬา",href:"/athletes",icon:"♟"},
  {label:"เมนู",href:"/menu",icon:"☰"},
];

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-[#edf3fa] pb-24 text-[#09265b]">
      <header className="sticky top-0 z-30 bg-[#041b41] text-white shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="shrink-0 text-sm font-semibold">← กลับหน้าแรก</Link>
          <span className="truncate text-sm font-extrabold tracking-wide sm:text-lg">GO TOURNAMENT</span>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-7">
        <h1 className="text-2xl font-extrabold">เมนูทั้งหมด</h1>
        <p className="mt-2 text-sm text-slate-600">เลือกบริการที่ต้องการใช้งาน</p>
        <nav aria-label="เมนูเว็บไซต์ทั้งหมด" className="mt-5 overflow-hidden rounded-xl border border-[#d8e3f1] bg-white shadow-sm">
          {entries.map((item,i)=>(
            <Link key={item.href} href={item.href} className={`flex min-h-20 items-center gap-4 px-4 py-3 transition-colors hover:bg-[#f2f7ff] focus-visible:bg-[#f2f7ff] ${i?"border-t border-[#e8edf5]":""}`}>
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eaf1fc] text-xl font-bold text-[#1255a7]">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">{item.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.desc}</span>
              </span>
              <span aria-hidden="true" className="text-xl text-[#2363b7]">›</span>
            </Link>
          ))}
        </nav>
      </div>
      <nav aria-label="เมนูหลักบนมือถือ" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_15px_rgba(0,0,0,0.08)] md:hidden">
        {tabs.map(tab=>(
          <Link key={tab.href} href={tab.href} aria-current={tab.href==="/menu"?"page":undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 ${tab.href==="/menu"?"text-[#b38326]":"text-[#09265b]"}`}>
            <span aria-hidden="true" className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[11px] font-semibold">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
