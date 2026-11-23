import Link from "next/link";

export default function AthleteProfileHelp({ signedIn = false, photo = false }: { signedIn?: boolean; photo?: boolean }) {
  const loginHref = photo ? "/login?next=/account/photo" : "/login?next=/account";

  return (
    <section id="athlete-profile-help" className="space-y-3 rounded-2xl border border-amber-400 bg-[var(--gt-surface,#fff)] p-4 sm:p-5">
      <h2 className="text-lg font-bold">{signedIn ? "เข้าระบบแล้ว แต่ยังไม่เห็นโปรไฟล์นักกีฬา" : "ค้นชื่อไม่เจอ หรือเข้าระบบแล้วไม่เห็นโปรไฟล์?"}</h2>
      <p className="text-sm leading-relaxed">บางบัญชียังไม่ได้เชื่อมกับทะเบียนนักกีฬา ชื่อที่ใช้สมัครแข่งอาจสะกดต่างกัน หรือทีมงานอาจยังไม่ได้ออกรหัส GO ให้ค่ะ</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
        <li><strong>ค้นชื่อในเมนู “นักกีฬา”</strong> ใช้ชื่อ-นามสกุลตามใบสมัครแข่ง ถ้าพบชื่อให้จดรหัส GO ไว้</li>
        <li><strong>ใช้รหัส GO เข้าระบบ</strong> {signedIn && "กด “ออกจากระบบ แล้วเข้าด้วยบัญชีอื่น” ก่อน "}แล้วกรอกรหัสผ่านของนักกีฬา หากเข้าครั้งแรกให้ใช้รหัสเริ่มต้นที่ครูแจ้ง</li>
        <li><strong>ถ้ายังไม่พบชื่อหรือเข้าด้วยรหัส GO แล้วไม่เห็นโปรไฟล์</strong> แจ้งครูหรือผู้จัดรายการที่เคยสมัคร พร้อมชื่อ-นามสกุล รหัส GO (ถ้ามี) และชื่อรายการกับรุ่นที่แข่ง เพื่อให้ทีมงานตรวจสอบค่ะ</li>
      </ol>
      <p className="text-sm leading-relaxed">ถ้าเห็นชื่อกับรหัส GO แล้ว แต่ยังไม่เห็นผลแข่ง ผลอาจอยู่ระหว่างตรวจสอบหรือยังไม่ได้เชื่อมเข้ารหัสเดิมค่ะ</p>
      <div className="flex flex-wrap gap-2 text-sm font-semibold">
        <Link href="/athletes" className="inline-flex min-h-11 items-center rounded-xl bg-[#1653ac] px-3 text-white">ค้นหาชื่อนักกีฬา</Link>
        <Link href={loginHref} className="inline-flex min-h-11 items-center rounded-xl border border-blue-300 px-3">{signedIn ? "ไปหน้าเปลี่ยนบัญชี" : "ไปหน้าเข้าสู่ระบบ"}</Link>
      </div>
    </section>
  );
}
