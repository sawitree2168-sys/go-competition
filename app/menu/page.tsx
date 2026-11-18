import PublicPage from "@/components/PublicPage";
import Link from "next/link";
import MenuIcon, { type MenuIconName } from "@/components/MenuIcon";

const entries: { label: string; href: string; icon: MenuIconName; desc: string }[] = [
  {label:"เกี่ยวกับและติดต่อ",href:"/about",icon:"faq",desc:"รู้จักเว็บไซต์และวิธีใช้งาน"},
  {label:"เข้าสู่ระบบ",href:"/login",icon:"athlete",desc:"บัญชีนักกีฬา ครู และผู้จัด"},
  {label:"หน้าสถาบัน",href:"/institution",icon:"entrants",desc:"ดูแลนักเรียนและติดตามการแข่งขัน"},
  {label:"หน้าแรก",href:"/",icon:"home",desc:"ภาพรวม GO TOURNAMENT"},
  {label:"รายการแข่งขัน",href:"/tournaments",icon:"trophy",desc:"ดูรายการแข่งขันทั้งหมด"},
  {label:"สมัครแข่งขัน",href:"/register",icon:"register",desc:"ลงทะเบียนเข้าร่วมการแข่งขัน"},
  {label:"ผลการแข่งขัน",href:"/results",icon:"results",desc:"ดูผลและคู่แข่งขัน"},
  {label:"ส่งผลการแข่งขัน",href:"/results/submit",icon:"upload",desc:"ส่งผลรายการอื่นเพื่อเก็บสถิติของนักกีฬา"},
  {label:"อันดับและสถิติ",href:"/stats",icon:"stats",desc:"สถิติและอันดับนักกีฬา"},
  {label:"นักกีฬา",href:"/athletes",icon:"athlete",desc:"ค้นหาและดูโปรไฟล์"},
  {label:"ทำเนียบนักกีฬา",href:"/dan",icon:"dan",desc:"อันดับคะแนน รายชื่อดั้ง และประกาศดั้งใหม่"},
  {label:"GO FAN",href:"/go-fan",icon:"fan",desc:"ติดตามนักกีฬาที่ชื่นชอบ"},
  {label:"ข่าวสาร",href:"/news",icon:"news",desc:"ข่าวประกาศและกิจกรรม"},
  {label:"แกลเลอรี",href:"/gallery",icon:"gallery",desc:"ภาพกิจกรรมการแข่งขัน"},
  {label:"เอกสารดาวน์โหลด",href:"/documents",icon:"documents",desc:"ระเบียบและเอกสาร"},
  {label:"คำถามที่พบบ่อย",href:"/faq",icon:"faq",desc:"คำแนะนำการใช้งาน"},
];

export default function MenuPage() {
  return (
    <PublicPage icon="menu" title="เมนูทั้งหมด" sub="เลือกบริการที่ต้องการใช้งาน" current="/menu">
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
    </PublicPage>
  );
}
