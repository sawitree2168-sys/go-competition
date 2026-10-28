import Link from "next/link";
import prize from "../../../config/prize_schedule_current_event.json";
const money=(n:number)=>new Intl.NumberFormat("th-TH",{maximumFractionDigits:0}).format(n);
const position=(p:string)=>p==="champion"?"ชนะเลิศ":"รองชนะเลิศอันดับที่ "+p.replace("runner_up_","");
const medal=(wins:number)=>wins===4?"เหรียญทอง":wins===3?"เหรียญเงิน":"เหรียญทองแดง";
export default function PrizeReferencePage(){
 const total=prize.cash_divisions.reduce((sum,group)=>sum+group.placements.reduce((s,p)=>s+p.cash_thb,0),0);
 return <main className="min-h-screen bg-[#eff4fd] text-[#102f5b]">
  <header className="bg-[#092b5b] px-5 py-5 text-white"><div className="mx-auto max-w-6xl">
   <Link href="/admin/tournaments" className="font-bold text-amber-200">‹ ศูนย์จัดการแข่งขัน</Link>
   <h1 className="mt-3 text-2xl font-black sm:text-3xl">ตารางเงินรางวัล — ฉบับอ้างอิงครั้งนี้</h1>
   <p className="mt-2 text-sm text-blue-100">จัดเตรียมจากตารางที่ผู้จัดส่งมา ยังไม่ผูกเข้ากับรายการแข่งขันในฐานข้อมูล และไม่ใช่หลักฐานการจ่ายเงิน</p>
  </div></header>
  <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
   <section className="grid gap-3 sm:grid-cols-3">
    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">รุ่นที่มีเงินรางวัล</p><p className="mt-2 text-3xl font-black">{prize.cash_divisions.length} รุ่น</p></div>
    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">เงินรางวัลรวมตามตำแหน่ง</p><p className="mt-2 text-3xl font-black">{money(total)} บาท</p></div>
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><p className="font-black">ไม่จัดรุ่น NEW ONE DAN</p><p className="mt-2 text-sm text-amber-900">คงรุ่น ASCENDANT — ONE DAN (1 DAN) ตามตาราง</p></div>
   </section>
   {prize.cash_divisions.map(group=><section key={group.code} className="overflow-hidden rounded-2xl bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0c4a99] px-5 py-4 text-white"><h2 className="text-lg font-black">{group.code} — {group.division}</h2><p className="text-sm font-bold">รวม {money(group.placements.reduce((sum,p)=>sum+p.cash_thb,0))} บาท</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
     <thead className="bg-blue-50"><tr><th className="p-3">อันดับ</th><th className="p-3 text-right">เงินรางวัล</th><th className="p-3">รางวัล</th><th className="p-3">ใบประกาศ</th></tr></thead>
     <tbody>{group.placements.map(p=><tr key={p.place} className="border-t border-blue-100 even:bg-[#f8fbff]"><td className="p-3 font-bold">{position(p.place)}</td><td className="p-3 text-right font-black">{money(p.cash_thb)} บาท</td><td className="p-3">{p.trophy?"ถ้วยรางวัล":"เหรียญรางวัล"}</td><td className="p-3">มี</td></tr>)}</tbody>
    </table></div>
   </section>)}
   <section className="rounded-2xl border border-amber-300 bg-white shadow-sm"><h2 className="rounded-t-2xl bg-amber-300 p-4 text-xl font-black text-[#122f56]">รุ่น Friendship</h2>
    <div className="grid gap-3 p-4 sm:grid-cols-3">{prize.friendship.awards.map(a=><div key={a.wins} className="rounded-xl border p-4"><p className="text-lg font-black">ชนะ {a.wins} กระดาน</p><p className="mt-2 font-bold">{medal(a.wins)}</p><p className="mt-1 text-sm text-slate-600">พร้อมใบประกาศ</p></div>)}</div>
   </section>
   <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-7">ตารางนี้เป็นข้อมูลรางวัลของการแข่งขันครั้งนี้เท่านั้น จะไม่ใช้เป็นค่าตั้งต้นของการแข่งขันอื่น และยังไม่เปิดให้ผู้ชมทั่วไปเข้าถึงจากเมนูหลักจนกว่าจะผูกกับรายการแข่งขันที่ถูกต้องและตรวจสอบเสร็จ</p>
  </div>
 </main>;
}
