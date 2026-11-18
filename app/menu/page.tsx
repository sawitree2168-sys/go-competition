import Link from "next/link";
import MenuIcon, { type MenuIconName } from "@/components/MenuIcon";

const entries: { label: string; href: string; icon: MenuIconName; desc: string }[] = [
  {label:"หน้าแรก",href:"/",icon:"home",desc:"ภาพรวม GO TOURNAMENT"},
  {label:"รายการแข่งขัน",href:"/tournaments",icon:"trophy",desc:"ดูรายการแข่งขันทั้งหมด"},
  {label:"สมัครแข่งขัน",href:"/register",icon:"register",desc:"ลงทะเบียนเข้าร่วมการแข่งขัน"},
  {label:"ผลการแข่งขัน",href:"/results",icon:"results",desc:"ดูผลและคู่แข่งขัน"},
  {label:"อันดับและสถิติ",href:"/stats",icon:"stats",desc:"สถิติและอันดับนักกีฬา"},
  {label:"นักกีฬา",href:"/athletes",icon:"athlete",desc:"ค้นหาและดูโปรไฟล์"},
  {label:"ประกาศดั้งใหม่",href:"/dan",icon:"dan",desc:"ดั้งใหม่ ดั้งเพชร และทำเนียบดั้งจากสมาคม"},
  {label:"GO FAN",href:"/go-fan",icon:"fan",desc:"ติดตามนักกีฬาที่ชื่นชอบ"},
  {label:"ข่าวสาร",href:"/news",icon:"news",desc:"ข่าวประกาศและกิจกรรม"},
  {label:"แกลเลอรี",href:"/gallery",icon:"gallery",desc:"ภาพกิจกรรมการแข่งขัน"},
  {label:"เอกสารดาวน์โหลด",href:"/documents",icon:"documents",desc:"ระเบียบและเอกสาร"},
  {label:"คำถามที่พบบ่อย",href:"/faq",icon:"faq",desc:"คำแนะนำการใช้งาน"},
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
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eaf1fc] text-[#1255a7]"><MenuIcon name={item.icon} className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">{item.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.desc}</span>
              </span>
              <span aria-hidden="true" className="text-xl text-[#2363b7]">›</span>
            </Link>
          ))}
        </nav>
      </div>

    </main>
  );
}
