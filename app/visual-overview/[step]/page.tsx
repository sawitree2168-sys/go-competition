import Link from "next/link";
import {notFound} from "next/navigation";
import {visualGroups,visualImages} from "../visual-data";
import {CroppedMockup} from "../VisualImage";
export default async function VisualScreen({params}:{params:Promise<{step:string}>}){
 const {step}=await params;
 const match=/^(intro|registration|competition|profile|admin)-([1-5])$/.exec(step);
 if(!match)notFound();
 const group=visualGroups.find(g=>g.id===match[1]);
 if(!group)notFound();
 const index=Number(match[2])-1;
 const image=visualImages[group.image];
 const prev=index>0?`/visual-overview/${group.id}-${index}`:undefined;
 const next=index<4?`/visual-overview/${group.id}-${index+2}`:undefined;
 return <main className="min-h-screen bg-[#edf3fb] text-[#11315d]">
  <header className="bg-[#0b2854] px-4 py-5 text-white">
   <div className="mx-auto max-w-5xl"><Link href="/visual-overview" className="font-semibold text-[#f2cc78]">‹ ภาพรวมทั้งหมด</Link>
    <p className="mt-2 text-sm text-blue-200">{group.title} • หน้า {index+1}/5</p>
    <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{group.steps[index]}</h1>
   </div>
  </header>
  <section className="mx-auto max-w-5xl space-y-5 px-4 py-8">
   <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed">หน้าตัวอย่างดีไซน์ ไม่ใช่แบบฟอร์มที่เปิดใช้งานจริง และข้อมูลภายในภาพเป็นเพียงตัวอย่าง</p>
   <CroppedMockup local={image.local} fallback={image.fallback} index={index} alt={group.steps[index]}/>
   <div className="flex justify-between gap-3">
    {prev?<Link href={prev} className="rounded-xl bg-white px-4 py-3 font-bold shadow-sm">‹ ก่อนหน้า</Link>:<span/>}
    {next?<Link href={next} className="rounded-xl bg-blue-800 px-4 py-3 font-bold text-white">ถัดไป ›</Link>:<Link href="/visual-overview" className="rounded-xl bg-blue-800 px-4 py-3 font-bold text-white">กลับภาพรวม</Link>}
   </div>
   <Link href={group.route} className="block rounded-xl border border-blue-700 bg-white px-5 py-4 text-center font-bold text-blue-900">เปิดหน้าระบบปัจจุบัน</Link>
  </section>
 </main>;
}