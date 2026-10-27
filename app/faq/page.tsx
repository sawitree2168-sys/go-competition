import Link from "next/link";
import {SiteSectionBanner} from "../components/SiteSectionBanner";
const faqs=[
 {group:"การค้นหาและติดตาม",items:[
  {question:"ดูรายการแข่งขันได้โดยไม่ต้องเข้าสู่ระบบหรือไม่?",answer:"ได้ค่ะ รายการแข่งขันที่ผู้จัดประกาศเผยแพร่แล้วสามารถดูได้จากหน้าปฏิทิน ส่วนรายการแบบร่างยังไม่แสดงต่อสาธารณะ"},
  {question:"GO FAN ต้องสมัครสมาชิกหรือเข้าสู่ระบบไหม?",answer:"ตามแบบที่กำหนด GO FAN จะไม่บังคับล็อกอิน และจะบันทึกรายชื่อที่เลือกติดตามไว้ในเบราว์เซอร์ของอุปกรณ์นั้น แต่ฟังก์ชันติดตามผลจริงยังอยู่ระหว่างพัฒนา จึงยังไม่สามารถกดติดตามนักกีฬาจริงได้"},
  {question:"ทำไมยังไม่เห็นนักกีฬาหรือรายการแข่งขัน?",answer:"อาจเป็นเพราะรายการนั้นยังไม่ได้รับอนุมัติให้เผยแพร่ หรือระบบยังไม่มีข้อมูลในส่วนที่คุณกำลังดู เราจะไม่แสดงข้อมูลจำลองให้เข้าใจว่าเป็นผลจริง"}
 ]},
 {group:"บัญชีและการสมัคร",items:[
  {question:"ทำไมค้นหาประวัตินักกีฬาเดิมต้องยืนยันตัวตน?",answer:"ข้อมูลนักกีฬารวมถึงข้อมูลเด็กและเยาวชนต้องคุ้มครองตามสิทธิ์ ผู้ใช้งานที่ต้องการจัดการบัญชีหรือขอผูก GO ID จึงต้องผ่านขั้นตอนยืนยันตัวตน ส่วนหน้าข้อมูลการแข่งขันสาธารณะจะเปิดเฉพาะข้อมูลที่ได้รับอนุญาต"},
  {question:"เปิดรับสมัครและโอนเงินแล้วหรือยัง?",answer:"ยังไม่เปิดรับสมัครหรือยืนยันการชำระเงินจริงผ่านเว็บไซต์นี้ กรุณายึดประกาศอย่างเป็นทางการของแต่ละรายการก่อนดำเนินการ"},
  {question:"ถ้ามี GO ID เดิมควรสร้างบัญชีนักกีฬาใหม่หรือไม่?",answer:"ไม่ควรสร้างนักกีฬาซ้ำ ให้เข้าสู่หน้าขอผูก GO ID เดิม และดำเนินการตามขั้นตอนตรวจสอบสิทธิ์"}
 ]},
 {group:"การแข่งขันและผล",items:[
  {question:"ผลการแข่งขันบนเว็บไซต์ถือเป็นผลทางการเมื่อใด?",answer:"ผลแข่งขันที่กรรมการกำลังบันทึกอาจยังอยู่ระหว่างตรวจสอบ ต้องรอการยืนยันและการเผยแพร่จากผู้จัดก่อน จึงจะนับเป็นผลทางการในระบบ"},
  {question:"ทุกการแข่งขันจำเป็นต้องใช้ระบบจับคู่ Swiss หรือไม่?",answer:"ไม่จำเป็น เป้าหมายของ GO TOURNAMENT คือให้ผู้จัดเลือกระบบจับคู่หรือใช้เพียงระบบรับสมัครและรายงานผลได้ตามรูปแบบงาน แต่ความสามารถนี้ยังอยู่ระหว่างประกอบและทดสอบ"},
  {question:"สถาบันที่ล็อกอินสามารถใช้ GO FAN ได้หรือไม่?",answer:"ได้ตามแนวทางที่ออกแบบไว้ สถาบันจะสามารถเปิด GO FAN เหมือนผู้ชมทั่วไป โดยไม่ต้องล็อกอินซ้ำ แต่ข้อมูลภายในสถาบันและสิทธิ์ผู้ดูแลจะไม่ถูกเปิดเผยผ่าน GO FAN"}
 ]},
 {group:"เว็บไซต์และการช่วยเหลือ",items:[
  {question:"ภาพต้นแบบที่เห็นสามารถกดใช้งานได้หรือไม่?",answer:"ภาพต้นแบบเป็นภาพอ้างอิงการออกแบบเท่านั้น หากต้องการใช้งานจริงให้ใช้เมนูหน้าเว็บไซต์หรือหน้ารวมเมนู ซึ่งระบุว่าฟังก์ชันใดเปิดให้ใช้แล้ว"},
  {question:"หากหน้าเว็บโหลดไม่สำเร็จควรทำอย่างไร?",answer:"ลองรีเฟรชหนึ่งครั้งและตรวจการเชื่อมต่ออินเทอร์เน็ต หากยังมีปัญหาให้จดหน้าที่ใช้งานและข้อความผิดพลาดไว้เพื่อแจ้งผู้ดูแล ผ่านช่องทางติดต่อที่ผู้จัดประกาศอย่างเป็นทางการ"}
 ]}
] as const;
export default function FAQPage(){
 return <main className="min-h-screen bg-[#f1f6fc] text-[#102b55]">
  <header className="bg-[#092752] p-5"><div className="mx-auto max-w-5xl"><Link href="/" className="font-bold text-amber-200">‹ กลับหน้าหลัก</Link></div></header>
  <div className="mx-auto max-w-5xl space-y-7 px-4 py-7">
   <SiteSectionBanner slot="faq" eyebrow="GO TOURNAMENT · HELP CENTER" title="คำถามที่พบบ่อย" description="ค้นหาคำแนะนำการใช้งานและตรวจสอบสถานะฟังก์ชันของเว็บไซต์"/>
   <nav aria-label="หมวดคำถาม" className="flex flex-wrap gap-2">{faqs.map((group,i)=><a key={group.group} href={"#faq-"+i} className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-800">{group.group}</a>)}</nav>
   {faqs.map((group,i)=><section id={"faq-"+i} key={group.group} className="scroll-mt-4 space-y-3">
    <h2 className="text-xl font-black sm:text-2xl">{group.group}</h2>
    {group.items.map(item=><details key={item.question} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-bold text-[#123e7b] marker:hidden focus-visible:outline-2 focus-visible:outline-blue-500"><span>{item.question}</span><span aria-hidden="true" className="text-xl text-blue-700 group-open:rotate-45">+</span></summary>
      <p className="border-t border-blue-100 px-5 py-4 text-sm leading-7 text-slate-700">{item.answer}</p>
     </details>)}
   </section>)}
   <div className="flex flex-wrap gap-3 rounded-2xl bg-[#092b60] p-5 text-white">
    <div className="flex-1"><h2 className="text-lg font-black">ต้องการเปิดหน้าเว็บไซต์?</h2><p className="mt-1 text-sm text-blue-100">เลือกหน้าที่มีอยู่จริงจากเมนูรวมของเว็บไซต์</p></div>
    <Link href="/site-map" className="inline-flex min-h-12 items-center rounded-xl bg-amber-300 px-5 py-3 font-black text-[#08265a]">ดูเมนูเว็บไซต์ทั้งหมด ›</Link>
   </div>
  </div>
 </main>;
}
