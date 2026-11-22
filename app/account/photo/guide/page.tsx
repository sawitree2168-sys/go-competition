import Link from "next/link";

export const metadata = { title: "วิธีเปลี่ยนรูปโปรไฟล์ · GO TOURNAMENT" };

const Btn = ({ children }: { children: React.ReactNode }) =>
  <span className="inline-block rounded-lg border-2 border-[#d8a83f] bg-[#fff5d5] px-2 py-0.5 font-bold text-[#123a86]">{children}</span>;

const steps: { title: string; body: React.ReactNode }[] = [
  { title: "เข้าเว็บ", body: <>เปิด <Link className="break-all font-bold underline" href="/login">go-competition.vercel.app/login</Link> บนมือถือหรือคอมพิวเตอร์</> },
  { title: "เข้าสู่ระบบ", body: <>ช่องชื่อ พิมพ์ชื่อ-นามสกุลนักกีฬา รหัส GO หรือเลขดั้ง (พิมพ์ 2 ตัวขึ้นไปจะมีรายชื่อให้เลือก) แล้วใส่รหัสผ่าน · ครั้งแรกใช้รหัสเริ่มต้นที่ครูแจ้ง แล้วตั้งรหัสใหม่หรือกดข้ามได้ · แนะนำให้บันทึกเบอร์โทร + วันเกิดไว้ใช้ตอนลืมรหัส</> },
  { title: "ไปที่หน้ารูป", body: <>ไปที่ <Btn>บัญชีของฉัน</Btn> แล้วกด <Btn>แก้รูปและระดับฝีมือ →</Btn> (หรือ <Link className="font-bold underline" href="/account/photo">กดตรงนี้เพื่อไปหน้ารูป</Link>)</> },
  { title: "ติ๊กยืนยันก่อน", body: <>ติ๊กช่อง “ฉันเป็นนักกีฬาคนนี้หรือผู้ปกครอง…” <strong>ถ้าไม่ติ๊ก ปุ่มจะเป็นสีเทา กดไม่ได้</strong></> },
  { title: "เพิ่มรูปและบันทึก", body: <>กด <Btn>เพิ่มรูปหลัก</Btn> → เลือกรูป → ลาก ซูม หรือหมุนให้หน้าอยู่กลางกรอบ → กดบันทึก → ขึ้นข้อความ “บันทึกรูปแล้ว” ✓</> },
];

export default function PhotoGuide() {
  const src = "/guide/photo-0.webp";
  return <main className="min-h-screen bg-[#eaf2ff] px-3 py-8 text-[#163568] sm:px-6">
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border-2 border-[#d3a749] bg-white shadow-xl">
      <header className="bg-[linear-gradient(130deg,#1763c4,#0e3f95)] px-5 py-8 text-center text-white sm:px-9">
        <div aria-hidden="true" className="mb-3 text-3xl">⚫ ⚪</div>
        <h1 className="text-3xl font-black sm:text-4xl">เปลี่ยนรูปโปรไฟล์นักกีฬาด้วยตัวเอง</h1>
        <p className="mt-2 text-xl font-bold text-[#ffe197]">ง่ายใน 5 ขั้นตอน</p>
        <p className="mt-2 text-sm text-blue-100">สำหรับนักกีฬาและผู้ปกครอง • ทำตามได้เอง ไม่ต้องรอแอดมิน</p>
      </header>
      <div className="space-y-7 p-4 sm:p-8">
        <figure className="mx-auto max-w-xl overflow-hidden rounded-2xl border-2 border-[#e1bc5a] bg-[#f8fbff]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static guide picture, opened full size on tap */}
          <a href={src} target="_blank" rel="noopener"><img src={src} width={1122} height={1402} alt="เปลี่ยนรูปโปรไฟล์นักกีฬาด้วยตัวเอง 5 ขั้นตอน: เข้าเว็บ เข้าสู่ระบบ ไปที่หน้ารูป ติ๊กยืนยันก่อน เพิ่มรูปและบันทึก" className="block h-auto w-full" /></a>
          <figcaption className="p-2 text-center"><a href={src} download="go-tournament-photo-guide.webp" className="inline-flex min-h-11 items-center rounded-lg border border-[#b48b36] bg-white px-4 text-sm font-bold">บันทึกภาพ</a></figcaption>
        </figure>
        <section aria-labelledby="howto">
          <h2 id="howto" className="mb-4 text-2xl font-extrabold">ลำดับขั้นตอน</h2>
          <ol className="space-y-3">{steps.map((s, i) => <li key={s.title} className="flex items-start gap-4 rounded-2xl border-2 border-[#e4c46b] bg-[#fffdf7] p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#1653ac] text-2xl font-black text-[#ffe09a]">{i + 1}</span>
            <div className="pt-1 leading-relaxed"><h3 className="text-lg font-extrabold">{s.title}</h3><p className="mt-1 text-base sm:text-lg">{s.body}</p></div>
          </li>)}</ol>
        </section>
        <section className="rounded-2xl border-2 border-[#e2bb5b] bg-[#fff9e9] p-5" aria-label="เคล็ดลับ">
          <h2 className="mb-3 text-2xl font-black">💡 เคล็ดลับ</h2>
          <div className="space-y-3 leading-relaxed">
            <p><strong>มีรูปเดิมอยู่แล้ว:</strong> กด <Btn>นำรูปออก</Btn> ก่อน แล้วค่อยกด <Btn>เพิ่มรูปหลัก</Btn></p>
            <p><strong>รูปสำรอง:</strong> เก็บได้อีก 2 รูป กด <Btn>ตั้งเป็นรูปหลัก</Btn> เพื่อสลับรูปได้ทุกเมื่อ</p>
            <p><strong>รูปขึ้นทันที</strong> ในโปรไฟล์ ทำเนียบนักกีฬา และผังคู่แข่งขันทุกงาน</p>
            <p><strong>ลืมรหัสผ่าน:</strong> กด <Link className="font-bold underline" href="/login/forgot">ลืมรหัสผ่าน</Link> กรอกเบอร์โทร + วันเกิด แล้วตั้งรหัสใหม่ได้ทันที</p>
            <p>ดูวิธีเข้าสู่ระบบแบบละเอียดได้ที่ <Link className="font-bold underline" href="/login/guide">วิธีเข้าสู่ระบบ</Link></p>
          </div>
        </section>
        <div className="text-center">
          <Link href="/account/photo" className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[#1654b4] px-8 text-lg font-black text-white shadow-md hover:bg-[#0d3e8e]">ไปเปลี่ยนรูปโปรไฟล์</Link>
          <p className="mt-3 break-all text-sm font-semibold">go-competition.vercel.app/account/photo/guide</p>
        </div>
      </div>
    </div>
  </main>;
}
