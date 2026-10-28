import Link from "next/link";
import {SiteSectionBanner} from "../components/SiteSectionBanner";
const groups=[
 {title:"สำหรับผู้ชมทั่วไป",detail:"เปิดดูข้อมูลสาธารณะได้โดยไม่ต้องเข้าสู่ระบบ",items:[
  {name:"หน้าแรก",href:"/",info:"ภาพรวมและทางเข้าหลักของระบบ"},
  {name:"ปฏิทินและรายการแข่งขัน",href:"/schedule",info:"แสดงเฉพาะรายการแข่งขันที่เผยแพร่แล้ว"},
  {name:"คำถามที่พบบ่อย",href:"/faq",info:"คำแนะนำการใช้งานและการรักษาความปลอดภัย"},
  {name:"GO FAN กองเชียร์",href:"/fan",info:"ไม่ต้องล็อกอิน เพิ่ม ลบ ล้างรายชื่อ และดูผลที่ยืนยันแล้วของนักกีฬาที่เปิดสาธารณะ"},
  {name:"ผลการแข่งขัน / อันดับ",href:null,info:"รอระบบยืนยันผลก่อนเผยแพร่ ไม่แสดงผลสมมติ"},
  {name:"ข่าวสาร / แกลเลอรี",href:null,info:"รอเผยแพร่ข่าวและภาพที่ผ่านการอนุมัติ"}
 ]},
 {title:"นักกีฬาและผู้ปกครอง",detail:"ระบบบัญชีและข้อมูลส่วนบุคคลต้องยืนยันสิทธิ์ตามกติกา",items:[
  {name:"ค้นหานักกีฬาเดิม",href:"/athletes/search",info:"ตรวจเฉพาะข้อมูลที่บัญชีได้รับอนุญาต"},
  {name:"ตั้งค่าบัญชีครั้งแรก",href:"/athletes/activate",info:"ระบุชื่อ–นามสกุล ยืนยันบัญชี แล้วตั้งรหัสเฉพาะตัว"},
  {name:"ขอผูก GO ID เดิม",href:"/athletes/claim",info:"ส่งคำขอให้ผู้ดูแลตรวจสอบ"},
  {name:"เปรียบเทียบ Head to Head",href:"/athletes/head-to-head",info:"หน้าเตรียมไว้แล้ว แต่ผลจริงยังรอข้อมูลยืนยัน"},
  {name:"สมัครแข่งขัน / ชำระเงิน",href:null,info:"ยังไม่เปิดรับสมัครหรือรับชำระเงินจริง"}
 ]},
 {title:"สำหรับเจ้าหน้าที่",detail:"ใช้สิทธิ์ตามบทบาท Owner / Admin / สถาบัน / กรรมการ",items:[
  {name:"ศูนย์จัดการรายการแข่งขัน",href:"/admin/tournaments",info:"ผู้จัดแข่งขันและเจ้าหน้าที่ที่ได้รับสิทธิ์"},
  {name:"จัดการสถาบัน",href:"/admin/academies",info:"จัดการข้อมูลสถาบันตามสิทธิ์"},
  {name:"จัดการภาพเว็บไซต์",href:"/admin/site-media",info:"อัปโหลดและอนุมัติภาพตามหน้าและอุปกรณ์"},
  {name:"ตรวจคำขอ GO ID",href:"/admin/athlete-claims",info:"สำหรับผู้ตรวจสอบที่ได้รับสิทธิ์"},
  {name:"จับคู่ / กรรมการ / ตารางคะแนน",href:null,info:"อยู่ระหว่างประกอบหน้าจอและระบบผลที่ยืนยันแล้ว"}
 ]},
 {title:"ต้นแบบและการตรวจงาน",detail:"แยกหน้าอ้างอิงดีไซน์ออกจากหน้าที่ทำงานจริง",items:[
  {name:"ดูต้นแบบเว็บไซต์ที่จัดเตรียมไว้",href:"/visual-overview",info:"เป็นภาพตัวอย่าง ไม่ใช่แบบฟอร์มหรือผลแข่งขันจริง"}
 ]}
] as const;
export default function SiteMap(){
 return <main className="min-h-screen bg-[#f0f5fc] text-[#102d58]">
  <header className="bg-[#08254e] px-5 py-4"><div className="mx-auto max-w-6xl"><Link href="/" className="font-bold text-[#f7d487]">‹ GO TOURNAMENT / หน้าหลัก</Link></div></header>
  <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:py-10">
   <SiteSectionBanner slot="home" eyebrow="GO TOURNAMENT · SITE MAP" title="เลือกส่วนที่ต้องการใช้งาน" description="รวมทางเข้าที่มีหน้าเว็บไซต์จริง พร้อมแสดงส่วนที่ยังอยู่ระหว่างพัฒนาอย่างชัดเจน"/>
   <Link href="/overview" className="flex min-h-16 items-center justify-between rounded-2xl bg-[#0d448e] px-5 py-4 font-black text-white shadow-sm">ดูภาพรวมทุกหน้าของเว็บไซต์ — รวมหน้าที่ยังสร้างระบบไม่เสร็จ <span aria-hidden="true">›</span></Link>
   <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-950">เมนูที่กดได้คือหน้าที่มีโค้ดในโครงการแล้ว แต่ไม่ได้หมายความว่าทุกฟังก์ชันทดสอบหรือเปิดใช้จริงครบทุกขั้นตอน ระบบสมัคร จ่ายเงิน และจับคู่ยังไม่เปิดใช้งานจริง ส่วน GO FAN มีโครงและ API แต่ยังต้องผ่านการทดสอบบนเว็บไซต์</div>
   {groups.map(g=><section key={g.title} aria-label={g.title} className="space-y-4">
    <div><h2 className="text-2xl font-black">{g.title}</h2><p className="mt-1 text-sm text-slate-600">{g.detail}</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{g.items.map(item=>item.href?
      <Link key={item.name} href={item.href} className="group flex min-h-32 flex-col justify-between rounded-2xl border border-[#d7e3f7] bg-white p-5 shadow-sm transition hover:border-blue-500 hover:shadow-md focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
       <div><h3 className="text-lg font-extrabold text-[#0b3677]">{item.name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{item.info}</p></div>
       <span className="mt-3 self-end font-bold text-blue-700">เปิดหน้า ›</span>
      </Link>:
      <div key={item.name} aria-disabled="true" className="flex min-h-32 flex-col justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-5">
       <div><h3 className="text-lg font-extrabold text-slate-600">{item.name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{item.info}</p></div>
       <span className="mt-3 text-xs font-bold text-amber-800">ยังไม่เปิดใช้งาน</span>
      </div>
    )}</div>
   </section>)}
   <div className="rounded-2xl bg-[#0b3166] p-5 text-white"><p className="font-black">สถานะเว็บไซต์</p><p className="mt-2 text-sm text-blue-100">เป้าหมายปัจจุบันคือประกอบทุกหน้าจากต้นแบบที่อนุมัติ และทดสอบการทำงานจริงก่อนการเผยแพร่ครั้งถัดไป</p></div>
  </div>
 </main>;
}
