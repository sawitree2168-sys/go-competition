import Link from "next/link";
import AthleteProfileHelp from "@/components/AthleteProfileHelp";

export const metadata = { title: "วิธีเข้าสู่ระบบ · GO TOURNAMENT" };
const roles = [
  { icon: "👨‍👩‍👧", role: "นักกีฬา / ผู้ปกครอง", name: "ชื่อ-นามสกุลนักกีฬา, รหัส GO หรือเลขดั้ง", hint: "ถ้าชื่อซ้ำ ให้เลือกคนที่รหัส GO ตรง" },
  { icon: "🏫", role: "เจ้าของสถาบัน", name: "ชื่อสถาบัน", hint: "" },
  { icon: "👩‍🏫", role: "ครูในสถาบัน", name: "ชื่อตัวเอง", hint: "ครั้งแรกจะมีหน้ายืนยันให้เลือกสถาบันที่สอน" },
  { icon: "📚", role: "ครูอิสระ", name: "ชื่อตัวเอง", hint: "ถ้าชื่อซ้ำกับนักกีฬา ให้พิมพ์คำว่า “ครู” นำหน้า" },
  { icon: "📣", role: "ผู้จัดงาน", name: "ชื่อทีมผู้จัด", hint: "" },
  { icon: "📋", role: "กรรมการ", name: "ชื่อตัวเอง", hint: "แล้วเปิด “บัญชีของฉัน” → “งานที่เป็นกรรมการ”" },
];
const steps = [
  <>เปิด <Link className="font-bold underline" href="/login">go-competition.vercel.app/login</Link></>,
  <>ช่องชื่อ: พิมพ์ชื่อตามตำแหน่งด้านล่างอย่างน้อย 2 ตัวอักษร แล้วเลือกจากรายชื่อ (เว้นวรรค ตัวพิมพ์เล็ก-ใหญ่ จุด หรือขีด ไม่ต้องตรงเป๊ะ)</>,
  <>ช่องรหัสผ่าน: ครั้งแรกใช้รหัสเริ่มต้นของตำแหน่งที่ครูแจ้ง ระบบจะเปิดบัญชีให้อัตโนมัติ</>,
  <>หน้า “ยินดีต้อนรับ”: ตั้งรหัสผ่านใหม่หรือกดข้ามก็ได้ แนะนำให้บันทึกเบอร์โทร + วันเกิดสำหรับกู้รหัสผ่าน</>,
  <>เข้าสู่ระบบสำเร็จ ✓ นักกีฬาเปิด <strong>โปรไฟล์ของฉัน</strong> เพื่อดูประวัติหรือเปลี่ยนรูป ส่วนครูและผู้จัดใช้เมนูตามหน้าที่ของตัวเอง</>,
];
const pictures = [
  { src: "/guide/login-0.webp", w: 1092, h: 1440, alt: "สรุปวิธีเข้าสู่ระบบ GO TOURNAMENT 5 ขั้นตอน และตารางว่าแต่ละตำแหน่งพิมพ์อะไรในช่องชื่อ" },
  { src: "/guide/login-1.webp", w: 1122, h: 1402, alt: "ขั้นที่ 1: เปิดหน้าเข้าสู่ระบบ พิมพ์ชื่อ 2 ตัวขึ้นไปแล้วเลือกจากรายชื่อ ครั้งแรกใช้รหัสเริ่มต้นที่ครูแจ้ง" },
  { src: "/guide/login-2.webp", w: 1122, h: 1402, alt: "ขั้นที่ 2–4: หน้ายินดีต้อนรับ ตั้งรหัสผ่านใหม่หรือข้าม บันทึกเบอร์โทรและวันเกิดไว้ใช้ตอนลืมรหัส" },
  { src: "/guide/login-3.webp", w: 1122, h: 1402, alt: "เข้าระบบสำเร็จ ไปที่บัญชีของฉัน ลืมรหัสผ่านกรอกเบอร์โทรและวันเกิด กรอกผิดหลายครั้งรอ 15 นาที" },
];
function Picture({ src, w, h, alt }: { src: string; w: number; h: number; alt: string }) {
  const file = `go-tournament-${src.split("/").pop()}`;
  return <figure className="overflow-hidden rounded-2xl border-2 border-[#e1bc5a] bg-[#f8fbff]">
    {/* eslint-disable-next-line @next/next/no-img-element -- static guide pictures, opened full size on tap */}
    <a href={src} target="_blank" rel="noopener"><img src={src} width={w} height={h} alt={alt} loading="lazy" className="block h-auto w-full" /></a>
    <figcaption className="p-2 text-center"><a href={src} download={file} className="inline-flex min-h-11 items-center rounded-lg border border-[#b48b36] bg-white px-4 text-sm font-bold">บันทึกภาพ</a></figcaption>
  </figure>;
}
export default function LoginGuide() {
  return <main className="min-h-screen bg-[#eaf2ff] px-3 py-8 text-[#163568] sm:px-6">
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border-2 border-[#d3a749] bg-white shadow-xl">
      <header className="bg-[linear-gradient(130deg,#1763c4,#0e3f95)] px-5 py-8 text-center text-white sm:px-9">
        <div aria-hidden="true" className="mb-3 text-3xl">⚫ ⚪</div>
        <h1 className="text-3xl font-black sm:text-4xl">เข้าสู่ระบบ GO TOURNAMENT</h1>
        <p className="mt-2 text-xl font-bold text-[#ffe197]">ช่องเดียว ใช้ได้ทุกคน</p>
        <p className="mt-2 text-sm text-blue-100">นักกีฬา • ผู้ปกครอง • ครู • สถาบัน • ผู้จัดงาน • กรรมการ</p>
      </header>
      <div className="space-y-7 p-4 sm:p-8">
        <AthleteProfileHelp />
        <section aria-labelledby="pictures">
          <h2 id="pictures" className="mb-1 text-2xl font-extrabold">ภาพวิธีเข้าสู่ระบบ</h2>
          <p className="mb-4 text-sm">แตะภาพเพื่อดูขนาดใหญ่ · กด “บันทึกภาพ” เพื่อส่งต่อใน LINE หรือ Facebook</p>
          <div className="space-y-4">
            {pictures.slice(0, 1).map(p => <Picture key={p.src} {...p} />)}
            <div className="grid gap-4 sm:grid-cols-3">{pictures.slice(1).map(p => <Picture key={p.src} {...p} />)}</div>
          </div>
        </section>
        <section aria-labelledby="howto">
          <h2 id="howto" className="mb-4 text-2xl font-extrabold">5 ขั้นตอนง่าย ๆ</h2>
          <ol className="space-y-3">{steps.map((s,i)=><li key={i} className="flex items-start gap-4 rounded-2xl border-2 border-[#e4c46b] bg-[#fffdf7] p-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#1653ac] text-2xl font-black text-[#ffe09a]">{i+1}</span><div className="pt-1 text-base leading-relaxed sm:text-lg">{s}</div></li>)}</ol>
        </section>
        <section aria-labelledby="who">
          <h2 id="who" className="mb-4 text-2xl font-extrabold">ใครพิมพ์อะไรในช่องชื่อ?</h2>
          <div className="grid gap-3 sm:grid-cols-2">{roles.map(r=><article key={r.role} className="rounded-2xl border-2 border-[#e1bc5a] bg-[#f8fbff] p-4"><div className="flex items-center gap-3"><span aria-hidden="true" className="text-3xl">{r.icon}</span><h3 className="font-bold">{r.role}</h3></div><p className="mt-3 rounded-lg border border-[#bfd3ef] bg-white p-3 font-semibold">{r.name}</p>{r.hint && <p className="mt-2 text-sm">{r.hint}</p>}</article>)}</div>
        </section>
        <section className="rounded-2xl border-2 border-[#e2bb5b] bg-[#fff9e9] p-5" aria-label="เคล็ดลับ">
          <h2 className="mb-3 text-2xl font-black">💡 เคล็ดลับ</h2>
          <div className="space-y-3 leading-relaxed">
            <p><strong>1 คน ใช้บัญชีเดียว</strong> ถ้าได้เป็นกรรมการหรือแอดมินจับคู่ ผู้จัดจะเพิ่มตำแหน่งให้บัญชีเดิม ไม่ต้องสมัครใหม่</p>
            <p><strong>ลืมรหัสผ่าน:</strong> กด <Link className="rounded-lg border border-[#b48b36] bg-white px-2 py-1 font-bold underline" href="/login/forgot">ลืมรหัสผ่าน</Link> กรอกเบอร์โทร + วันเกิด แล้วตั้งรหัสใหม่ได้ทันที หรือให้ครูของสถาบันรีเซ็ตเป็นรหัสเริ่มต้น</p>
            <p><strong>กรอกรหัสผิดหลายครั้งติดกัน:</strong> ระบบจะให้รอ 15 นาทีแล้วค่อยลองใหม่</p>
          </div>
        </section>
        <div className="text-center">
          <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[#1654b4] px-8 text-lg font-black text-white shadow-md hover:bg-[#0d3e8e]">เข้าสู่ระบบ GO TOURNAMENT</Link>
          <p className="mt-3 break-all text-sm font-semibold">go-competition.vercel.app/login</p>
        </div>
      </div>
    </div>
  </main>;
}
