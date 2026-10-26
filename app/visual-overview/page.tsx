import Link from "next/link";
const sections=[
 {id:"home",name:"หน้าแรกและภาพรวม",path:"/",assets:"ภาพหน้าแรก / Dashboard / หน้ารวม",status:"มีหน้าเว็บจริง",icon:"⌂"},
 {id:"register",name:"สมัครแข่งขัน",path:"/athletes/search",assets:"ภาพสมัครรายบุคคล / กลุ่ม / มือถือ",status:"ยังไม่เปิดสมัครจริง",icon:"✎"},
 {id:"athlete",name:"โปรไฟล์นักกีฬา",path:"/athletes/claim",assets:"ภาพโปรไฟล์นักกีฬา / ติดตามผลงาน",status:"มีระบบขอผูก GO ID",icon:"♟"},
 {id:"matches",name:"ผลแข่งขันและ Head-to-Head",path:"/athletes/head-to-head",assets:"ภาพผลสด / ตารางคู่แข่ง / สถิติ H2H",status:"รอผลแข่งขันจริง",icon:"◎"},
 {id:"institute",name:"สถาบันและทีม",path:null,assets:"ภาพสมัครแบบกลุ่ม / แดชบอร์ดสถาบัน / ผลทีม",status:"ภาพออกแบบก่อนเชื่อมฟังก์ชัน",icon:"▦"},
 {id:"admin",name:"Admin และกรรมการ",path:"/admin/athlete-claims",assets:"ภาพจัดการแข่งขัน / หน้าผู้ดูแล / คะแนน",status:"มีหน้า Admin จริง",icon:"⚙"},
 {id:"media",name:"ข่าวสารและผลงาน",path:null,assets:"ภาพข่าว / แกลเลอรี / รายงานผล",status:"ภาพออกแบบก่อนเชื่อมฟังก์ชัน",icon:"▣"},
];
export default function VisualOverview(){
 return <main className="min-h-screen bg-[#eef3fb] text-[#0c2a56]">
  <header className="bg-[#071d42] px-5 py-8 text-white">
   <div className="mx-auto max-w-6xl">
    <Link href="/" className="text-sm font-bold text-[#f0ca78]">‹ กลับหน้าแรก</Link>
    <h1 className="mt-3 text-3xl font-black sm:text-4xl">GO TOURNAMENT</h1>
    <p className="mt-2 text-lg text-blue-100">ผังภาพรวมการออกแบบเว็บไซต์ทั้งระบบ</p>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100">ใช้เป็นจุดเชื่อมหน้าต่าง ๆ ระหว่างการวางภาพ Mockup เดิมกับหน้าที่มีฟังก์ชันจริง โดยยังไม่สร้างข้อมูลนักกีฬาและผลแข่งขันสมมติ</p>
   </div>
  </header>
  <div className="mx-auto max-w-6xl px-4 py-7">
   <div className="mb-7 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
    <strong>ภาพต้นฉบับเดิม:</strong> มีชุด Visual Preview แยกเป็นหมวดครบ 7 ส่วนแล้ว ระหว่างย้ายไฟล์ภาพต้นฉบับขึ้นโฮสต์ถาวร หน้านี้แสดงผังหน้าและลิงก์จริงก่อน เพื่อไม่ให้ภาพหายหรือใช้ URL ชั่วคราวที่หมดอายุ
   </div>
   <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {sections.map((s,i)=><section key={s.id} id={s.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative flex aspect-[16/10] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a2857] via-[#184b8a] to-[#091b3c] p-5 text-center text-white">
        <span className="absolute right-4 top-3 rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-xs">หน้า {String(i+1).padStart(2,"0")}</span>
        <span className="mb-3 text-5xl text-[#f4d184]" aria-hidden="true">{s.icon}</span>
        <h2 className="text-xl font-black">{s.name}</h2>
        <p className="mt-2 text-xs leading-relaxed text-blue-100">ตำแหน่งแสดงภาพ Mockup ต้นฉบับ</p>
        <div className="mt-4 flex w-4/5 items-end gap-2 rounded-lg border border-white/20 bg-white/10 p-3">
         <div className="h-12 w-1/3 rounded bg-white/30"/><div className="h-8 w-1/3 rounded bg-white/20"/><div className="h-10 w-1/3 rounded bg-[#f4d184]/70"/>
        </div>
      </div>
      <div className="space-y-3 p-5">
       <p className="min-h-11 text-sm leading-relaxed text-slate-600">{s.assets}</p>
       <p className="text-xs font-semibold text-blue-800">{s.status}</p>
       {s.path?<Link href={s.path} className="block rounded-xl bg-blue-800 px-4 py-3 text-center font-bold text-white">เปิดหน้าระบบปัจจุบัน</Link>:
        <span className="block rounded-xl bg-slate-100 px-4 py-3 text-center font-semibold text-slate-600">อยู่ระหว่างจัดวางภาพต้นฉบับ</span>}
      </div>
    </section>)}
   </div>
   <div className="mt-8 rounded-xl bg-white p-5 text-sm leading-relaxed text-slate-600">หมายเหตุ: ภาพพื้นน้ำเงินในหน้านี้เป็นโครงตำแหน่งภาพ ไม่ใช่ไฟล์ Mockup ต้นฉบับ และไม่ใช่ข้อมูลแข่งขันจริง</div>
  </div>
 </main>;
}