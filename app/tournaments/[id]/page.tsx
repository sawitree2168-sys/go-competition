import Link from "next/link";
import { Header, Icon, Shell, STONES_IMAGE, Thumb } from "./_ui/chrome";
import ShareButton from "./_ui/ShareButton";
import PosterViewer from "./_ui/PosterViewer";
import { loadEventPage, publicDb } from "./_ui/data";
import { divisionKey, divisionLabel, posterThumb, thaiDate } from "@/lib/division-display";

// Served from cache and refreshed in the background at most every 30 s (see PUBLIC_CACHE_SECONDS).
export const revalidate = 30;

// หน้า 2 · รายละเอียดงานแข่งขัน: event card, schedule/rules shortcuts, one row per division.
export default async function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event, divisions, entrants } = await loadEventPage(publicDb(), id);

  if (!event) {
    return (
      <Shell>
        <Header backHref="/tournaments" backLabel="กลับรายการแข่งขัน" />
        <div className="gt-card mx-4 mt-6 p-8 text-center">
          <h1 className="text-xl font-bold">ยังไม่พบรายการแข่งขันที่เผยแพร่</h1>
          <p className="mt-2 text-sm text-[var(--gt-muted)]">รายการนี้อาจยังไม่เปิดเผยข้อมูล หรือยังไม่พร้อมให้เข้าชม</p>
          <Link href="/tournaments" className="gt-gold-btn mt-5 inline-block px-5 py-3 text-sm">ดูรายการแข่งขันทั้งหมด</Link>
        </div>
      </Shell>
    );
  }

  const opens = thaiDate(event.registration_open_date, "short");
  const closes = thaiDate(event.registration_close_date, "long");
  const countFor = (name: string) => entrants.filter((e) => divisionKey(e.division_name) === divisionKey(name)).length;

  return (
    <Shell
      bottomBar={<>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <Icon name="calendar" className="h-6 w-6 shrink-0 text-[var(--gt-brand)]" />
          <span className="truncate">{opens ? `เปิดรับสมัคร ${opens}` : "รอประกาศวันรับสมัคร"}</span>
        </span>
        <Link href="/register" className="gt-gold-btn flex items-center gap-2 px-6 py-3 text-base">สมัครแข่งขัน <Icon name="chevron" className="h-4 w-4" /></Link>
      </>}
    >
      <Header backHref="/tournaments" backLabel="กลับรายการแข่งขัน" />

      <main className="px-4">
        <h1 className="mt-2 text-xl font-bold">รายละเอียดงานแข่งขัน</h1>

        <section className="gt-card mt-3 flex gap-3 p-3">
          {event.poster_url
            ? <PosterViewer src={event.poster_url} thumb={posterThumb(event.poster_url)} alt={`โปสเตอร์ ${event.title}`} className="h-40 w-[6.75rem] rounded-lg sm:h-48 sm:w-32" />
            : <Thumb src={STONES_IMAGE} alt="" className="h-36 w-32 rounded-lg sm:h-40 sm:w-40" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold leading-tight sm:text-xl">{event.title}</h2>
              <ShareButton title={event.title} />
            </div>
            {opens && <span className="gt-pill-gold mt-2 inline-block px-3 py-0.5 text-sm font-medium">เปิดรับสมัคร {opens}</span>}
            <p className="mt-2 flex items-center gap-2 text-sm"><Icon name="calendar" className="h-5 w-5 text-[var(--gt-gold)]" />{thaiDate(event.event_date) ?? "รอประกาศวันแข่งขัน"}</p>
            <p className="mt-1 flex items-center gap-2 text-sm"><Icon name="pin" className="h-5 w-5 text-[var(--gt-gold)]" />สถานที่รอยืนยัน</p>
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <a href="#schedule" className="gt-outline-btn flex items-center justify-center gap-2 py-3 text-[15px] font-semibold"><Icon name="calendar" className="h-6 w-6 text-[var(--gt-brand)]" />กำหนดการ</a>
          <a href="#rules" className="gt-outline-btn flex items-center justify-center gap-2 py-3 text-[15px] font-semibold"><Icon name="doc" className="h-6 w-6 text-[var(--gt-gold)]" />กติกาการแข่งขัน</a>
        </div>

        <h2 className="mt-6 text-xl font-bold">เลือกรุ่นการแข่งขัน</h2>
        <p className="text-sm text-[var(--gt-muted)]">แตะรุ่นเพื่อดูรายละเอียดและรายชื่อผู้แข่งขัน</p>

        {divisions.length ? (
          <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
            {divisions.map((d, i) => {
              const n = countFor(d.name);
              return (
                <li key={d.id}>
                  <Link href={`/tournaments/${id}/divisions/${d.id}`} className="gt-card gt-row flex min-w-0 items-center gap-3 p-1.5 pr-3">
                    <Thumb src={STONES_IMAGE} alt="" shift={i} className="h-14 w-24 rounded-[10px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold leading-snug">{divisionLabel(d.name)}</span>
                      <span className="block text-xs text-[var(--gt-muted)]">รายละเอียดรุ่น · รายชื่อผู้แข่งขัน{n ? ` · ${n} คน` : ""}</span>
                    </span>
                    <Icon name="chevron" className="h-6 w-6 shrink-0 text-[var(--gt-brand)]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="gt-card mt-3 p-5 text-sm text-[var(--gt-muted)]">ผู้จัดยังไม่ประกาศรุ่นการแข่งขัน</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href="#contact" className="gt-outline-btn flex items-center justify-center gap-2 py-3 text-[15px] font-semibold"><Icon name="chat" className="h-6 w-6 text-[var(--gt-brand)]" />ติดต่อผู้จัด</a>
          <a href="#contact" className="gt-pill-gold flex items-center justify-center gap-2 !rounded-xl py-3 text-[14px] font-semibold"><Icon name="hands" className="h-6 w-6" />ร่วมสนับสนุนการแข่งขัน</a>
        </div>

        <section id="schedule" className="gt-card mt-6 scroll-mt-4 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="calendar" className="h-5 w-5 text-[var(--gt-gold)]" />กำหนดการ</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-[var(--gt-line)] pb-2"><dt className="text-[var(--gt-muted)]">เปิดรับสมัคร</dt><dd className="font-semibold">{thaiDate(event.registration_open_date) ?? "รอประกาศ"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-[var(--gt-line)] pb-2"><dt className="text-[var(--gt-muted)]">ปิดรับสมัคร</dt><dd className="font-semibold">{closes ?? "รอประกาศ"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[var(--gt-muted)]">วันแข่งขัน</dt><dd className="font-semibold">{thaiDate(event.event_date) ?? "รอประกาศ"}</dd></div>
          </dl>
        </section>

        <section id="rules" className="gt-card mt-3 scroll-mt-4 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="doc" className="h-5 w-5 text-[var(--gt-gold)]" />กติกาการแข่งขัน</h2>
          <ul className="mt-3 grid gap-1.5 text-sm">
            <li>จับคู่แบบสวิส: รอบแรกจับตามลำดับ รอบถัดไปจับคนคะแนนเท่ากัน ไม่เจอคู่เดิมซ้ำ</li>
            <li>ชนะได้ 1 คะแนน ผู้ได้บาย (ไม่มีคู่ในรอบนั้น) ได้ 1 คะแนน</li>
            <li>คะแนนเท่ากัน ตัดสินด้วย SOS แล้วจึง SOSOS</li>
          </ul>
          <p className="mt-3 text-xs text-[var(--gt-muted)]">เวลาแข่ง โคมิ และรายละเอียดอื่นรอผู้จัดประกาศ</p>
        </section>

        <section id="contact" className="gt-card mt-3 scroll-mt-4 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="chat" className="h-5 w-5 text-[var(--gt-gold)]" />ติดต่อผู้จัด และร่วมสนับสนุน</h2>
          <p className="mt-2 text-sm text-[var(--gt-muted)]">รอผู้จัดยืนยันชื่อผู้ติดต่อ เบอร์โทรศัพท์ และ LINE สำหรับงานนี้</p>
        </section>
      </main>
    </Shell>
  );
}
